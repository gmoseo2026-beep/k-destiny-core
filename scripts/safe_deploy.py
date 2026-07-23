import paramiko
import sys
import io
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Credentials come from the environment — NEVER hardcode them in a file that can be
# committed. Set them in your shell (or scripts/deploy.env, which is gitignored):
#   DEPLOY_HOST=161.97.134.176  DEPLOY_USER=root  DEPLOY_PASS=...  python scripts/safe_deploy.py
HOST = os.environ.get("DEPLOY_HOST", "161.97.134.176")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS")
if not PASS:
    print("[ERROR] DEPLOY_PASS environment variable is not set. Refusing to run.")
    print("        Example: DEPLOY_PASS='...' python scripts/safe_deploy.py")
    sys.exit(3)

def run_cmd(client, cmd, tmo=300):
    print(f"\n>>> {cmd}")
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
    if out: print(out)
    if err: print(f"[STDERR] {err}")
    print(f"[EXIT] {exit_code}")
    return exit_code

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=15, look_for_keys=False, allow_agent=False)
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

    # 2. Dependencies — MUST run so new packages (e.g. `openai`, used by the
    # failover path in lib/aiFallback.ts) are present. A missing dep makes the
    # build fail with "Module not found". `npm ci` if the lockfile matches, else
    # `npm install`.
    run_cmd(client, "cd /root/k-destiny-core && (npm ci 2>&1 || npm install 2>&1) | tail -15", tmo=600)

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
    # The chat route must answer as an NDJSON stream ("x-ndjson" content-type with
    # a {"type":"delta"} line). If we still see the legacy single {"reply":...}
    # object, the running process is stale and the deploy has NOT taken effect.
    print("\nVerifying /api/chat is serving the NDJSON format...")
    verify_cmd = (
        "curl -s -m 90 -X POST http://localhost:3000/api/chat "
        "-H 'Content-Type: application/json' "
        "-d '{\"message\":\"ping\",\"history\":[],\"masterName\":\"Master Karma\",\"locale\":\"ko\"}' "
        "| head -c 400"
    )
    _, vout, _ = client.exec_command(verify_cmd, timeout=120)
    body = vout.read().decode("utf-8", "replace")
    print("Chat response sample:", body[:400])

    if '"type"' in body and ('"delta"' in body or '"done"' in body or '"emotion"' in body):
        print("\n[OK] Live chat is serving NDJSON. Deploy VERIFIED. ✅")
    elif '"reply"' in body:
        print("\n[STALE] Chat still returns the legacy {\"reply\":...} object — the")
        print("        running process did NOT pick up the new build. Check that PM2")
        print("        runs from /root/k-destiny-core and reload it: pm2 reload all.")
        client.close()
        sys.exit(2)
    else:
        print("\n[WARN] Could not confirm the response format. Inspect the sample above.")

    client.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
