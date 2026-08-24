# K-Destiny 보이스 설계 — AI 성우 캐스팅 + TTS 파이프라인

**작성:** 개발총괄(Opus5) · 2026-07-26
**결정:** 본인 목소리 미사용 → **마스터 10인 각각 다른 목소리 + 전용 나레이터**
**핵심:** 이 방향은 더 강할 수 있습니다. 단, **한 가지 조건**을 지켜야 합니다.

---

## 1. 먼저 — 정책 리스크를 다시 계산했습니다

지난 보고서에서 "본인 목소리"를 권했는데, **그건 수단이었지 목적이 아니었습니다.** 다시 정확히 짚겠습니다.

YouTube가 1월에 채널 16개를 종료한 사유는 "AI 목소리를 썼다"가 아니라 —

> "AI가 제작의 모든 단계(대본·보이스오버·비주얼·**발행**)를 처리하고 사람의 편집적 개입이 **전혀** 없었다"

**즉 판정선은 "사람의 편집 레이어가 어디엔가 존재하는가"입니다.** 목소리는 그 레이어를 넣는 가장 쉬운 방법이었을 뿐입니다.

### 그래서 우리는 이렇게 방어합니다

| 방어 근거 | 우리의 상태 | 강도 |
|---|---|---|
| **원본 데이터** | 사주 해석이 제품의 실제 계산 엔진(`lib/saju.ts` 만세력 + `SajuContentDictionary`)에서 나옴. 남의 콘텐츠 스크랩이 아님 | ★★★ |
| **창작 세계관** | 10인 마스터 페르소나 + 전문분야 + **보이스 캐스팅** = 명백한 창작 설계 | ★★★ |
| **영상마다 실질적 차이** | 분기형 포맷 = 매 영상 다른 해석 3갈래 | ★★☆ |
| **사람의 편집 개입** | ⚠️ **지금 여기가 비어 있습니다** | — |

**결론: 목소리 대신 "대본 검수 + 업로드 전 검수"를 사람이 하면 됩니다.**

사실 사용자님 계획에 **이미 있습니다** — "저녁에 완성본 검수 → 업로드·예약". 그걸 **명시적 공정으로 만들고 기록만 남기면** 됩니다.

### 절대 하지 말 것 (이것 하나만)

> ❌ **업로드 자동화 금지.** `run_batch.py` 가 YouTube/TikTok API로 자동 업로드하는 기능은 **절대 만들지 마세요.**
> 생성·조립까지는 무인, **발행은 반드시 사람.** 이 한 줄이 채널 생존을 가릅니다.
> (종료된 채널들의 공통점이 정확히 "publishing까지 자동"이었습니다.)

그리고 **보이스 캐스팅 자체가 방어 자산이 됩니다.** 애니메이션 스튜디오가 성우를 캐스팅하는 것과 같은 구조입니다 — 아래 캐스팅 시트를 `automation/VOICE_CASTING.md` 로 레포에 남겨두면 "창작 설계의 증거"가 됩니다.

---

## 2. TTS 플랫폼 선정

### 비교

| 플랫폼 | 한국어 품질 | 캐릭터 보이스 | 상업권 | API | 월 비용 | 판정 |
|---|---|---|---|---|---|---|
| **ElevenLabs** | 상 (다국어 v2) | **Voice Design — 텍스트로 보이스 생성 후 ID 고정** ★ | Starter($5)부터 | ✅ | $5~22 | **1순위** |
| **Gemini-TTS** | 상 (GA 언어) | 32 프리셋 + **자연어 스타일 지시** | Google Cloud 전 플랜 허용 | ✅ | 사실상 무시 가능 | **2순위 / 병행** |
| **Typecast** | **최상 (한국어 특화)** | 한국어 보이스 50+ · 감정연기 | 유료 플랜 | ✅ | ~$9~ | 한국어 최우선이면 |
| Azure / Google Cloud 표준 | 중 (한국어 4~5종) | 부족 | 전 플랜 허용 | ✅ | 저렴 | 캐릭터 부적합 |
| 무료 티어(ElevenLabs 등) | — | — | ❌ **상업 불가** | — | — | **쓰면 안 됨** |

