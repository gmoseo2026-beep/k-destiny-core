/**
 * 새 주소·바뀐 주소를 검색엔진에 바로 알린다(IndexNow — 네이버·빙이 지원).
 *
 *   npx tsx scripts/seo/indexnow.ts            # 운영 사이트맵의 모든 주소를 알린다
 *   npx tsx scripts/seo/indexnow.ts /ko/zodiac # 특정 주소만
 *
 * 열쇠는 비밀이 아니다 — 누구나 볼 수 있게 사이트 루트(public/<열쇠>.txt)에 두는 것이
 * 규약이고, 검색엔진은 그 파일로 "이 사이트 주인이 보낸 요청"임을 확인한다.
 * 배포가 끝난 뒤에 실행한다(열쇠 파일과 새 페이지가 운영에 있어야 한다).
 */
import fs from "fs";
import path from "path";

const HOST = "kongdak.kr";
const ORIGIN = `https://${HOST}`;
const ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://www.bing.com/indexnow"];

function readKey(): string {
  const dir = path.join(process.cwd(), "public");
  const file = fs.readdirSync(dir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (!file) throw new Error("public/<열쇠>.txt 가 없습니다");
  return file.replace(".txt", "");
}

async function sitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const key = readKey();
  const args = process.argv.slice(2);
  const urlList = args.length > 0 ? args.map((p) => (p.startsWith("http") ? p : `${ORIGIN}${p}`)) : await sitemapUrls();
  if (urlList.length === 0) throw new Error("알릴 주소가 없습니다");

  const keyLocation = `${ORIGIN}/${key}.txt`;
  const live = await fetch(keyLocation);
  if (!live.ok || (await live.text()).trim() !== key) throw new Error("운영에 열쇠 파일이 없습니다 — 배포 후 다시 실행하세요");

  let failed = false;
  for (const endpoint of ENDPOINTS) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
    });
    // 200·202 = 접수
    console.log(`${endpoint} → ${res.status} (${urlList.length}개 주소)`);
    if (res.status !== 200 && res.status !== 202) failed = true;
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
