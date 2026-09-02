import paramiko
import sys
from _creds import connect_client

def run_cmd(client, cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    while True:
        line = stdout.readline()
        if not line:
            break
        sys.stdout.buffer.write(line.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()

    err = stderr.read()
    if err:
        sys.stderr.buffer.write(err)
    
    exit_code = stdout.channel.recv_exit_status()
    print(f"\n[EXIT] {exit_code}")
    return exit_code

def main():
    client = connect_client()
    
    # Delete Windows node_modules and run npm install
    run_cmd(client, "cd /root/k-destiny-core && rm -rf node_modules package-lock.json && npm install")
    
    # Generate Prisma client
    run_cmd(client, "cd /root/k-destiny-core && npx prisma generate")
    
    # Build
    build_exit = run_cmd(client, "cd /root/k-destiny-core && rm -rf .next && NODE_OPTIONS='--max-old-space-size=2048' npm run build")
    
    # Restart
    if build_exit == 0:
        run_cmd(client, "cd /root/k-destiny-core && pm2 restart k-destiny")
    else:
        print("Build failed.")
        
    client.close()

if __name__ == '__main__':
    main()
