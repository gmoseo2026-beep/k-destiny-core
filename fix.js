require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      image: { startsWith: 'http://' }
    }
  });
  console.log(`Found ${users.length} users with http:// image`);
  
  for (const user of users) {
    const newImage = user.image.replace('http://', 'https://');
    await prisma.user.update({
      where: { id: user.id },
      data: { image: newImage }
    });
    console.log(`Updated user ${user.name}: ${newImage}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