### 권장: ElevenLabs Creator ($22/월) 주력 + Gemini-TTS 병행

**왜 ElevenLabs인가 —** 캐릭터 유니버스에서 가장 중요한 건 **목소리의 동일성**입니다. 3개월 뒤에도 카르마가 같은 목소리여야 캐릭터가 성립합니다. ElevenLabs의 **Voice Design**은 텍스트 설명으로 보이스를 만들고 **영구 Voice ID로 저장**합니다. 이게 유일하게 동일성을 보장합니다.

**왜 Gemini-TTS도 함께 —** 자연어 스타일 지시(`"Say this in a low, warning tone"`)와 `[whispering]` `[sigh]` 같은 마크업 태그가 있어 **연기 디렉션이 세밀**합니다. 32개 프리셋 보이스(Kore, Charon, Puck, Callirrhoe 등)를 마스터에 고정 배정하면 동일성도 유지됩니다. Google Cloud 경유라 **상업 이용이 전 플랜 허용**이고 비용이 사실상 0에 수렴합니다.

> **주의:** 사용자님의 Google AI **Ultra 구독은 Flow/Gemini 앱용**입니다. Cloud TTS API는 **별도 과금**(Google Cloud 프로젝트)입니다. 다만 우리 사용량이 워낙 작아 월 1달러도 안 나옵니다.

### 실제 비용 계산

한국어 발화 ≈ 초당 5자 → 영상 1편 VO 약 20초 = **약 100자**

| 항목 | 계산 | 결과 |
|---|---|---|
| 월 60편 | 60 × 100자 | 6,000자 |
| 재녹음 3배 여유 | × 3 | **18,000자/월** |
| ElevenLabs Starter | 30,000 크레딧 제공 | ✅ **$5로도 충분** |
| ElevenLabs Creator | 100,000 크레딧 | ✅ $22, 여유 5배 + Voice Design 전체 기능 |

**→ 처음엔 Starter $5로 시작하고, Voice Design을 본격적으로 쓸 때 Creator로 올리세요.** 비용은 전혀 병목이 아닙니다.

---

## 3. ★ 보이스 캐스팅 시트 — 마스터 10인 + 나레이터

실제 마스터 이미지를 전부 확인하고 외형·세계관에 맞춰 캐스팅했습니다.

### 3.0 나레이터 (채널의 목소리)

모든 영상의 **후크와 CTA**를 담당합니다. 마스터 중 누구도 아닌 **제3의 목소리** — 이게 채널의 정체성이 됩니다.

| 항목 | 사양 |
|---|---|
| **성별/연령** | 여성 · 30대 초반 |
| **음색** | 중저음, 매끄럽고 살짝 허스키. 차갑지 않고 "비밀을 알려주는 친구" 톤 |
| **속도** | 보통보다 **약간 느리게** (0.92×). 후크는 또박또박, CTA는 부드럽게 |
| **연기 방향** | 단정 짓지 않고 **초대한다.** 점쟁이가 아니라 안내자 |
| **금지** | 과장된 신비주의, 뉴스 앵커 톤, 광고 성우 톤 |
| **샘플 대사** | "태어난 달, 지금 고르세요." / "네 사주는 프로필 링크에서 무료." |

```
[ElevenLabs Voice Design 프롬프트]
A Korean woman in her early thirties with a warm mid-low voice, slightly husky,
speaking calmly and intimately as if sharing a secret with a close friend.
Measured pace, gentle authority, never theatrical. Clear articulation.

[Gemini-TTS] 보이스: Kore
스타일 지시: "Speak in a calm, warm mid-low voice, slightly husky,
              slower than normal, like confiding a secret to a close friend.
              Do not sound theatrical or like an announcer."
```

