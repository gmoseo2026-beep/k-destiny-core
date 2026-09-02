const fs = require('fs');

const curationPath = 'C:\\dev\\tripgak\\data\\cities-curation.json';
const collectPath = 'C:\\dev\\tripgak\\lib\\osm\\collect.ts';

const newCities = [
  {
    "id": "kobe",
    "nameKo": "고베",
    "country": "일본",
    "region": "일본",
    "themes": [
      "미식",
      "야경",
      "시티투어"
    ],
    "budgetBand": "보통",
    "imageUrl": "",
    "description": "고베규와 항구 야경. 오사카에서 30분 거리인데 분위기는 완전히 다릅니다."
  },
  {
    "id": "hiroshima",
    "nameKo": "히로시마",
    "country": "일본",
    "region": "일본",
    "themes": [
      "역사",
      "문화",
      "미식"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "평화기념공원과 바다 위 도리이. 오코노미야키의 또 다른 본고장입니다."
  },
  {
    "id": "kagoshima",
    "nameKo": "가고시마",
    "country": "일본",
    "region": "일본",
    "themes": [
      "온천",
      "자연",
      "미식"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "연기 뿜는 사쿠라지마와 모래찜질 온천. 규슈 남쪽 끝의 화산 도시입니다."
  },
  {
    "id": "sendai",
    "nameKo": "센다이",
    "country": "일본",
    "region": "일본",
    "themes": [
      "미식",
      "자연",
      "시티투어"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "규탄과 마쓰시마 해안. 도호쿠 여행의 관문입니다."
  },
  {
    "id": "hakodate",
    "nameKo": "하코다테",
    "country": "일본",
    "region": "일본",
    "themes": [
      "야경",
      "미식",
      "온천"
    ],
    "budgetBand": "보통",
    "imageUrl": "",
    "description": "세계 3대 야경과 아침시장 해산물덮밥. 홋카이도 남쪽의 항구 도시입니다."
  },
  {
    "id": "nagasaki",
    "nameKo": "나가사키",
    "country": "일본",
    "region": "일본",
    "themes": [
      "야경",
      "역사",
      "문화"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "이나사야마 야경과 데지마. 일본에서 가장 이국적인 항구 도시입니다."
  },
  {
    "id": "kumamoto",
    "nameKo": "구마모토",
    "country": "일본",
    "region": "일본",
    "themes": [
      "역사",
      "자연",
      "온천"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "구마모토성과 아소산. 규슈 한가운데의 화산 지대입니다."
  },
  {
    "id": "takamatsu",
    "nameKo": "다카마쓰",
    "country": "일본",
    "region": "일본",
    "themes": [
      "미식",
      "자연",
      "문화"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "사누키 우동의 본고장이자 나오시마 예술섬으로 가는 관문입니다."
  },
  {
    "id": "ishigaki",
    "nameKo": "이시가키",
    "country": "일본",
    "region": "일본",
    "themes": [
      "해변",
      "휴양",
      "액티비티"
    ],
    "budgetBand": "여유",
    "imageUrl": "",
    "description": "오키나와보다 더 남쪽의 에메랄드 바다. 만타 다이빙으로 유명합니다."
  },
  {
    "id": "oita",
    "nameKo": "오이타",
    "country": "일본",
    "region": "일본",
    "themes": [
      "온천",
      "자연",
      "휴양"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "다카사키산 원숭이와 우미타마고. 벳푸·유후인으로 들어가는 관문입니다."
  },
  {
    "id": "kanazawa",
    "nameKo": "가나자와",
    "country": "일본",
    "region": "일본",
    "themes": [
      "전통",
      "문화",
      "미식"
    ],
    "budgetBand": "보통",
    "imageUrl": "",
    "description": "겐로쿠엔 정원과 히가시차야 거리. 전쟁을 피해 옛 모습이 남은 도시입니다."
  },
  {
    "id": "okayama",
    "nameKo": "오카야마",
    "country": "일본",
    "region": "일본",
    "themes": [
      "전통",
      "문화",
      "자연"
    ],
    "budgetBand": "가성비",
    "imageUrl": "",
    "description": "고라쿠엔과 구라시키 미관지구. 세토내해로 나가는 길목입니다."
  }
];

// Update curation
const curationData = JSON.parse(fs.readFileSync(curationPath, 'utf8'));
// Ensure we don't add duplicates
const existingIds = new Set(curationData.map(c => c.id));
for (const city of newCities) {
  if (!existingIds.has(city.id)) {
    curationData.push(city);
  }
}
fs.writeFileSync(curationPath, JSON.stringify(curationData, null, 2), 'utf8');

// Update collect.ts
const newQueries = `
  'kobe': 'kobe-shi, hyogo, japan',
  'hiroshima': 'hiroshima-shi, hiroshima, japan',
  'kagoshima': 'kagoshima-shi, kagoshima, japan',
  'sendai': 'sendai-shi, miyagi, japan',
  'hakodate': 'hakodate-shi, hokkaido, japan',
  'nagasaki': 'nagasaki-shi, nagasaki, japan',
  'kumamoto': 'kumamoto-shi, kumamoto, japan',
  'takamatsu': 'takamatsu-shi, kagawa, japan',
  'ishigaki': 'ishigaki-shi, okinawa, japan',
  'oita': 'oita-shi, oita, japan',
  'kanazawa': 'kanazawa-shi, ishikawa, japan',
  'okayama': 'okayama-shi, okayama, japan',`;

let collectContent = fs.readFileSync(collectPath, 'utf8');
const searchString = "const NOMINATIM_QUERY: Record<string, string> = {";
if (collectContent.includes(searchString) && !collectContent.includes("'kobe': 'kobe-shi, hyogo, japan'")) {
  collectContent = collectContent.replace(searchString, searchString + newQueries);
  fs.writeFileSync(collectPath, collectContent, 'utf8');
  console.log("collect.ts updated");
} else {
  console.log("collect.ts already updated or search string not found");
}
console.log("Done");
