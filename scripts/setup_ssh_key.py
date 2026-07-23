"""One-time: install the deploy SSH public key on the server, then verify.

Run this ONCE while you still have password auth working:

    python scripts/setup_ssh_key.py

It connects with DEPLOY_PASS (password), appends your public key to the
server's ~/.ssh/authorized_keys (idempotent), fixes permissions, and then
proves key-only login works. After it succeeds, add this line to
scripts/deploy.env so every script uses the key (no password):

    DEPLOY_KEY=~/.ssh/kdestiny_deploy

The public key installed is <DEPLOY_KEY>.pub (default ~/.ssh/kdestiny_deploy.pub).
"""
import os
import sys
import io
import paramiko
from _creds import get_creds, get_host_user

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def main():
    key_path = os.path.expanduser(os.environ.get("DEPLOY_KEY", "~/.ssh/kdestiny_deploy"))
    pub_path = key_path + ".pub"
    if not os.path.exists(pub_path):
        raise SystemExit(
            f"[ERROR] Public key not found: {pub_path}\n"
            "Generate it first:\n"
            f'  ssh-keygen -t ed25519 -f "{key_path}" -N "" -C "kdestiny-deploy"'
        )
    with open(pub_path, encoding="utf-8") as f:
        pubkey = f.read().strip()

    host, user = get_host_user()
    # Force PASSWORD auth for the install step (the key isn't on the server yet).
    _, _, password = get_creds()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {host} with password to install the key...")
    client.connect(host, username=user, password=password, timeout=15,
                   look_for_keys=False, allow_agent=False)

    # Idempotent install: only append if the key isn't already present.
    install_cmd = (
        "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && "
        "chmod 600 ~/.ssh/authorized_keys && "
        f"grep -qF '{pubkey}' ~/.ssh/authorized_keys || echo '{pubkey}' >> ~/.ssh/authorized_keys; "
        "echo INSTALLED"
    )
    _, out, err = client.exec_command(install_cmd, timeout=30)
    print(out.read().decode("utf-8", "replace").strip())
    e = err.read().decode("utf-8", "replace").strip()
    if e:
        print("[STDERR]", e)
    client.close()

    # Verify: connect again using ONLY the key (no password).
    print("\nVerifying key-only login...")
    v = paramiko.SSHClient()
    v.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    v.connect(host, username=user, key_filename=key_path, timeout=15,
              look_for_keys=False, allow_agent=False)
    _, o2, _ = v.exec_command("whoami && hostname", timeout=15)
    who = o2.read().decode("utf-8", "replace").strip()
    v.close()
    print("[OK] Key login works ->", who.replace("\n", " / "))
    print("\nNext: add this to scripts/deploy.env, then you can remove DEPLOY_PASS:")
    print(f"    DEPLOY_KEY={os.environ.get('DEPLOY_KEY', '~/.ssh/kdestiny_deploy')}")
    print("(Once verified in production, disable password login on the server:")
    print(" /etc/ssh/sshd_config -> PasswordAuthentication no ; systemctl reload sshd)")


if __name__ == "__main__":
    main()
