# ElevenLabs 1차 보이스 — 음향 분석 결과 + 재작업 지시

**분석:** 개발총괄(Opus5) · 2026-07-27
**대상:** `나래이터 test.mp3` · `karma test.mp3` · `Seoa test.mp3`
**방법:** 자기상관 F0 추적 + HPS(하모닉 곱 스펙트럼) 교차검증, 무음 구간 검출, 스펙트럼 중심

> **전제:** 저는 소리를 들을 수 없습니다. 아래는 **파형에서 측정한 객관 수치**이고,
> **한국어 발음의 자연스러움(받침·연음·`1996년생` 읽기)은 사용자님이 귀로 판단**하셔야 합니다.

---

## 1. 기술 품질 — 통과 ✅

| 항목 | 나레이터 | Karma | Seoa | 판정 |
|---|---|---|---|---|
| 샘플레이트 | 44.1 kHz 모노 | 〃 | 〃 | ✅ |
| 비트레이트 | 157 kbps | 156 | 159 | ✅ |
| 라우드니스 | −17.6 LUFS | −17.3 | −16.6 | ✅ 셋이 균일 |
| 피크 | −1.2 dB | −1.9 | −1.6 | ✅ 클리핑 없음 |
| 유성음 비율 | 58.3% | 65.7% | 64.5% | ✅ 정상 발화 |

**녹음 자체는 흠잡을 데 없습니다.** 셋의 레벨이 균일해서 믹싱도 편합니다.

---

## 2. 캐스팅 스펙 대비 — 문제 3건 ⚠️

### 측정값

| | 나레이터 | Karma | Seoa |
|---|---|---|---|
| **중앙 F0 (자기상관)** | 127.5 Hz | 162.1 Hz | 152.1 Hz |
| **중앙 F0 (HPS 교차검증)** | 129.2 Hz | 164.2 Hz | 150.7 Hz |
| F0 범위 (10–90%) | 115–199 | 142–213 | 125–220 |
| 길이 | 9.85초 | 10.03초 | 9.27초 |
| 긴 침묵(0.18초+) 횟수 | **6회** | **2회** | 3회 |
| 무음 비율 | 23.2% | **14.8%** | 22.7% |
| 스펙트럼 중심(밝기) | 1,617 Hz | 1,927 Hz | **979 Hz** |

두 방법이 3 Hz 이내로 일치했으니 **옥타브 오류가 아닌 실제 값**입니다.

---

### 【문제 1】 셋 다 여성 음역대 아래입니다

성인 여성 평상시 F0는 보통 **165–220 Hz**, 성인 남성은 **85–155 Hz** 입니다.

- **나레이터 128 Hz** — **남성 음역대 한복판**입니다. "여성 30대 중저음"으로 지정했는데 결과가 이렇다면, 들었을 때 남성이나 중성으로 들릴 가능성이 큽니다
- **Seoa 151 Hz** — 역시 남성권 경계. 스펙은 "여성 30대 또렷한 메조"(~200 Hz)였으니 **50 Hz 낮습니다**
- **Karma 163 Hz** — 여성 저음(알토) 경계. 스펙(~175 Hz)에 가장 근접. **셋 중 유일하게 의도대로**입니다

> 프롬프트에 `A Korean woman in her thirties` 라고 명시했는데도 이렇게 나온 건,
> Voice Design이 **"low", "mid-low", "alto", "composed"** 같은 수식어를 성별 지시보다 강하게 받아들였기 때문으로 보입니다.
> 제가 프롬프트에 저음 형용사를 너무 많이 넣은 탓입니다.

### 【문제 2】 Karma와 Seoa가 구별되지 않습니다 ← 가장 심각

```
나레이터 vs Karma : 34.7 Hz 차이 (4.2 반음)   → 구별됨
나레이터 vs Seoa  : 24.6 Hz 차이 (3.1 반음)   → 구별됨
Karma    vs Seoa  : 10.1 Hz 차이 (1.1 반음)   → 사실상 같은 음높이
```

