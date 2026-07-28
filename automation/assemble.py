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

# 9:16 표준
W, H, FPS, AR = 1080, 1920, 30, 48000
FONT = "C:/Windows/Fonts/malgunbd.ttf"   # 맑은 고딕 Bold (한글). 환경에 맞게 수정.


def _run(cmd):
    print(">>", " ".join(str(c) for c in cmd))
    p = subprocess.run(cmd, capture_output=True, text=True)
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


def normalize_clip(src: Path, dst: Path):
    """어떤 소스든 동일 규격으로 재인코딩 → concat 시 깨짐/싱크 문제 예방.
    이미지(png)면 3초짜리 정지 영상으로 변환. 오디오 없으면 무음 추가."""
    is_img = src.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")
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
            # D10: 오디오 없는 클립에 무음 트랙 주입
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
    """정규화된 클립들을 demuxer로 병합(재인코딩 없이 빠르게 — 규격이 같으므로 안전)."""
    lst = dst.parent / "_concat.txt"
    lst.write_text("".join(f"file '{c.absolute().as_posix()}'\n" for c in clips), encoding="utf-8")
    _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
          "-c", "copy", str(dst)])
    return dst


def _sec_to_ass(t: float) -> str:
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


def build_ass(captions_timed, dst: Path):
    """씬별 (start,end,text) → 스타일 있는 .ass 자막 파일.
    큰 볼드 흰 글씨 + 검은 외곽선(랭킹 숏츠 가독성). 상단 배치."""
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: KD, Malgun Gothic, 76, &H00FFFFFF, &H00000000, &H90000000, 1, 6, 2, 8, 60, 60, 180, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for (start, end, text) in captions_timed:
        t = text.replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{_sec_to_ass(start)},{_sec_to_ass(end)},KD,,0,0,0,,{t}")
    dst.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return dst


def burn_and_mix(video: Path, ass: Path, bgm: str, dst: Path):
    """자막 굽기 + (있으면)BGM 믹스 + 라우드니스 정규화 → 최종본."""
    ass_esc = ass.as_posix().replace(":", "\\:")   # ffmpeg filter escaping
    font_dir = str(Path(FONT).parent).replace(":", "\\:")
    vf = f"subtitles='{ass_esc}':fontsdir='{font_dir}'"
    has_aud = _has_audio(video)
    if bgm and Path(bgm).exists():
        # 원본 오디오 + BGM(볼륨 다운) 믹스, 영상 길이에 맞춤
        # 모든 클립이 무음을 가지고 있도록 정규화되었으므로 오디오 맵핑 안전함
        if has_aud:
            cmd = ["ffmpeg", "-y", "-i", str(video), "-stream_loop", "-1", "-i", bgm,
                   "-filter_complex",
                   f"[0:v]{vf}[v];"
                   f"[1:a]volume=0.18[bg];"
                   f"[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2,"
                   f"loudnorm=I=-14:TP=-1.5:LRA=11[a]",
                   "-map", "[v]", "-map", "[a]",
                   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
                   "-shortest", str(dst)]
        else:
            # 원본 비디오에 오디오가 없는 경우(단독 호출 시 대비)
            cmd = ["ffmpeg", "-y", "-i", str(video), "-stream_loop", "-1", "-i", bgm,
                   "-filter_complex",
                   f"[0:v]{vf}[v];"
                   f"[1:a]volume=0.18,loudnorm=I=-14:TP=-1.5:LRA=11[a]",
                   "-map", "[v]", "-map", "[a]",
                   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
                   "-shortest", str(dst)]
    else:
        cmd = ["ffmpeg", "-y", "-i", str(video),
               "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p",
               "-c:a", "aac", str(dst)]
    _run(cmd)
    return dst


def build_from_manifest(manifest_path: str):
    """전체 파이프라인: manifest.json → 정규화 → 병합 → 자막 → BGM → 완성본."""
    mp = Path(manifest_path)
    m = json.loads(mp.read_text(encoding="utf-8"))
    work = mp.parent
    norm_dir = work / "_norm"; norm_dir.mkdir(exist_ok=True)

    # R5: 클립 무결성 확인
    expected_files_count = sum(len(s["files"]) for s in m["scenes"])
    if expected_files_count != len(m["clips"]):
        raise ValueError(f"무결성 에러: scenes의 파일 개수 합({expected_files_count})과 clips 배열 길이({len(m['clips'])})가 불일치합니다.")

    # 1) 정규화 (클립 순서 = manifest.clips 순서 = 씬 순서)
    norm_clips = []
    for i, c in enumerate(m["clips"]):
        src = Path(c)
        dst = norm_dir / f"n{i:03d}.mp4"
        norm_clips.append(normalize_clip(src, dst))

    # 2) 병합
    merged = work / "_merged.mp4"
    concat_clips(norm_clips, merged)

    # 3) 씬 caption을 실제 클립 길이에 맞춰 타이밍 계산
    #    (한 씬이 여러 클립=extend이면 그 씬 자막을 클립 길이 합만큼 노출)
    captions_timed = []
    idx = 0
    cursor = 0.0
    for scene in m["scenes"]:
        n_files = len(scene["files"])
            
        dur = sum(_probe_dur(norm_clips[idx + k]) for k in range(n_files))
        idx += n_files
        text = scene.get("caption", "").strip()
        if text:
            captions_timed.append((cursor, cursor + dur, text))
        cursor += dur
    ass = build_ass(captions_timed, work / "_subs.ass")

    # 4) 자막+BGM
    vid = m.get("video_id", mp.parent.name)
    final = work / f"{vid}_FINAL.mp4"
    burn_and_mix(merged, ass, m.get("bgm", ""), final)

    # 5) 매니페스트 갱신
    m["final"] = str(final)
    mp.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ 완성: {final}")
    return final


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
