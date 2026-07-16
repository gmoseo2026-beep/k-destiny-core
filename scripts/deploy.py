import paramiko
import sys

HOST = "31.220.108.136"
USER = "root"
# Try multiple password variations
PASSWORDS = [
    "***REMOVED***",
    "***REMOVED***!",
    "***REMOVED***",
]
COMMANDS = [
    "cd /root/k-destiny && git pull origin main",
    "cd /root/k-destiny && npm run build",
    "cd /root/k-destiny && pm2 restart k-destiny",
]

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    connected = False
    for pw in PASSWORDS:
        try:
            print(f"Trying password: {'*' * len(pw)} (len={len(pw)})")
            client.connect(HOST, username=USER, password=pw, timeout=15, look_for_keys=False, allow_agent=False)
            print(f"Connected with password variant!")
            connected = True
            break
        except paramiko.ssh_exception.AuthenticationException:
            print(f"  -> Auth failed")
            continue
        except Exception as e:
            print(f"  -> Error: {e}")
            continue
    
    if not connected:
        print("All password attempts failed!")
        sys.exit(1)

    for cmd in COMMANDS:
        print(f"\n>>> {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        out = stdout.read().decode()
        err = stderr.read().decode()
        exit_code = stdout.channel.recv_exit_status()
        if out: print(out[-2000:] if len(out) > 2000 else out)
        if err: print(f"[STDERR] {err[-1000:]}")
        if exit_code != 0:
            print(f"[ERROR] exit code {exit_code}")
            client.close()
            sys.exit(1)
        print(f"[OK] exit={exit_code}")

    client.close()
    print("\n✅ Deployment complete!")

if __name__ == "__main__":
    main()
