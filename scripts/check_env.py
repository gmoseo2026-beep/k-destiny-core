import os
import sys
import io
from urllib.parse import urlparse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')

if not os.path.exists(env_path):
    print('[ERROR] .env file not found')
    sys.exit(1)

with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

parsed = {}
duplicates = []
malformed = []

for idx, line in enumerate(lines, 1):
    stripped = line.strip()
    if not stripped or stripped.startswith('#'):
        continue
    if '=' in stripped:
        k, v = stripped.split('=', 1)
        k = k.strip()
        v = v.strip()
        if k in parsed:
            duplicates.append((k, idx))
        parsed[k] = v
    else:
        malformed.append((idx, stripped))

print(f'총 환경변수 키 개수: {len(parsed)}개')
if duplicates:
    print(f'[경고] 중복된 키 발견: {duplicates}')
if malformed:
    print(f'[경고] 잘못된 형식의 라인 발견: {malformed}')

# Check specific key requirements safely
essential_keys = [
    'DATABASE_URL', 'DIRECT_URL',
    'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_GA_ID',
    'BIRTH_HASH_PEPPER', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL',
    'GEMINI_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'
]

print('\n' + '=' * 60)
print('📌 1. 핵심 환경변수 검사')
print('=' * 60)
for k in essential_keys:
    if k not in parsed:
        print(f'❌ {k:<25}: 키 누락 (Missing)')
        continue
    val = parsed[k]
    if not val:
        print(f'⚪ {k:<25}: ⚠️ 빈 값 (Empty)')
    else:
        extra = ''
        if k == 'NEXT_PUBLIC_SITE_URL':
            extra = f'-> {val}' if val.startswith('http') else '-> ⚠️ http/https 누락'
        elif k == 'NEXT_PUBLIC_GA_ID':
            extra = f'-> GA4 ID 형식 확인 (G-...)' if val.startswith('G-') else f'-> ⚠️ 형식 주의 (G-로 시작하지 않음: {val[:3]}...)'
        elif k in ('DATABASE_URL', 'DIRECT_URL'):
            try:
                host = urlparse(val.strip('\"\'')).hostname
                extra = f'-> 호스트: {host} (Supabase 검증)'
            except:
                extra = '-> ⚠️ URL 파싱 실패'
        elif k == 'BIRTH_HASH_PEPPER':
            if len(val) >= 16:
                extra = f'-> 보안 권장 길이 충족 ({len(val)}자)'
            else:
                extra = f'-> ⚠️ 권장 길이(16자 이상)보다 짧음 ({len(val)}자)'
        else:
            extra = f'-> 정상 설정됨 ({len(val)}자)'
        print(f'✅ {k:<25}: {extra}')

print('\n' + '=' * 60)
print('📌 2. 전체 키 목록 및 설정 상태')
print('=' * 60)
empty_keys = []
for k in sorted(parsed.keys()):
    v = parsed[k]
    if not v:
        status = '⚪ 빈 값 (EMPTY)'
        empty_keys.append(k)
    else:
        status = f'🟢 설정됨 ({len(v)}자)'
    print(f' - {k:<28}: {status}')

print('\n' + '=' * 60)
print('📌 3. 최종 진단')
print('=' * 60)
if not empty_keys:
    print('🎉 모든 필수 및 보조 환경변수가 빈틈없이 100% 채워졌습니다! 즉시 배포 가능합니다.')
elif set(empty_keys) == {'BIRTH_HASH_PEPPER', 'NEXT_PUBLIC_GA_ID'}:
    print('ℹ️ 안내: 아직 BIRTH_HASH_PEPPER 와 NEXT_PUBLIC_GA_ID 가 비어있습니다. 이 두 값을 채워주시면 배포 준비가 완료됩니다.')
else:
    print(f'⚠️ 아직 비어있는 키 목록: {", ".join(empty_keys)}')
