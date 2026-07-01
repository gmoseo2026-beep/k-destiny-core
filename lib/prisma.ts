// dotenv is loaded by Next.js automatically; this import is for standalone scripts (e.g., seed.ts)
if (typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
  try { require('dotenv/config'); } catch {}
}
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Initialize the Prisma Client with the PostgreSQL adapter
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
