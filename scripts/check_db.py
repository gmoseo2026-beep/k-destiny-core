from _creds import connect_client

client = connect_client()

cmds = [
    # Check .env file (not .env.local)
    'grep -iE "DATABASE|POSTGRES" /root/k-destiny-core/.env 2>/dev/null | head -3',
    # Check prisma.config.ts 
    'cat /root/k-destiny-core/prisma/prisma.config.ts 2>/dev/null || cat /root/k-destiny-core/prisma.config.ts 2>/dev/null || echo "NO PRISMA CONFIG"',
    # Try a quick prisma query via node
    'cd /root/k-destiny-core && node -e "const {PrismaClient}=require(\"@prisma/client\");const p=new PrismaClient();p.user.count().then(c=>{console.log(\"Users:\",c);p.\$disconnect()}).catch(e=>console.error(e.message))" 2>&1',
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print(f">>> {cmd[:80]}")
    if out: print(f"  {out}")
    if err: print(f"  [ERR] {err[:500]}")
    print()

client.close()
