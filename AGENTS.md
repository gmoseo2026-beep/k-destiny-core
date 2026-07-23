<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Security (MANDATORY for every model — Claude, Gemini, Antigravity, …)

**Full rules: `skill.md` §5. Non-negotiable summary:**

1. **Never hardcode secrets** (passwords, API keys, tokens, SSH creds) in any committable file — scripts, configs, docs, or comments.
2. **Deploy/SSH scripts read credentials only via `get_creds()` in `scripts/_creds.py`**, which loads the gitignored `scripts/deploy.env`. Never inline host/user/password.
3. **Never commit** `.env`, `.env.local`, `scripts/deploy.env`, or anything holding a real secret (all gitignored — keep them so). Never print/log secret values.
4. **Before any commit/push, scan the staged diff for secrets** (`sk-`, `password=`, `DEPLOY_PASS=`, `chltnrud`, `BEGIN … PRIVATE KEY`). If found, STOP and switch to env vars.
5. **A leaked secret is compromised — rotate it immediately.** Deleting the file is not enough; git history keeps it.
6. **Deploy only via `python scripts/safe_deploy.py`.** Never pipe `npm run build` into `tail` (it masks the exit code). Never restart PM2 onto a failed build. Confirm `Deploy VERIFIED` before reporting success.
