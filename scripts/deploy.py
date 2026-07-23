import paramiko
import sys
import io

# Fix Windows console encoding for Unicode output from VPS
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from _creds import connect_client, get_host_user
HOST, USER = get_host_user()
COMMANDS = [
    "cd /root/k-destiny-core && git pull origin main 2>&1",
    "cd /root/k-destiny-core && npm run build 2>&1 | tail -5",
    "cd /root/k-destiny-core && pm2 restart k-destiny 2>&1",
]

def main():
    print(f"Connecting to {HOST}...")
    client = connect_client()
    print("Connected!")

    for cmd in COMMANDS:
        print(f"\n>>> {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        raw_out = stdout.read()
        raw_err = stderr.read()
        exit_code = stdout.channel.recv_exit_status()
        try:
            out = raw_out.decode('utf-8', errors='replace')[-2000:]
            err = raw_err.decode('utf-8', errors='replace')[-1000:]
        except:
            out = str(raw_out)[-2000:]
            err = str(raw_err)[-1000:]
        if out: print(out)
        if err: print(f"[STDERR] {err}")
        print(f"[EXIT] {exit_code}")

    client.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
