# SEO 색인 수정 — 안티그래비티 실행 체크리스트

> 수정된 파일 13개는 이미 로컬 프로젝트 폴더에 저장돼 있습니다.
> 아래는 **로컬 검증 → 커밋/푸시 → 배포 → 검증 → Search Console** 순서입니다.
> `safe_deploy.py`가 서버에서 `git reset --hard origin/main`을 하므로 **푸시 없이는 배포되지 않습니다.**

---

## 1단계. 로컬 빌드 검증 (필수)

클라우드 환경에서 npm 레지스트리가 막혀 있어 전체 빌드를 못 돌렸습니다. 이 단계가 실질적인 첫 검증입니다.

```bash
npm run build
```

- 반드시 **exit code 0**과 `Compiled successfully` 확인. `| tail` 파이프 금지 (AGENTS.md §6).
- 새로 만든 라우트별 `layout.tsx` 8개가 빌드 로그의 route 목록에 영향 없이 통과하는지 확인.
- 타입 에러가 나면 대부분 `@/lib/seo` 경로 문제 → `tsconfig.json`의 `paths: { "@/*": ["./*"] }` 확인.

### 실제 canonical이 바뀌었는지 로컬에서 확인

```bash
npm run start
```

다른 터미널에서 (PowerShell):

```powershell
curl.exe -s http://localhost:3000/en/pricing | Select-String -Pattern 'canonical|hreflang'
```

**기대 결과**

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| `/en/pricing` canonical | `https://thekdestiny.com/en` ❌ | `https://thekdestiny.com/en/pricing` ✅ |
| `/en/pricing` hreflang ko | `https://thekdestiny.com/ko` ❌ | `https://thekdestiny.com/ko/pricing` ✅ |
| `<title>` | 홈과 동일 ❌ | `Pricing — Free and Premium Saju Readings \| K-Destiny` ✅ |

`/ko/guide`, `/ja/sync` 등 2~3개 더 확인해 보세요.

```powershell
curl.exe -s http://localhost:3000/robots.txt
```

`Disallow: /en/dashboard`, `/ko/dashboard` … 처럼 **로케일 접두사가 붙은 규칙**이 보여야 합니다.

---

## 2단계. 커밋 & 푸시

커밋 전 시크릿 스캔 (AGENTS.md §4):

```bash
git status
git diff --staged
```

`sk-`, `password=`, `DEPLOY_PASS=`, `BEGIN ... PRIVATE KEY` 가 없는지 확인. 이번 변경은 SEO 메타데이터뿐이라 시크릿이 들어갈 여지는 없습니다.

```bash
git add lib/seo.ts app/sitemap.ts app/robots.ts next.config.ts "app/[locale]/layout.tsx" "app/[locale]/*/layout.tsx"
git commit -m "fix(seo): per-route canonical/hreflang + locale-aware robots

- app/[locale]/layout.tsx가 유일한 메타데이터 소스라 모든 하위 페이지가
  canonical=/{locale}을 상속 → GSC '적절한 표준 태그가 포함된 대체 페이지'
- lib/seo.ts 신설 + 라우트별 서버 layout.tsx 8개로 자체 canonical/hreflang 선언
- robots.ts: /dashboard/ 규칙이 /en/dashboard와 매칭 안 되던 문제 수정
- sitemap: 리디렉션되는 루트와 noindex인 /login 제거, hreflang 클러스터 추가
- sitemap.xml/robots.txt에 no-store가 걸리던 문제 수정"
git push origin main
```

---

## 3단계. 배포

```bash
python scripts/safe_deploy.py
```

- 이번 변경에는 **Prisma 스키마 변경이 없으므로** DB 마이그레이션 리스크는 없습니다.
- 마지막에 `Deploy VERIFIED ✅` 를 눈으로 확인하기 전까지 배포 성공으로 간주하지 마세요.
- 빌드 실패 시 스크립트가 PM2를 재시작하지 않으므로 사이트는 구버전으로 살아 있습니다.

---

## 4단계. Cloudflare 캐시 퍼지 (이번엔 특히 중요)

`sitemap.xml`과 `robots.txt`의 `Cache-Control`이 `no-store` → `public, max-age=3600`으로 바뀝니다.
**퍼지하지 않으면 Cloudflare가 옛날 응답을 계속 서빙**해서 구글이 새 사이트맵을 못 봅니다.

대시보드 → Caching → Configuration → **Purge Everything**

