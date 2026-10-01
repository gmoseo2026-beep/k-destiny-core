// scripts/query_revenue.js
// 콩닥 일일 보고서용 지표(매출·퍼널) — daily_report.py 가 호출한다.
// 개인정보(이름·생년월일·이메일)는 조회하지 않는다. 집계 숫자만 낸다.
// 출력: 마지막 줄에 "REPORT_JSON:{...}" 한 줄 (dotenv 안내문 등 다른 출력과 섞여도 안전하게 파싱)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local'), quiet: true });

const { Pool } = require('pg');

// DB 는 UTC(타임존 없는 timestamp)로 저장 → 한국 날짜로 바꿔 비교한다
const KST = (col) => `(${col} at time zone 'UTC' at time zone 'Asia/Seoul')`;
const TODAY = `(now() at time zone 'Asia/Seoul')::date`;

const out = (obj) => console.log('REPORT_JSON:' + JSON.stringify(obj));

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    out({ error: 'DATABASE_URL not set' });
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, max: 2 });
  const one = async (sql) => (await pool.query(sql)).rows[0];
  const all = async (sql) => (await pool.query(sql)).rows;

  try {
    const paid = (where) =>
      one(`select count(*)::int cnt, coalesce(sum(amount),0)::int total from "Order" where status='PAID' and ${where}`);

    const today = await paid(`${KST('"createdAt"')}::date = ${TODAY}`);
    const week = await paid(`${KST('"createdAt"')}::date > ${TODAY} - 7`);
    const month = await paid(`date_trunc('month', ${KST('"createdAt"')}) = date_trunc('month', now() at time zone 'Asia/Seoul')`);

    const products = await all(
      `select coalesce("productKey", "planId", '-') k, count(*)::int cnt, sum(amount)::int total
         from "Order" where status='PAID' and ${KST('"createdAt"')}::date = ${TODAY}
        group by 1 order by 3 desc limit 5`
    );
    const canceled = await one(
      `select count(*)::int cnt from "Order" where status='CANCELED' and ${KST('"updatedAt"')}::date = ${TODAY}`
    );
    const pending = await one(
      `select count(*)::int cnt from "Order" where status in ('PENDING','FAILED') and ${KST('"createdAt"')}::date = ${TODAY}`
    );

    const compat = await one(`select count(*)::int cnt from "Compatibility" where ${KST('"createdAt"')}::date = ${TODAY}`);
    const users = await one(
      `select count(*)::int total, count(*) filter (where ${KST('"createdAt"')}::date = ${TODAY})::int today from "User"`
    );

    // 생성 기록(저장본 재사용 제외): 미리보기·무료·결제 리포트·실패
    let gen = { teaser: 0, free: 0, full: 0, failed: 0 };
    try {
      gen = await one(
        `select count(*) filter (where kind='TEASER' and ok)::int teaser,
                count(*) filter (where kind='FREE' and ok)::int free,
                count(*) filter (where kind='FULL' and ok)::int full,
                count(*) filter (where not ok)::int failed
           from "ReportGenLog" where not cached and ${KST('"createdAt"')}::date = ${TODAY}`
      );
    } catch {
      // 테이블이 없는 환경에서도 보고서는 나가야 한다
    }

    out({ today, week, month, products, canceled: canceled.cnt, pending: pending.cnt, compat: compat.cnt, users, gen });
  } catch (err) {
    out({ error: err.message });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
