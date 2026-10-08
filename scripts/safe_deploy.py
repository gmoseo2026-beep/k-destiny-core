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

# 지난 빌드의 /_next/static 파일을 모아 두는 곳(저장소 밖 — git clean 이 건드리지 않는다).
# 빌드는 .next 를 통째로 지우고 새로 만들기 때문에, 배포 전에 받아 간 HTML(열어 둔 탭,
# Cloudflare 가 보관 중인 검색용 페이지)이 가리키는 옛 JS·CSS 가 404 가 된다.
# 파일 이름에 내용 해시가 들어 있어 옛 파일을 그대로 함께 두어도 새 파일과 충돌하지 않는다.
STATIC_KEEP_DIR = "/root/.kongdak-static-keep"
STATIC_KEEP_DAYS = 14  # Cloudflare 보관(1일 + stale 7일)보다 넉넉히 길게

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
    # build fail with "Module not found".
    #
    # `npm ci` ONLY. The old `npm ci || npm install` fallback hid a lockfile that
    # was out of sync for the server's npm 10 (local npm 11 drops an optional peer
    # entry, @swc/helpers under next-intl), so every deploy silently ran
    # `npm install`, rewrote package-lock.json on the server and installed
    # versions nobody had tested. A failing `npm ci` now stops the deploy before
    # the build; the live version keeps running. Fix: `npm run lock:sync` locally
    # (regenerates the lock with the server's npm version), commit, redeploy.
    install_exit = run_cmd(
        client,
        "cd /root/k-destiny-core && export PUPPETEER_SKIP_DOWNLOAD=true && npm ci 2>&1",
        tmo=600,
    )
    if install_exit != 0:
        print("\n" + "!" * 60)
        print(f"[DEPLOY FAILED] npm ci failed (exit {install_exit}). Nothing was built")
        print("or restarted. If it says the lock file is out of sync, run")
        print("`npm run lock:sync` locally, commit package-lock.json and redeploy.")
        print("!" * 60)
        client.close()
        sys.exit(1)

    # 3. Prisma
    run_cmd(client, "cd /root/k-destiny-core && npx prisma db push 2>&1")
    run_cmd(client, "cd /root/k-destiny-core && npx prisma generate 2>&1")

    # 4. Clean Build.
    # NODE_OPTIONS raises the heap so a small VPS does not silently OOM-kill the
    # Next 16 build. NOTE: do NOT pipe `npm run build` into `tail` — a pipe makes
    # the shell report tail's exit code (always 0), masking a real build failure
    # and letting us restart PM2 onto a broken/empty .next (past outage cause).
    # We capture the real code and print an explicit BUILD_EXIT marker.
    # 지금 서비스 중인 정적 파일을 따로 모아 둔다(실패해도 배포는 계속한다).
    run_cmd(
        client,
        f"cd /root/k-destiny-core && mkdir -p {STATIC_KEEP_DIR} && "
        f"if [ -d .next/static ]; then cp -a --update=none .next/static/. {STATIC_KEEP_DIR}/ 2>/dev/null "
        f"|| cp -an .next/static/. {STATIC_KEEP_DIR}/; fi; "
        f"find {STATIC_KEEP_DIR} -type f -mtime +{STATIC_KEEP_DAYS} -delete; "
        f"find {STATIC_KEEP_DIR} -mindepth 1 -type d -empty -delete; "
        f"du -sh {STATIC_KEEP_DIR} 2>&1; true",
        tmo=120,
    )

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

    # 옛 정적 파일을 새 빌드 옆에 되돌려 놓는다. 같은 이름은 덮어쓰지 않으므로 새 빌드는 그대로다.
    # 재시작 전에 해야 한다 — 서버가 뜰 때 이 폴더의 파일 목록을 읽는다.
    run_cmd(
        client,
        f"cd /root/k-destiny-core && if [ -d {STATIC_KEEP_DIR} ] && [ -d .next/static ]; then "
        f"cp -a --update=none {STATIC_KEEP_DIR}/. .next/static/ 2>/dev/null "
        f"|| cp -an {STATIC_KEEP_DIR}/. .next/static/; fi; "
        "echo \"static files: $(find .next/static -type f | wc -l)\"; true",
        tmo=120,
    )

    print("\nBuild SUCCESS. Restarting PM2...")
    # 웹 앱만 재시작한다. `restart all` 은 일부러 멈춰 둔 k-destiny-autopilot(Hermes)까지 되살린다.
    run_cmd(client, "cd /root/k-destiny-core && pm2 restart k-destiny --update-env 2>&1")
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
