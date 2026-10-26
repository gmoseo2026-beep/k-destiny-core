// 콩닥 스레드 v4 — 10/26~11/1, 하루 5개 · 35개. 진단은 posts_v4.mjs 맨 위.
//   node docs/marketing/threads_2026-10/v4/build_v4.mjs
//
// v3 검사를 이어받았다. 바뀐 점: 하루 5개(시간대마다 형식 고정), 띠 12개 목록의 "내용 이어쓰기"(add) 검사,
// 콩닥 이름은 아침 서명에만. 덕담·띠·시기·커플 글은 부드러운 말("~수도", "~흐름", "~경우가 많")이 있어야 한다.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { posts } from "./posts_v4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const len = (s) => [...s].length;
const START = "2026-10-26";
const DAYS = 7;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
// 궁합 입력이 가장 많은 때: 저녁 8~10시(10-25 시간당 15~16건), 그다음 18시. 아침·점심은 출근·점심 스크롤용.
const TIMES = ["08:00", "12:30", "18:30", "20:30", "22:30"];
const TOPICS = new Set(["사주", "운세", "궁합", "연애운"]);
const KINDS = new Set(["아침", "커플", "띠", "시기", "밤"]);
const SLOT_KIND = ["아침", "커플", "띠", "시기", "밤"];
const MAIN_MIN = 120, MAIN_MAX = 430; // 스레드 한 글 500자 제한 안에서
const REPLY_MAX = 330;

const NL = String.fromCharCode(10);
const P = (name, items, tail) => [`콩닥 '${name}'에선`, ...items.map((x) => `· ${x}`), tail].join(NL);
const PRODUCT = {
  "그 사람 속마음": P("그 사람의 속마음", ["그 사람이 나한테 끌리는 점", "부담스러워하는 점", "마음을 여는 말"], "까지 두 사람 생일로 풀어 줘 🔮"),
  "재회운": P("재회운과 타이밍", ["우리가 멀어진 진짜 이유", "다시 다가가기 좋은 때", "그때 건넬 첫마디"], "까지 짚어 줘 🔮"),
  "갈등과 해법": P("갈등과 해법", ["우리가 자꾸 부딪히는 지점", "서로 서운한 포인트", "싸움을 푸는 말"], "까지 짚어 줘 🔮"),
  "연애운과 인연": P("연애운과 인연", ["내가 끌리는 사람", "나랑 오래 갈 사람", "인연이 오는 흐름"], "까지 풀어 줘 💘"),
  "결혼 궁합": P("결혼 궁합", ["같이 살면 맞춰야 할 것", "돈·집안일 맞추는 법", "오래 가는 우리만의 방식"], "까지 미리 보여 줘 💍"),
  "재물운": P("재물운", ["돈이 들어오는 길", "돈이 새는 습관", "모으기 좋은 때"], "까지 쉬운 말로 풀어 줘 💰"),
  "성격·기질": P("타고난 성격과 기질", ["남들이 보는 나", "진짜 나", "나를 지치게 하는 것"], "까지 무료로 끝까지 볼 수 있어 🌱"),
  "정통 궁합": P("정통 궁합", ["두 사람 궁합 점수", "우리 케미 키워드", "닮은 점과 채워 주는 점"], "까지 점수는 무료로 나와 💞"),
  "2026 총운": P("2026년 총운", ["올해 흐름 한눈에", "월별 운세", "남은 달 보내는 법"], "까지 풀어 줘 🗓️"),
  "2027 대운": P("2027 대운 프리미엄 리포트", ["앞으로 10년 흐름 속 2027년의 자리", "12개월 상세 달력", "힘 줄 때와 쉬어 갈 때"], "까지 한 권에 담았어 👑"),
  "2027 신년운": P("2027년 신년운", ["내년에 오는 흐름", "시작하면 좋은 것", "정리하면 좋은 것"], "까지 짚어 줘 🌱"),
};
const BRIDGE = {
  now: ["내 경우가 궁금한 사람을 위해 👇", "우리 둘은 어떤지 궁금하다면 👇", "이건 사람마다 타고난 게 달라서 그래 ☺️"],
  "100": ["궁금하다는 사람이 많아서 남겨 둘게 👇", "생각보다 많이 봐 줘서 하나 더 👇", "내 얘기가 궁금해진 사람을 위해 👇"],
};
const QUALITY = ["한자 하나 없이 쉬운 말로 만들었어", "같은 생일이면 언제 봐도 같은 결과가 나와", "앞부분은 무료로 먼저 읽어 볼 수 있어", "가입 없이 생일만 넣으면 30초야"];
const DISCOUNT = ["지금 연말 특가라 2026 총운 3,000원, 2027 대운 리포트 9,900원이야 🎁", "12월 31일까지 2026 총운 3,000원 · 2027 대운 리포트 9,900원 🎁"];

