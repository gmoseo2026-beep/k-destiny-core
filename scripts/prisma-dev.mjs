// scripts/prisma-dev.mjs — 개발 DB 전용 prisma 실행기. 운영 DB를 가리키면 거부한다.
// 사용: node scripts/prisma-dev.mjs db push
import { config } from "dotenv";
import { spawnSync } from "node:child_process";

const read = (path) => config({ path, processEnv: {}, quiet: true }).parsed?.DATABASE_URL ?? "";
const ident = (u) => {
  try {
    const x = new URL(u);
    return `${x.username}@${x.host}`;
  } catch {
    return "";
  }
};

const prod = read(".env");
const dev = read(".env.development.local");
if (!dev) {
  console.error("✖ .env.development.local 에 DATABASE_URL 이 없습니다. 개발 DB를 먼저 준비하세요.");
  process.exit(1);
}
if (ident(dev) === ident(prod)) {
  console.error("✖ 개발 DB가 운영 DB와 같은 프로젝트입니다. 중단합니다.");
  process.exit(1);
}
const r = spawnSync("npx", ["prisma", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: dev },
});
process.exit(r.status ?? 1);
