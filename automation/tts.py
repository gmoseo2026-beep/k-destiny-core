#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import logging
import os
import hashlib
from pathlib import Path
import urllib.request
import urllib.error

# .env.local 로드 시도 (옵션)
env_path = Path(__file__).resolve().parent.parent / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            # Remove surrounding quotes if any
            v = v.strip().strip("\"'")
            os.environ.setdefault(k.strip(), v)

log = logging.getLogger("tts")
if not log.handlers:
    log.setLevel(logging.INFO)
    log.addHandler(logging.StreamHandler())

CASTING_FILE = Path(__file__).resolve().parent / "casting.json"
CACHE_DIR = Path(__file__).resolve().parent / "_vo_cache"

def get_voice_id(speaker: str) -> str:
    if not CASTING_FILE.exists():
        raise FileNotFoundError(f"캐스팅 시트가 없습니다: {CASTING_FILE}")
    casting = json.loads(CASTING_FILE.read_text(encoding="utf-8"))
    
    # 대소문자 무시 매핑
    mapping = {k.lower(): v for k, v in casting.items()}
    voice_id = mapping.get(speaker.lower())
    if not voice_id:
        raise ValueError(f"캐스팅 시트에 '{speaker}' 배역이 없습니다.")
    return voice_id


def generate_vo(text: str, speaker: str, lang: str = "ko") -> Path:
    """
    ElevenLabs API를 호출하여 VO(보이스) MP3를 생성하고 파일 경로를 반환합니다.
    동일한 텍스트/화자/언어 조합은 캐시된 MP3를 재사용합니다.
    """
    text = text.strip()
    if not text:
        raise ValueError("텍스트가 비어 있습니다.")

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY 환경변수가 설정되지 않았습니다.")

    voice_id = get_voice_id(speaker)
    CACHE_DIR.mkdir(exist_ok=True)
    
    # 캐시 키: Hash(텍스트 + VoiceID + 언어)
    hash_input = f"{text}|{voice_id}|{lang}".encode("utf-8")
    cache_key = hashlib.md5(hash_input).hexdigest()
    out_path = CACHE_DIR / f"{speaker}_{lang}_{cache_key}.mp3"
    
    if out_path.exists():
        log.info("  [TTS Cache Hit] %s (%s, %s)", speaker, lang, cache_key[:6])
        return out_path

    log.info("  [TTS API Request] %s (%s, %s) -> %s 자", speaker, lang, cache_key[:6], len(text))
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                raise RuntimeError(f"ElevenLabs API 실패: {response.status} {response.read()}")
            
            with open(out_path, "wb") as f:
                f.write(response.read())
                
        return out_path
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise RuntimeError(f"ElevenLabs API 에러: {e.code} {err_msg}")
    except Exception as e:
        raise RuntimeError(f"TTS 요청 중 예외 발생: {e}")

if __name__ == "__main__":
    # Test execution
    print("Testing TTS generation (ensure ELEVENLABS_API_KEY is set in .env.local)")
    try:
        p = generate_vo("안녕하세요, 1996년생 당신.", "karma", "ko")
        print("Success:", p)
    except Exception as e:
        print("Failed:", e)
