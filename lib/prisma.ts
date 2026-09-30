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
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

globalForPrisma.pgPool = pool;
globalForPrisma.prisma = prisma;

export default prisma;
