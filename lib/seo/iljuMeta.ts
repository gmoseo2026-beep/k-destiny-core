/**
 * 60갑자 일주 결정론 근거 테이블 (위 글자 10종 × 아래 글자 12종 × 띠 동물 × 계절·시간 × 기운 관계 × 고유 장면).
 * - 사주 엔진(lib/saju.ts)은 수정하지 않고 읽기 전용으로만 연결한다.
 * - 한자 키(hanjaKey)는 lib/saju.ts의 fourPillars.day 매핑 전용이며 화면에 절대 노출하지 않는다.
 */

export type SimpleElem = "tree" | "fire" | "earth" | "metal" | "water";

export interface StemMeta {
  ko: string;
  rom: string;
  elem: SimpleElem;
  yin: boolean;
  natureImage: string;
  loveTemperament: string;
}

export interface BranchMeta {
  ko: string;
  rom: string;
  elem: SimpleElem;
  yin: boolean;
  animal: string;
  seasonTime: string;
  atmosphere: string;
  sixPartnerIdx: number;
}

export const STEMS: readonly StemMeta[] = [
  {
    ko: "갑",
    rom: "gap",
    elem: "tree",
    yin: false,
    natureImage: "하늘을 향해 곧게 뻗어 올라가는 아름드리 큰 나무",
    loveTemperament: "마음이 생기면 에둘러 말하지 않고 앞장서서 챙기며, 내 사람에게 든든한 그늘이 되어 주려 하지만 자존심이 꺾이면 급격히 말수가 줄어드는 기질",
  },
  {
    ko: "을",
    rom: "eul",
    elem: "tree",
    yin: true,
    natureImage: "바람에 유연하게 흔들려도 뿌리를 단단히 내리는 들꽃과 덩굴",
    loveTemperament: "상대의 말투와 표정 변화를 섬세하게 읽고 자연스럽게 스며들며, 부드러워 보이지만 한 번 마음 준 인연은 끈기 있게 이어 가는 기질",
  },
  {
    ko: "병",
    rom: "byeong",
    elem: "fire",
    yin: false,
    natureImage: "구름을 뚫고 사방을 환하게 비추는 한낮의 태양",
    loveTemperament: "좋아하는 감정이 얼굴과 목소리에 그대로 드러나고 좋은 것을 보면 가장 먼저 공유하고 싶어 하며, 화끈한 대신 뒤끝이 없는 기질",
  },
  {
    ko: "정",
    rom: "jeong",
    elem: "fire",
    yin: true,
    natureImage: "어두운 밤방과 차가운 손을 은은하게 데우는 촛불과 모닥불",
    loveTemperament: "겉으로는 차분해 보여도 한 사람에게 꽂히면 깊고 오래 온기를 유지하며, 사소한 대화와 날짜까지 세심하게 기억하는 기질",
  },
  {
    ko: "무",
    rom: "mu",
    elem: "earth",
    yin: false,
    natureImage: "비바람에도 자리에서 흔들리지 않는 넓은 산과 고원",
    loveTemperament: "말수는 많지 않아도 묵직한 행동과 약속 이행으로 마음을 증명하고, 상대의 기분 기복을 넉넉하게 받아 주지만 속내를 늦게 꺼내는 기질",
  },
  {
    ko: "기",
    rom: "gi",
    elem: "earth",
    yin: true,
    natureImage: "작은 씨앗을 품어 꽃과 열매를 키워 내는 포근한 텃밭 흙",
    loveTemperament: "밥은 먹었는지, 집에 잘 들어갔는지 살뜰하게 일상을 챙기며 편안한 안식처가 되어 주지만, 혼자 속으로 서운함을 곱씹기 쉬운 기질",
  },
  {
    ko: "경",
    rom: "gyeong",
    elem: "metal",
    yin: false,
    natureImage: "결이 단단하고 선이 또렷한 바위와 원석",
    loveTemperament: "애매한 어장관리나 밀당을 딱 잘라 싫어하고, 내 편이라고 확신이 서면 어떤 상황에서도 의리와 책임을 끝까지 지키는 담백한 기질",
  },
  {
    ko: "신",
    rom: "sin",
    elem: "metal",
    yin: true,
    natureImage: "정교하게 세공되어 맑은 빛을 내는 보석과 작은 은방울",
    loveTemperament: "취향과 예의의 기준이 분명해 처음엔 새침해 보일 수 있지만, 마음을 허락한 사람에게는 누구보다 순도 높고 세심한 다정함을 보여 주는 기질",
  },
  {
    ko: "임",
    rom: "im",
    elem: "water",
    yin: false,
    natureImage: "막힘없이 유유히 흘러가는 깊고 넓은 강과 바다",
    loveTemperament: "생각의 폭이 넓고 유연해 상대를 구속하지 않고 편안하게 감싸 주면서도, 속마음의 가장 깊은 바닥은 쉽게 다 보여 주지 않는 기질",
  },
  {
    ko: "계",
    rom: "gye",
    elem: "water",
    yin: true,
    natureImage: "소리 없이 스며들어 마른 땅을 적시는 봄비와 새벽 이슬",
    loveTemperament: "말하지 않은 기류까지 직관적으로 알아채고 다정하게 감정을 어루만져 주며, 여리고 맑은 감수성으로 둘만의 정서적 교감을 중시하는 기질",
  },
] as const;

