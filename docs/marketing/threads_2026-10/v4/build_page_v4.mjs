// v4(10/26~11/1, 하루 5개) 글을 같은 체크리스트 페이지(같은 주소)로 만든다. 글마다 [본문]·[내용 이어쓰기]·[홍보 이어쓰기]를 따로 복사한다.
//   node docs/marketing/threads_2026-10/v4/build_v4.mjs                (글 검사 + posts_v4.json)
//   node docs/marketing/threads_2026-10/v4/build_page_v4.mjs <내보낼 html 경로>
// 이어쓰기는 when 에 따라 "올릴 때 바로" 또는 "반응 100 넘으면 그때"로 나눠 보여 준다.
// 올림 표시는 페이지 밖(아티팩트 db 의 posted 컬렉션)에 저장돼서 휴대폰과 PC 가 같은 상태를 본다.
// db 를 못 쓰는 화면에서는 예전 페이지처럼 이 기기에만 저장한다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2];
if (!OUT) throw new Error("내보낼 html 경로를 인자로 주세요");

const src = JSON.parse(readFileSync(join(HERE, "posts_v4.json"), "utf8"));
const total = src.days.reduce((n, d) => n + d.posts.length, 0);
if (src.version !== 4 || src.days.length !== 7 || total !== 35) throw new Error(`글 수가 맞지 않음: ${src.days.length}일 ${total}개`);
const data = JSON.stringify(src).replace(/</g, "\\u003c");