---

## 5단계. 프로덕션 검증

```powershell
curl.exe -s https://thekdestiny.com/en/pricing | Select-String -Pattern 'canonical'
curl.exe -s https://thekdestiny.com/ko/guide  | Select-String -Pattern 'canonical'
curl.exe -sI https://thekdestiny.com/sitemap.xml
curl.exe -s  https://thekdestiny.com/robots.txt
```

확인 사항:

1. 각 페이지의 canonical이 **자기 자신의 URL**인가
2. `sitemap.xml` 응답 헤더가 `cache-control: public, max-age=3600` 인가 (no-store가 아님)
3. `robots.txt`에 `/en/dashboard` 형태의 규칙이 있는가
4. `sitemap.xml`에 `https://thekdestiny.com/` (루트) 와 `/login` 이 **없는가**
5. 사이트맵 URL 총 48개 (8개 라우트 × 6개 언어)

추가로 [Rich Results Test](https://search.google.com/test/rich-results)에 `/ko/pricing`을 넣어 구글이 렌더링한 결과에서 canonical을 한 번 더 확인하면 확실합니다.

---

## 6단계. Search Console 작업

배포와 캐시 퍼지가 **끝난 뒤에** 진행하세요. 순서를 바꾸면 유효성 검사가 실패로 끝납니다.

1. **Sitemaps** → `sitemap.xml` 재제출 (기존 것 삭제 후 다시 추가하면 강제 재읽기)
2. **URL 검사** → 아래 URL을 하나씩 넣고 "색인 생성 요청"
   하루 할당량이 10건 정도이므로 우선순위 순으로:
   - `https://thekdestiny.com/ko` , `https://thekdestiny.com/en`
   - `https://thekdestiny.com/ko/input-destiny` , `/en/input-destiny`
   - `https://thekdestiny.com/ko/pricing` , `/en/pricing`
   - `https://thekdestiny.com/ko/guide` , `/en/guide`
3. **페이지 색인 생성** 리포트 → 아래 두 행을 열고 **"수정 확인"(유효성 검사 시작)** 클릭
   (스크린샷에서 둘 다 "시작되지 않음" 상태입니다)
   - 적절한 표준 태그가 포함된 대체 페이지 (5)
   - 리디렉션이 포함된 페이지 (1)
   - 중복 페이지, Google에서 사용자와 다른 표준을 선택함 (1)

---

## 기대 결과와 현실적인 기간

| 항목 | 개수 | 전망 |
|---|---|---|
| 적절한 표준 태그가 포함된 대체 페이지 | 5 | **거의 확실히 해소** — 원인이 명확한 코드 버그였음. 1~2주 |
| 리디렉션이 포함된 페이지 | 1 | **해소** — 사이트맵에서 제거됨 |
| 중복 페이지, 다른 표준 선택 | 1 | **해소 가능성 높음** |
| 크롤링됨 - 색인 생성 안 됨 | 2 | robots.txt로 크롤 예산 회수 → 개선 |
| 발견됨 - 현재 색인 생성되지 않음 | 39 | **부분적으로만 개선** ⚠️ |

마지막 39개는 코드 문제가 아니라 **사이트 권위(백링크·검색 트래픽·콘텐츠 양)** 문제입니다.
6개 언어 × 8개 라우트로 URL은 48개인데 실질 콘텐츠는 8종이라, 구글 입장에서 "크롤링할 가치"가 아직 낮게 평가된 상태입니다. 코드로 더 짜낼 여지는 크지 않고, 다음 단계는 별개 작업입니다:

- `/guide` 를 실제 검색 수요가 있는 콘텐츠로 확장 (사주 용어, 일간별 해설 등 개별 URL)
- 외부 링크 확보 (커뮤니티, 프로덕트헌트, 블로그)
- GSC "실적" 탭에서 노출은 되는데 클릭이 없는 쿼리를 찾아 title/description 튜닝

---

## 주의할 점

- **되돌리려면**: `git revert <커밋해시>` 후 재배포. 이번 변경은 메타데이터 전용이라 런타임 로직/DB에 영향이 없어 롤백이 안전합니다.
- **6단계를 배포 전에 하지 마세요.** 유효성 검사가 실패로 기록되면 재요청까지 시간이 더 걸립니다.
- **결과는 즉시 나오지 않습니다.** 구글 재크롤링에 보통 3일~2주. 매일 확인하지 말고 1주 뒤에 보세요.
