# 보이스 슬롯 전략 + 나머지 8인 프롬프트

**작성:** 개발총괄(Opus5) · 2026-07-27
**결론:** **지금 11명을 다 만들지 마세요.** 4~5명으로 테스트하고, 성과가 나면 확장합니다.

---

## 1. 플랜별 보이스 슬롯 (공식 문서 확인)

| 플랜 | 월 가격 | **보이스 슬롯** | 월 크레딧 | 상업 이용 |
|---|---|---|---|---|
| **Free** | $0 | **3** ← 지금 여기 | 10,000 | ❌ **불가** |
| **Starter** | $6 | **10** | 30,000 | ✅ |
| **Creator** | $22 (첫 달 $11) | **30** | 121,000 | ✅ |
| Pro | $99 | 160 | 600,000 | ✅ |

슬롯은 **상위 플랜으로 올려야만** 늘어납니다. 다만 **보이스를 삭제하면 슬롯이 회수**되므로,
안 쓰는 캐릭터를 지웠다 다시 만드는 것도 가능합니다(복구는 안 되니 Voice ID는 꼭 백업).

### ⚠️ 지금 만든 3개는 실제 영상에 쓸 수 없습니다

**Free 플랜은 상업 이용이 금지**되고 저작자 표시가 필요합니다.
지금까지는 **품질 검증**이었으니 문제없지만, **실제 업로드할 영상을 만드는 순간 유료 플랜이 필요**합니다.
(같은 Voice ID를 유료 전환 후에도 그대로 쓸 수 있으니 다시 만들 필요는 없습니다.)

---

## 2. 11명을 지금 다 만들면 안 되는 이유

**아직 어떤 포맷이 먹히는지 모릅니다.** 시장조사에서 정한 계획이 이거였습니다.

> 6종 60편에 올인하지 말고 **3종 9편으로 2주 테스트 → 승자 포맷 1개에 집중**

포맷별로 필요한 마스터 수를 보면:

| 포맷 | 필요 마스터 | 지금 가능? |
|---|---|---|
| **A. 분기형** ("태어난 달을 고르세요") | 나레이터 + **갈래별 2~3명** | 🟡 1명만 더 있으면 |
| **B. 일간 리비일** ("당신의 일간이 ○○라면") | 나레이터 + **Seoa**(설명) | ✅ **지금 가능** |
| C. 마스터 소개 (Meet the Master) | **10명 전원** | ❌ |

**A와 B는 3~4명으로 됩니다. 10명이 필요한 건 C뿐입니다.**

그런데 C(마스터 소개)는 "10명 = 10편 즉시 재고"라는 장점이 있지만,
**포맷이 먹히는지도 모르는 상태에서 10명을 만드는 건 순서가 뒤바뀝니다.**
C가 승자로 판명되면 그때 만들어도 2주면 충분합니다.

> 그리고 **루트메이커를 다음 프로젝트로 계획**하고 계시니, 여기서 과투자하지 않는 게 맞습니다.
> 보이스는 언제든 추가할 수 있고, 만들어둔 Voice ID는 사라지지 않습니다.

---

## 3. ★ 권장 — 지금은 Starter $6 + 마스터 4명

### 3-1. 지금 만들 4명 (나레이터 포함 4슬롯 / 10슬롯 중)

| # | 캐릭터 | 상태 | 역할 |
|---|---|---|---|
| 1 | **Narrator** | ✅ 완료 (202 Hz) | 모든 영상의 후크·CTA |
| 2 | **Karma** | ✅ 완료 (182 Hz) | 경고·재물 — 시그니처 |
| 3 | **Seoa** | ✅ 완료 (257 Hz) | 설명·사주vs별자리 |
| 4 | **Ryu** ← **1명만 추가** | 신규 | 대운·흐름 — **남성** |

**왜 Ryu인가:** 현재 3명이 전부 여성입니다. **남성 1명이 들어가면 대비가 극적으로 커집니다.**
Ryu는 "거칠고 직설적, 팩트 폭격"이라 Karma(서늘한 경고)·Seoa(차분한 설명)와 성격도 겹치지 않습니다.

이 4명이면 **분기형 3갈래**(Karma / Seoa / Ryu)에 나레이터 후크까지 완전히 커버됩니다.

### 3-2. 확장 시점

```
[지금]      Starter $6   · 4명   · 9편 2주 테스트          예상 사용 11,600자 / 30,000
[성과 확인] Creator $22  · 11명  · 하루 2편 한/영 본격 가동  예상 사용 25,800자 / 121,000
```

