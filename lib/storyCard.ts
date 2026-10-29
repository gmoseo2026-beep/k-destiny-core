import type {
  CharmBadgeId,
  CharmBadgeLabel,
  SajuDisplayCard,
  SajuElementKey,
} from "@/lib/sajuDisplay";

const HANJA_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g;
const DATE_OR_NUMBER_PII_RE =
  /\b\d{4}[-./년]\s*\d{1,2}[-./월]\s*\d{1,2}일?|\b\d{6,}\b|\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g;
const EMAIL_OR_URL_RE = /\S+@\S+\.\S+|https?:\/\/\S+/gi;

const DEFAULT_NAME_TOKENS = new Set([
  "",
  "나",
  "상대",
  "상대방",
  "그 사람",
  "그사람",
  "당신",
  "본인",
  "person a",
  "person b",
  "me",
  "partner",
]);

/**
 * 한국 성씨 첫 글자 목록 (2~4글자 순한글 실명 오노출 방지용).
 * 입력창 라벨이 "이름 또는 애칭"이라 카카오 실명("김민수", "이서연" 등)이 들어올 수 있으므로,
 * 성씨+이름 패턴으로 보이는 2~4자 한글 문자열은 스토리 이미지에 넣지 않고 기본 애칭으로 대체한다.
 */
const KOREAN_SURNAME_INITIALS = new Set(
  Array.from(
    "김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구라민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용",
  ),
);

/** 성씨 글자로 시작하더라도 명백히 일상 애칭인 단어는 허용한다. */
const NICKNAME_ALLOWLIST = new Set([
  "고양이",
  "강아지",
  "곰돌이",
  "공주",
  "공주님",
  "왕자",
  "왕자님",
  "천사",
  "오리",
  "배추",
  "복숭아",
  "백설기",
  "하트",
  "달님",
  "별님",
  "차차",
  "주주",
  "구름",
  "구름이",
  "남친",
  "여친",
  "짝남",
  "짝녀",
  "썸남",
  "썸녀",
]);

const DAY_TOP_LABELS = [
  "큰 나무",
  "풀꽃",
  "태양",
  "촛불",
  "큰 산",
  "고운 흙",
  "큰 바위",
  "보석",
  "바다",
  "단비",
] as const;

const DAY_BOTTOM_LABELS = [
  "봄 숲",
  "새싹",
  "여름 볕",
  "불꽃",
  "봄 들판",
  "가을 언덕",
  "겨울 땅",
  "여름 땅",
  "원석",
  "맑은 쇠",
  "깊은 물",
  "샘물",
] as const;

const DAY_TOP_KEYWORDS: readonly string[] = [
  "단단한 중심",
  "유연한 다정함",
  "환한 존재감",
  "섬세한 온기",
  "든든한 믿음",
  "포근한 배려",
  "분명한 결단",
  "반짝이는 감각",
  "넓은 포용력",
  "깊은 공감력",
];

const DAY_BOTTOM_KEYWORDS: readonly string[] = [
  "새로운 시작",
  "사랑스러운 결",
  "솔직한 표현",
  "뜨거운 몰입",
  "넉넉한 여유",
  "깊은 속내",
  "꾸준한 진심",
  "따뜻한 여운",
  "빠른 눈치",
  "깔끔한 취향",
  "풍부한 상상",
  "맑은 직관",
];

const ELEMENT_BALANCE_CODES = [
  "wood",
  "fire",
  "earth",
  "metal",
  "water",
  "balanced",
] as const;

type ElementBalanceCode = (typeof ELEMENT_BALANCE_CODES)[number];

const ELEMENT_BALANCE_KEYWORDS: Record<ElementBalanceCode, string> = {
  wood: "나무 기운 충만",
  fire: "불 기운 충만",
  earth: "흙 기운 충만",
  metal: "쇠 기운 충만",
  water: "물 기운 충만",
  balanced: "고른 다섯 기운",
};

const CHARM_BADGE_MAP: Record<CharmBadgeId, CharmBadgeLabel> = {
  dohwa: "도화(사람을 끄는 매력)",
  hongyeom: "홍염(한 번 빠지면 깊은 매력)",
  yeokma: "역마(움직임이 많은)",
};

const CHARM_BADGE_ORDER: readonly CharmBadgeId[] = [
  "dohwa",
  "hongyeom",
  "yeokma",
];

/**
 * 스토리 카드에 표시할 애칭을 정제한다.
 * 빈칸·기본값·생년월일/숫자·이메일·한자·한국 실명 패턴이면 null을 반환해 "나 × 그 사람"으로 대체한다.
 */
