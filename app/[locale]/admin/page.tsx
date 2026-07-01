import prisma from '@/lib/prisma';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const totalUsers = users.length;
  const premiumUsers = users.filter((u) => u.tier === 'PREMIUM').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sajuReadingsToday = await prisma.userSajuProfile.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const stats = {
    totalUsers,
    premiumUsers,
    sajuReadingsToday,
  };

  return <AdminDashboard users={users} stats={stats} />;
}
