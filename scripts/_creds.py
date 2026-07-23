"""Shared deploy/SSH credentials — never hardcode secrets in a committed file.

Credentials are read from environment variables, and (for convenience) from an
optional gitignored file `scripts/deploy.env` containing KEY=VALUE lines, e.g.:

    DEPLOY_HOST=161.97.134.176
    DEPLOY_USER=root
    DEPLOY_KEY=~/.ssh/kdestiny_deploy   # preferred: SSH private key (no password)
    DEPLOY_PASS=your-new-password       # fallback if no key is configured
    OPENAI_API_KEY=sk-...               # only if a script needs it

`scripts/deploy.env` is gitignored, so the real secret never enters git.
Auth precedence: DEPLOY_KEY (SSH key) is used if set, otherwise DEPLOY_PASS.
"""
import os


def _load_env_file():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "deploy.env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            # Do not clobber a value already set in the real environment.
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def get_creds():
    """Return (host, user, password). Raises if the password is not provided."""
    _load_env_file()
    host = os.environ.get("DEPLOY_HOST", "161.97.134.176")
    user = os.environ.get("DEPLOY_USER", "root")
    pw = os.environ.get("DEPLOY_PASS")
    if not pw:
        raise SystemExit(
            "[ERROR] DEPLOY_PASS is not set. Put it in scripts/deploy.env "
            "(gitignored) or export it before running."
        )
    return host, user, pw


def get_env(name):
    """Fetch any other secret (e.g. OPENAI_API_KEY) from env / deploy.env."""
    _load_env_file()
    val = os.environ.get(name)
    if not val:
        raise SystemExit(f"[ERROR] {name} is not set (env or scripts/deploy.env).")
    return val


def get_host_user():
    """Return (host, user) — safe to log; no secret involved."""
    _load_env_file()
    host = os.environ.get("DEPLOY_HOST", "161.97.134.176")
    user = os.environ.get("DEPLOY_USER", "root")
    return host, user


def connect_client(timeout=15):
    """Return a connected paramiko SSHClient.

    Auth precedence:
      1) DEPLOY_KEY  — path to an SSH private key (no password on the wire)
      2) DEPLOY_PASS — password fallback

    Use this everywhere instead of hand-rolling client.connect(...), so switching
    the whole fleet from password to key auth is a one-line change in deploy.env.
    """
    import paramiko
    _load_env_file()
    host, user = get_host_user()
    key_path = os.environ.get("DEPLOY_KEY")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    if key_path:
        kp = os.path.expanduser(key_path)
        if not os.path.exists(kp):
            raise SystemExit(f"[ERROR] DEPLOY_KEY points to a missing file: {kp}")
        client.connect(
            host, username=user, key_filename=kp,
            timeout=timeout, look_for_keys=False, allow_agent=False,
        )
    else:
        pw = os.environ.get("DEPLOY_PASS")
        if not pw:
            raise SystemExit(
                "[ERROR] No auth configured. Set DEPLOY_KEY (preferred) or "
                "DEPLOY_PASS in scripts/deploy.env."
            )
        client.connect(
            host, username=user, password=pw,
            timeout=timeout, look_for_keys=False, allow_agent=False,
        )
    return client