export function sanitizeStoryNickname(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (DEFAULT_NAME_TOKENS.has(trimmed.toLowerCase())) return null;
  if (trimmed.length > 10) return null;

  // 숫자 2연속 이상(생일·연도·전화번호), 이메일, URL, 한자 포함 시 거부
  if (/\d{2,}/.test(trimmed)) return null;
  if (/@|https?:\/\//i.test(trimmed)) return null;
  if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(trimmed)) return null;

  if (NICKNAME_ALLOWLIST.has(trimmed)) return trimmed;

  // 2~4글자 순한글이면서 한국 성씨로 시작하면 실명 가능성이 높으므로 노출하지 않는다.
  // 단, "~이"(예: 콩이, 멍뭉이 — 성씨 제외)나 공백/기호가 섞인 별명은 허용하되,
  // 3글자 성씨 시작 순한글(예: 김민수, 이설렘, 박서준) 및 2/4글자 성씨 시작 순한글은 차단한다.
  if (/^[가-힣]{2,4}$/.test(trimmed) && KOREAN_SURNAME_INITIALS.has(trimmed[0])) {
    return null;
  }

  return trimmed;
}

/**
 * 궁합("나 × 그 사람") 또는 개인 무료 성격("나의 타고난 매력") 스토리 카드 상단 제목을 만든다.
 */
export function formatStoryTitle(
  mode: "compat" | "personality",
  nameA?: string | null,
  nameB?: string | null,
): string {
  const nickA = sanitizeStoryNickname(nameA);
  if (mode === "personality") {
    return nickA ? `${nickA}의 타고난 매력` : "나의 타고난 매력";
  }
  const nickB = sanitizeStoryNickname(nameB);
  if (!nickA && !nickB) return "나 × 그 사람";
  return `${nickA ?? "나"} × ${nickB ?? "그 사람"}`;
}

/**
 * 1인 또는 2인의 여덟 글자 표시 카드에서 매력 기운 배지를 순서대로 중복 없이 모은다.
 */
export function mergeStoryCharmBadges(
  cards: ReadonlyArray<SajuDisplayCard | null | undefined>,
): CharmBadgeLabel[] {
  const found = new Set<CharmBadgeId>();
  for (const card of cards) {
    if (!card) continue;
    for (const badge of card.badges) {
      found.add(badge.id);
    }
  }
  return CHARM_BADGE_ORDER.filter((id) => found.has(id)).map(
    (id) => CHARM_BADGE_MAP[id],
  );
}

function resolveElementBalanceCode(card: SajuDisplayCard): ElementBalanceCode {
  let maxKey: SajuElementKey = "wood";
  let maxCount = -1;
  for (const item of card.elements) {
    if (item.count > maxCount) {
      maxCount = item.count;
      maxKey = item.key;
    }
  }
  if (maxCount <= 2) return "balanced";
  return maxKey;
}

/**
 * 무료 성격 결과용 결정론 엔진 키워드 3개를 사주 여덟 글자 표시 카드에서 계산한다.
 */
export function derivePersonalityKeywordsFromCard(
  card: SajuDisplayCard | null | undefined,
): [string, string, string] {
  if (!card) {
    return ["타고난 중심", "다정한 온기", "고른 다섯 기운"];
  }
  const dayPillar = card.pillars[2];
  const dtIdx = DAY_TOP_LABELS.indexOf(
    dayPillar.top.label as (typeof DAY_TOP_LABELS)[number],
  );
  const dbIdx = DAY_BOTTOM_LABELS.indexOf(
    dayPillar.bottom.label as (typeof DAY_BOTTOM_LABELS)[number],
  );
  const elCode = resolveElementBalanceCode(card);

  return [
    DAY_TOP_KEYWORDS[dtIdx >= 0 ? dtIdx : 0],
    DAY_BOTTOM_KEYWORDS[dbIdx >= 0 ? dbIdx : 0],
    ELEMENT_BALANCE_KEYWORDS[elCode],
  ];
}

/**
 * 무료 성격 스토리 카드 URL에 넣을 비식별 결정론 코드(닫힌 enum 인덱스만, 생년월일·이름·자유문장 없음)를 만든다.
 */