const HANJA = /[㐀-䶿一-鿿]/;
const JARGON = /오행|일간|일주(?!일)|천간|지지\b|용신|십신|격국|대운수|도화살|역마살|화개살|편재|정재|편관|정관|식신|상관|비견|겁재|인성|[갑을병정무기경신임계][목화토금수]\b|[갑을병정무기경신임계][자축인묘진사오미신유술해]년/;
const PROPHECY = /반드시|무조건|100%|틀림없|확실히|확실하|절대 ?(안|못) ?(망|와|온)|\d+ ?(시간|일) ?안에|돈벼락|로또|대박 난다|액운.*끝난다/;
const ASKS = /댓글|답글|남겨 ?주|남겨 ?줘|적어 ?줘|알려 ?줘|말해 ?줘|생일 ?(알려|적어|남겨)|봐 ?줄게|DM|디엠|리포스트|팔로우 ?(해|하고)|공유해/;
const LINK = /http|www\.|kongdak\.kr|프로필 ?링크|프로필로/;
const PRICES = new Set(["3,000", "9,900"]);
const SOFT = /수도 있|수도$|흐름|길 바라|좋겠다|좋아|경우가 많|기도 해|래\.|대\.|거야|있어/;

const problems = [];
const json = { start: START, version: 4, days: [] };
const md = [];
const firsts = new Set();
let used = 0;
for (let di = 0; di < DAYS; di++) {
  const kst = new Date(Date.parse(`${START}T00:00:00Z`) + di * 86_400_000);
  const label = `${di + 1}일차 · ${kst.getUTCMonth() + 1}/${kst.getUTCDate()}(${WEEK[kst.getUTCDay()]})`;
  md.push(`\n## ${label}\n`);
  const day = { day: di + 1, name: `${di + 1}일차`, date: kst.toISOString().slice(0, 10), posts: [] };
  const todays = posts.filter((p) => p.day === di + 1).sort((a, b) => TIMES[a.slot].localeCompare(TIMES[b.slot]));
  if (todays.length !== 5) problems.push(`${di + 1}일차: 글 ${todays.length}개(5개여야 함)`);
  if (todays.some((p) => SLOT_KIND[p.slot] !== p.kind)) problems.push(`${di + 1}일차: 시간대와 형식이 맞지 않음`);
  for (const p of todays) {
    const where = `${di + 1}일차 ${TIMES[p.slot]}`;
    const main = p.m.trim();
    const n = len(main);
    if (!KINDS.has(p.kind)) problems.push(`${where}: 형식 "${p.kind}"`);
    if (!TOPICS.has(p.topic)) problems.push(`${where}: 주제 태그 "${p.topic}"`);
    if (n < MAIN_MIN || n > MAIN_MAX) problems.push(`${where}: 본문 ${n}자(${MAIN_MIN}~${MAIN_MAX})`);
    const first = main.split(NL)[0];
    if (len(first) > 28) problems.push(`${where}: 첫 줄 ${len(first)}자 — ${first}`);
    if (firsts.has(first)) problems.push(`${where}: 첫 줄 중복`);
    firsts.add(first);
    const add = p.add ? p.add.trim() : "";
    const whole = add ? main + NL + add : main;
    if (add && (len(add) < 60 || len(add) > MAIN_MAX)) problems.push(`${where}: 내용 이어쓰기 ${len(add)}자(60~${MAIN_MAX})`);
    if (add && p.kind !== "띠") problems.push(`${where}: 내용 이어쓰기는 띠 12개 목록에만`);
    if ((p.kind === "커플" || p.kind === "시기" || (p.kind === "띠" && add)) && !/^<.+>$/.test(first)) problems.push(`${where}: ${p.kind} 목록 글은 <제목>으로 시작`);
    if (p.kind === "띠" && !/년생|띠/.test(whole)) problems.push(`${where}: 띠 글에 띠·년생이 없음`);
    if (p.kind === "띠" && add && !/12\. 돼지띠/.test(add)) problems.push(`${where}: 띠 12개 목록이 이어쓰기에서 끝나지 않음`);
    if (["띠", "시기", "밤", "커플"].includes(p.kind) && !SOFT.test(whole)) problems.push(`${where}: 부드러운 말("~수도", "~흐름", "~경우가 많")이 없음`);
    // 아침 글: 좋은 기운 부르는 말("…") 한 줄과 행운 습관 목록, 부드러운 말. 콩닥 이름은 맨 끝 서명으로만
    if (p.kind === "아침" && (!/"[^"]+"/.test(main) || !SOFT.test(main))) problems.push(`${where}: 아침 글에 따옴표 속 좋은 말이나 부드러운 말이 없음`);
    if (p.kind === "아침" && !/— 콩닥이의 아침 기운 배달$/.test(main)) problems.push(`${where}: 아침 글 끝 서명이 없음`);
    if (/콩닥/.test(whole.replace(/— 콩닥이의 아침 기운 배달$/, ""))) problems.push(`${where}: 본문에 콩닥(아침 서명만 허용)`);
    if (/[0-9],[0-9]{3}원|[0-9]+원/.test(whole)) problems.push(`${where}: 본문에 가격`);
    const prod = PRODUCT[p.promo];
    if (!prod) { problems.push(`${where}: 상품 문장 없음 "${p.promo}"`); continue; }
    if (p.when !== "now" && p.when !== "100") problems.push(`${where}: when "${p.when}"`);
    const bridges = BRIDGE[p.when] ?? BRIDGE.now;
    const reply = [bridges[used % bridges.length], prod, QUALITY[used % QUALITY.length], DISCOUNT[used % DISCOUNT.length]].join(NL);
    used++;
    if (len(reply) > REPLY_MAX) problems.push(`${where}: 이어쓰기 ${len(reply)}자(${REPLY_MAX} 이하)`);
    for (const [name, text] of [["본문", main], ["내용 이어쓰기", add], ["이어쓰기", reply]]) {
      if (HANJA.test(text)) problems.push(`${where} ${name}: 한자`);
      const j = JARGON.exec(text); if (j) problems.push(`${where} ${name}: 전문용어 "${j[0]}"`);
      const pr = PROPHECY.exec(text); if (pr) problems.push(`${where} ${name}: 단정 표현 "${pr[0]}"`);
      const a = ASKS.exec(text); if (a) problems.push(`${where} ${name}: 청하는 표현 "${a[0]}"`);
      const l = LINK.exec(text); if (l) problems.push(`${where} ${name}: 링크 "${l[0]}"`);
    }
    for (const m of reply.matchAll(/([0-9]{1,2},[0-9]{3})원/g)) if (!PRICES.has(m[1])) problems.push(`${where}: 없는 가격 ${m[0]}`);
    const id = `v4d${String(di + 1).padStart(2, "0")}s${p.slot + 1}`;
    day.posts.push({ id, time: TIMES[p.slot], kind: p.kind, topic: p.topic, tag: p.promo, when: p.when, main, add, reply, nMain: n, nAdd: len(add), nReply: len(reply) });
    const whenLabel = p.when === "now" ? "올릴 때 바로 스레드에 추가" : "반응 100 넘으면 그때 스레드에 추가";
    md.push(`### ${TIMES[p.slot]} · ${p.kind} · 태그 ${p.topic} (본문 ${n}자)\n\n본문\n\`\`\`\n${main}\n\`\`\`\n${add ? `내용 이어쓰기 — 올리자마자 스레드에 추가\n\`\`\`\n${add}\n\`\`\`\n` : ""}홍보 이어쓰기 — ${whenLabel}\n\`\`\`\n${reply}\n\`\`\`\n`);
  }
  json.days.push(day);
}
const nowCount = posts.filter((p) => p.when === "now").length;
if (nowCount * 4 > posts.length + 3) problems.push(`바로 붙이는 홍보가 ${nowCount}/${posts.length}개 — 4개 중 1개 정도로`);
const head = `# 콩닥 스레드 v4 — 10/26 ~ 11/1, 하루 5개 · ${posts.length}개

- 시간: 08:00 아침 · 12:30 커플 특징 · 18:30 띠 · 20:30 지금 시기 저장 목록 · 22:30 밤.
- v3 주 좋아요 중간값 약 9. 잘 된 커플·띠·아침 글을 늘리고, 성격형 특징·운영 이야기는 뺐다.
- 띠 12개 목록은 본문(1~6) + 내용 이어쓰기(7~12)로 나눠 올리자마자 "스레드에 추가".
- 홍보 이어쓰기는 ${nowCount}개만 바로 붙이고, 나머지는 반응 100 넘으면.
- 본문엔 콩닥 이름(아침 서명 빼고)·링크·가격 없음. 댓글·생일 요청, 사주 봐 준다는 말 없음. 덕담은 부드럽게.
`;
writeFileSync(join(HERE, "콩닥_스레드_v4.md"), head + md.join("\n"), "utf8");
writeFileSync(join(HERE, "posts_v4.json"), JSON.stringify(json), "utf8");
console.log(`글 ${posts.length}개 · 바로 홍보 ${nowCount}개 · 문제 ${problems.length}건`);
for (const p of problems) console.log(" -", p);
if (problems.length) process.exitCode = 1;