---

### 3.1 마스터 10인

> 각 마스터는 **자기 전문분야 영상에서만** 말합니다. 그래야 캐릭터가 각인됩니다.

#### 🖤 Karma — Wealth Energy · 재물·경고

고딕 흑드레스, 달빛 폐허, 20대 후반 여성. **채널의 시그니처 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 낮고 서늘한 여성 알토. 숨소리가 살짝 섞임 |
| 속도 | 느림 (0.88×). 문장 사이 여백을 길게 |
| 감정 | 경고하되 위협하지 않음. **연민이 깔린 단호함** |
| 시그니처 | 문장 끝을 내려서 마무리. 절대 올리지 않음 |
| 샘플 | "그때 정한 것이, 오래 굳어요." |

```
[EL] A Korean woman in her late twenties, low cool alto with breathy edges,
speaking slowly with long pauses, delivering a serious warning with underlying
compassion. Falling intonation at sentence ends. Gothic, composed, never harsh.
[Gemini] 보이스: Callirrhoe · "Low, cool, breathy. Very slow with long pauses.
A grave warning delivered with compassion. Falling tone at the end of each sentence."
```

#### 💜 Hana — Calm Water · 관계·치유

사이버펑크 네온, 트윈 브레이드, 20대 초반 여성. **가장 접근하기 쉬운 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 밝고 맑은 여성 소프라노. 다만 들뜨지 않음 |
| 속도 | 보통 (1.0×) |
| 감정 | 다정하고 편안함. **위로하는 친구** |
| 시그니처 | 살짝 웃음기 섞인 어미 |
| 샘플 | "괜찮아요. 지금 흐르는 중이에요." |

```
[EL] A Korean woman in her early twenties, bright clear voice with a gentle smile
in it, warm and reassuring like a close friend comforting you. Natural pace,
soft endings, never bubbly or childish.
[Gemini] 보이스: Leda · "Bright, clear, with a gentle smile. Warm and reassuring.
Natural pace. Soft sentence endings. Not bubbly."
```

#### ⚔️ Ian — Iron Will · 결단·커리어

전통 무관 복장, 갓, 30대 남성. **가장 신뢰감 있는 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 단단한 남성 바리톤. 울림이 있고 절제됨 |
| 속도 | 약간 느림 (0.95×) |
| 감정 | 흔들림 없음. **명령이 아니라 확신** |
| 시그니처 | 짧은 문장, 군더더기 없음 |
| 샘플 | "미루면 기회가 아니라 부담이 됩니다." |

```
[EL] A Korean man in his thirties, firm resonant baritone, disciplined and
restrained, speaking with quiet certainty. Short declarative sentences,
slightly slower than normal. Never aggressive, never salesy.
[Gemini] 보이스: Charon · "Firm resonant baritone, disciplined and restrained.
Quiet certainty. Short declarative sentences. Slightly slow."
```

#### ⚡ Jay — Wind Chaser · 변화·이동

은발, 네온 스트리트, 20대 남성. **가장 젊고 빠른 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 가볍고 날카로운 남성 테너 |
| 속도 | **빠름 (1.12×)** — 유일하게 빠른 마스터 |
| 감정 | 들뜨고 자극적. **"지금 움직여"** |
| 시그니처 | 짧게 끊어 치기, 어미 살짝 올림 |
| 샘플 | "안 움직이면? 흐름이 먼저 지나가요." |

```
[EL] A Korean man in his early twenties, light sharp tenor, energetic and
quick-paced, urging action with excitement. Clipped delivery, slight rising
intonation. Street-smart, confident, never obnoxious.
[Gemini] 보이스: Puck · "Light sharp tenor, fast and energetic. Clipped,
urgent delivery urging immediate action. Slight rising intonation."
```

#### 🔥 Jin — Golden Flame · 열정·창작