**1.1 반음은 사람이 "다른 사람"으로 인식하지 못하는 수준입니다.**
카르마(재물·경고)와 세오아(인연·타이밍)는 서로 다른 영상에서 전문 분야를 나눠 맡을 캐릭터인데,
목소리가 같으면 **캐릭터 유니버스 전략의 전제가 무너집니다.**

그나마 음색은 다릅니다 — Karma 1,927 Hz vs Seoa 979 Hz. Seoa 쪽이 확연히 어둡고 먹먹합니다.
그런데 Seoa 스펙은 **"또렷하고 발음이 정확한"** 이었으니 **이것도 의도와 반대**입니다.

### 【문제 3】 Karma의 시그니처(느림 + 긴 침묵)가 전혀 구현 안 됐습니다

스펙: *"속도 0.88× — 느림. 문장 사이 여백을 길게."*

측정: **긴 침묵 2회 / 무음 비율 14.8%** — **셋 중 가장 적습니다.**
길이도 Seoa(9.27초)와 거의 같아서 사실상 같은 속도로 읽었습니다.

정확히 반대로 나왔습니다.

---

## 3. 원인 — 제 지시가 틀렸습니다

**Voice Design 설명문으로는 속도·침묵·음높이를 제어할 수 없습니다.**
그건 **음성을 만들 때(합성 시점)** 정하는 값인데, 제가 캐스팅 시트에 "속도 0.88×"라고만 적고
**어디서 그 값을 넣는지 알려드리지 않았습니다.** 제 잘못입니다.

ElevenLabs의 실제 제어 수단은 이렇습니다.

| 제어 대상 | 수단 | 범위 |
|---|---|---|
| **속도** | **Speed 슬라이더** | **0.7 ~ 1.2** (기본 1.0) |
| 표현력 | **Stability** | Creative(표현적) / Natural(중립) / Robust(일관·단조) |
| **침묵** | **텍스트의 `…` 와 `—`** (v3) 또는 `<break time="0.8s" />` (v2) | 최대 3초 |
| 감정 | 오디오 태그 `[whispers]` `[sighs]` 등 (v3) | — |

> 다행히 **캐스팅 시트의 속도값(0.82~1.15)이 ElevenLabs의 0.7~1.2 범위 안에** 전부 들어갑니다.
> 설계는 살아 있고, **적용 위치만 바꾸면** 됩니다.

---

## 4. 재작업 지시

### 4-1. 프롬프트 수정 — 성별과 음높이를 앞세우세요

저음 형용사(`low`, `mid-low`, `alto`)를 **뒤로 빼고**, 여성·밝기를 **앞에 명시**합니다.

**나레이터 (재생성 필수)**
```
An unmistakably female Korean voice, early thirties, clearly feminine and
bright in timbre with a gentle warmth. She speaks calmly and intimately,
as if sharing a secret with a close friend. Natural conversational pitch
for a woman — not deep, not breathy-dark. Clear articulation, measured pace.
```

**Seoa (재생성 필수)**
```
An unmistakably female Korean voice, thirties, clear and bright with crisp
articulation — every consonant distinct. Intelligent and composed, like a
thoughtful counselor explaining something carefully. Natural feminine pitch,
never dark or muffled. Even, unhurried delivery.
```

**Karma (유지하거나 미세 조정)** — 셋 중 유일하게 스펙에 맞았습니다. 다만 Seoa와 벌리려면 살짝 더 낮게.
```
A Korean woman in her late twenties, distinctly feminine but with a notably
low, cool alto register — the lowest voice in the cast. Cold composure with
a breathy edge, delivering a serious warning that carries hidden compassion.
Falling intonation at sentence ends.
```

> **Voice Design은 한 프롬프트에 여러 후보를 생성합니다. 첫 번째를 바로 저장하지 마시고
> 후보를 전부 들어보고 고르세요.** 이번 결과는 후보 비교 없이 저장하셨을 가능성이 큽니다.

### 4-2. 합성 설정 — 캐스팅 시트를 실제 슬라이더 값으로 변환