export function buildPersonalityStoryUrl(
  reportId: string,
  card?: SajuDisplayCard | null,
): string {
  const sp = new URLSearchParams();
  sp.set("reportId", reportId);
  if (card) {
    const dtIdx = DAY_TOP_LABELS.indexOf(
      card.pillars[2].top.label as (typeof DAY_TOP_LABELS)[number],
    );
    const dbIdx = DAY_BOTTOM_LABELS.indexOf(
      card.pillars[2].bottom.label as (typeof DAY_BOTTOM_LABELS)[number],
    );
    if (dtIdx >= 0) sp.set("dt", String(dtIdx));
    if (dbIdx >= 0) sp.set("db", String(dbIdx));
    sp.set("el", resolveElementBalanceCode(card));
    if (card.badges.length > 0) {
      sp.set(
        "b",
        card.badges.map((badge) => badge.id).join(","),
      );
    }
  }
  return `/api/og/story?${sp.toString()}`;
}

/**
 * 서버 `/api/og/story`에서 무료 성격의 닫힌 enum 파라미터만 검증·복원한다(임의 자유 문자열 무시).
 */
export function decodePersonalityStoryCodes(searchParams: URLSearchParams): {
  keywords: [string, string, string];
  badges: CharmBadgeLabel[];
} {
  const dtRaw = Number.parseInt(searchParams.get("dt") ?? "", 10);
  const dbRaw = Number.parseInt(searchParams.get("db") ?? "", 10);
  const elRaw = searchParams.get("el") ?? "";
  const bRaw = searchParams.get("b") ?? "";

  const kw1 =
    Number.isInteger(dtRaw) && dtRaw >= 0 && dtRaw < DAY_TOP_KEYWORDS.length
      ? DAY_TOP_KEYWORDS[dtRaw]
      : "타고난 중심";
  const kw2 =
    Number.isInteger(dbRaw) && dbRaw >= 0 && dbRaw < DAY_BOTTOM_KEYWORDS.length
      ? DAY_BOTTOM_KEYWORDS[dbRaw]
      : "다정한 온기";
  const kw3 = (ELEMENT_BALANCE_CODES as readonly string[]).includes(elRaw)
    ? ELEMENT_BALANCE_KEYWORDS[elRaw as ElementBalanceCode]
    : "고른 다섯 기운";

  const requestedIds = new Set(
    bRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is CharmBadgeId =>
        (CHARM_BADGE_ORDER as readonly string[]).includes(s),
      ),
  );
  const badges = CHARM_BADGE_ORDER.filter((id) => requestedIds.has(id)).map(
    (id) => CHARM_BADGE_MAP[id],
  );

  return {
    keywords: [kw1, kw2, kw3],
    badges,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 스토리 카드에 들어갈 한 줄 요약을 정제한다.
 * - DB에 저장된 원본 이름(실명 가능성)과 "○○님" 호칭을 제거·치환하고
 * - 날짜/전화/이메일/한자를 제거한 뒤
 * - 첫 문장을 자연스러운 길이(최대 58자)로 정리한다.
 */
export function sanitizeStoryOneLineSummary(
  rawText: string | null | undefined,
  rawNamesToScrub: ReadonlyArray<string | null | undefined> = [],
): string {
  let text = (rawText ?? "").trim();
  if (!text) {
    return "서로의 결이 자연스럽게 스며드는 다정한 흐름이에요.";
  }

  for (let i = 0; i < rawNamesToScrub.length; i += 1) {
    const rawName = rawNamesToScrub[i]?.trim();
    if (!rawName || DEFAULT_NAME_TOKENS.has(rawName.toLowerCase())) continue;
    const replacement = i === 0 ? "나" : "그 사람";
    const nameWithHonorificRe = new RegExp(
      `${escapeRegExp(rawName)}\\s*님?`,
      "g",
    );
    text = text.replace(nameWithHonorificRe, replacement);
  }

  // 캐시된 문장 안에 남은 "김민수 님" / "이서연님" 형태의 호칭도 일반 표현으로 바꾼다.
  text = text.replace(/[가-힣]{2,4}\s*님/g, "당신");
  text = text.replace(DATE_OR_NUMBER_PII_RE, "");
  text = text.replace(EMAIL_OR_URL_RE, "");
  text = text.replace(HANJA_RE, "");
  text = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

  // 첫 문장만 추출
  const sentenceMatch = text.match(/^(.+?[.!?…])(?:\s|$)/);
  const firstSentence = (sentenceMatch ? sentenceMatch[1] : text)
    .replace(/^["'“”‘’\-•·*\s]+|["'“”‘’\s]+$/g, "")
    .trim();

  if (!firstSentence) {
    return "서로의 결이 자연스럽게 스며드는 다정한 흐름이에요.";
  }

  const maxLen = 58;
  if (firstSentence.length <= maxLen) {
    return firstSentence;
  }

  const sliced = firstSentence.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace >= 24 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.replace(/[,.!?…\s]+$/, "")}…`;
}