정장, 도시 야경, 30대 후반 남성. **가장 세련된 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 부드럽고 매끄러운 남성 바리톤. 도시적 |
| 속도 | 보통 (1.0×) |
| 감정 | 자신감 있고 여유로움. **성공한 선배** |
| 시그니처 | 여유 있는 호흡, 미세한 미소 |
| 샘플 | "당신 안에 이미 불이 있어요. 연료가 없을 뿐." |

```
[EL] A Korean man in his late thirties, smooth polished baritone, urbane and
self-assured, speaking with relaxed confidence like a successful mentor.
Even pace, slight warmth, subtle smile in the voice. Not corporate, not smug.
[Gemini] 보이스: Orus · "Smooth polished baritone, urbane and self-assured.
Relaxed confident pace with subtle warmth."
```

#### 🤍 Muwi — Void Flow · 비움·지혜

백발, 흰 도복, 염주. 젊은 얼굴 + 백발 = **나이를 초월한 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 아주 부드럽고 낮은 남성 목소리. 거의 속삭임 |
| 속도 | **가장 느림 (0.82×)** |
| 감정 | 평온. 설득하지 않음. **그냥 놓아둠** |
| 시그니처 | 문장 사이 긴 침묵, 숨소리가 들림 |
| 샘플 | "붙잡을수록… 멀어집니다." |
| 활용 | **오행 무드/ASMR 포맷 전담** |

```
[EL] A Korean man of indeterminate age, very soft low voice, almost a whisper,
speaking extremely slowly with long silences between phrases. Serene, detached,
never persuading. Audible gentle breath. Meditative.
[Gemini] 보이스: Enceladus · "[whispering] Very soft and low, extremely slow,
with long pauses. Serene and detached. Meditative, never persuasive."
```

#### 🌙 Rin — Lunar Echo · 감정·직감

금관·한복, 달빛 궁궐, 여성. **가장 고전적이고 신비로운 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 낮고 우아한 여성 메조. 고전적 발성 |
| 속도 | 느림 (0.9×) |
| 감정 | 신비롭고 서정적. **꿈 얘기하듯** |
| 시그니처 | 어미를 길게 늘임, 미세한 울림 |
| 샘플 | "마음이 먼저 알고 있었을 거예요." |

```
[EL] A Korean woman with a low elegant mezzo voice, classical and refined,
speaking slowly and lyrically as if recounting a dream. Elongated sentence
endings, subtle resonance. Mysterious but never spooky.
[Gemini] 보이스: Aoede · "Low elegant mezzo, classical and refined. Slow and
lyrical, like recounting a dream. Elongated endings."
```

#### 🐉 Ryu — Dragon Path · 대운·흐름

가죽 재킷, 네온 뒷골목, 강렬한 눈. **가장 거친 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 거칠고 낮은 남성 목소리. 약간 쉰 듯 |
| 속도 | 보통 (1.0×) |
| 감정 | 직설적, 돌려 말하지 않음. **팩트 폭격** |
| 시그니처 | 툭 던지는 어미, 짧은 침묵 후 결정타 |
| 샘플 | "10년 주기가 지금 바뀌는 중입니다. 버티는 게 답이 아니에요." |

```
[EL] A Korean man in his early thirties, rough low voice with a slight rasp,
blunt and direct, speaking hard truths without softening them. Natural pace,
throwaway sentence endings, a beat of silence before the key line.
[Gemini] 보이스: Fenrir · "Rough low voice with a slight rasp. Blunt and
direct, delivering hard truths. Pause before the key line."
```

#### 🔭 Seoa — Star Whisper · 인연·타이밍

안경, 서재, 30대 여성. **가장 지적이고 설득력 있는 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 또렷하고 차분한 여성 메조. 발음이 정확함 |
| 속도 | 보통 (1.0×) |
| 감정 | 분석적이고 침착함. **상담사·연구자** |
| 시그니처 | 논리적 연결어("그래서", "그러니까") 살짝 강조 |
| 샘플 | "인연은 우연이 아니라 타이밍입니다. 계산이 되거든요." |
| 활용 | **"사주 vs 별자리" 설명 포맷 전담** |

