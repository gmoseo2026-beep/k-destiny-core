// ─── Country & City Data for Onboarding Dropdown ───
export interface CountryData {
  code: string;
  name: Record<string, string>; // locale → display name
  cities: { code: string; name: Record<string, string> }[];
}

export const COUNTRIES: CountryData[] = [
  {
    code: "KR", name: { ko: "대한민국", en: "South Korea", ja: "韓国", es: "Corea del Sur", de: "Südkorea", fr: "Corée du Sud" },
    cities: [
      { code: "SEL", name: { ko: "서울", en: "Seoul", ja: "ソウル", es: "Seúl", de: "Seoul", fr: "Séoul" } },
      { code: "BUS", name: { ko: "부산", en: "Busan", ja: "釜山", es: "Busan", de: "Busan", fr: "Busan" } },
      { code: "ICN", name: { ko: "인천", en: "Incheon", ja: "仁川", es: "Incheon", de: "Incheon", fr: "Incheon" } },
      { code: "DGU", name: { ko: "대구", en: "Daegu", ja: "大邱", es: "Daegu", de: "Daegu", fr: "Daegu" } },
      { code: "DJN", name: { ko: "대전", en: "Daejeon", ja: "大田", es: "Daejeon", de: "Daejeon", fr: "Daejeon" } },
      { code: "GWJ", name: { ko: "광주", en: "Gwangju", ja: "光州", es: "Gwangju", de: "Gwangju", fr: "Gwangju" } },
      { code: "ULS", name: { ko: "울산", en: "Ulsan", ja: "蔚山", es: "Ulsan", de: "Ulsan", fr: "Ulsan" } },
      { code: "SWN", name: { ko: "수원", en: "Suwon", ja: "水原", es: "Suwon", de: "Suwon", fr: "Suwon" } },
      { code: "JJU", name: { ko: "제주", en: "Jeju", ja: "済州", es: "Jeju", de: "Jeju", fr: "Jeju" } },
      { code: "CCN", name: { ko: "천안", en: "Cheonan", ja: "天安", es: "Cheonan", de: "Cheonan", fr: "Cheonan" } },
    ],
  },
  {
    code: "US", name: { ko: "미국", en: "United States", ja: "アメリカ", es: "Estados Unidos", de: "USA", fr: "États-Unis" },
    cities: [
      { code: "NYC", name: { ko: "뉴욕", en: "New York", ja: "ニューヨーク", es: "Nueva York", de: "New York", fr: "New York" } },
      { code: "LAX", name: { ko: "로스앤젤레스", en: "Los Angeles", ja: "ロサンゼルス", es: "Los Ángeles", de: "Los Angeles", fr: "Los Angeles" } },
      { code: "CHI", name: { ko: "시카고", en: "Chicago", ja: "シカゴ", es: "Chicago", de: "Chicago", fr: "Chicago" } },
      { code: "HOU", name: { ko: "휴스턴", en: "Houston", ja: "ヒューストン", es: "Houston", de: "Houston", fr: "Houston" } },
      { code: "SFO", name: { ko: "샌프란시스코", en: "San Francisco", ja: "サンフランシスコ", es: "San Francisco", de: "San Francisco", fr: "San Francisco" } },
      { code: "SEA", name: { ko: "시애틀", en: "Seattle", ja: "シアトル", es: "Seattle", de: "Seattle", fr: "Seattle" } },
    ],
  },
  {
    code: "JP", name: { ko: "일본", en: "Japan", ja: "日本", es: "Japón", de: "Japan", fr: "Japon" },
    cities: [
      { code: "TYO", name: { ko: "도쿄", en: "Tokyo", ja: "東京", es: "Tokio", de: "Tokio", fr: "Tokyo" } },
      { code: "OSA", name: { ko: "오사카", en: "Osaka", ja: "大阪", es: "Osaka", de: "Osaka", fr: "Osaka" } },
      { code: "KYO", name: { ko: "교토", en: "Kyoto", ja: "京都", es: "Kioto", de: "Kyoto", fr: "Kyoto" } },
      { code: "FUK", name: { ko: "후쿠오카", en: "Fukuoka", ja: "福岡", es: "Fukuoka", de: "Fukuoka", fr: "Fukuoka" } },
      { code: "SAP", name: { ko: "삿포로", en: "Sapporo", ja: "札幌", es: "Sapporo", de: "Sapporo", fr: "Sapporo" } },
    ],
  },
  {
    code: "CN", name: { ko: "중국", en: "China", ja: "中国", es: "China", de: "China", fr: "Chine" },
    cities: [
      { code: "BEJ", name: { ko: "베이징", en: "Beijing", ja: "北京", es: "Pekín", de: "Peking", fr: "Pékin" } },
      { code: "SHA", name: { ko: "상하이", en: "Shanghai", ja: "上海", es: "Shanghái", de: "Shanghai", fr: "Shanghai" } },
      { code: "GUZ", name: { ko: "광저우", en: "Guangzhou", ja: "広州", es: "Cantón", de: "Guangzhou", fr: "Canton" } },
      { code: "SHZ", name: { ko: "선전", en: "Shenzhen", ja: "深圳", es: "Shenzhen", de: "Shenzhen", fr: "Shenzhen" } },
    ],
  },
  {
    code: "GB", name: { ko: "영국", en: "United Kingdom", ja: "イギリス", es: "Reino Unido", de: "Großbritannien", fr: "Royaume-Uni" },
    cities: [
      { code: "LON", name: { ko: "런던", en: "London", ja: "ロンドン", es: "Londres", de: "London", fr: "Londres" } },
      { code: "MAN", name: { ko: "맨체스터", en: "Manchester", ja: "マンチェスター", es: "Mánchester", de: "Manchester", fr: "Manchester" } },
      { code: "BIR", name: { ko: "버밍엄", en: "Birmingham", ja: "バーミンガム", es: "Birmingham", de: "Birmingham", fr: "Birmingham" } },
    ],
  },
  {
    code: "DE", name: { ko: "독일", en: "Germany", ja: "ドイツ", es: "Alemania", de: "Deutschland", fr: "Allemagne" },
    cities: [
      { code: "BER", name: { ko: "베를린", en: "Berlin", ja: "ベルリン", es: "Berlín", de: "Berlin", fr: "Berlin" } },
      { code: "MUN", name: { ko: "뮌헨", en: "Munich", ja: "ミュンヘン", es: "Múnich", de: "München", fr: "Munich" } },
      { code: "FRA", name: { ko: "프랑크푸르트", en: "Frankfurt", ja: "フランクフルト", es: "Fráncfort", de: "Frankfurt", fr: "Francfort" } },
    ],
  },
  {
    code: "FR", name: { ko: "프랑스", en: "France", ja: "フランス", es: "Francia", de: "Frankreich", fr: "France" },
    cities: [
      { code: "PAR", name: { ko: "파리", en: "Paris", ja: "パリ", es: "París", de: "Paris", fr: "Paris" } },
      { code: "LYO", name: { ko: "리옹", en: "Lyon", ja: "リヨン", es: "Lyon", de: "Lyon", fr: "Lyon" } },
      { code: "MAR", name: { ko: "마르세유", en: "Marseille", ja: "マルセイユ", es: "Marsella", de: "Marseille", fr: "Marseille" } },
    ],
  },
  {
    code: "ES", name: { ko: "스페인", en: "Spain", ja: "スペイン", es: "España", de: "Spanien", fr: "Espagne" },
    cities: [
      { code: "MAD", name: { ko: "마드리드", en: "Madrid", ja: "マドリード", es: "Madrid", de: "Madrid", fr: "Madrid" } },
      { code: "BCN", name: { ko: "바르셀로나", en: "Barcelona", ja: "バルセロナ", es: "Barcelona", de: "Barcelona", fr: "Barcelone" } },
    ],
  },
  {
    code: "CA", name: { ko: "캐나다", en: "Canada", ja: "カナダ", es: "Canadá", de: "Kanada", fr: "Canada" },
    cities: [
      { code: "TOR", name: { ko: "토론토", en: "Toronto", ja: "トロント", es: "Toronto", de: "Toronto", fr: "Toronto" } },
      { code: "VAN", name: { ko: "밴쿠버", en: "Vancouver", ja: "バンクーバー", es: "Vancouver", de: "Vancouver", fr: "Vancouver" } },
      { code: "MTL", name: { ko: "몬트리올", en: "Montreal", ja: "モントリオール", es: "Montreal", de: "Montreal", fr: "Montréal" } },
    ],
  },
  {
    code: "AU", name: { ko: "호주", en: "Australia", ja: "オーストラリア", es: "Australia", de: "Australien", fr: "Australie" },
    cities: [
      { code: "SYD", name: { ko: "시드니", en: "Sydney", ja: "シドニー", es: "Sídney", de: "Sydney", fr: "Sydney" } },
      { code: "MEL", name: { ko: "멜버른", en: "Melbourne", ja: "メルボルン", es: "Melbourne", de: "Melbourne", fr: "Melbourne" } },
    ],
  },
  {
    code: "TH", name: { ko: "태국", en: "Thailand", ja: "タイ", es: "Tailandia", de: "Thailand", fr: "Thaïlande" },
    cities: [
      { code: "BKK", name: { ko: "방콕", en: "Bangkok", ja: "バンコク", es: "Bangkok", de: "Bangkok", fr: "Bangkok" } },
      { code: "CNX", name: { ko: "치앙마이", en: "Chiang Mai", ja: "チェンマイ", es: "Chiang Mai", de: "Chiang Mai", fr: "Chiang Mai" } },
    ],
  },
  {
    code: "VN", name: { ko: "베트남", en: "Vietnam", ja: "ベトナム", es: "Vietnam", de: "Vietnam", fr: "Viêt Nam" },
    cities: [
      { code: "HAN", name: { ko: "하노이", en: "Hanoi", ja: "ハノイ", es: "Hanói", de: "Hanoi", fr: "Hanoï" } },
      { code: "SGN", name: { ko: "호치민", en: "Ho Chi Minh City", ja: "ホーチミン", es: "Ciudad Ho Chi Minh", de: "Ho-Chi-Minh-Stadt", fr: "Hô Chi Minh-Ville" } },
    ],
  },
  {
    code: "PH", name: { ko: "필리핀", en: "Philippines", ja: "フィリピン", es: "Filipinas", de: "Philippinen", fr: "Philippines" },
    cities: [
      { code: "MNL", name: { ko: "마닐라", en: "Manila", ja: "マニラ", es: "Manila", de: "Manila", fr: "Manille" } },
      { code: "CEB", name: { ko: "세부", en: "Cebu", ja: "セブ", es: "Cebú", de: "Cebu", fr: "Cebu" } },
    ],
  },
  {
    code: "IN", name: { ko: "인도", en: "India", ja: "インド", es: "India", de: "Indien", fr: "Inde" },
    cities: [
      { code: "DEL", name: { ko: "뉴델리", en: "New Delhi", ja: "ニューデリー", es: "Nueva Delhi", de: "Neu-Delhi", fr: "New Delhi" } },
      { code: "MUM", name: { ko: "뭄바이", en: "Mumbai", ja: "ムンバイ", es: "Bombay", de: "Mumbai", fr: "Bombay" } },
      { code: "BLR", name: { ko: "방갈로르", en: "Bangalore", ja: "バンガロール", es: "Bangalore", de: "Bangalore", fr: "Bangalore" } },
    ],
  },
  {
    code: "BR", name: { ko: "브라질", en: "Brazil", ja: "ブラジル", es: "Brasil", de: "Brasilien", fr: "Brésil" },
    cities: [
      { code: "SAO", name: { ko: "상파울루", en: "São Paulo", ja: "サンパウロ", es: "São Paulo", de: "São Paulo", fr: "São Paulo" } },
      { code: "RIO", name: { ko: "리우데자네이루", en: "Rio de Janeiro", ja: "リオデジャネイロ", es: "Río de Janeiro", de: "Rio de Janeiro", fr: "Rio de Janeiro" } },
    ],
  },
  {
    code: "MX", name: { ko: "멕시코", en: "Mexico", ja: "メキシコ", es: "México", de: "Mexiko", fr: "Mexique" },
    cities: [
      { code: "MEX", name: { ko: "멕시코시티", en: "Mexico City", ja: "メキシコシティ", es: "Ciudad de México", de: "Mexiko-Stadt", fr: "Mexico" } },
    ],
  },
  {
    code: "SG", name: { ko: "싱가포르", en: "Singapore", ja: "シンガポール", es: "Singapur", de: "Singapur", fr: "Singapour" },
    cities: [
      { code: "SIN", name: { ko: "싱가포르", en: "Singapore", ja: "シンガポール", es: "Singapur", de: "Singapur", fr: "Singapour" } },
    ],
  },
  {
    code: "OTHER", name: { ko: "기타", en: "Other", ja: "その他", es: "Otro", de: "Andere", fr: "Autre" },
    cities: [
      { code: "OTH", name: { ko: "기타", en: "Other", ja: "その他", es: "Otro", de: "Andere", fr: "Autre" } },
    ],
  },
];

// Helper: Resolve to English name for API payload
export function getCountryEnglishName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name.en || code;
}
export function getCityEnglishName(countryCode: string, cityCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country?.cities.find(c => c.code === cityCode)?.name.en || cityCode;
}
