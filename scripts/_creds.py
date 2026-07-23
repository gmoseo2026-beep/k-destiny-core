"""Shared deploy/SSH credentials — never hardcode secrets in a committed file.

Credentials are read from environment variables, and (for convenience) from an
optional gitignored file `scripts/deploy.env` containing KEY=VALUE lines, e.g.:

    DEPLOY_HOST=161.97.134.176
    DEPLOY_USER=root
    DEPLOY_PASS=your-new-password
    OPENAI_API_KEY=sk-...            # only if a script needs it

`scripts/deploy.env` is gitignored, so the real password never enters git.
Prefer SSH keys over passwords for the strongest setup (see README/notes).
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
