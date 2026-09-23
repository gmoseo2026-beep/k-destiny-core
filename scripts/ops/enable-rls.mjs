// scripts/ops/enable-rls.mjs — 운영 DB public 테이블의 RLS 를 켠다(정책 없음 = Data API 의 anon/authenticated 차단).
// Prisma 는 테이블 소유자 역할로 접속하므로 영향이 없다. 소유자가 아닌 테이블이 있으면 중단한다.
// 사용: node scripts/ops/enable-rls.mjs             (dry-run, 변경 없음)
//       node scripts/ops/enable-rls.mjs --apply     (적용)
//       node scripts/ops/enable-rls.mjs --rollback=t1,t2  (원복: 적용 때 켠 테이블만 끈다)
//       node scripts/ops/enable-rls.mjs --rollback  (원복: RLS 가 켜진 public 테이블을 모두 끈다)
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });
const apply = process.argv.includes("--apply");
const rollback = process.argv.includes("--rollback");
// lib/prisma.ts 와 동일하게 연결 문자열 설정만 쓴다. TLS 인증서 검증을 끄지 않는다(rejectUnauthorized:false 금지).
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const me = (await c.query(
  "select current_user as u, (select rolbypassrls from pg_roles where rolname = current_user) as bypass",
)).rows[0];
const { rows } = await c.query(
  "select tablename, tableowner, rowsecurity from pg_tables where schemaname = 'public' order by 1",
);
const off = rows.filter((r) => !r.rowsecurity);
console.log(`접속 역할=${me.u} bypassrls=${me.bypass} / public 테이블 ${rows.length}개, RLS 꺼짐 ${off.length}개`);
const notOwned = rows.filter((r) => r.tableowner !== me.u);
if (notOwned.length && !me.bypass) {
  console.error("✖ 중단: 접속 역할이 소유하지 않은 테이블 →", notOwned.map((r) => `${r.tablename}(${r.tableowner})`).join(", "));
  process.exit(1);
}
const quote = (name) => `public."${name.replace(/"/g, '""')}"`;
if (rollback) {
  // 원래 켜져 있던 테이블까지 끄지 않도록, 끌 테이블을 --rollback=t1,t2 로 받으면 그것만 끈다(적용 로그의 목록).
  const arg = process.argv.find((a) => a.startsWith("--rollback="));
  const only = arg ? new Set(arg.slice("--rollback=".length).split(",").filter(Boolean)) : null;
  for (const r of rows.filter((x) => x.rowsecurity && (!only || only.has(x.tablename)))) {
    console.log(`DISABLE RLS: ${r.tablename}`);
    await c.query(`alter table ${quote(r.tablename)} disable row level security`);
  }
} else {
  for (const r of off) {
    console.log(`${apply ? "" : "[dry-run] "}ENABLE RLS: ${r.tablename}`);
    if (apply) await c.query(`alter table ${quote(r.tablename)} enable row level security`);
  }
}
await c.end();