```
[EL] A Korean woman in her thirties, clear composed mezzo with precise
articulation, analytical and calm like a thoughtful counselor or researcher.
Even pace, gentle emphasis on logical connectors. Intelligent, warm, credible.
[Gemini] 보이스: Despina · "Clear composed mezzo, precise articulation.
Analytical and calm, like a thoughtful counselor. Gentle emphasis on connectors."
```

#### 👑 Yura — Earth Soul · 기반·안정

금발 웨이브, 진주, 화려한 실내, 30~40대 여성. **가장 품격 있는 캐릭터.**

| 항목 | 사양 |
|---|---|
| 음색 | 풍부하고 따뜻한 여성 알토. 여유 있는 울림 |
| 속도 | 약간 느림 (0.93×) |
| 감정 | 안정적이고 너그러움. **든든한 어른** |
| 시그니처 | 낮게 시작해 문장 중반에 살짝 힘 |
| 샘플 | "기반이 없으면 아무리 벌어도 새어나가요." |

```
[EL] A Korean woman in her late thirties, rich warm alto with relaxed resonance,
speaking with grounded generosity like a reassuring older figure. Slightly slow,
starting low and gaining warmth mid-sentence. Dignified, never patronizing.
[Gemini] 보이스: Autonoe · "Rich warm alto with relaxed resonance. Grounded
and generous, like a reassuring elder. Slightly slow, dignified."
```

---

### 3.2 캐스팅 요약표 (복붙용)

| 마스터 | 성별/연령 | 음색 | 속도 | Gemini 보이스 | 담당 포맷 |
|---|---|---|---|---|---|
| **나레이터** | 여 30대 | 중저음 허스키 | 0.92× | Kore | **전 영상 후크·CTA** |
| Karma | 여 20후 | 낮은 서늘한 알토 | 0.88× | Callirrhoe | 재물·경고 |
| Hana | 여 20초 | 밝고 맑은 소프라노 | 1.0× | Leda | 관계·치유 |
| Ian | 남 30대 | 단단한 바리톤 | 0.95× | Charon | 결단·커리어 |
| Jay | 남 20초 | 날카로운 테너 | **1.12×** | Puck | 변화·이동 |
| Jin | 남 30후 | 매끄러운 바리톤 | 1.0× | Orus | 열정·창작 |
| Muwi | 남 초월 | 속삭이는 저음 | **0.82×** | Enceladus | 오행 무드·ASMR |
| Rin | 여 미상 | 우아한 메조 | 0.9× | Aoede | 감정·직감 |
| Ryu | 남 30초 | 거친 저음 | 1.0× | Fenrir | 대운·흐름 |
| Seoa | 여 30대 | 또렷한 메조 | 1.0× | Despina | 사주 vs 별자리 |
| Yura | 여 30후 | 풍부한 알토 | 0.93× | Autonoe | 기반·안정 |

> **속도 대비가 캐릭터를 만듭니다.** Jay(1.12×)와 Muwi(0.82×)가 양 극단이고, 나머지가 그 사이에 분포합니다. 목소리만 듣고도 누군지 알게 되는 게 목표입니다.

---

## 4. ★ 제작 규칙 — 립싱크 함정 (이거 놓치면 전부 망합니다)

**가장 위험한 실수:** Veo3로 마스터 초상을 애니메이션하면 **입이 움직입니다.** 그런데 우리 목소리는 외부 TTS라 **입 모양과 전혀 안 맞습니다.** 시청자는 이걸 0.5초 만에 알아채고, "싸구려 AI 영상"으로 낙인찍습니다.

### 해결 — Veo 프롬프트에 반드시 넣을 것

```
mouth closed, lips still, does not speak, no dialogue, no lip movement,
no talking, ambient sound only, no speech
```