export const BRANCHES: readonly BranchMeta[] = [
  {
    ko: "자",
    rom: "ja",
    elem: "water",
    yin: true,
    animal: "쥐",
    seasonTime: "한겨울 자정 무렵의 고요한 밤",
    atmosphere: "소음이 가라앉은 밤시간에 생각이 깊어지고, 사람들 앞보다 단둘이 있을 때 집중력과 애정 표현이 훨씬 진해지는 분위기",
    sixPartnerIdx: 1,
  },
  {
    ko: "축",
    rom: "chuk",
    elem: "earth",
    yin: true,
    animal: "소",
    seasonTime: "깊은 겨울 동트기 직전의 차분한 새벽",
    atmosphere: "찬 공기를 버티며 봄을 기다리는 땅처럼 초반에는 신중하고 느리지만, 한 번 정이 들면 묵묵한 인내심으로 곁을 지키는 분위기",
    sixPartnerIdx: 0,
  },
  {
    ko: "인",
    rom: "in",
    elem: "tree",
    yin: false,
    animal: "호랑이",
    seasonTime: "초봄 이른 새벽 막 기지개를 켜는 숲길",
    atmosphere: "새로운 시작과 설렘에 반응이 빠르고, 함께 가 볼 곳과 해 볼 일을 먼저 제안하며 관계에 생동감을 불어넣는 분위기",
    sixPartnerIdx: 11,
  },
  {
    ko: "묘",
    rom: "myo",
    elem: "tree",
    yin: true,
    animal: "토끼",
    seasonTime: "한봄 따스한 아침 햇살이 드는 꽃길",
    atmosphere: "다정한 말투와 아기자기한 일상 공유에서 행복을 느끼고, 거친 언쟁보다 부드러운 눈맞춤과 공감을 소중히 여기는 분위기",
    sixPartnerIdx: 10,
  },
  {
    ko: "진",
    rom: "jin",
    elem: "earth",
    yin: false,
    animal: "용",
    seasonTime: "늦봄 물안개가 피어오르는 비옥한 오전 들판",
    atmosphere: "현실적인 든든함과 낭만적인 상상력을 함께 품고 있어, 평소엔 너그럽다가도 가끔 예상 밖의 드라마틱한 설렘을 찾는 분위기",
    sixPartnerIdx: 9,
  },
  {
    ko: "사",
    rom: "sa",
    elem: "fire",
    yin: false,
    animal: "뱀",
    seasonTime: "초여름 햇살이 달아오르는 한낮 직전",
    atmosphere: "감각과 센스가 뛰어나 대화의 결이 세련되고, 호감 있는 상대의 취향을 빠르게 파악해 설레는 데이트 공기를 만드는 분위기",
    sixPartnerIdx: 8,
  },
  {
    ko: "오",
    rom: "o",
    elem: "fire",
    yin: false,
    animal: "말",
    seasonTime: "한여름 정오의 가장 환하고 뜨거운 광장",
    atmosphere: "감정의 온도가 빠르게 오르고 솔직하게 드러나며, 답답하게 숨기기보다 시원하게 만나고 웃으며 에너지를 나누는 분위기",
    sixPartnerIdx: 7,
  },
  {
    ko: "미",
    rom: "mi",
    elem: "earth",
    yin: true,
    animal: "양",
    seasonTime: "늦여름 오후 열기가 여운처럼 남은 들녘",
    atmosphere: "겉으로는 온화하고 평화롭지만 속에는 은근한 고집과 깊은 정이 함께 자리해, 익숙해질수록 따뜻한 애착이 강해지는 분위기",
    sixPartnerIdx: 6,
  },
  {
    ko: "신",
    rom: "sin",
    elem: "metal",
    yin: false,
    animal: "원숭이",
    seasonTime: "초가을 선선한 바람이 부는 늦오후 바위길",
    atmosphere: "재치와 상황 판단이 빨라 대화가 지루할 틈이 없고, 문제를 깔끔하게 해결해 주며 활동적인 데이트를 즐기는 분위기",
    sixPartnerIdx: 5,
  },
  {
    ko: "유",
    rom: "yu",
    elem: "metal",
    yin: true,
    animal: "닭",
    seasonTime: "한가을 해질녘 이슬이 맺힌 정갈한 정원",
    atmosphere: "약속 시간·말투·작은 매너 같은 디테일에서 진심을 읽고, 내 사람에게는 세심하고 깔끔한 정성을 쏟는 분위기",
    sixPartnerIdx: 4,
  },
  {
    ko: "술",
    rom: "sul",
    elem: "earth",
    yin: false,
    animal: "개",
    seasonTime: "늦가을 노을 지는 초저녁 모닥불씨를 품은 언덕",
    atmosphere: "서늘한 저녁 공기 속 불씨처럼 외로움을 잘 타면서도 의리가 깊어, 내 편이 된 사람과의 추억과 신뢰를 오래 지키는 분위기",
    sixPartnerIdx: 3,
  },
  {
    ko: "해",
    rom: "hae",
    elem: "water",
    yin: false,
    animal: "돼지",
    seasonTime: "초겨울 깊은 밤 모든 물줄기가 모이는 넓은 바다",
    atmosphere: "마음의 품이 넓고 감수성이 풍부해 상대의 허물까지 넉넉히 안아 주며, 밤늦은 깊은 대화와 따뜻한 스킨십에 약한 분위기",
    sixPartnerIdx: 2,
  },
] as const;

