# K-Destiny — Instructions for Gemini / Antigravity

이 저장소에서 작업하는 모든 Gemini 계열 모델(Antigravity 포함)은 아래 문서를 **기준(Ground Truth)** 으로 따릅니다.
All Gemini-family models (incl. Antigravity) working in this repo MUST follow these as ground truth:

- **`skill.md`** — 기술 스택·아키텍처 원칙·비즈니스 로직, 그리고 **§5 보안 규칙**.
- **`AGENTS.md`** — Next.js 주의사항 + 보안 요약.

## 🔐 보안 — 절대 규칙 (Security — hard rules, no exceptions)

전문은 `skill.md` §5. 요약(위반 시 즉시 중단·수정):

1. **비밀을 하드코딩하지 말 것.** 비밀번호·API 키·토큰·SSH 자격증명을 커밋될 수 있는 어떤 파일에도 직접 쓰지 않는다.
   Never hardcode secrets in any committable file.
2. **배포/SSH 스크립트는 `scripts/_creds.py`의 `get_creds()`로만** 자격증명을 읽는다. host/user/password를 인라인으로 쓰지 않는다. 실제 값은 gitignore된 `scripts/deploy.env`(로컬)와 서버 `.env`에만 존재한다.
3. **커밋 금지 파일:** `.env`, `.env.local`, `scripts/deploy.env`, 실제 비밀이 든 모든 파일. 비밀 값을 print/echo/log 하지 않는다.
4. **커밋·푸시 전 스테이징 diff를 스캔**해 `sk-`, `password=`, `DEPLOY_PASS=`, `chltnrud`, `BEGIN … PRIVATE KEY` 패턴이 있으면 멈추고 env 방식으로 고친다.
   `git diff --cached | grep -nEi "sk-[a-z0-9-]{10}|password=|DEPLOY_PASS=|BEGIN .*PRIVATE KEY"`
5. **비밀이 노출되면 손상된 것 — 즉시 교체(rotate).** 파일에서 지우는 것만으로는 불충분(히스토리에 남음).

## 🚀 배포 — 안전 규칙 (Deployment)

- 배포는 **`python scripts/safe_deploy.py`** 로만 한다. (origin/main pull → `git clean -fd` → `npm ci/install` → 빌드[**실제 종료코드 확인**] → 성공 시에만 PM2 재시작 → `/api/chat` NDJSON 검증)
- **`npm run build`를 `| tail` 등으로 파이프하지 말 것** — 파이프는 tail의 종료코드(0)를 반환해 빌드 실패를 성공으로 오판시키고, 깨진 빌드 위에 재시작해 사이트를 죽인다.
- 빌드 실패 시 재시작하지 않는다. "배포 완료" 보고 전에 `Deploy VERIFIED` 를 반드시 확인한다.

## 언어 (Language)
- 모든 응답·결과물은 **한글(Korean)** 로 제공한다.
