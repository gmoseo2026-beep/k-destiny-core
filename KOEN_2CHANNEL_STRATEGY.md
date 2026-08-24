# 한/영 2채널 전략 확정 + ElevenLabs 요금 정정

**작성:** 개발총괄(Opus5) · 2026-07-26 (갱신)
**대체:** `CHANNEL_SETUP_KDESTINY.md` 의 "단일 채널 리브랜딩" 부분을 이 문서로 대체합니다.

---

## 1. ElevenLabs 요금 — 제가 틀렸습니다. 정정합니다

사용자님 화면이 맞습니다. 제가 참고한 3자 블로그가 낡은 값이었습니다.

| 플랜 | **실제 가격** | 제가 말했던 것 | 월 크레딧 | 포함 분(영어 기준) | 추가 분 |
|---|---|---|---|---|---|
| Free | $0 | $0 ✓ | 10,000 | ~10분 | $0.36 |
| **Starter** | **$6** | ~~$5~~ ❌ | 30,000 | ~30분 | $0.20 |
| **Creator** | **$22** (첫 달 **$11**) | $22 ✓ | **121,000** | ~121분 | $0.18 |
| Pro | $99 | $99 ✓ | 600,000 | ~600분 | $0.17 |
| **Scale** | **$299** | ~~$330~~ ❌ | 1,800,000 | ~1,800분 | $0.17 |

**틀린 것 3개:** Starter $5→**$6**, Creator 크레딧 100,000→**121,000**, Scale $330→**$299**.
그리고 **첫 달 반값($11)** 프로모션은 제가 아예 몰랐습니다.

### 기능 경계 (화면 기준)

| 기능 | 최소 플랜 |
|---|---|
| **보이스 디자인** | **Free** ← 무료로 11명 캐릭터를 설계할 수 있습니다 |
| **상업용 라이선스** | **Starter** ← Free는 상업 이용 **불가** |
| 즉시 음성 복제 / 더빙 스튜디오 | Starter |
| **192kbps 품질 오디오** · 프로페셔널 음성 복제 · 초과분 종량 결제 | **Creator** |
| API 44.1kHz PCM | Pro |

> **중요:** 보이스 디자인이 Free에 포함됩니다. **결제 전에 11명을 만들어 들어볼 수 있습니다.**
> 다만 Free로 만든 음성은 상업 이용이 안 되므로, 실제 영상에 넣을 음성은 유료 플랜에서 다시 생성해야 합니다.

---

## 2. 우리 사용량 재계산 — 한/영 2배 기준

### 왜 사이트의 "~분" 표기보다 우리가 유리한가

`30,000 크레딧 ≈ 30분` 은 **영어 기준 추정**입니다. 영어는 분당 약 1,000자(150 wpm)를 씁니다.
그런데 **한국어는 음절 1개 = 글자 1개**라서 분당 약 **300자**밖에 안 됩니다.

즉 **한국어는 같은 크레딧으로 약 3배 긴 음성**을 만들 수 있습니다. (표기상 30분 → 실제 한국어 ~90분)

> ⚠️ 단, ElevenLabs가 한글을 1글자=1크레딧으로 계산한다는 전제입니다. **첫 달에 실측으로 확인하세요** —
> 짧은 문장 하나 생성 전후의 크레딧 차이를 보면 바로 나옵니다.

### 월 소모량 (하루 2편 × 한/영)

| 항목 | 계산 | 글자 수 |
|---|---|---|
| 한국어 VO (편당 발화 ~20초) | 20초 × 5자/초 = 100자 · 월 60편 | **6,000자** |
| 영어 VO (편당 발화 ~20초) | 20초 × 16.7자/초 ≈ 330자 · 월 60편 | **19,800자** |
| **소계** | | **~25,800자** |
| 재작업 2배 여유 | | ~52,000자 |
| 재작업 3배 여유 | | ~78,000자 |

**판정**

- **Starter $6 (30,000)** — 재작업 없이 딱 86%. **여유가 없습니다.** 재작업 한 번만 늘어도 초과
- **Creator $22 (121,000)** — 재작업 3배까지 64%. **적정**

### ★ 권장: 첫 달부터 Creator

Starter와 차액이 **$16**인데 크레딧은 **4배**(30k → 121k)이고 192kbps 오디오가 붙습니다.
게다가 **첫 달 $11** 이면 Starter $6보다 **$5 더 내고 4배**를 받는 셈입니다. 안 쓰면 손해입니다.