const HANJA_STEMS = ["\u7532", "\u4E59", "\u4E19", "\u4E01", "\u620A", "\u5DF1", "\u5E9A", "\u8F9B", "\u58EC", "\u7678"] as const;
const HANJA_BRANCHES = ["\u5B50", "\u4E11", "\u5BC5", "\u536F", "\u8FB0", "\u5DF3", "\u5348", "\u672A", "\u7533", "\u9149", "\u620C", "\u4EA5"] as const;

const GENERATES: Record<SimpleElem, SimpleElem> = {
  tree: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "tree",
};

const SHAPES: Record<SimpleElem, SimpleElem> = {
  tree: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "tree",
};

export function describeUpperLowerRelation(upper: SimpleElem, lower: SimpleElem): string {
  if (upper === lower) {
    return "위와 아래가 같은 결의 에너지로 단단히 겹쳐져 있어요. 좋아하는 마음도 주관도 또렷해 흔들림이 적지만, 서운할 때 자존심까지 함께 세워지면 먼저 굽히기 어려워 부드러운 대화 신호가 중요해요.";
  }
  if (GENERATES[lower] === upper) {
    return "아래의 계절 기운이 위의 성향을 조용히 북돋아 주는 구조예요. 상대에게 사랑받고 인정받는다고 느낄 때 가장 다정해지지만, 혼자 있는 시간에 생각을 깊게 굴리며 넘겨짚기 쉬운 면이 있어요.";
  }
  if (GENERATES[upper] === lower) {
    return "위의 마음이 아래로 막힘없이 흘러가 표현으로 피어나는 구조예요. 좋아하는 사람에게 리액션·선물·다정한 행동을 아낌없이 쏟는 만큼, 상대의 반응이 미지근하면 급격히 허전함을 느끼기 쉬워요.";
  }
  if (SHAPES[upper] === lower) {
    return "위가 아래를 다듬고 가꾸며 현실적인 책임을 다하려는 구조예요. 연애에서도 빈말보다 실질적인 도움과 함께 그리는 일상 계획을 중시하지만, 내 마음의 속도대로 상대를 이끌려다 조급해질 때가 있어요.";
  }
  if (SHAPES[lower] === upper) {
    return "아래의 기운이 위를 적당히 긴장시키고 단련시키는 구조예요. 좋아하는 사람 앞일수록 예의와 단정한 모습을 지키려 애쓰지만, 속으로는 '수고했어, 내 편이야'라는 따뜻한 한마디에 무장해제되는 반전이 있어요.";
  }
  return "위와 아래의 서로 다른 매력이 맞물려 상황에 따라 유연하게 온도를 바꾸는 구조예요.";
}

