import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // CLI(db push 등)는 스키마 작업이라 세션 연결(DIRECT_URL)을 쓴다. 앱 런타임은 lib/prisma.ts 에서 DATABASE_URL(트랜잭션 풀러).
  datasource: {
    url: (process.env.DIRECT_URL || process.env.DATABASE_URL) as string,
  },
});
