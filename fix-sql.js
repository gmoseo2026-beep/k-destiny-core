require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(`UPDATE "User" SET image = REPLACE(image, 'http://', 'https://') WHERE image LIKE 'http://%';`);
  console.log(`Updated ${result.rowCount} rows`);
  
  const check = await pool.query(`SELECT id, name, image FROM "User" WHERE name = '서민오'`);
  console.log(`Current image for 서민오:`, check.rows);
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end());