/** 60갑자 각각의 고유 풍경 비유 · 키워드 3개 · 일상 연애 장면 시드 (60개 전부 고유) */
export const UNIQUE_60_SEEDS: readonly {
  metaphor: string;
  keywords: readonly [string, string, string];
  sceneSeed: string;
}[] = [
  // 0~9: 갑자 ~ 계유
  { metaphor: "한겨울 밤 샘물가의 큰 나무", keywords: ["솔직한 직진", "깊은 밤사색", "든든한 울타리"], sceneSeed: "심야 산책길 편의점 따뜻한 음료, 잠들기 전 길어지는 통화, 자존심 상했을 때의 짧은 단답" },
  { metaphor: "동트기 전 언 땅을 뚫고 피는 들꽃", keywords: ["느린 스며듦", "묵묵한 지구력", "살뜰한 기억력"], sceneSeed: "추운 날 주머니에 챙겨 온 핫팩, 세 번 참다 조용히 정리하는 장문 카톡, 단골 국물 맛집 데이트" },
  { metaphor: "초봄 새벽 숲을 깨우는 아침 태양", keywords: ["투명한 직구", "새출발 에너지", "뒤끝 없는 화해"], sceneSeed: "주말 아침 즉흥 드라이브 제안, 맛있는 빵집 발견하자마자 찍어 보내는 사진, 읽씹에 금방 시무룩해지는 순간" },
  { metaphor: "봄꽃 오솔길을 비추는 따뜻한 등불", keywords: ["은은한 몰입", "다정한 눈맞춤", "섬세한 감수성"], sceneSeed: "조명 낮은 골목 심야 카페, 두 달 전 스치듯 말한 디저트 기억하기, 말투가 차가워지면 혼자 밤새 복기하기" },
  { metaphor: "물안개 낀 봄 들판의 넉넉한 산", keywords: ["묵직한 포용", "은근한 낭만", "느긋한 신뢰"], sceneSeed: "비 오는 날 우산 기울여 씌워 주기, 바쁜 평일 저녁 묵묵히 데리러 오기, 재촉할수록 더 입을 닫는 타이밍" },
  { metaphor: "초여름 햇살 아래 데워진 포근한 텃밭", keywords: ["현실적 다정함", "센스 있는 챙김", "편안한 대화"], sceneSeed: "점심시간 메뉴 추천과 배달 기프티콘, 여행 가기 전 꼼꼼히 챙긴 상비약 파우치, 내 수고를 당연하게 여길 때의 거리두기" },
  { metaphor: "한여름 정오 열기를 머금은 단단한 바위", keywords: ["담백한 결단", "뜨거운 의리", "쿨한 겉과 여린 속"], sceneSeed: "고민 상담에 해결책부터 내놓았다가 아차 하는 순간, 더운 날 시원한 곳 미리 예약해 두기, 밀당 신호에 바로 식는 순간" },
  { metaphor: "늦여름 오후 온기를 품은 세공 보석", keywords: ["정갈한 취향", "은근한 애착", "순도 높은 진심"], sceneSeed: "향수와 옷차림 디테일 칭찬, 조용한 전시회 뒤 와인바 코스, 무례한 농담 한마디에 마음의 문을 닫는 장면" },
  { metaphor: "초가을 바위산을 시원하게 흐르는 강물", keywords: ["재치 있는 여유", "넓은 포용력", "자유로운 호흡"], sceneSeed: "퇴근길 웃긴 밈과 음성 메시지 티키타카, 구속 없는 각자의 취미 존중, 집착성 확인 연락에 숨이 막히는 순간" },
  { metaphor: "한가을 해질녘 정원에 내리는 맑은 이슬", keywords: ["빠른 눈치", "투명한 교감", "세심한 매너"], sceneSeed: "목소리 톤만으로 피곤함 알아채기, 기념일 손편지 한 장의 진심, 약속 시간 늦고 변명할 때 차갑게 식는 표정" },

  // 10~19: 갑술 ~ 계미
  { metaphor: "늦가을 노을 언덕을 지키는 큰 나무", keywords: ["의리 있는 보호", "초저녁 감성", "단단한 책임감"], sceneSeed: "퇴근길 지하철역 앞 기다림, 힘든 하루 끝에 건네는 묵묵한 토닥임, 비교하는 말에 오래 남는 상처" },
  { metaphor: "초겨울 밤바다 위에 떠 있는 연꽃", keywords: ["깊은 공감력", "부드러운 포용", "여운 긴 다정함"], sceneSeed: "비 오는 밤 차 안에서 듣는 플레이리스트 공유, 상대의 실수를 감싸 주는 말투, 혼자 감정을 떠안다 지치는 밤" },
  { metaphor: "한겨울 자정 밤하늘을 비추는 불빛", keywords: ["반전 매력", "예의 바른 열정", "깊은 속정"], sceneSeed: "모임에서는 밝다가 단둘이 남으면 조용히 깊어지는 눈빛, 자정 넘겨 도착하는 안부 메시지, 체면 깎이는 상황에 민감한 순간" },
  { metaphor: "새벽 눈밭 위를 녹이는 작은 모닥불", keywords: ["끈기 있는 온기", "조용한 헌신", "깊은 집중력"], sceneSeed: "감기 기운 있다는 말에 문 앞에 걸어 둔 따뜻한 차, 오래 지켜본 뒤 꺼내는 진지한 고백, 가벼운 장난으로 진심이 취급될 때" },
  { metaphor: "초봄 숲이 우거진 웅장한 산봉우리", keywords: ["듬직한 추진력", "어른스러운 여유", "책임지는 사랑"], sceneSeed: "일정 꼬인 여행지에서 침착하게 대안 찾기, 연인의 진로 고민을 진지하게 들어주는 저녁, 잔소리가 반복될 때의 침묵" },
  { metaphor: "봄날 꽃핀 오솔길의 보드라운 흙길", keywords: ["아기자기한 배려", "다정한 생활감", "부드러운 조율"], sceneSeed: "함께 장 보며 저녁 메뉴 고르는 주말, 작게 적어 둔 데이트 버킷리스트, 급한 결정 강요받을 때의 당황" },
  { metaphor: "물안개 낀 봄 들판에 우뚝 선 바위", keywords: ["시원한 추진력", "솔직한 화법", "반전 허당미"], sceneSeed: "고민 없이 바로 잡아 주는 주말 맛집 예약, 툭 던지는 칭찬 뒤에 숨은 쑥스러움, 돌려 말하는 서운함을 눈치 못 채는 순간" },
  { metaphor: "초여름 햇살에 반짝이는 정교한 보석", keywords: ["세련된 감각", "은근한 열정", "분명한 호불호"], sceneSeed: "분위기 좋은 루프탑에서의 솔직한 대화, 깔끔하게 정리된 기념일 선물, 예고 없는 약속 변경에 예민해지는 순간" },
  { metaphor: "한여름 정오 파도가 일렁이는 넓은 바다", keywords: ["역동적 설렘", "솔직한 감정선", "시원한 스케일"], sceneSeed: "여름밤 바다 보러 가는 즉흥 출발, 좋으면 숨기지 못하는 빠른 답장 속도, 감정 기복을 솔직히 털어놓는 대화" },
  { metaphor: "늦여름 오후 마른 들녘을 적시는 단비", keywords: ["차분한 위로", "섬세한 현실감", "다정한 조율"], sceneSeed: "지친 평일 오후 조용히 건네는 커피 한 잔, 갈등이 생겼을 때 감정 대신 이유를 차분히 묻는 태도, 일방적 통보에 단호해지는 순간" },

  // 20~29: 갑신 ~ 계사
  { metaphor: "초가을 바위산 바람을 맞고 선 큰 나무", keywords: ["긴장감 있는 매력", "책임감과 절제", "은근한 다정함"], sceneSeed: "바쁜 일정 속에서도 쪼개서 만드는 1시간 데이트, 힘들어도 내색 않다가 칭찬 한마디에 풀리는 표정, 무책임한 약속 파기에 단호한 태도" },
  { metaphor: "가을 해질녘 정갈한 정원의 들꽃", keywords: ["단정한 배려", "섬세한 긴장감", "깔끔한 애정"], sceneSeed: "데이트 전 꼼꼼히 신경 쓴 옷차림, 상대의 체면을 세워 주는 모임 자리 매너, 서운함을 웃음으로 넘기다 혼자 지치는 저녁" },
  { metaphor: "늦가을 노을빛을 길게 머금은 태양", keywords: ["따뜻한 여운", "넉넉한 베풂", "꾸준한 온기"], sceneSeed: "노을 지는 한강변 산책 데이트, 주변 사람들에게까지 잘하는 내 편 자랑, 열정을 쏟아부은 뒤 찾아오는 짧은 공허함" },
  { metaphor: "초겨울 밤바다 위에 비치는 등대 불빛", keywords: ["맑은 직관", "고요한 다정함", "깊은 신뢰"], sceneSeed: "잠들기 전 조용히 나누는 하루 끝 통화, 말하지 않은 고민까지 짚어 주는 따뜻한 질문, 예의 없는 말투에 조용히 선 긋기" },
  { metaphor: "한겨울 밤 고요한 호수를 품은 큰 산", keywords: ["현실적 든든함", "세심한 챙김", "차분한 무게감"], sceneSeed: "비나 눈 오는 날 집 앞까지 바래다주는 발걸음, 함께 모으는 여행 통장 이야기, 갑작스러운 감정 폭발 앞에서 말문이 막히는 순간" },
  { metaphor: "동트기 전 겨울 새벽의 포근한 대지", keywords: ["우직한 성실함", "깊은 인내심", "변함없는 일상"], sceneSeed: "매일 같은 시간 빠짐없이 오는 출퇴근 안부, 아프다는 말에 조용히 사 들고 온 죽, 너무 참다가 한 번에 마음이 얼어붙는 순간" },
  { metaphor: "초봄 숲을 가르며 달리는 단단한 바위", keywords: ["과감한 실행력", "솔직한 승부욕", "투명한 의리"], sceneSeed: "썸 단계를 길게 끌지 않는 담백한 고백, 액티비티나 야외 나들이 데이트, 빙빙 돌려 떠보는 질문에 답답해하는 표정" },
  { metaphor: "한봄 꽃길 사이로 반짝이는 작은 보석", keywords: ["산뜻한 센스", "섬세한 취향", "다정한 긴장감"], sceneSeed: "봄날 소품샵과 브런치 카페 나들이, 작지만 취향을 정확히 저격한 선물, 거친 말투나 소리 높이는 다툼에 크게 다치는 마음" },
  { metaphor: "늦봄 들판을 가로질러 흐르는 큰 강", keywords: ["당당한 스케일", "유연한 추진력", "깊은 속마음"], sceneSeed: "넓은 시야로 상대의 고민을 정리해 주는 대화, 장거리 드라이브와 탁 트인 전망 데이트, 자존심을 건드리는 간섭에 거리를 두는 순간" },
  { metaphor: "초여름 햇살 위로 피어오르는 무지개 단비", keywords: ["감각적 센스", "빠른 공감", "현실과 낭만의 균형"], sceneSeed: "분위기 좋은 저녁 식사 자리 예약, 상대 기분에 맞춰 대화 주제를 자연스럽게 바꾸는 재치, 속마음을 다 말하지 않고 미소로 넘기는 순간" },

  // 30~39: 갑오 ~ 계묘
  { metaphor: "한여름 정오 햇살 아래 가지를 펼친 나무", keywords: ["화끈한 몰입", "밝은 표현력", "솔직한 열정"], sceneSeed: "좋아하는 마음이 생기면 숨기지 못하는 직진 데이트 신청, 함께 웃고 떠드는 페스티벌·야시장, 에너지 다 쏟고 혼자 충전이 필요한 일요일 밤" },
  { metaphor: "늦여름 오후 따뜻한 들녘에 뿌리내린 들꽃", keywords: ["부드러운 생활력", "오래가는 정", "현실적 배려"], sceneSeed: "평일 저녁 소박한 동네 산책과 편의점 아이스크림, 현실적인 일정 조율 센스, 은근한 고집이 부딪칠 때 부드럽게 넘어가는 유머" },
  { metaphor: "초가을 바위산을 환하게 비추는 오후 태양", keywords: ["경쾌한 활력", "센스 있는 리드", "분명한 매너"], sceneSeed: "퇴근 후 번개로 만나는 맛집 탐방, 어색한 공기를 단번에 풀어 주는 농담, 내 호의를 당연하게 여길 때 깔끔하게 거리를 두는 태도" },
  { metaphor: "가을 해질녘 정원을 밝히는 은은한 등불", keywords: ["낭만적 취향", "세심한 눈썰미", "깊은 여운"], sceneSeed: "조용한 LP바나 독립서점 데이트, 상대가 흘려 말한 취향을 메모해 두는 습관, 약속 직전 성의 없는 취소에 차갑게 가라앉는 마음" },
  { metaphor: "늦가을 초저녁 노을이 내려앉은 넓은 고원", keywords: ["흔들림 없는 주체성", "깊은 의리", "묵직한 진심"], sceneSeed: "오래 사귄 뒤에도 변함없이 지키는 주말 약속, 위기 상황에서 가장 먼저 달려오는 든든함, 둘 다 고집을 세우며 냉전이 길어지는 밤" },
  { metaphor: "초겨울 밤바다를 감싸 안은 포근한 해안 흙", keywords: ["따뜻한 수용력", "잔잔한 유머", "현실적 안정감"], sceneSeed: "집에서 함께 요리해 먹는 따뜻한 저녁, 상대의 서툰 모습까지 귀엽게 봐주는 여유, 말 안 해도 알아주길 바라다 서운해지는 순간" },
  { metaphor: "한겨울 밤 맑은 샘물 위에 비친 바위", keywords: ["또렷한 이성", "숨겨진 다정함", "섬세한 배려"], sceneSeed: "겉으론 무심한 듯 건네는 목도리와 우산, 늦은 밤 진지한 고민을 끝까지 들어주는 통화, 감정적으로 몰아붙일 때 차갑게 식는 말투" },
  { metaphor: "겨울 새벽 차가운 대지 속에서 빛나는 원석", keywords: ["차분한 인내", "순수한 진심", "단정한 신뢰"], sceneSeed: "오랜 기간 지켜보며 천천히 열리는 마음, 실속 있고 정성스러운 손편지와 선물, 가벼운 밀당에 아예 관심을 접어 버리는 단호함" },
  { metaphor: "초봄 새벽 숲을 적시며 흐르는 맑은 강", keywords: ["따뜻한 베풂", "새로움과 여유", "자연스러운 리드"], sceneSeed: "새로운 취미나 여행지를 함께 배우고 떠나는 주말, 상대의 기를 살려 주는 아낌없는 칭찬, 지나치게 세세한 보고 요구에 답답해지는 순간" },
  { metaphor: "한봄 꽃잎 위에 사뿐히 맺힌 아침 이슬", keywords: ["말랑한 다정함", "순수한 호감", "섬세한 공감"], sceneSeed: "꽃 피는 계절 공원 피크닉과 사진 찍어 주기, 다정하고 부드러운 카톡 말투, 거짓말이나 거친 언행 한 번에 깊이 실망하는 순간" },

  // 40~49: 갑진 ~ 계축
  { metaphor: "늦봄 비옥한 들판 한가운데 뿌리내린 큰 나무", keywords: ["든든한 생활력", "화통한 여유", "함께 크는 미래"], sceneSeed: "연인의 일상 문제를 내 일처럼 해결해 주는 추진력, 탁 트인 교외 카페 나들이, 내 방식이 맞다고 밀어붙이다 아차 하는 순간" },
  { metaphor: "초여름 햇살 길가에 화사하게 핀 들꽃", keywords: ["밝은 표현력", "다정한 리액션", "세련된 사교성"], sceneSeed: "만나자마자 환하게 웃으며 반겨 주는 첫인사, 예쁜 사진을 서로 찍어 주는 데이트, 관심과 리액션이 줄어들면 금방 외로워지는 밤" },
  { metaphor: "한여름 정오 가장 높이 뜬 눈부신 태양", keywords: ["강렬한 존재감", "불꽃 같은 직진", "화끈한 솔직함"], sceneSeed: "첫눈에 호감이 생기면 바로 표현하는 돌직구, 열정 넘치는 스포츠·콘서트 데이트, 욱해서 내뱉은 한마디를 곧바로 후회하는 순간" },
  { metaphor: "늦여름 오후 온기를 간직한 작은 화로", keywords: ["따스한 정", "부드러운 끈기", "세심한 보살핌"], sceneSeed: "식사 속도를 상대에게 조용히 맞춰 주는 매너, 사소한 기념일도 따뜻하게 챙기는 테이블, 서운함을 속으로 삭이다 표정이 굳어지는 순간" },
  { metaphor: "초가을 선선한 바람이 부는 바위산 능선", keywords: ["여유로운 센스", "깔끔한 해결력", "든든한 유머"], sceneSeed: "갑자기 비가 와도 웃으며 플랜 B로 안내하는 여유, 실질적인 조언과 든든한 에스코트, 감정 호소보다 논리가 앞서 오해받는 순간" },
  { metaphor: "한가을 해질녘 황금빛 들판의 고운 흙", keywords: ["살뜰한 정성", "깔끔한 살림감", "잔잔한 미소"], sceneSeed: "직접 포장해 온 간식과 정갈한 피크닉, 약속과 일정을 차분하게 챙기는 세심함, 내 정성을 가볍게 여기는 말에 조용히 멀어지는 순간" },
  { metaphor: "늦가을 노을 언덕 위에 우뚝 선 바위", keywords: ["단단한 절개", "묵직한 보호 본능", "솔직한 직언"], sceneSeed: "어려운 일이 생겼을 때 말없이 내 편에 서 주는 태도, 늦가을 야경 산책에서의 진솔한 대화, 자존심 때문에 보고 싶다는 말을 삼키는 밤" },
  { metaphor: "초겨울 깊은 밤바다에 비친 맑은 보석", keywords: ["투명한 감수성", "세련된 위트", "자유로운 진심"], sceneSeed: "심야 영화관 관람 뒤 밤거리를 걸으며 나누는 감상, 솔직하고 재치 있는 애정 표현, 억지 규칙으로 틀에 가두려 할 때 멀어지는 마음" },
  { metaphor: "한겨울 자정 깊이를 알 수 없는 큰 바다", keywords: ["깊은 포용과 열정", "강한 몰입", "솔직한 본능"], sceneSeed: "단둘이 있을 때 확 달라지는 깊은 눈빛과 스킨십 온도, 밤늦게 이어지는 진솔한 속마음 대화, 질투나 불안을 겉으로 숨기다 파도처럼 올라오는 순간" },
  { metaphor: "겨울 새벽 얼음 아래로 흐르는 맑은 샘물", keywords: ["침착한 직관", "은근한 단단함", "신중한 진심"], sceneSeed: "겉으론 담담하지만 상대의 컨디션을 누구보다 정확히 챙기는 메시지, 오래 신뢰를 확인한 뒤 여는 속마음, 가벼운 약속 남발에 차갑게 선 긋는 순간" },

  // 50~59: 갑인 ~ 계해
  { metaphor: "초봄 새벽 숲에 나란히 선 아름드리 나무", keywords: ["당당한 자립심", "시원한 직진", "함께 달리는 성장"], sceneSeed: "서로의 일과 꿈을 응원하는 건강한 데이트, 아침 일찍 떠나는 숲길·바다 여행, 지시하듯 말하는 태도에 자존심이 부딪치는 순간" },
  { metaphor: "한봄 아침 들판을 가득 채운 푸른 꽃밭", keywords: ["다정한 친화력", "부드러운 고집", "생기 있는 대화"], sceneSeed: "끊이지 않는 카톡 수다와 일상 사진 공유, 친구처럼 편안하다가도 설레는 장난, 혼자 결정해 통보하는 태도에 단단히 토라지는 순간" },
  { metaphor: "늦봄 넓은 들판 위로 쏟아지는 따스한 햇살", keywords: ["호탕한 다정함", "밝은 낙천성", "예의 바른 배려"], sceneSeed: "어색한 첫 만남에서도 금방 웃음을 터뜨리게 만드는 대화, 맛있는 음식 앞에 두고 나누는 칭찬, 속상한 일을 혼자 밝은 척 넘기는 순간" },
  { metaphor: "초여름 저녁 열기를 머금은 밝은 등불", keywords: ["집중력 있는 애정", "화사한 매력", "뜨거운 진심"], sceneSeed: "좋아하는 사람에게 시선이 고정되는 솔직한 눈빛, 분위기 있는 야외 테라스 저녁 데이트, 서운함이 쌓이면 한 번에 뜨겁게 터져 나오는 순간" },
  { metaphor: "한여름 정오 태양 아래 달궈진 높은 산", keywords: ["강한 카리스마", "화끈한 보호력", "깊은 자존심"], sceneSeed: "내 사람이 힘들 때 앞장서서 문제를 정리해 주는 든든함, 시원시원한 데이트 리드, 감정적으로 부딪칠 때 먼저 한 템포 식혀야 풀리는 밤" },
  { metaphor: "늦여름 오후 따스하게 마른 비옥한 대지", keywords: ["차분한 뚝심", "세심한 일상애", "은근한 주체성"], sceneSeed: "오래 만나도 한결같이 챙겨 주는 식사와 안부, 조용하고 아늑한 동네 단골집 데이트, 겉으론 맞춰 주지만 속으론 분명한 기준이 있는 순간" },
  { metaphor: "초가을 바위산 정상의 단단한 원석", keywords: ["확실한 선과 의리", "담백한 직구", "행동으로 하는 사랑"], sceneSeed: "빈말 대신 필요한 순간 정확히 도와주는 실행력, 깔끔하고 군더더기 없는 약속 정하기, 서로 고집을 꺾지 못해 말수가 줄어드는 순간" },
  { metaphor: "한가을 해질녘 맑게 울리는 순수한 보석", keywords: ["티 없는 진심", "예리한 감각", "단정한 애정"], sceneSeed: "깔끔하게 정돈된 공간에서의 오붓한 티타임, 작은 말실수 없이 상대를 존중하는 화법, 무신경한 태도에 상처받고 조용히 거리를 두는 순간" },
  { metaphor: "늦가을 초저녁 노을을 비추는 깊은 호수", keywords: ["넓은 이해심", "믿음직한 안정감", "깊은 여운"], sceneSeed: "어스름한 저녁 산책길에서 조용히 손을 잡아 주는 온기, 상대의 불안한 마음을 차분히 가라앉히는 목소리, 속마음을 혼자 감당하다 늦게 털어놓는 밤" },
  { metaphor: "초겨울 밤 모든 물길이 모이는 고요한 밤바다", keywords: ["깊은 직관력", "경계 없는 다정함", "풍부한 감수성"], sceneSeed: "말없이 옆에 앉아만 있어도 위로가 되는 밤 데이트, 상대의 기분 파장을 그대로 흡수하는 공감, 감정이 너무 깊어져 혼자 생각이 많아지는 새벽" },
] as const;