| 캐릭터 | **Speed** | **Stability** | 텍스트 기법 |
|---|---|---|---|
| **나레이터** | **0.92** | Natural | 마침표 위주, 후크는 짧게 끊기 |
| **Karma** | **0.85** | Natural | 문장 사이에 **`…`** 를 넣어 여백 |
| Hana | 1.00 | Creative | — |
| Ian | 0.95 | Robust | 짧은 단문 |
| Jay | **1.15** | Creative | 쉼표 최소, 붙여 읽기 |
| Jin | 1.00 | Natural | — |
| Muwi | **0.75** | Robust | `…` 다용 + `[whispers]` |
| Rin | 0.90 | Natural | 어미 뒤 `—` |
| Ryu | 1.00 | Natural | 결정타 앞에 `—` |
| **Seoa** | **1.00** | Robust | 논리 연결어 앞뒤 쉼표 |
| Yura | 0.93 | Natural | — |

**Karma 재테스트용 텍스트 (침묵을 텍스트로 만드세요)**
```
1996년생… 잠깐 멈추세요.
10월에 대한… 경고입니다.
```

**Muwi 텍스트 예시**
```
[whispers] 붙잡을수록… 멀어집니다.
```

### 4-3. 재테스트 후 저에게 다시 주세요

같은 3개를 재생성해서 주시면 **제가 같은 방식으로 측정**해 스펙에 맞았는지 확인해 드리겠습니다.

**통과 기준**
- 나레이터·Seoa 중앙 F0 **165 Hz 이상**
- **Karma ↔ Seoa 간격 4 반음 이상** (약 40 Hz)
- Karma 무음 비율 **25% 이상** (현재 14.8%)
- Karma 길이가 Seoa보다 **15% 이상 김**

---

## 5. ★ 아직 안 하신 것 — 영어 테스트

이번에 주신 건 **한국어 3개뿐**입니다. 그런데 한/영 2채널 전략의 핵심 전제가 이거였습니다.

> **같은 Voice ID로 낸 한국어와 영어가 같은 캐릭터로 들리는가**

이게 안 되면 영어 채널용 보이스 11개를 **따로 디자인**해야 합니다(비용은 같지만 작업량이 2배).
**보이스를 다시 만드실 때 각각 영어도 한 문장씩 뽑아서 함께 주세요.**

```
[한국어] 1996년생… 잠깐 멈추세요. 10월에 대한… 경고입니다.
[영어]   If you were born in 1996 — stop scrolling for five seconds.
```

---

## 6. 제가 판단할 수 없는 것 — 사용자님이 확인하실 것

측정으로는 알 수 없습니다. **직접 들으시고 알려주세요.**

- [ ] 받침·연음이 자연스러운가 (`잠깐 멈추세요`, `경고입니다`)
- [ ] **`1996년생` 을 "천구백구십육년생"으로 제대로 읽는가** (숫자 오독은 치명적입니다)
- [ ] 어색한 억양이나 로봇 같은 구간이 있는가
- [ ] **나레이터가 여성으로 들리는가** (측정상 남성 음역대입니다 — 실제로 어떻게 들리는지가 중요)

---

## 요약

| | 상태 |
|---|---|
| 오디오 기술 품질 | ✅ 문제없음 |
| Karma | 🟡 스펙에 근접. Seoa와 벌리는 조정만 |
| 나레이터 | ❌ 재생성 (음높이 67 Hz 낮음) |
| Seoa | ❌ 재생성 (음높이 49 Hz 낮음, 음색도 반대) |
| 속도·침묵 제어 | ❌ 프롬프트가 아니라 **Speed 슬라이더 + 텍스트 구두점**으로 |
| 영어 테스트 | ⬜ 미실시 — 다음 라운드에 반드시 |
| 한국어 발음 판정 | ⬜ 사용자님 귀 |

---

## 출처

- [ElevenLabs — Text to Speech Best Practices (voice settings, speed, break tags, audio tags)](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- 측정: 자기상관 F0 + HPS 교차검증 · 무음 검출(RMS 0.012 임계, 0.18초+) · 스펙트럼 중심
- 음역대 기준: 성인 여성 165–220 Hz / 성인 남성 85–155 Hz (음성학 통용값)