### 대신 이렇게 연출합니다

| 연출 | 프롬프트 예시 |
|---|---|
| **시선** | `slowly raises her eyes to look directly into the camera, lips closed` |
| **미세 동작** | `barely perceptible turn of the head, a slow blink, breathing` |
| **손짓** | `hand slowly moves through candlelight, face partly out of frame` |
| **환경 반응** | `embers drift past her still face, wind moves her hair` |
| **컷어웨이** | `close-up of hands over a glowing saju chart, no face in frame` |
| **뒷모습·옆모습** | `three-quarter back view, she turns her head slightly` |

**원칙: 마스터는 "말하지 않고 존재한다."** 목소리는 그 위에 얹히는 내레이션입니다. 이게 오히려 더 신비롭고, 애초에 사주 콘텐츠의 톤과 맞습니다.

### Veo 생성 오디오 처리

Veo 3는 **자체 오디오(대사 포함)를 생성**합니다. 그대로 두면 TTS와 겹칩니다.

- 프롬프트에 `no speech, no dialogue, ambient only` 명시
- 그래도 남는 소리는 **`assemble.py`에서 볼륨 0.12로 낮춰** 앰비언스로만 활용 (완전 제거하면 영상이 죽습니다)

---

## 5. 파이프라인 통합

### 5.1 신설: `automation/tts.py`

```python
"""
tts.py — 마스터별 보이스로 VO 생성
casting.json 에서 마스터→voice_id·스타일을 읽어 대사를 음성으로 만든다.
결과는 out/<video_id>/vo_<n>.wav 로 저장, manifest에 기록.
"""
```

- `automation/casting.json` — 위 캐스팅 표를 그대로 JSON으로 (voice_id·speed·style prompt)
- **API 키는 환경변수로만** (`ELEVENLABS_API_KEY` / `GOOGLE_APPLICATION_CREDENTIALS`) — 절대 커밋 금지
- 생성 결과를 **캐시**(대사 해시 기준)해서 재실행 시 같은 대사를 다시 만들지 않게 → 크레딧 절약
- `casting.json` 은 **커밋합니다** (창작 설계 증거 + 재현성). API 키만 빼고.

### 5.2 job JSON 스키마 확장

```json
{
  "video_id": "20260801_A_birthmonth",
  "narrator": "narrator",
  "scenes": [
    {
      "n": 1,
      "speaker": "narrator",
      "vo_text": "태어난 달, 지금 고르세요.",
      "prompt": "... mouth closed, does not speak, no dialogue, ambient only ...",
      "ref_image": ".../master_karma_calm.webp.jpg",
      "extend": 0,
      "subs": [{"t": 0.0, "text": "Pick your birth month. Now."}]
    },
    {
      "n": 2,
      "speaker": "karma",
      "vo_text": "1월에서 4월. 당신은 지금 뭔가를 미루고 있어요.",
      "...": "..."
    }
  ]
}
```

**핵심 필드:** `speaker`(캐스팅 키) + `vo_text`(그 씬의 대사). 자막(`subs`)은 **영어**, VO는 **한국어**.

### 5.3 `assemble.py` — 3트랙 믹스로 확장

현재는 [원본오디오 + BGM] 2트랙입니다. **VO를 추가해 3트랙**으로:

```
[0:a] Veo 생성 앰비언스   volume=0.12
[1:a] VO (마스터/나레이터) volume=1.0    ← 메인
[2:a] BGM                 volume=0.10   ← VO가 있으면 0.18 → 0.10으로 낮춤
→ amix=inputs=3:duration=first → loudnorm=I=-14:TP=-1.5:LRA=11
```

**중요한 설계 변경 — 영상 길이를 VO에 맞춥니다.**

지금은 클립 길이가 영상 길이를 정하는데, VO가 들어가면 **말이 끝나기 전에 화면이 넘어가는** 사고가 납니다.

