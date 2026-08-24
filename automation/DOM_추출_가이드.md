# Flow DOM 셀렉터 추출 가이드 — 두 가지 경로

**목적:** 4라운드째 추측으로 쓰이던 셀렉터를 **실제 DOM 값으로 확정**합니다.
이것만 끝나면 Antigravity가 더 이상 헤맬 이유가 없습니다.

---

# 경로 A — Claude in Chrome 확장 (제가 직접 봅니다)

지금 확장이 연결되지 않은 상태입니다. 아래를 하시면 제가 Flow 화면을 직접 읽어 셀렉터를 전부 뽑겠습니다.

### 설정 (3분)

1. **확장 설치** — https://claude.ai/chrome 에서 Claude for Chrome 설치
2. **claude.ai 로그인** — Claude Code와 **같은 계정**이어야 합니다
3. **크롬 재시작** — 처음 설치라면 필수입니다
4. **Flow 프로젝트 탭을 열어두세요** — `labs.google/fx/en/tools/flow/project/<uuid>`
5. **확장에서 `labs.google` 도메인 권한 허용** — 확장 아이콘 클릭 → 사이트 권한 켜기

> **어느 크롬이어도 됩니다.** 평소 쓰는 크롬이든 자동화 전용 프로필(`C:\kd\chrome-profile`)이든,
> **Flow에 로그인되어 있고 확장이 붙어 있으면** DOM은 동일합니다.
> 자동화 전용 프로필에 확장을 넣는 게 부담되면 평소 크롬에서 하셔도 무방합니다.

준비되면 **"확장 연결했어"** 라고만 알려주세요.

---

# 경로 B — 콘솔 스크립트 (확장 없이, 5분) ★ 이게 더 빠를 수 있습니다

확장 설정이 번거로우면 이쪽이 낫습니다. **F12 → Console 탭에 붙여넣기만** 하면 됩니다.

## 1단계 — 헬퍼 설치

Flow 프로젝트 페이지에서 **F12 → Console** 탭 → 아래를 **전체 복사해 붙여넣고 Enter**:

```js
window.kd = (q, n = 6) => {
  const out = [], seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
    if (!t || t.length > 90) continue;
    if (!t.toLowerCase().includes(q.toLowerCase())) continue;
    if (el.children.length > 4) continue;
    const attrs = [...el.attributes].map(a => `${a.name}="${a.value.slice(0, 70)}"`).join(' ');
    const line = `<${el.tagName.toLowerCase()} ${attrs}>  ▶TEXT="${t.slice(0, 60).replace(/\n/g, '⏎')}"`;
    if (seen.has(line)) continue; seen.add(line);
    out.push(line);
    if (out.length >= n) break;
  }
  return out.join('\n\n') || '❌ no match: ' + q;
};

window.kdPath = (el, up = 6) => {
  const parts = [];
  for (let i = 0; i < up && el; i++) {
    const a = [...el.attributes].map(x => `${x.name}="${x.value.slice(0, 50)}"`).join(' ');
    parts.push(`${'  '.repeat(i)}${i ? '↑ ' : '● '}<${el.tagName.toLowerCase()} ${a}>`);
    el = el.parentElement;
  }
  return parts.join('\n');
};

window.kdTiles = () => {
  const c = [...document.querySelectorAll('video, img[src^="blob:"]')];
  if (!c.length) return '❌ video/blob 요소 없음 — 결과가 있는 프로젝트에서 실행하세요';
  return `총 ${c.length}개 발견. 첫 2개의 조상 경로:\n\n` +
    c.slice(0, 2).map((v, i) => `━━ [${i}] ━━\n${kdPath(v, 7)}`).join('\n\n');
};

window.kdMenu = () => {
  const btns = [...document.querySelectorAll('button, [role="button"]')]
    .filter(b => { const l = (b.getAttribute('aria-label') || '') + (b.title || '');
                   return /more|option|menu|더보기|기타/i.test(l); });
  return btns.length
    ? `${btns.length}개:\n\n` + btns.slice(0, 5).map(b =>
        `<button ${[...b.attributes].map(a => `${a.name}="${a.value.slice(0, 60)}"`).join(' ')}>`).join('\n')
    : '❌ 더보기 버튼 미발견 — 타일에 마우스를 올린 상태에서 실행하세요';
};

'✅ 설치 완료. kd("텍스트") / kdTiles() / kdMenu() 사용 가능';
```

