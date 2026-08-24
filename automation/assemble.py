#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
assemble.py — FFmpeg 자동 조립 (CapCut 완전 대체)  [요청 산출물 #4 + K-Destiny 개선]
=====================================================================
gemini_rpa.py가 만든 manifest.json을 읽어:
  1) 각 클립을 9:16 1080x1920 / 30fps / 48kHz로 정규화(서로 다른 소스도 매끄럽게 병합되게)
  2) 씬 순서대로 병합
  3) 씬별 caption을 .ass 자막으로 구워 넣기(랭킹 숏츠 필수)
  4) BGM 믹스 + 라우드니스 정규화
  5) 완성본을 '수동 예약 친화적' 파일명으로 저장 + 매니페스트 갱신

단독 병합만 원하면 merge_folder()만 써도 된다.
필요: FFmpeg 설치(PATH 등록). 한글 자막용 폰트 경로는 FONT 참고.
"""

import json
import subprocess
import sys
from pathlib import Path

import tts

# 9:16 표준
W, H, FPS, AR = 1080, 1920, 30, 48000
FONT = "C:/Windows/Fonts/malgunbd.ttf"   # 맑은 고딕 Bold (한글). 환경에 맞게 수정.
TRANSITIONS = ["fadeblack", "circlecrop", "wipeleft", "slideup"]  # 씬 간 전환


def _run(cmd):
    print(">>", " ".join(str(c) for c in cmd))
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        # D10: 실패한 파일명을 식별하기 위해 cmd를 에러 메시지에 포함
        raise RuntimeError(f"FFmpeg 실패 ({cmd}):\n{p.stderr[-1500:]}")
    return p


def _has_audio(path: Path) -> bool:
    """ffprobe로 오디오 스트림 존재 확인 (D10)."""
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a",
                        "-show_entries", "stream=index", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    return bool(p.stdout.strip())


def normalize_clip(src: Path, dst: Path, motion: str = None):
    """어떤 소스든 동일 규격으로 재인코딩 → concat 시 깨짐/싱크 문제 예방.
    이미지(png)면 3초짜리 정지 영상으로 변환. 오디오 없으면 무음 추가.

    motion: "zoom_in" | "zoom_out" | None
        Ken Burns 효과. 소스 비디오에만 적용 (이미지 제외).
        crop 애니메이션으로 정적 영상에 카메라 움직임을 부여.
    """
    is_img = src.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")

    # Ken Burns: 비디오 소스에 줌 인/아웃 효과
    if motion and not is_img:
        try:
            src_dur = _probe_dur(src)
        except Exception:
            src_dur = 8.0
        ZOOM = 0.08  # 8% 줌 범위
        sw, sh = int(W * (1 + ZOOM)), int(H * (1 + ZOOM))
        if motion == "zoom_in":
            # zoompan d=1: 프레임별 처리. z 1.0→1.08 (점점 확대)
            # fps를 먼저 변환해야 zoompan 입력 프레임 수가 정확함
            total_frames = int(src_dur * FPS)
            vf = (
                f"scale={W}:{H}:force_original_aspect_ratio=increase,"
                f"crop={W}:{H},fps={FPS},"
                f"zoompan=z='1+0.08*on/{total_frames}':"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                f"d=1:s={W}x{H}:fps={FPS}"
            )
        else:  # zoom_out
            # z 1.08→1.0 (점점 축소)
            total_frames = int(src_dur * FPS)
            vf = (
                f"scale={W}:{H}:force_original_aspect_ratio=increase,"
                f"crop={W}:{H},fps={FPS},"
                f"zoompan=z='1.08-0.08*on/{total_frames}':"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                f"d=1:s={W}x{H}:fps={FPS}"
            )
    else:
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,"
              f"crop={W}:{H},setsar=1,fps={FPS}")

    if is_img:
        cmd = ["ffmpeg", "-y", "-loop", "1", "-t", "3", "-i", str(src),
               "-f", "lavfi", "-t", "3", "-i", "anullsrc=r=48000:cl=stereo",
               "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-ar", str(AR), "-shortest", str(dst)]
    else:
        has_aud = _has_audio(src)
        if has_aud:
            cmd = ["ffmpeg", "-y", "-i", str(src),
                   "-vf", vf, "-r", str(FPS),
                   "-c:v", "libx264", "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-ar", str(AR),
                   "-af", "aresample=48000", str(dst)]
        else:
            cmd = ["ffmpeg", "-y", "-i", str(src),
                   "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                   "-vf", vf, "-r", str(FPS),
                   "-c:v", "libx264", "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-ar", str(AR), "-shortest", str(dst)]
    _run(cmd)
    return dst


def _probe_dur(path: Path) -> float:
    p = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
              "-of", "default=nw=1:nk=1", str(path)])
    return float(p.stdout.strip())


def concat_clips(clips, dst: Path):
    """정규화된 클립들을 xfade로 부드럽게 병합 (크로스페이드 1초)."""
    if len(clips) == 1:
        _run(["ffmpeg", "-y", "-i", str(clips[0]), "-c", "copy", str(dst)])
        return dst
        
    cmd = ["ffmpeg", "-y"]
    for c in clips:
        cmd.extend(["-i", str(c)])
        
    durs = [_probe_dur(c) for c in clips]
    
    fc = ""
    FADE_DUR = 1.0
    current_offset = 0.0
    last_out = "[0:v]"
    
    for i in range(1, len(clips)):
        offset = current_offset + durs[i-1] - FADE_DUR
        next_in = f"[{i}:v]"
        out_name = f"[v{i}]"
        
        transition = TRANSITIONS[(i-1) % len(TRANSITIONS)]
        fc += f"{last_out}{next_in}xfade=transition={transition}:duration={FADE_DUR}:offset={offset}{out_name};"
        
        last_out = out_name
        current_offset = offset

    fc = fc.rstrip(";")
    
    cmd.extend([
        "-filter_complex", fc,
        "-map", last_out,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(dst)
    ])
    _run(cmd)
    return dst


def _sec_to_ass(t: float) -> str:
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


def build_ass(captions_timed, dst: Path):
    """Rich ASS 자막: 3가지 스타일(Hook/Body/CTA) + 페이드 애니메이션.

    captions_timed: list of (start, end, text[, style]) tuples.
    style: "hook" | "body" | "cta" (기본: "body")
    - Hook: 120pt 금색, 화면 중앙 — 첫 인상 강탈
    - Body: 88pt 흰색, 상단 — 본문 메시지
    - CTA:  80pt 금색, 하단 — 행동 유도
    """
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: KD_Hook, Malgun Gothic, 120, &H0000C8FF, &H00000050, &HAA000000, 1, 8, 4, 5, 60, 60, 400, 1
Style: KD_Body, Malgun Gothic, 88, &H00FFFFFF, &H00000000, &H90000000, 1, 7, 2, 8, 60, 60, 180, 1
Style: KD_CTA, Malgun Gothic, 80, &H0000C8FF, &H00000000, &H90000000, 1, 6, 2, 2, 60, 60, 200, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    style_map = {"hook": "KD_Hook", "body": "KD_Body", "cta": "KD_CTA"}
    lines = []
    for item in captions_timed:
        if len(item) >= 4:
            start, end, text, style = item[0], item[1], item[2], item[3]
        else:
            start, end, text = item[0], item[1], item[2]
            style = "body"
        ass_style = style_map.get(style, "KD_Body")
        t = text.replace("\n", "\\N")
        # 모든 자막에 페이드 인/아웃 효과
        fade = "{\\fad(400,300)}"
        lines.append(f"Dialogue: 0,{_sec_to_ass(start)},{_sec_to_ass(end)},{ass_style},,0,0,0,,{fade}{t}")
    dst.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return dst


def burn_and_mix(video: Path, ass: Path, bgm: str, vos: list, dst: Path):
    """자막 굽기 + 오디오 트랙 믹스(원본+BGM 등) + 라우드니스 정규화 → 최종본.
    
    주의: -shortest를 사용하면 VO 트랙(수초)이 비디오(수십초)보다 짧아
    전체 영상이 VO 길이에 맞춰 잘리는 치명적 버그가 발생한다.
    대신 VO에 apad(자동 무음 패딩)를 적용하고 amix duration=first로
    비디오 원본 오디오 길이 기준으로 출력한다.
    """
    ass_esc = ass.as_posix().replace(":", "\\:")
    font_dir = str(Path(FONT).parent).replace(":", "\\:")
    vf = f"subtitles='{ass_esc}':fontsdir='{font_dir}'"
    
    video_dur = _probe_dur(video)
    
    # 0번 입력: 비디오
    cmd = ["ffmpeg", "-y", "-i", str(video)]
    
    # 트랙 목록: [(반복여부, 외부파일경로_또는_None, 볼륨필터), ...]
    tracks = []
    has_video_audio = _has_audio(video)
    
    if has_video_audio:
        # 비디오 원본 오디오 (기준 길이 역할)
        tracks.append((False, None, "[0:a]volume=1.0"))
    
    if bgm and Path(bgm).exists():
        # BGM 트랙 (stream_loop로 반복하므로 길이 문제 없음)
        tracks.append((True, bgm, "volume=0.18"))
        
    for (start_sec, vo_path) in vos:
        delay_ms = int(start_sec * 1000)
        # apad: VO 끝난 뒤 무음으로 패딩하여 비디오 길이에 맞춤
        # → -shortest 없이도 amix가 안전하게 동작
        tracks.append((False, str(vo_path),
                        f"adelay={delay_ms}|{delay_ms},volume=1.0,apad"))

    filter_complex = f"[0:v]{vf}[v]"
    
    if not tracks:
        # 오디오가 아예 없는 경우: 무음 트랙 생성
        cmd.extend(["-f", "lavfi", "-t", str(video_dur),
                     "-i", "anullsrc=r=48000:cl=stereo"])
        filter_complex += ";[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]"
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            str(dst)
        ])
        _run(cmd)
        return dst
    
    # 비디오에 원본 오디오가 없으면 기준 무음 트랙을 맨 앞에 삽입
    if not has_video_audio:
        cmd.extend(["-f", "lavfi", "-t", str(video_dur),
                     "-i", "anullsrc=r=48000:cl=stereo"])
        ref_idx = 1  # 무음 트랙의 입력 인덱스
        tracks.insert(0, (False, None, f"[{ref_idx}:a]volume=1.0"))
        # 기존 트랙들의 input_idx가 1 밀림 → 아래 루프에서 자동 처리
    
    mix_inputs = []
    # 외부 파일 입력 인덱스: 비디오(0) + (무음 트랙이 있으면 +1)
    input_idx = 1 + (0 if has_video_audio else 1)
    for i, (is_loop, path, vol_filter) in enumerate(tracks):
        if path:
            if is_loop:
                cmd.extend(["-stream_loop", "-1"])
            cmd.extend(["-i", str(path)])
            filter_complex += f";[{input_idx}:a]{vol_filter}[a{i}]"
            mix_inputs.append(f"[a{i}]")
            input_idx += 1
        else:
            filter_complex += f";{vol_filter}[a{i}]"
            mix_inputs.append(f"[a{i}]")
            
    if len(mix_inputs) > 1:
        mix_str = "".join(mix_inputs)
        # duration=first: 첫 번째 오디오(비디오 원본 or 기준 무음) 길이 기준
        filter_complex += f";{mix_str}amix=inputs={len(mix_inputs)}:duration=first:dropout_transition=2,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
    else:
        filter_complex += f";{mix_inputs[0]}loudnorm=I=-14:TP=-1.5:LRA=11[a]"

    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
        str(dst)
    ])
    
    _run(cmd)
    return dst


def ensure_bgm(dst: Path) -> Path:
    """BGM 에셋이 없으면 FFmpeg로 미스터리 앰비언트 드론을 합성.
    A2(110Hz) + E3(165Hz) + A1(55Hz) + 핑크노이즈 저역 → 에코 → 30초."""
    if dst.exists():
        return dst
    dst.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=f=110:d=30",
        "-f", "lavfi", "-i", "sine=f=165:d=30",
        "-f", "lavfi", "-i", "sine=f=55:d=30",
        "-f", "lavfi", "-i", "anoisesrc=d=30:c=pink:r=48000:a=0.003",
        "-filter_complex",
        "[0]volume=0.2[s1];[1]volume=0.12[s2];[2]volume=0.08[s3];"
        "[3]lowpass=f=200[n];"
        "[s1][s2][s3][n]amix=inputs=4:normalize=0,"
        "aecho=0.6:0.6:500|800:0.3|0.2,"
        "lowpass=f=600,"
        "afade=t=in:d=2,afade=t=out:st=27:d=3,"
        "volume=2",
        "-ar", "48000", "-t", "30", str(dst)
    ])
    print(f"[BGM 합성 완료]: {dst}")
    return dst


def generate_upload_meta(m, work: Path):
    """유튜브/틱톡 업로드용 메타데이터(제목, 설명, 해시태그) 자동 생성."""
    vid = m.get("video_id", "")
    parts = vid.split("_")
    year = parts[-1] if len(parts) > 1 and parts[-1].isdigit() else ""
    topic_key = parts[1] if len(parts) > 1 else ""

    topic_map = {
        "warn": ("경고", "Warning"),
        "fortune": ("재물운", "Fortune Reading"),
        "love": ("애정운", "Love Reading"),
        "health": ("건강운", "Health Reading"),
        "secret": ("비밀운", "Secret Reading"),
    }
    topic_ko, topic_en = topic_map.get(topic_key, ("운세", "Reading"))
    site_url = "https://k-destiny.com"

    meta = {
        "youtube": {
            "ko": {
                "title": f"🔮 {year}년생 {topic_ko} — 이 영상을 넘기면 후회합니다 #shorts",
                "description": (
                    f"🔮 {year}년생을 위한 {topic_ko} 리딩\n\n"
                    f"이 메시지는 우연이 아닙니다.\n"
                    f"당신이 이 영상을 보고 있는 데는 이유가 있습니다.\n\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🌙 K-Destiny — AI 사주·타로 리딩\n"
                    f"📱 무료 운세 확인: {site_url}\n"
                    f"━━━━━━━━━━━━━━━━━━\n\n"
                    f"#운세 #{year}년생 #사주 #타로 #{topic_ko} "
                    f"#shorts #숏츠 #KDestiny"
                ),
                "tags": [
                    f"{year}년생", "운세", topic_ko, "사주", "타로",
                    "숏츠", "shorts", "KDestiny", "오늘의운세",
                    f"{year}년생운세", "무료운세", "AI운세"
                ]
            },
            "en": {
                "title": f"🔮 Born in {year} — {topic_en} You MUST See #shorts",
                "description": (
                    f"🔮 {topic_en} for those born in {year}\n\n"
                    f"This message found you for a reason.\n"
                    f"Don't ignore what the universe is telling you.\n\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🌙 K-Destiny — AI Fortune & Tarot Reading\n"
                    f"📱 Free reading: {site_url}\n"
                    f"━━━━━━━━━━━━━━━━━━\n\n"
                    f"#fortune #bornin{year} #tarot #zodiac "
                    f"#{topic_key} #shorts #KDestiny"
                ),
                "tags": [
                    f"born in {year}", "fortune", topic_en.lower(), "tarot",
                    "zodiac", "shorts", "KDestiny", "psychic reading",
                    "astrology", "horoscope"
                ]
            }
        },
        "tiktok": {
            "ko": {
                "caption": (
                    f"🔮 {year}년생, 이건 우연이 아니야...\n\n"
                    f"#{year}년생 #운세 #{topic_ko} #사주 #타로 "
                    f"#KDestiny #숏츠 #fyp #foryou"
                )
            },
            "en": {
                "caption": (
                    f"🔮 Born in {year}? This isn't a coincidence...\n\n"
                    f"#bornin{year} #fortune #{topic_key} #tarot "
                    f"#KDestiny #shorts #fyp #foryou #zodiac"
                )
            }
        }
    }
    # JSON 생성 (기존 호환 유지용)
    dst_json = work / "_upload_meta.json"
    dst_json.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    
    # TXT 생성 (바로 복사/붙여넣기 용)
    dst_txt = work / "_upload_meta.txt"
    txt_content = f"""========== [ 유튜브 (YouTube) ] ==========