const html = String.raw`<title>콩닥 스레드 체크리스트</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
/* 배치: 소개와 쓰는 법 → 위에 붙는 진행 막대 → 날짜별 글 카드. 9/26~10/15 체크리스트와 같은 모양. */
:root{
  --bg:#FBF8F7; --surface:#FFFFFF; --ink:#2B2430; --muted:#7C7280; --line:#EDE8E6;
  --coral:#E0245A; --coral-soft:#FDE8EE; --plum:#3A1F33; --done:#2E7D5B; --done-soft:#E4F3EC;
  --chip:#F4F0EF; --on-accent:#FFFFFF; --warn:#A8500B;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    color-scheme:dark;
    --bg:#16111A; --surface:#211925; --ink:#F3ECF1; --muted:#A99FAE; --line:#382D3C;
    --coral:#FF6B8E; --coral-soft:#3A1B27; --plum:#E9D7E4; --done:#6FD1A2; --done-soft:#1C3329; --chip:#2B2230;
    --on-accent:#1B0C13; --warn:#FFB067;
  }
}
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg:#16111A; --surface:#211925; --ink:#F3ECF1; --muted:#A99FAE; --line:#382D3C;
  --coral:#FF6B8E; --coral-soft:#3A1B27; --plum:#E9D7E4; --done:#6FD1A2; --done-soft:#1C3329; --chip:#2B2230;
  --on-accent:#1B0C13; --warn:#FFB067;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:15px;line-height:1.6;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px));padding-block:0 48px}
.wrap{max-width:640px;margin:0 auto}
header.intro{padding-block:28px 8px}
.eyebrow{font-size:12px;letter-spacing:.06em;color:var(--coral);font-weight:700}
h1{font-size:26px;line-height:1.3;margin:6px 0 8px;text-wrap:balance;font-weight:700}
.lede{color:var(--muted);margin:0 0 16px;max-width:60ch}
.howto{display:grid;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:8px}
.howto p{margin:0;font-size:14px}
.howto b{color:var(--ink)}
.howto .sub{color:var(--muted);font-size:13px}
.howto .sub.warn{color:var(--warn);font-weight:600}
.linkrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.linkrow code{font-size:12.5px;background:var(--chip);border-radius:8px;padding:6px 8px;word-break:break-all;flex:1 1 240px;color:var(--ink);min-width:0}
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);padding-block:10px;border-bottom:1px solid var(--line);margin-bottom:8px}
.bar-inner{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.progress{flex:1 1 180px;display:flex;align-items:center;gap:10px;min-width:0}
.track{flex:1;height:8px;border-radius:99px;background:var(--chip);overflow:hidden}
.fill{height:100%;background:var(--coral);width:0;transition:width .3s}
.count{font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;white-space:nowrap}
.seg{display:flex;background:var(--chip);border-radius:10px;padding:3px}
.seg button{border:0;background:transparent;color:var(--muted);font:inherit;font-size:13px;font-weight:600;padding:6px 10px;border-radius:8px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.nextbtn{border:0;background:var(--coral);color:var(--on-accent);font:inherit;font-size:13px;font-weight:700;padding:8px 12px;border-radius:10px;cursor:pointer}
section.day{margin-top:22px;scroll-margin-top:72px}
.dayhead{display:flex;align-items:baseline;gap:8px;margin:0 0 10px;flex-wrap:wrap}
.dayhead h2{font-size:17px;margin:0;font-weight:700}
.dayhead span{color:var(--muted);font-size:13px}
.posts{display:grid;gap:10px}
article.post{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;gap:10px;min-width:0;scroll-margin-top:72px}
article.post.done{border-color:transparent;background:var(--done-soft)}
article.post.done .text{opacity:.6}
.meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.time{font-variant-numeric:tabular-nums;font-weight:700;font-size:13px}
.chip{font-size:12px;font-weight:600;border-radius:99px;padding:2px 9px;background:var(--coral-soft);color:var(--coral)}
.chip.free,.chip.kind{background:var(--chip);color:var(--muted)}
.label{font-size:12px;font-weight:700;color:var(--muted);margin:0}
.reply{border-left:3px solid var(--coral-soft);padding-left:10px;display:grid;gap:4px}
.reply.later{border-left-style:dashed;border-left-color:var(--line)}
.reply.later .text{color:var(--muted)}
.reply.add{border-left-color:var(--done)}
.chip.add{background:var(--done-soft);color:var(--done)}
.chip.topic{background:var(--plum);color:var(--bg)}
.chip.now{background:var(--coral);color:var(--on-accent)}
.chip.later{background:var(--chip);color:var(--muted);border:1px dashed var(--line)}
.text{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font-size:15px;line-height:1.65}
.foot{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap}
.len{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn{border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;font-weight:600;padding:7px 12px;border-radius:10px;cursor:pointer;transition:transform .08s}
.btn:active,.nextbtn:active,.seg button:active{transform:scale(.96)}
.btn.primary{background:var(--plum);border-color:var(--plum);color:var(--bg)}
.btn.ok{background:var(--done);border-color:var(--done);color:var(--on-accent)}
.btn[disabled]{opacity:.6}
button:focus-visible{outline:2px solid var(--coral);outline-offset:2px}
.today{font-size:11px;font-weight:700;color:var(--on-accent)!important;background:var(--coral);border-radius:6px;padding:1px 6px}
.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--plum);color:var(--bg);padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;opacity:0;transition:opacity .2s;pointer-events:none;max-width:calc(100vw - 32px);text-align:center}
.toast.show{opacity:1}
.alldone{color:var(--muted);text-align:center;padding:40px 0}
.rules{margin-top:28px;color:var(--muted);font-size:13px}
.rules h3{font-size:14px;color:var(--ink);margin:0 0 6px}
.rules ul{margin:0;padding-left:18px}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
</style>

<div class="wrap">
  <header class="intro">
    <div class="eyebrow">THREADS · 10/26 – 11/1 · 하루 5개 · 2주차</div>
    <h1>콩닥 스레드 게시 체크리스트</h1>
    <p class="lede">지난주 반응을 보고 잘 된 형식(커플 특징·띠·아침 기운)을 늘리고, 안 된 성격형 특징·운영 이야기는 뺐어요. 매일 "지금 시기" 저장용 목록을 하나 더 넣어 하루 5개예요. 홍보 이어쓰기는 35개 중 5개만 바로 붙여요.</p>
    <div class="howto">
      <p><b>지난주(10/19~10/25) 결과</b></p>
      <p class="sub">좋아요 중간값 약 9 · 팔로워 2,741 → 2,854. 1일차 글은 25~33이었는데 같은 형식이 반복되며 4~10으로 내려갔어요.</p>
      <p class="sub">잘 된 글: &lt;결혼하면 잘 사는 커플 특징&gt; 49 · 띠 짝꿍 22 · 수요일 아침 기운 22. 안 된 글: 운영 이야기 2 · &lt;잠수 타는 사람 특징&gt; 4 · &lt;180도 바뀌는 사람 특징&gt; 6.</p>
      <p class="sub">잘 되는 계정(사주장인 6.4만): 띠 12개 목록을 "스레드에 추가"로 나눠 이어 쓰고, "남은 올해·11월부터·2027년"처럼 지금 시기를 걸어요(절 12곳 222). 먹파니는 첫 줄이 짧고 세요("이 글은 ~한테만 뜬다").</p>
    </div>
    <div class="howto">
      <p><b>시간</b> 08:00 아침 기운 · 12:30 커플 특징 · 18:30 띠 · 20:30 지금 시기 저장 목록 · 22:30 밤 (궁합 보는 사람이 저녁 8~10시에 가장 많아요)</p>
      <p><b>순서</b> [본문 복사] → 새 글에 붙여넣기 → <b>주제 태그</b>(카드의 보라색 칩)를 달기 → 게시 → [올렸어요]</p>
      <p><b>내용 이어쓰기</b> 띠 12개 목록 글(초록 칩)은 본문에 1~6번, 나머지 7~12번은 올리자마자 "스레드에 추가"로 붙여요. 홍보가 아니라 글의 뒷부분이에요.</p>
      <p><b>홍보 이어쓰기</b> 빨간 칩 "바로 홍보"인 글만 올릴 때 "스레드에 추가"로 붙여요. 회색 칩 "100 넘으면"인 글은 반응이 100을 넘었을 때만 붙여요.</p>
      <p class="sub">올리고 30분 안에 달린 댓글에 짧게라도 답해 주세요. 스하리·반하리도요. 답글이 붙을수록 더 멀리 퍼져요.</p>
      <p class="sub">한 번만: 스레드 프로필 편집 → 관심사에 사주 · 운세 · 궁합 · 타로를 추가해 주세요. 검색과 추천에 같이 잡혀요.</p>
      <p class="sub" id="sync" role="status">체크를 불러오는 중이에요…</p>
      <p><b>특가</b> 2026년 총운 4,900원 → 3,000원 · 2027 대운 프리미엄 리포트 19,900원 → 9,900원 (12월 31일까지)</p>
      <div class="linkrow">
        <code id="profileLink">https://kongdak.kr/?utm_source=threads&amp;utm_medium=social&amp;utm_campaign=daily</code>
        <button class="btn" id="copyLink" type="button">프로필 링크 복사</button>
      </div>
      <p class="sub">스레드 프로필 링크를 위 주소로 두면 GA4에서 스레드로 들어온 방문을 따로 볼 수 있어요. 글 본문에는 링크를 넣지 않았어요.</p>
    </div>
    <div class="howto profile">
      <p><b>프로필 정리 (한 번만, 10/20 추가)</b></p>
      <p class="label">이름</p>
      <p class="text" id="pfName">콩닥 | 연애·궁합 사주</p>
      <p class="label">소개글 (제휴 문의 한 줄 포함)</p>
      <p class="text" id="pfBio">💘 연애·궁합이 궁금할 때 들르는 사주 계정
매일 저녁 "이거 완전 나잖아" 싶은 글 올려요
한자 없이 쉬운 말로 · 생일만 넣으면 30초
👇 무료 궁합 먼저 보기
🤝 제휴·협업 partner@kongdak.kr</p>
      <p class="label">고정글 (이미지 2~3장과 함께 올리고 '고정')</p>
      <p class="text" id="pfPin">콩닥이 뭐 하는 곳이냐면 💘

1. 연애·궁합을 사주로 쉽게 풀어 주는 곳이야
2. 한자, 어려운 말, 겁주는 말 없어
3. 생일만 넣으면 30초, 궁합 점수는 무료
4. 지금까지 궁합 800번 넘게 봤어 (짝사랑 궁합만 170번 넘게 🤭)
5. 매일 저녁 "이거 완전 나잖아" 싶은 글 올리니까
   스친 김에 팔로우해 둬

👇 무료 궁합은 프로필 링크에서
🤝 제휴·협업 문의: partner@kongdak.kr</p>
      <div class="actions">
        <button class="btn" id="cpName" type="button">이름 복사</button>
        <button class="btn" id="cpBio" type="button">소개글 복사</button>
        <button class="btn primary" id="cpPin" type="button">고정글 복사</button>
      </div>
    </div>
  </header>

  <div class="bar">
    <div class="bar-inner">
      <div class="progress" aria-live="polite">
        <div class="track"><div class="fill" id="fill"></div></div>
        <span class="count" id="count">0 / 35</span>
      </div>
      <div class="seg" role="group" aria-label="보기">
        <button type="button" id="fAll" aria-pressed="true">전체</button>
        <button type="button" id="fTodo" aria-pressed="false">안 올린 글</button>
      </div>
      <button type="button" class="nextbtn" id="goNext">다음 글로</button>
    </div>
  </div>

  <main id="list"></main>

  <div class="rules">
    <h3>글에 지킨 원칙</h3>
    <ul>
      <li>첫 줄은 짧고 나를 가리키게: "이 글은 오늘 많이 참은 너한테만", &lt;○○ 커플 특징&gt;, "11월에 연락운 들어오는 띠"</li>
      <li>띠 글의 근거는 예로부터 내려오는 띠 짝·띠 무리, 11월=돼지의 달·12월=쥐의 달·2027년=양의 해만 써요. 한자 간지·전문 용어는 없어요</li>
      <li>본문엔 콩닥 이름(아침 서명 빼고)·가격·링크가 없어요</li>
      <li>좋아요·저장을 권하는 말은 넣었어요. 댓글·생일을 남겨 달라는 말, 사주를 봐 준다는 말은 없어요</li>
      <li>덕담·예고는 "~수도", "~흐름", "~경우가 많대"처럼 부드럽게. 날짜·금액을 못 박는 예언은 없어요</li>
      <li>다음 주 월요일에 좋아요 중간값을 다시 재서 지난주(약 9)와 비교해요</li>
    </ul>
  </div>
</div>
<div class="toast" id="toast" role="status"></div>

<script type="application/json" id="data">__DATA__</script>
<script>
(function () {
  var DATA = JSON.parse(document.getElementById("data").textContent);
  var POSTS = [];
  DATA.days.forEach(function (d) { d.posts.forEach(function (p) { POSTS.push({ day: d, p: p }); }); });
  var KEY = "kongdak-threads-posted-v4";
  var WD = ["일", "월", "화", "수", "목", "금", "토"];
  var posted = {};   // id -> true
  var pending = {};  // id -> true (저장 중)
  var filter = "all";
  var db = null, local = false;

  var list = document.getElementById("list");
  var toastEl = document.getElementById("toast");
  var syncEl = document.getElementById("sync");
  var toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800); }
  function localToday() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function copyText(text, onOk) {
    var fallback = function () {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      if (ok) onOk(); else toast("복사가 막혔어요. 글을 길게 눌러 직접 복사해 주세요.");
    };
    try { navigator.clipboard.writeText(text).then(onOk, fallback); } catch (e) { fallback(); }
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function render() {
    list.textContent = "";
    var today = localToday();
    DATA.days.forEach(function (d) {
      var items = d.posts.filter(function (p) { return filter === "all" || !posted[p.id]; });
      if (!items.length) return;
      var date = new Date(d.date + "T00:00:00");
      var md = (date.getMonth() + 1) + "/" + date.getDate();
      var sec = el("section", "day"); sec.id = "d" + d.day;
      var head = el("div", "dayhead");
      head.appendChild(el("h2", null, (d.name || d.day + "일차") + " · " + md + " (" + WD[date.getDay()] + ")"));
      if (d.day === 0) head.appendChild(el("span", null, "일정 시작 전에 먼저 올리는 2개"));
      if (d.date === today) head.appendChild(el("span", "today", "오늘"));
      sec.appendChild(head);
      var wrap = el("div", "posts");
      items.forEach(function (p) {
        var done = !!posted[p.id];
        var art = el("article", "post" + (done ? " done" : "")); art.id = "p-" + p.id;
        var meta = el("div", "meta");
        meta.appendChild(el("span", "time", p.time));
        meta.appendChild(el("span", "chip kind", p.kind));
        meta.appendChild(el("span", "chip topic", "태그 · " + p.topic));
        var now = p.when === "now";
        meta.appendChild(el("span", now ? "chip now" : "chip later", now ? "바로 홍보" : "100 넘으면 홍보"));
        if (p.add) meta.appendChild(el("span", "chip add", "이어쓰기 있음"));
        art.appendChild(meta);
        art.appendChild(el("p", "label", "본문"));
        art.appendChild(el("p", "text", p.main));
        if (p.add) {
          var addBox = el("div", "reply add");
          addBox.appendChild(el("p", "label", "내용 이어쓰기 · 올리자마자 스레드에 추가 (7~12번)"));
          addBox.appendChild(el("p", "text", p.add));
          art.appendChild(addBox);
        }
        var box = el("div", now ? "reply" : "reply later");
        box.appendChild(el("p", "label", now ? "홍보 이어쓰기 · 올릴 때 바로 스레드에 추가" : "홍보 이어쓰기 · 반응 100 넘으면 그때 스레드에 추가"));
        box.appendChild(el("p", "text", p.reply));
        art.appendChild(box);
        var foot = el("div", "foot");
        foot.appendChild(el("span", "len", "본문 " + p.nMain + "자"));
        var actions = el("div", "actions");
        var copy = el("button", "btn primary", "본문 복사"); copy.type = "button"; copy.id = "c-" + p.id;
        copy.addEventListener("click", function () { copyText(p.main, function () { toast(md + " " + p.time + " 본문을 복사했어요"); }); });
        var copyA = null;
        if (p.add) {
          copyA = el("button", "btn", "내용 이어쓰기 복사"); copyA.type = "button"; copyA.id = "a-" + p.id;
          copyA.addEventListener("click", function () { copyText(p.add, function () { toast("내용 이어쓰기(7~12번)를 복사했어요"); }); });
        }
        var copy2 = el("button", "btn", "홍보 복사"); copy2.type = "button"; copy2.id = "r-" + p.id;
        copy2.addEventListener("click", function () { copyText(p.reply, function () { toast("홍보 이어쓰기를 복사했어요"); }); });
        var mark = el("button", "btn" + (done ? " ok" : ""), pending[p.id] ? "저장 중…" : done ? "올렸어요 ✓" : "올렸어요"); mark.type = "button"; mark.id = "k-" + p.id;
        mark.disabled = !!pending[p.id];
        mark.setAttribute("aria-pressed", done ? "true" : "false");
        mark.addEventListener("click", function () { toggle(p.id); });
        actions.appendChild(copy); if (copyA) actions.appendChild(copyA); actions.appendChild(copy2); actions.appendChild(mark); foot.appendChild(actions);
        art.appendChild(foot); wrap.appendChild(art);
      });
      sec.appendChild(wrap); list.appendChild(sec);
    });
    if (!list.children.length) list.appendChild(el("p", "alldone", POSTS.length + "개를 모두 올렸어요. 수고하셨어요!"));
    updateProgress();
  }
  function updateProgress() {
    var n = POSTS.filter(function (x) { return posted[x.p.id]; }).length;
    document.getElementById("count").textContent = n + " / " + POSTS.length;
    document.getElementById("fill").style.width = (n / POSTS.length * 100) + "%";
  }
  function setFilter(f) {
    filter = f;
    document.getElementById("fAll").setAttribute("aria-pressed", f === "all" ? "true" : "false");
    document.getElementById("fTodo").setAttribute("aria-pressed", f === "todo" ? "true" : "false");
    render();
  }
  document.getElementById("fAll").addEventListener("click", function () { setFilter("all"); });
  document.getElementById("fTodo").addEventListener("click", function () { setFilter("todo"); });
  document.getElementById("goNext").addEventListener("click", function () {
    var next = POSTS.find(function (x) { return !posted[x.p.id]; });
    if (!next) { toast("다 올렸어요!"); return; }
    var target = document.getElementById("p-" + next.p.id);
    if (target) target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  });
  [["cpName", "pfName", "이름"], ["cpBio", "pfBio", "소개글"], ["cpPin", "pfPin", "고정글"]].forEach(function (x) {
    document.getElementById(x[0]).addEventListener("click", function () {
      copyText(document.getElementById(x[1]).textContent, function () { toast(x[2] + "을 복사했어요"); });
    });
  });
  document.getElementById("copyLink").addEventListener("click", function () {
    copyText(document.getElementById("profileLink").textContent, function () { toast("프로필 링크를 복사했어요"); });
  });

  // 체크 저장: db 가 있으면 거기에(휴대폰·PC 가 같이 본다), 없으면 이 기기에만
  function loadLocal() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); var o = {}; a.forEach(function (id) { o[id] = true; }); return o; } catch (e) { return {}; } }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(Object.keys(posted))); } catch (e) {} }
  function useLocal(msg) { local = true; pending = {}; posted = loadLocal(); syncEl.textContent = msg; render(); }
  function toggle(id) {
    if (pending[id]) return;
    var done = !!posted[id];
    if (local || !db) { if (done) delete posted[id]; else posted[id] = true; saveLocal(); render(); return; }
    pending[id] = true; render();
    var ref = db.doc("posted/" + id);
    var job = done ? ref.delete() : ref.set({ done: true, at: new Date().toISOString() });
    job.then(function () { delete pending[id]; render(); }, function (err) {
      delete pending[id];
      var code = err && err.code;
      syncEl.classList.add("warn");
      syncEl.textContent = code === "invalid_argument" || code === "not_granted" || code === "revoked"
        ? "이 계정으로는 체크를 저장할 수 없어요. 글 복사는 그대로 쓸 수 있어요."
        : "체크를 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
      render();
    });
  }

  render();
  var use = window.claude && window.claude.use ? window.claude.use("db") : Promise.resolve(null);
  Promise.resolve(use).then(function (ns) {
    if (!ns) { useLocal("체크는 이 기기에만 저장돼요."); return; }
    db = ns;
    db.collection("posted").limit(500).onSnapshot(function (snap) {
      var next = {};
      snap.docs.forEach(function (d) { var v = d.data() || {}; if (v.done) next[d.id] = true; });
      posted = next;
      syncEl.classList.remove("warn");
      syncEl.textContent = "체크는 저장돼서 휴대폰과 PC에서 같이 보여요.";
      render();
    }, function () { useLocal("체크를 불러오지 못했어요. 지금은 이 기기에만 저장돼요."); });
  }, function () { useLocal("체크는 이 기기에만 저장돼요."); });
})();
</script>
`;
writeFileSync(OUT, html.replace("__DATA__", () => data), "utf8");
console.log("저장:", OUT, "·", src.days.length, "일 ·", total, "개 ·", Math.round((html.length + data.length) / 1024), "KB");