export interface IljuDeterministicFact {
  index: number;
  slug: string;
  koPair: string;
  name: string;
  title: string;
  hanjaKey: string;
  stem: StemMeta;
  branch: BranchMeta;
  animal: string;
  metaphor: string;
  keywords: readonly [string, string, string];
  relationNote: string;
  sceneSeed: string;
  matchSpecs: readonly [
    { index: number; tag: string; pairDynamics: string },
    { index: number; tag: string; pairDynamics: string },
    { index: number; tag: string; pairDynamics: string },
  ];
}

export const ILJU_FACTS: readonly IljuDeterministicFact[] = Array.from({ length: 60 }, (_, idx) => {
  const sIdx = idx % 10;
  const bIdx = idx % 12;
  const stem = STEMS[sIdx];
  const branch = BRANCHES[bIdx];
  const koPair = `${stem.ko}${branch.ko}`;
  const slug = `${stem.rom}${branch.rom}`;
  const name = `${koPair}일주`;
  const title = `${name} 연애 성향과 잘 맞는 사람`;
  const hanjaKey = `${HANJA_STEMS[sIdx]}${HANJA_BRANCHES[bIdx]}`;
  const seed = UNIQUE_60_SEEDS[idx];

  const findIndex = (targetS: number, targetB: number): number => {
    for (let k = 0; k < 60; k++) {
      if (k % 10 === targetS && k % 12 === targetB) return k;
    }
    return (idx + 1) % 60;
  };

  // 1) 위 글자 짝 + 아래 글자 단짝 (천합지합 — 마음의 방향과 일상 리듬이 동시에 맞물리는 단짝)
  const m1Idx = findIndex((sIdx + 5) % 10, branch.sixPartnerIdx);
  // 2) 자연스럽게 애정이 흘러가는 위 글자 + 같은 방향 호흡 짝 1 (함께 움직일수록 활기가 커지는 짝)
  const m2Idx = findIndex((sIdx + 2) % 10, (bIdx + 4) % 12);
  // 3) 나를 포근하게 채워 주는 위 글자 + 같은 방향 호흡 짝 2 (지친 날 편안하게 기댈 수 있는 짝)
  const m3Idx = findIndex((sIdx + 8) % 10, (bIdx + 8) % 12);

  return {
    index: idx,
    slug,
    koPair,
    name,
    title,
    hanjaKey,
    stem,
    branch,
    animal: branch.animal,
    metaphor: seed.metaphor,
    keywords: seed.keywords,
    relationNote: describeUpperLowerRelation(stem.elem, branch.elem),
    sceneSeed: seed.sceneSeed,
    matchSpecs: [
      {
        index: m1Idx,
        tag: "마음과 보폭이 단번에 맞물리는 단짝",
        pairDynamics: "두 사람의 겉 성향과 속 리듬이 자석처럼 자연스럽게 맞물려, 억지로 애쓰지 않아도 대화 템포와 데이트 보폭이 편안하게 맞아떨어지는 조합",
      },
      {
        index: m2Idx,
        tag: "함께할수록 웃음과 활기가 커지는 짝",
        pairDynamics: "함께 무언가를 계획하고 움직일 때 시너지가 살아나고, 내가 표현한 애정을 상대가 기분 좋게 받아 주어 연애의 설렘이 오래 유지되는 조합",
      },
      {
        index: m3Idx,
        tag: "지친 하루 끝에 마음이 놓이는 안식처 짝",
        pairDynamics: "말하지 못한 속생각이나 피로감을 상대가 넉넉하게 감싸 주어, 오래 만날수록 서로에게 가장 안전한 내 편이 되어 주는 조합",
      },
    ],
  };
});

export const DAY_PILLAR_TO_SLUG: Readonly<Record<string, string>> = Object.fromEntries(
  ILJU_FACTS.map((f) => [f.hanjaKey, f.slug])
);