성과가 안 나오면 Starter에서 멈추면 됩니다. **초기 투자 $6입니다.**

> **Starter 10슬롯으로는 11명이 안 됩니다**(1개 부족). 11명 전원이 필요해지는 시점 =
> 포맷 C 확정 시점이고, 그때는 어차피 크레딧 때문에도 Creator로 올려야 합니다.

---

## 4. 나머지 8인 프롬프트 (전부 준비 — 필요할 때 쓰세요)

**1차 실패에서 얻은 3가지 원칙을 전부 반영했습니다.**

1. `unmistakably male/female` 을 **문장 맨 앞**에 (성별이 가장 강하게 잡힘)
2. 저음 형용사(`low`, `deep`, `dark`) **남발 금지** — 나레이터가 128 Hz로 나왔던 원인
3. **캐스트 내 상대 위치**로 표현 (`the lowest voice in the cast` 등)

---

### 🐉 Ryu — 대운·흐름 · **지금 만드세요**

목표 F0 **115–130 Hz** · Speed **1.00** · Stability **Natural**

```
An unmistakably male Korean voice, early thirties, with a rough, slightly
raspy texture — gravelly but never growling. He speaks bluntly and directly,
delivering hard truths without softening them, like a friend who tells you
what nobody else will. Mid-range male pitch, grounded and street-worn.
Natural conversational pace, throwaway sentence endings, with a beat of
silence before the key line. Confident, unpolished, never theatrical.
```

**테스트 텍스트**
```
10년 주기가 지금 바뀌는 중입니다 — 버티는 게 답이 아니에요.
```

---

### ⚔️ Ian — 결단·커리어

목표 F0 **110–125 Hz** · Speed **0.95** · Stability **Robust**

```
An unmistakably male Korean voice, thirties, a firm resonant baritone with
clean, disciplined delivery. He speaks with quiet certainty — never raising
his voice, never rushing. Short declarative sentences. Steady, controlled,
almost military in composure, but warm underneath. Slightly slower than
conversational. No aggression, no salesmanship.
```
```
미루면 기회가 아니라 부담이 됩니다.
```

---

### 🤍 Muwi — 비움·지혜 (오행 ASMR 전담)

목표 F0 **95–110 Hz** (캐스트 최저) · Speed **0.75** · Stability **Robust**

```
An unmistakably male Korean voice of indeterminate age — the lowest and
softest voice in the entire cast. He speaks barely above a whisper, extremely
slowly, with long silences between phrases. Serene and detached, never
persuading, never urgent. Audible gentle breath between words. Meditative,
almost hypnotic. Think of someone speaking in an empty temple at night.
```
```
[whispers] 붙잡을수록… 멀어집니다.
```
> Muwi만 오디오 태그 `[whispers]` 를 씁니다. ASMR 포맷 전담이라 이게 핵심입니다.

---

### 🔥 Jin — 열정·창작

목표 F0 **125–140 Hz** · Speed **1.00** · Stability **Natural**

```
An unmistakably male Korean voice, late thirties, a smooth and polished
baritone — urbane, self-assured, effortless. He speaks with relaxed
confidence, like a successful mentor who has nothing to prove. Even pace,
subtle warmth, the faintest smile audible in his voice. Brighter and more
refined than a gravelly voice, but clearly masculine. Not corporate,
not smug, never a salesman.
```
```
당신 안에 이미 불이 있어요. 연료가 없을 뿐입니다.
```

---

### ⚡ Jay — 변화·이동

목표 F0 **145–165 Hz** (남성 중 최고) · Speed **1.15** · Stability **Creative**

```
An unmistakably male Korean voice, early twenties — the highest and lightest
male voice in the cast, a bright sharp tenor. He speaks fast and energetically,
urging immediate action with genuine excitement. Clipped delivery, slight
rising intonation at phrase ends. Youthful, street-smart, quick-witted.
Never obnoxious, never shouting — just fast and alive.
```
```
안 움직이면? 흐름이 먼저 지나가요.
```

---

### 👑 Yura — 기반·안정

목표 F0 **185–195 Hz** · Speed **0.93** · Stability **Natural**

```
An unmistakably female Korean voice, late thirties, a rich and warm alto with
relaxed resonance. She speaks with grounded generosity, like a reassuring
older figure who has seen everything and is not worried. Slightly slower than
conversational, starting low and gaining warmth mid-sentence. Dignified and
composed. Never patronizing, never cold.
```
```
기반이 없으면 아무리 벌어도 새어나가요.
```

