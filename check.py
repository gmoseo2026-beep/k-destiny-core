import sys
sys.path.append('./scripts')
import _creds
client = _creds.connect_client()
cmd = '''cd /root/k-destiny-core && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { name: '서민오' } }).then(u => {
    console.log(u.image);
}).finally(() => { prisma.\\$disconnect(); });
"'''
stdin, stdout, stderr = client.exec_command(cmd)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
client.close()