```
① Free 로 보이스 11개 디자인 + 한/영 품질 확인        $0
② 품질 OK → Creator 첫 달 $11 로 결제, 음성 재생성    $11
③ 두 번째 달부터 $22/월
```

테스트 단계(9편 2주)만 돌릴 거면 Starter $6로도 되지만, 어차피 본격 가동하면 넘습니다.

---

## 3. 채널 4개 구조 — 확정

| # | 채널명 | 플랫폼 | 언어 | 기반 | 핸들 |
|---|---|---|---|---|---|
| 1 | **K-Destiny** | YouTube | 🇰🇷 한국어 | 기존 **냥이숏** 리브랜딩 | `@kdestiny` / `@thekdestiny` |
| 2 | **K-Destiny** | TikTok | 🇰🇷 한국어 | 기존 **전랭뷰** 리브랜딩 | `@kdestiny.kr` |
| 3 | **K-Destiny Global** | YouTube | 🇺🇸 영어 | **신규 개설** | `@kdestinyglobal` |
| 4 | **K-Destiny Global** | TikTok | 🇺🇸 영어 | **신규 개설** | `@kdestiny.global` |

> **표기 확인:** 메시지에 `K-Dstiny Global` 로 적혀 있었는데 **`K-Destiny Global`** 이 맞겠지요? (e 빠짐)
> 채널명은 나중에 바꾸기 번거로우니 개설 전에 확정해주세요.

### 이 구조가 이전 계획보다 나은 이유

이전엔 "한 채널에 한국어 VO + 영어 자막"이었습니다. 지금 구조가 확실히 낫습니다.

- **알고리즘이 채널당 하나의 언어·시청자를 학습** → 타깃 정확도가 올라갑니다
- **댓글이 한 언어로 모입니다** → 답글로 무료 리딩 주는 전환 루프가 훨씬 잘 돌아갑니다
- 전랭뷰가 한국 비중이 높으니 **기존 구독자를 그대로 활용**하고, 영어권은 깨끗하게 새로 시작합니다
- 자막 전략이 단순해집니다: **채널 언어 = VO 언어 = 자막 언어**

### ⚠️ 리스크 — 업로드 작업량이 4배가 됩니다

하루 2편(비주얼 2세트) → 완성본 4개(KO 2 + EN 2) → **하루 8건 업로드**
(KO판 2편 × YT+TikTok = 4건, EN판 2편 × YT+TikTok = 4건)

건당 3분이면 **하루 24분**이고, 업로드 자동화는 금지이므로 **전부 수동**입니다.

**권장:** 테스트 2주는 **하루 1편(비주얼 1세트)** 으로 시작하세요.
→ 완성본 2개 → 4건 업로드 → 하루 12분. 워크플로가 손에 익으면 2편으로 올리세요.

---

## 4. 채널별 설명 · 서명 (복붙)

### 4-1. K-Destiny (YouTube · 한국어)

```
🔮 K-Destiny — AI 마스터가 읽어주는 한국 사주

별자리 운세는 12가지. 한국 사주는 518,400가지입니다.

사주는 태어난 '순간'에서 계산합니다.
연·월·일·시 네 기둥이 각각 오행에 대응하고,
그 균형이 당신의 본질과 시기의 흐름을 말해줍니다.

10명의 AI 사주 마스터가 매일 하나씩 읽어드립니다.
카르마는 경고하고, 유라는 기반을 다지고, 류는 흐름을 바꿉니다.

▶ 매일 새로운 리딩
▶ 당신의 일간, 오행, 전환점
▶ 한국어 음성 · 한국어 자막

내 사주 무료로 보기 → https://thekdestiny.com

※ 오락 및 자기이해 목적의 콘텐츠입니다.
```

**채널 키워드:** `사주, 운세, 사주풀이, 일간, 오행, 명리, 만세력, 띠별운세, 오늘의운세, K-Destiny`

**고정 댓글 (한국어)**
```
🔮 내 사주 무료로 보기 → 프로필 링크
생년월일 남겨주시면 일간 봐드려요 👇
```

### 4-2. K-Destiny Global (YouTube · 영어)

```
🔮 K-Destiny Global — Korean Saju, read by AI Masters.

Your horoscope has 12 options. Korean Saju has 518,400.

Saju (四柱, "Four Pillars") is Korea's 500-year-old destiny system.
It doesn't read your sun sign — it calculates from your exact birth
moment: year, month, day, and hour. Each pillar maps to an element,
and the balance between them describes your core self and the timing
of your years. It's the system K-dramas keep referencing.

10 AI Saju Masters read it for you.
Karma warns. Yura grounds. Ryu moves. Each one specializes.

▶ New reading every day
▶ Your Day Master, your element, your turning points
▶ English voice · English subtitles

Get your own full chart — free to start:
https://thekdestiny.com

For entertainment and self-reflection.
```

