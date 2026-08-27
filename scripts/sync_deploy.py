import paramiko
import sys
import os
import zipfile
from _creds import connect_client, get_host_user

HOST, USER = get_host_user()

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

def zip_project(project_root, zip_path):
    print_f(f"Zipping project to {zip_path}...")
    exclude_dirs = {'.git', 'node_modules', '.next', 'automation', '.gemini', 'SNS'}
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_root):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file.endswith('.zip') or file == '.env.local' or file == 'package-lock.json':
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, project_root)
                zipf.write(file_path, arcname)
    print_f("Zipping complete.")

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    zip_path = os.path.join(project_root, 'deploy.zip')
    
    zip_project(project_root, zip_path)
    
    print_f(f"Connecting to {HOST}...")
    client = connect_client()
    print_f("Connected!")
    
    print_f("Uploading deploy.zip...")
    sftp = client.open_sftp()
    sftp.put(zip_path, '/root/deploy.zip')
    sftp.close()
    print_f("Upload complete.")
    
    run_cmd(client, "unzip -o /root/deploy.zip -d /root/k-destiny-core")
    run_cmd(client, "rm /root/deploy.zip")
    
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
        print_f("ABORTING deployment. The old version is still running (PM2 was not restarted).")
        sys.exit(1)

    print_f("\n[SUCCESS] Build passed! Restarting PM2... 🔄")
    run_cmd(client, "cd /root/k-destiny-core && pm2 restart k-destiny")

    client.close()

if __name__ == '__main__':
    main()