## 2단계 — 아래 순서대로 실행하고 **출력을 그대로 복사**해주세요

각 명령의 출력을 그대로 붙여주시면 됩니다. 길어도 괜찮습니다.

### ① 결과 타일 구조 ★ 가장 중요

**결과가 2개 이상 있는 프로젝트**에서:

```js
kdTiles()
```

> 이걸로 `result_tile` 셀렉터가 추측에서 확정으로 바뀝니다.

### ② 타일 더보기(점3개) 버튼

**결과 타일에 마우스를 올린 상태로** 실행하세요 (마우스를 올려둔 채 콘솔에서 Enter):

```js
kdMenu()
```

마우스를 올리기 어려우면, **점3개를 한 번 클릭해서 메뉴를 연 다음** 이걸 실행:

```js
kd("Download")
```

### ③ 출력 개수 설정 (1x)

**프롬프트창의 설정 아이콘을 눌러 에이전트 설정 패널을 연 상태에서**:

```js
kd("1x")
```

패널의 해당 섹션 제목도 같이:

```js
kd("Video generation")
```
(영어 UI 기준. 한국어면 `kd("동영상 생성")`)

### ④ 모델 드롭다운

**설정 패널에서 모델 드롭다운을 연 상태에서**:

```js
kd("Veo 3.1")
```

닫은 상태에서 현재 선택된 모델 표시:

```js
kd("Lite")
```

### ⑤ 프로필 메뉴 · 크레딧 잔액

**우상단 프로필을 클릭해 메뉴를 연 상태에서**:

```js
kd("credits")
```

메뉴를 여는 버튼 자체 (메뉴 닫은 상태에서):

```js
document.querySelectorAll('header button, [role="banner"] button').length + '개 → ' +
[...document.querySelectorAll('header button, [role="banner"] button')].slice(-3)
  .map(b=>`<button ${[...b.attributes].map(a=>a.name+'="'+a.value.slice(0,50)+'"').join(' ')}>`).join('\n')
```

### ⑥ 에이전트 채팅 메시지 컨테이너

에이전트가 뭔가 답한 상태에서 (아무 대화든):

```js
kd("영상")      // 또는 에이전트 응답에 실제로 들어있는 단어
```

### ⑦ 생성 버튼 · 프롬프트 입력창

```js
kd("Generate")
```
```js
[...document.querySelectorAll('textarea, [contenteditable="true"]')].map(e=>
  `<${e.tagName.toLowerCase()} ${[...e.attributes].map(a=>a.name+'="'+a.value.slice(0,60)+'"').join(' ')}>`).join('\n')
```

---

## 어느 쪽이든

**①②③이 가장 중요합니다.** 그 세 개만 있어도 지금 막혀 있는 치명 결함이 다 풀립니다.
④⑤⑥⑦은 있으면 좋고, 없어도 진행 가능합니다.

출력을 주시면 제가 **셀렉터를 확정한 최종 지시서**를 만들어 Antigravity에 넘기겠습니다.
그 라운드가 끝나면 `PHASE0_VERIFIED = True` 로 열고 실제 1편 생성 테스트로 갑니다.

---

## 참고 — 왜 이게 필요한가

지금 코드에 들어 있는 이런 값들은 **전부 아무도 확인하지 않은 추측**입니다:

```python
"result_tile":  ['[data-result-id]', ...]          # 이런 속성이 있는지 불명
"outputs_per_prompt": ['text=/outputs per prompt/i']  # 이 문자열이 UI에 없을 가능성 높음
"selected_model": ['[aria-haspopup="listbox"]', '.selected-model']   # 추측
"tile_menu": ['button[aria-label*="more" i]', ...]  # 추측
```

Antigravity는 Flow 화면을 볼 수 없어서 계속 추측할 수밖에 없습니다.
**이 5분이 남은 라운드를 한 번으로 줄입니다.**
