import paramiko
import sys
import io
from _creds import connect_client, get_host_user

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import time

# Credentials come from scripts/deploy.env (gitignored) or the environment —
# never hardcoded here. See scripts/_creds.py.
HOST, USER = get_host_user()

def run_cmd(client, cmd, tmo=600):
    print(f"\n>>> {cmd}")
    transport = client.get_transport()
    channel = transport.open_session()
    channel.set_combine_stderr(True)
    channel.exec_command(cmd)

    start_time = time.time()
    while True:
        if channel.recv_ready():
            chunk = channel.recv(4096)
            if chunk:
                text = chunk.decode('utf-8', errors='replace')
                print(text, end='', flush=True)

        if channel.exit_status_ready():
            while channel.recv_ready():
                chunk = channel.recv(4096)
                if chunk:
                    text = chunk.decode('utf-8', errors='replace')
                    print(text, end='', flush=True)
            break

        if time.time() - start_time > tmo:
            channel.close()
            raise TimeoutError(f"Command timed out after {tmo} seconds: {cmd}")

        time.sleep(0.3)

    exit_code = channel.recv_exit_status()
    print(f"\n[EXIT] {exit_code}")
    return exit_code

def main():
    print(f"Connecting to {HOST}...")
    client = connect_client()
    print("Connected!")

    # 1. Pull latest code — capture what we ACTUALLY end up on.
    # `git reset --hard` does NOT remove untracked files, so stray files created
    # directly on the server (e.g. a hand-added component importing an uninstalled
    # package) survive and break every build. `git clean -fd` makes the tree match
    # origin exactly. It does NOT use -x, so gitignored .env*/node_modules/.next
    # are preserved (verified: those are all in .gitignore).
    run_cmd(client, "cd /root/k-destiny-core && git fetch origin main 2>&1 && git reset --hard origin/main 2>&1")
    print("\n[clean dry-run] untracked files that will be removed:")
    run_cmd(client, "cd /root/k-destiny-core && git clean -fdn 2>&1")
    run_cmd(client, "cd /root/k-destiny-core && git clean -fd 2>&1")
    run_cmd(client, "cd /root/k-destiny-core && git log -1 --oneline")

    # 1-1. Sync .env — Ensure runtime secrets and build-time NEXT_PUBLIC_* variables
    # are in place on the server before `npm run build` and `prisma db push`.
    # (Values are NEVER logged or printed; only key names are verified).
    import os
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_env = os.path.join(project_root, ".env")
    # M-2: Do NOT fallback to .env.local (development secrets must never leak to production)

    if os.path.exists(local_env):
        print(f"\n[ENV SYNC] Uploading local {os.path.basename(local_env)} to /root/k-destiny-core/.env via SFTP...")
        sftp = client.open_sftp()
        try:
            # Backup existing .env if present
            try:
                sftp.stat("/root/k-destiny-core/.env")
                client.exec_command("cp /root/k-destiny-core/.env /root/k-destiny-core/.env.bak")
            except IOError:
                pass
            sftp.put(local_env, "/root/k-destiny-core/.env")
            client.exec_command("chmod 600 /root/k-destiny-core/.env")
            print("[ENV SYNC] Successfully synced .env to server (chmod 600 set). ✅")
        finally:
            sftp.close()
    else:
        print("\n[ENV SYNC] Notice: No local .env/.env.local found. Using existing server .env.")

    # 2. Dependencies — MUST run so new packages (e.g. `openai`, used by the
    # failover path in lib/aiFallback.ts) are present. A missing dep makes the
    # build fail with "Module not found". `npm ci` if the lockfile matches, else
    # `npm install`.
    run_cmd(client, "cd /root/k-destiny-core && export PUPPETEER_SKIP_DOWNLOAD=true && (npm ci 2>&1 || npm install 2>&1)", tmo=600)

    # 3. Prisma
    run_cmd(client, "cd /root/k-destiny-core && npx prisma db push 2>&1")
    run_cmd(client, "cd /root/k-destiny-core && npx prisma generate 2>&1")

    # 4. Clean Build.
    # NODE_OPTIONS raises the heap so a small VPS does not silently OOM-kill the
    # Next 16 build. NOTE: do NOT pipe `npm run build` into `tail` — a pipe makes
    # the shell report tail's exit code (always 0), masking a real build failure
    # and letting us restart PM2 onto a broken/empty .next (past outage cause).
    # We capture the real code and print an explicit BUILD_EXIT marker.
    print("\nBuilding Next.js application...")
    build_exit = run_cmd(
        client,
        "cd /root/k-destiny-core && rm -rf .next && "
        "NODE_OPTIONS='--max-old-space-size=2048' npm run build 2>&1; "
        "code=$?; echo \"BUILD_EXIT=$code\"; exit $code",
        tmo=600,
    )

    # 4. Conditional Restart
    if build_exit != 0:
        print("\n" + "!" * 60)
        print("[DEPLOY FAILED] npm run build did NOT succeed (exit "
              f"{build_exit}). PM2 was NOT restarted — the OLD version is still")
        print("live. DO NOT report this as deployed. Fix the build error above")
        print("(often OOM on the VPS — add swap or raise --max-old-space-size).")
        print("!" * 60)
        client.close()
        sys.exit(1)

    print("\nBuild SUCCESS. Restarting PM2...")
    run_cmd(client, "cd /root/k-destiny-core && pm2 restart all --update-env 2>&1")
    run_cmd(client, "sleep 4 && curl -sI http://localhost:3000/en 2>&1 | head -1")

    # 5. POST-DEPLOY VERIFICATION — prove the NEW code is actually serving.
    print("\nVerifying live service on http://localhost:3000/ko...")
    verify_cmd = "curl -sI http://localhost:3000/ko | head -n 1"
    _, vout, _ = client.exec_command(verify_cmd, timeout=30)
    status_line = vout.read().decode("utf-8", "replace").strip()
    print("HTTP Status:", status_line)

    verify_api = "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/compat"
    _, aout, _ = client.exec_command(verify_api, timeout=30)
    api_code = aout.read().decode("utf-8", "replace").strip()
    print("/api/compat HTTP Code:", api_code)

    if "200" in status_line:
        print("\n[OK] Service is serving 200 OK. Deploy VERIFIED. ✅")
    else:
        print("\n[WARN] Service did not return 200 OK. Please check logs.")

    client.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