**채널 키워드:** `saju, korean saju, four pillars, bazi, day master, korean astrology, korean fortune telling, kdrama, destiny, K-Destiny`

**고정 댓글 (영어)**
```
🔮 Your own full chart is free to start → link in profile
Drop your birth year below and I'll tell you your Day Master 👇
```

### 4-3. TikTok bio (80자 제한)

```
[K-Destiny · 한국어]
한국 사주를 AI로 🔮 별자리 아닌 태어난 순간의 계산. 무료 사주 👇
(39자)

[K-Destiny Global · 영어]
Korean Saju 🔮 Your exact birth moment, not your sun sign. Free reading 👇
(72자)
```

**TikTok 표시 이름 (30자 제한)**
```
K-Destiny 🔮 AI 사주              (한국어 채널)
K-Destiny 🔮 Korean Saju        (영어 채널)
```

### 4-4. 프로필 링크 UTM — 채널별로 구분하세요

```
YouTube KO : https://thekdestiny.com/ko?utm_source=youtube&utm_medium=social&utm_campaign=shorts_ko
YouTube EN : https://thekdestiny.com/en?utm_source=youtube_global&utm_medium=social&utm_campaign=shorts_en
TikTok  KO : https://thekdestiny.com/ko?utm_source=tiktok&utm_medium=social&utm_campaign=shorts_ko
TikTok  EN : https://thekdestiny.com/en?utm_source=tiktok_global&utm_medium=social&utm_campaign=shorts_en
```

**한국어 채널은 `/ko`, 영어 채널은 `/en` 으로 랜딩을 분리하세요.** 언어가 맞아야 전환됩니다.

---

## 5. 해시태그 — 채널별

**K-Destiny (한국어)**
```
YouTube 설명 상단: #shorts #사주 #운세
하단: #사주풀이 #일간 #오행 #만세력 #띠별운세 #오늘의운세 #명리학 #신점 #타로
TikTok 캡션: #사주 #운세 #사주풀이 #추천 #fyp
```

**K-Destiny Global (영어)**
```
YouTube 설명 상단: #shorts #saju #koreanastrology
하단: #fourpillars #daymaster #bazi #koreanfortune #kdrama #astrology #destiny #zodiac
TikTok 캡션: #saju #koreanastrology #fourpillars #fyp #astrologytok
```

---

## 6. ★ 파이프라인 설계 변경 — 비주얼 1세트 → 완성본 2개

이게 이번 결정의 **가장 중요한 기술적 영향**입니다.

```
[밤] Flow RPA — 씬 3개 생성 (8초 × 3 = 24초)          ← 크레딧 30, 1회만
        ↓
[TTS] 같은 대본을 한국어 VO 3개 + 영어 VO 3개
        ↓
[조립] 같은 클립 세트로 2번 조립
        ├─ <video_id>_KO_FINAL.mp4   (한국어 VO + 한국어 자막)
        └─ <video_id>_EN_FINAL.mp4   (영어 VO + 영어 자막)
```

**Veo 크레딧은 늘지 않습니다.** 비주얼을 공유하니까요. 늘어나는 건 TTS 비용(무시할 수준)과 조립 시간뿐입니다.

### job JSON 스키마 (Phase 4/5에 반영할 것)

```json
{
  "video_id": "20260801_A_birthmonth",
  "output_dir": "C:\\kd\\out",
  "bgm": "C:\\kd\\assets\\bgm_mystic_loop.mp3",
  "languages": ["ko", "en"],
  "scenes": [
    {
      "n": 1,
      "speaker": "narrator",
      "prompt": "... mouth closed, does not speak, no dialogue, ambient only ...",
      "ref_image": ".../master_karma_calm.webp.jpg",
      "vo": {
        "ko": "태어난 달, 지금 고르세요.",
        "en": "Pick your birth month. Now."
      },
      "subs": {
        "ko": [{"t": 0.0, "text": "태어난 달, 지금 고르세요"}],
        "en": [{"t": 0.0, "text": "Pick your birth month. Now."}]
      }
    }
  ],
  "meta": {
    "ko": { "title": "...", "caption_hashtags": "..." },
    "en": { "title": "...", "caption_hashtags": "..." }
  }
}
```

