// scripts/query_revenue.js
// Node.js helper to query revenue stats using raw pg
// Called by daily_report.py

// Load .env and .env.local
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { Pool } = require('pg');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log(JSON.stringify({ error: 'DATABASE_URL not set' }));
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Total users
    const totalUsersRes = await pool.query('SELECT COUNT(*) as cnt FROM "User"');
    const totalUsers = parseInt(totalUsersRes.rows[0].cnt);

    // Total premium users
    const totalPremiumRes = await pool.query("SELECT COUNT(*) as cnt FROM \"User\" WHERE tier='PREMIUM'");
    const totalPremium = parseInt(totalPremiumRes.rows[0].cnt);

    // Today's new premium
    const dailyPremiumRes = await pool.query(
      "SELECT COUNT(*) as cnt FROM \"User\" WHERE tier='PREMIUM' AND \"premiumStartDate\"::date = $1",
      [todayStr]
    );
    const dailyPremium = parseInt(dailyPremiumRes.rows[0].cnt);

    // Daily revenue (paidAmount in cents)
    const dailyRevRes = await pool.query(
      "SELECT COALESCE(SUM(\"paidAmount\"),0) as total FROM \"User\" WHERE tier='PREMIUM' AND \"premiumStartDate\"::date = $1",
      [todayStr]
    );
    const dailyRevenue = parseInt(dailyRevRes.rows[0].total);

    // Weekly revenue
    const weeklyRevRes = await pool.query(
      "SELECT COALESCE(SUM(\"paidAmount\"),0) as total FROM \"User\" WHERE tier='PREMIUM' AND \"premiumStartDate\"::date >= $1",
      [weekAgoStr]
    );
    const weeklyRevenue = parseInt(weeklyRevRes.rows[0].total);

    // Monthly revenue
    const monthlyRevRes = await pool.query(
      "SELECT COALESCE(SUM(\"paidAmount\"),0) as total FROM \"User\" WHERE tier='PREMIUM' AND \"premiumStartDate\"::date >= $1",
      [monthStart]
    );
    const monthlyRevenue = parseInt(monthlyRevRes.rows[0].total);

    // Today's purchased reports
    const dailyReportsRes = await pool.query(
      "SELECT COUNT(*) as cnt FROM \"PurchasedReport\" WHERE \"createdAt\"::date = $1",
      [todayStr]
    );
    const dailyReports = parseInt(dailyReportsRes.rows[0].cnt);

    // Total purchased reports
    const totalReportsRes = await pool.query('SELECT COUNT(*) as cnt FROM "PurchasedReport"');
    const totalReports = parseInt(totalReportsRes.rows[0].cnt);

    console.log(JSON.stringify({
      totalUsers,
      totalPremium,
      dailyPremium,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      dailyReports,
      totalReports
    }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
