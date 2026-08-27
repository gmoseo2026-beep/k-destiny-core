import sys
sys.path.append('./scripts')
import _creds
client = _creds.connect_client()
cmd = '''cd /root/k-destiny-core && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ where: { image: { startsWith: 'http://' } } }).then(async users => {
  for (const u of users) {
    const newImage = u.image.replace('http://', 'https://');
    await prisma.user.update({ where: { id: u.id }, data: { image: newImage } });
    console.log('Fixed', u.name);
  }
}).finally(() => prisma.\\\$disconnect());
"'''
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())
client.close()