**핵심:** `vo` 와 `subs` 를 **언어별 딕셔너리**로. `assemble.py` 는 `languages` 를 순회하며
같은 `_norm/` 클립을 재사용해 완성본 2개를 만듭니다. (정규화·병합은 1회, 자막·믹스만 2회)

`upload_manifest.csv` 에도 `language` 열을 추가해 업로드 대상 채널을 구분하세요.

---

## 7. 지금부터 할 일 — 순서대로

### ① [사용자] ElevenLabs 보이스 테스트 — **3개만, 한/영 둘 다** (30분) ★ 최우선

Free 플랜으로 **Voice Design** 에서 3개만 만드세요.

| 캐릭터 | 프롬프트 (그대로 붙여넣기) |
|---|---|
| **나레이터** | `A Korean woman in her early thirties with a warm mid-low voice, slightly husky, speaking calmly and intimately as if sharing a secret with a close friend. Measured pace, gentle authority, never theatrical. Clear articulation.` |
| **Karma** | `A Korean woman in her late twenties, low cool alto with breathy edges, speaking slowly with long pauses, delivering a serious warning with underlying compassion. Falling intonation at sentence ends. Gothic, composed, never harsh.` |
| **Seoa** | `A Korean woman in her thirties, clear composed mezzo with precise articulation, analytical and calm like a thoughtful counselor. Even pace, gentle emphasis on logical connectors. Intelligent, warm, credible.` |

**그리고 각 보이스로 한국어와 영어를 둘 다 뽑아보세요.** 이게 이번 테스트의 핵심입니다 —
한/영 2채널 전략은 **같은 Voice ID가 두 언어에서 같은 캐릭터로 들려야** 성립합니다.

```
[한국어] 1996년생, 잠깐 멈추세요. 10월에 대한 경고입니다.
[영어]   If you were born in 1996 — stop scrolling for five seconds.

[한국어] 태어난 달, 지금 고르세요.
[영어]   Pick your birth month. Now.
```

**판단 기준 4개**

1. 한국어 받침·연음이 어색하지 않은가 (`잠깐 멈추세요`, `경고입니다`)
2. `1996년생` 을 제대로 읽는가
3. **같은 보이스의 한국어와 영어가 같은 사람처럼 들리는가** ← 가장 중요
4. 세 목소리가 서로 구별되는가

**결과에 따라**

- **다 좋다** → Creator 첫 달 $11 결제 → 나머지 8개 생성 → **Voice ID 11개를 알려주세요**
- **한국어는 좋은데 영어가 어색하다** → 영어용 보이스를 **별도로 11개 더** 디자인 (비용 동일)
- **한국어가 어색하다** → Typecast 재검토 (단 그러면 영어 채널은 다른 엔진을 써야 합니다)

### ② [Antigravity] R6 반송분 처리 (병렬)

`ROUND6_반송.md` 를 넘기세요. ①과 동시에 진행 가능합니다.
치명 3건(KeyError 즉사 / 설정 패널 미개방 / 씬별 모델 재검증 불가) + 중대 4건입니다.

### ③ [사용자] 영어 채널 2개 개설 (30분) — ①과 병렬 가능

- YouTube: 새 채널 생성 → `K-Destiny Global` → 핸들 `@kdestinyglobal`
- TikTok: 새 계정 → `K-Destiny 🔮 Korean Saju` → 사용자명 `kdestiny.global`
- 프로필 이미지는 **한국어 채널과 같은 엠블럼**을 쓰세요 (브랜드 일관성)
- 배너는 태그라인만 영어로 교체

> 신규 채널은 **콘텐츠가 준비된 뒤에 개설**해도 됩니다. 빈 채널을 오래 두면 좋지 않으니,
> 첫 영상 업로드 직전에 만드는 것도 방법입니다.

### ④ [내가] Voice ID 받은 뒤

- `casting.json` 작성 (한/영 보이스 ID 매핑)
- `tts.py` + `assemble.py` 다국어 조립 **Phase 4 지시서** 작성
- `make_jobs.py` 다국어 job 생성 **Phase 5 지시서** 작성

---

## 출처

- ElevenLabs 요금제 (사용자 제공 스크린샷, 2026-07-26 · 한국어 UI) — **이게 기준입니다**
- [ElevenLabs Pricing 페이지](https://elevenlabs.io/pricing)
- 이전 문서: `CHANNEL_SETUP_KDESTINY.md` (§0 단일채널 전제는 이 문서로 대체), `VOICE_CASTING.md` (캐스팅 시트는 유효)
