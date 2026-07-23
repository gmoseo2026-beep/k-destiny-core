import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "161.97.134.176"
USER = "root"
PASS = "***REMOVED***"

COMMANDS = [
    "cd /root/k-destiny-core && git pull origin main 2>&1",
    "cd /root/k-destiny-core && npx prisma db push 2>&1",
    "cd /root/k-destiny-core && npx prisma generate 2>&1",
    "cd /root/k-destiny-core && rm -rf .next && npm run build 2>&1 | tail -20",
    "cd /root/k-destiny-core && pm2 restart all --update-env 2>&1",
    "curl -I http://localhost:3000/en 2>&1",
]

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=15, look_for_keys=False, allow_agent=False)
    print("Connected!")

    for cmd in COMMANDS:
        print(f"\n>>> {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        raw_out = stdout.read()
        raw_err = stderr.read()
        exit_code = stdout.channel.recv_exit_status()
        try:
            out = raw_out.decode('utf-8', errors='replace')[-4000:]
            err = raw_err.decode('utf-8', errors='replace')[-1000:]
        except:
            out = str(raw_out)[-4000:]
            err = str(raw_err)[-1000:]
        if out: print(out)
        if err: print(f"[STDERR] {err}")
        print(f"[EXIT] {exit_code}")

    client.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
