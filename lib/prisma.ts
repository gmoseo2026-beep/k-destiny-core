import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// DATABASE_URL 은 Supabase 트랜잭션 풀러(:6543)를 쓴다. 세션 풀러(:5432)는 클라이언트 연결 수가
// pool_size(15)로 묶여 트래픽이 몰리면 EMAXCONNSESSION 으로 요청이 실패했다(2026-09-30).
// 풀 크기는 프로세스당 상한을 명시하고, 번들마다 모듈이 다시 평가돼도 풀이 하나만 생기도록 전역에 둔다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pgPool?: Pool };

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: `${process.env.DATABASE_URL}`,
    max: Number(process.env.DB_POOL_MAX) || 8,
    // 서버(프랑스)↔DB(미국) 재연결에 1초 가까이 걸린다 → 쉬는 연결을 10분간 살려 둔다
    idleTimeoutMillis: 600_000,
    keepAlive: true,
    connectionTimeoutMillis: 10_000,
  });

// 쉬는 연결이 풀러 쪽에서 끊기면 pg 가 pool 에 error 를 던진다. 받아 주지 않으면 프로세스가 죽는다.
if (!globalForPrisma.pgPool) {
  pool.on('error', (err) => console.warn('[pg pool] idle client error:', err.message));
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

globalForPrisma.pgPool = pool;
globalForPrisma.prisma = prisma;

export default prisma;
