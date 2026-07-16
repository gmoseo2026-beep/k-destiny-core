// scripts/query_revenue.js
// Node.js helper to query revenue stats via Prisma Client
// Called by daily_report.py

// Load .env and .env.local (same as prisma.config.ts)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
  
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total users
    const totalUsers = await prisma.user.count();
    
    // Total premium users
    const totalPremium = await prisma.user.count({
      where: { tier: 'PREMIUM' }
    });
    
    // Today's new premium
    const dailyPremium = await prisma.user.count({
      where: {
        tier: 'PREMIUM',
        premiumStartDate: { gte: todayStart }
      }
    });
    
    // Daily revenue (sum paidAmount in cents)
    const dailyRevResult = await prisma.user.aggregate({
      _sum: { paidAmount: true },
      where: {
        tier: 'PREMIUM',
        premiumStartDate: { gte: todayStart }
      }
    });
    
    // Weekly revenue
    const weeklyRevResult = await prisma.user.aggregate({
      _sum: { paidAmount: true },
      where: {
        tier: 'PREMIUM',
        premiumStartDate: { gte: weekAgo }
      }
    });
    
    // Monthly revenue
    const monthlyRevResult = await prisma.user.aggregate({
      _sum: { paidAmount: true },
      where: {
        tier: 'PREMIUM',
        premiumStartDate: { gte: monthStart }
      }
    });
    
    // Today's purchased reports
    const dailyReports = await prisma.purchasedReport.count({
      where: { createdAt: { gte: todayStart } }
    });
    
    // Total purchased reports
    const totalReports = await prisma.purchasedReport.count();

    const result = {
      totalUsers,
      totalPremium,
      dailyPremium,
      dailyRevenue: dailyRevResult._sum.paidAmount || 0,
      weeklyRevenue: weeklyRevResult._sum.paidAmount || 0,
      monthlyRevenue: monthlyRevResult._sum.paidAmount || 0,
      dailyReports,
      totalReports
    };
    
    console.log(JSON.stringify(result));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