---

### 🌙 Rin — 감정·직감

목표 F0 **195–210 Hz** · Speed **0.90** · Stability **Natural**

```
An unmistakably female Korean voice, an elegant and refined mezzo with a
classical, almost theatrical poise. She speaks slowly and lyrically, as if
recounting a dream she just woke from. Elongated sentence endings, subtle
resonance. Mysterious and poetic — but never spooky, never breathy.
Clear feminine pitch, warmer and rounder than a bright soprano.
```
```
마음이 먼저 알고 있었을 거예요 —
```

---

### 💜 Hana — 관계·치유

목표 F0 **265–290 Hz** (캐스트 최고) · Speed **1.00** · Stability **Creative**

```
An unmistakably female Korean voice, early twenties — the brightest and
highest voice in the entire cast, youthful and crystalline. She speaks warmly
and reassuringly, with a gentle smile audible in every phrase, like a close
friend comforting you. Natural conversational pace, soft rounded sentence
endings. Bright and clear, never bubbly, never childish, never shrill.
```
```
괜찮아요. 지금 흐르는 중이에요.
```

> **Seoa가 257 Hz로 예상보다 높게 나왔기 때문에** Hana는 더 위로 배치해야 합니다.
> `the brightest and highest voice in the entire cast` 문구가 그래서 들어갔습니다.

---

## 5. 최종 음높이 배치도

```
남성                                    여성
 95 ─ Muwi        (속삭임)              182 ─ Karma      ✅ 완료
110 ─ Ian         (바리톤)              190 ─ Yura
120 ─ Ryu         (거친 저음)            202 ─ Narrator   ✅ 완료
130 ─ Jin         (매끄러운 바리톤)       205 ─ Rin
155 ─ Jay         (테너)                257 ─ Seoa       ✅ 완료
                                        275 ─ Hana
```

**같은 영상에 함께 나올 조합**만 벌어져 있으면 됩니다.
분기형(3갈래)에서는 **성별을 섞어** 쓰세요 — 예: Karma(182) / Ryu(120) / Seoa(257) 조합이면
음높이가 극단적으로 벌어져 시청자가 즉시 구별합니다.

---

## 6. 지금 하실 것

### ① Starter $6 결제 (실제 영상 제작 시작 시)

- Free는 **상업 이용 불가**입니다. 테스트 영상이라도 업로드할 거면 필요합니다
- 슬롯 10개 · 크레딧 30,000 — 9편 2주 테스트에 충분합니다(예상 11,600자)

### ② Ryu 1명만 추가 생성 (§4의 첫 프롬프트)

- 모델 **v3** · Speed **1.00** · Stability **Natural**
- 한국어 테스트 문장만 뽑아서 주세요. **제가 측정해서 다른 3명과 겹치지 않는지 확인**하겠습니다
- 영어는 이미 동일성이 검증됐으니 생략해도 됩니다

### ③ Voice ID 4개를 알려주세요

```
narrator : <ID>
karma    : <ID>
seoa     : <ID>
ryu      : <ID>
```

받는 즉시 **`casting.json` + `tts.py` + Phase 4 지시서**를 쓰겠습니다.

### ④ (여전히 미확인) `1996년생` 숫자 읽기

세 라운드째 확인을 못 했습니다. **"천구백구십육년생"으로 제대로 읽는지** 한 번만 들어봐 주세요.
숫자를 `1-9-9-6` 처럼 자릿수로 읽으면 영상 하나를 통째로 버려야 합니다.

---

## 7. 참고 — 나중에 11명이 필요해지는 시점

**포맷 C(마스터 소개)를 하기로 결정할 때**입니다. 그때는:

- Creator $22(첫 달 $11)로 업그레이드 → 슬롯 30개
- §4의 프롬프트 7개를 그대로 써서 하루면 다 만듭니다
- 크레딧도 121,000으로 늘어 한/영 하루 2편을 커버합니다

**지금 미리 할 이유가 없습니다.**

---

## 출처

- [ElevenLabs — 티어별 보이스 슬롯 수 (공식 헬프센터)](https://help.elevenlabs.io/hc/en-us/articles/24351056337937-How-many-voice-slots-do-I-get-per-tier-and-how-can-I-increase-it)
- ElevenLabs 요금제 (사용자 제공 스크린샷, 2026-07-26)
- 캐스팅 근거: `VOICE_CASTING.md`, 실측 `VOICE_QC_ROUND1~3.md`