- 씬별로 `ffprobe`로 VO 길이를 재고, **클립이 VO보다 짧으면 마지막 프레임을 홀드**(`tpad=stop_mode=clone`)
- 클립이 VO보다 길면 그대로 두고 VO 뒤에 무음 패딩(`apad`)
- 이 로직을 **Phase 4에 포함**시킵니다

### 5.4 자막 타이밍 — VO 기준으로

VO 오디오 길이를 알면 **자막 타이밍을 정확히 맞출 수 있습니다.** 지금처럼 클립 길이로 추정할 필요가 없어집니다. Phase 4 타임드 자막(`subs:[{t,text}]`)과 자연스럽게 합쳐집니다.

---

## 6. 보너스 — 한/영 2배 콘텐츠 (거의 공짜)

VO를 TTS로 만드는 순간 **같은 영상의 영어 버전이 사실상 무료**가 됩니다.

```
비주얼 1세트 (크레딧 소모) 
   ├─ 한국어 VO + 영어 자막  → 한국·일본 타깃 (21:00 KST)
   └─ 영어 VO  + 영어 자막  → 미국·영국 타깃 (다음날 08:00 KST)
```

- **추가 크레딧 0** — Veo 생성은 그대로, TTS 비용만 2배(그래도 월 몇 달러)
- 마스터 목소리는 **같은 캐릭터의 영어 보이스**로 캐스팅 (ElevenLabs는 같은 Voice ID로 다국어 가능)
- 하루 2편 목표가 **비주얼 1세트로 달성**됩니다

> 단, 두 버전을 **같은 채널에 올리지 마세요.** 중복으로 보입니다. 한국어판=TikTok(전랭뷰, 한국 비중↑), 영어판=YouTube 또는 그 반대로 분리하거나, 업로드 시간을 크게 벌리세요.

---

## 7. 지금 하실 것 — 순서대로

### 오늘/내일 (Phase 0과 함께)

1. **ElevenLabs Starter($5) 가입** → Voice Design에서 §3의 프롬프트로 **나레이터 1개 + 카르마·세오아 2개만 먼저** 생성해보기
   → 한국어 발음이 견딜 만한지 **본인 귀로 확인**이 먼저입니다. 안 좋으면 Typecast로 갈아탑니다
2. 마음에 들면 나머지 8개 생성 → **Voice ID를 메모**

### Antigravity 지시 (Phase 0 결과 나온 뒤)

3. `automation/casting.json` + `automation/tts.py` 신설
4. Phase 4에 **3트랙 믹스 + VO 길이 기준 타이밍** 합치기
5. Phase 5 `make_jobs.py` 를 **"초안 생성 → 사람 검수"** 구조로 (업로드 자동화는 절대 금지)

### 영구 원칙

6. **업로드는 항상 사람이.** 자동 업로드 기능을 만들지 마세요
7. TikTok **AIGC 라벨 항상 켜기** (합성 얼굴 + AI 배경 + **AI 음성** 3중 해당)
8. `casting.json`과 이 문서를 레포에 커밋 — 창작 설계의 증거로 남습니다

---

## 출처

- [TTS Licensing Matrix 2026 — 제공사별 상업 이용권](https://freetts.org/tts-licensing-commercial-use-matrix)
- [ElevenLabs Pricing 2026 — 플랜·크레딧·상업권 (BIGVU)](https://bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/)
- [Gemini-TTS 공식 문서 — 32 보이스·스타일 지시·다화자 (Google Cloud)](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)
- [한국어 TTS API 비교 2026 — 한국어 보이스 수·최적화 (Humelo)](https://humelo.com/tts-api)
- [Typecast — 감정 표현 TTS](https://typecast.ai/text-to-speech/)
- [YouTube AI Slop Crackdown 2026 — 채널 종료 사유 (OutlierKit)](https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/)
- 캐스팅 근거: 제품 `lib/masters.ts` + `public/images/master_*_calm` 실제 이미지 전수 확인
