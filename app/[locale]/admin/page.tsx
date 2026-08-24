import prisma from '@/lib/prisma';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const totalUsers = users.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCompatibilities = await prisma.compatibility.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const totalCompatibilities = await prisma.compatibility.count();

  const stats = {
    totalUsers,
    todayCompatibilities,
    totalCompatibilities,
  };

  return <AdminDashboard users={JSON.parse(JSON.stringify(users))} stats={stats} />;
}