[ 한국어 (KO) ]
제목: {meta['youtube']['ko']['title']}
내용:
{meta['youtube']['ko']['description']}


[ 영어 (EN) ]
제목: {meta['youtube']['en']['title']}
내용:
{meta['youtube']['en']['description']}


========== [ 틱톡 (TikTok) ] ==========

[ 한국어 (KO) ]
내용(해시태그 포함):
{meta['tiktok']['ko']['caption']}


[ 영어 (EN) ]
내용(해시태그 포함):
{meta['tiktok']['en']['caption']}
"""
    dst_txt.write_text(txt_content, encoding="utf-8")
    
    print(f"\n[메타데이터 생성 완료]: {dst_json.name}, {dst_txt.name}")
    return dst_json
def build_from_manifest(manifest_path: str):
    """전체 파이프라인: manifest.json → 정규화(Ken Burns) → 병합 → 자막 → BGM → 완성본 → 메타데이터."""
    mp = Path(manifest_path)
    m = json.loads(mp.read_text(encoding="utf-8"))
    work = mp.parent
    norm_dir = work / "_norm"; norm_dir.mkdir(exist_ok=True)

    # R5: 클립 무결성 확인
    expected_files_count = sum(len(s["files"]) for s in m["scenes"])
    if expected_files_count != len(m["clips"]):
        raise ValueError(f"무결성 에러: scenes의 파일 개수 합({expected_files_count})과 clips 배열 길이({len(m['clips'])})가 불일치합니다.")

    # 씬별 모션 매핑 (Ken Burns 효과)
    DEFAULT_MOTIONS = ["zoom_in", "zoom_out", "zoom_in"]
    clip_motions = []
    for si, scene in enumerate(m["scenes"]):
        motion = scene.get("motion", DEFAULT_MOTIONS[si % len(DEFAULT_MOTIONS)])
        for _ in scene["files"]:
            clip_motions.append(motion)

    # 1) 정규화 + Ken Burns
    norm_clips = []
    for i, c in enumerate(m["clips"]):
        src = Path(c)
        dst = norm_dir / f"n{i:03d}.mp4"
        motion = clip_motions[i] if i < len(clip_motions) else None
        norm_clips.append(normalize_clip(src, dst, motion=motion))

    # 2) 병합 (다양한 전환 효과)
    merged = work / "_merged.mp4"
    concat_clips(norm_clips, merged)

    # BGM: 명시적 경로가 없으면 기본 에셋 사용
    bgm = m.get("bgm", "")
    if not bgm or not Path(bgm).exists():
        default_bgm = Path(__file__).resolve().parent / "assets" / "bgm_mystical.mp3"
        bgm = str(ensure_bgm(default_bgm))

    languages = ["ko", "en"]
    if "final" not in m or isinstance(m["final"], str):
        m["final"] = {}

    FADE_DUR = 1.0

    for lang in languages:
        captions_timed = []
        vos_timed = []
        idx = 0
        
        for scene in m["scenes"]:
            # 현재 씬이 시작되는 타임라인 상의 정확한 시간 (크로스페이드 1초 감안)
            cursor = sum(_probe_dur(norm_clips[k]) for k in range(idx)) - (idx * FADE_DUR)
            cursor = max(0.0, cursor)
            
            n_files = len(scene["files"])
            dur = sum(_probe_dur(norm_clips[idx + k]) for k in range(n_files))
            idx += n_files
            
            # VO 먼저 생성하여 길이를 알아냄
            vo_dur = 0.0
            if "vo" in scene and lang in scene.get("vo", {}) and "speaker" in scene:
                vo_text = scene["vo"][lang].strip()
                if vo_text:
                    try:
                        vo_path = tts.generate_vo(vo_text, scene["speaker"], lang)
                        vos_timed.append((cursor, vo_path))
                        vo_dur = _probe_dur(vo_path)
                    except Exception as e:
                        print(f"[{lang.upper()} VO Error] {e}")

            # Subs (자막 타이밍 분할) + 스타일
            text = ""
            if "subs" in scene and lang in scene.get("subs", {}):
                text = scene["subs"][lang].strip()
            elif "caption" in scene: # backward compatibility
                text = scene["caption"].strip()

            sub_style = scene.get("sub_style", "body")
                
            if text:
                # TTS가 있으면 TTS 길이 + 0.5초(여운), 없으면 씬 전체 길이
                sub_total_dur = vo_dur + 0.5 if vo_dur > 0 else dur
                sub_total_dur = min(sub_total_dur, dur) # 씬 길이를 초과하지 않도록
                
                blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
                if not blocks:
                    blocks = [text]
                
                block_dur = sub_total_dur / len(blocks)
                for i, block in enumerate(blocks):
                    start_t = cursor + (i * block_dur)
                    end_t = start_t + block_dur
                    captions_timed.append((start_t, end_t, block, sub_style))
                    
        ass = build_ass(captions_timed, work / f"_subs_{lang}.ass")
        vid = m.get("video_id", mp.parent.name)
        final = work / f"{vid}_{lang.upper()}_FINAL.mp4"
        burn_and_mix(merged, ass, bgm, vos_timed, final)
        
        m["final"][lang] = str(final)
        print(f"\n[{lang.upper()} 완성]: {final}")

    mp.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")

    # 업로드 메타데이터 생성
    generate_upload_meta(m, work)

    return list(m["final"].values())


def merge_folder(folder: str, dst: str):
    """단순 병합만 필요할 때: 폴더 내 mp4를 파일명 순으로 정렬 후 병합."""
    clips = sorted(Path(folder).glob("*.mp4"))
    norm = Path(folder) / "_norm"; norm.mkdir(exist_ok=True)
    nc = [normalize_clip(c, norm / f"n{i:03d}.mp4") for i, c in enumerate(clips)]
    return concat_clips(nc, Path(dst))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python assemble.py <output_dir>/<video_id>/manifest.json")
        sys.exit(1)
    build_from_manifest(sys.argv[1])

