import paramiko
import os
import sys
import io
from _creds import connect_client, get_host_user

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST, USER = get_host_user()

files_to_upload = [
    "app/[locale]/compat/[id]/page.tsx",
    "app/[locale]/compat/new/page.tsx",
    "components/CompatNewClient.tsx",
    "components/CompatResultClient.tsx",
    "lib/destinyGen.ts",
    "prisma/schema.prisma",
    "app/api/fortune/weekly/route.ts",
    "app/api/user/profile/route.ts",
    "app/[locale]/onboarding/page.tsx",
    "app/[locale]/onboarding/OnboardingClient.tsx",
    "app/[locale]/fortune/weekly/page.tsx",
    "app/[locale]/fortune/weekly/WeeklyFortuneClient.tsx",
    "components/Navbar.tsx",
    "app/[locale]/guide/page.tsx",
    "messages/ko.json",
]

def print_f(msg):
    print(msg, flush=True)

def run_cmd(client, cmd, tmo=600):
    print_f(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=tmo)
    raw_out = stdout.read()
    raw_err = stderr.read()
    exit_code = stdout.channel.recv_exit_status()
    try:
        out = raw_out.decode('utf-8', errors='replace')[-4000:]
        err = raw_err.decode('utf-8', errors='replace')[-1000:]
    except:
        out = str(raw_out)[-4000:]
        err = str(raw_err)[-1000:]
    if out: print_f(out)
    if err: print_f(f"[STDERR] {err}")
    print_f(f"[EXIT] {exit_code}")
    return exit_code

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    print_f(f"Connecting to {HOST}...")
    client = connect_client()
    print_f("Connected!")
    
    sftp = client.open_sftp()
    
    for relative_path in files_to_upload:
        local_path = os.path.join(project_root, os.path.normpath(relative_path))
        remote_path = f"/root/k-destiny-core/{relative_path.replace(chr(92), '/')}"
        
        # Ensure remote dir exists
        remote_dir = '/'.join(remote_path.split('/')[:-1])
        try:
            sftp.stat(remote_dir)
        except Exception:
            print_f(f"Creating directory {remote_dir}...")
            client.exec_command(f"mkdir -p {remote_dir}")
            
        print_f(f"Uploading {relative_path}...")
        try:
            sftp.put(local_path, remote_path)
        except Exception as e:
            print_f(f"Warning: Failed to upload {relative_path} - {e}")
            
    sftp.close()
    print_f("Upload complete!")
    
    # 3. Prisma
    run_cmd(client, "cd /root/k-destiny-core && npx prisma db push 2>&1")
    run_cmd(client, "cd /root/k-destiny-core && npx prisma generate 2>&1")

    # 4. Clean Build.
    print_f("\nBuilding Next.js application...")
    build_exit = run_cmd(
        client,
        "cd /root/k-destiny-core && rm -rf .next && "
        "NODE_OPTIONS='--max-old-space-size=2048' npm run build 2>&1; "
        "code=$?; echo \"BUILD_EXIT=$code\"; exit $code",
        tmo=600,
    )

    if build_exit != 0:
        print_f("\n[ERROR] Build failed! Check the output above. 🛑")
        sys.exit(1)

    print_f("\n[SUCCESS] Build passed! Restarting PM2... 🔄")
    run_cmd(client, "cd /root/k-destiny-core && pm2 restart k-destiny")
    client.close()

if __name__ == '__main__':
    main()
