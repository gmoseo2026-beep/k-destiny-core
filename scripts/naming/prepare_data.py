import json
import urllib.request
import zipfile
import io
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

os.makedirs('data/naming', exist_ok=True)
os.makedirs('scripts/naming', exist_ok=True)

# 1. Load inmyong-hanja.txt
print("Loading inmyong-hanja.txt...")
with open('data/naming/inmyong-hanja.txt', encoding='utf-8') as f:
    inmyong = set(line.strip() for line in f if not line.startswith('#') and line.strip())
print(f"inmyong count: {len(inmyong)}")

# 2. Fetch data-naver.json
print("Fetching data-naver.json...")
url_naver = 'https://raw.githubusercontent.com/rutopio/Korean-Name-Hanja-Charset/main/data-naver.json'
req_n = urllib.request.Request(url_naver, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req_n, timeout=30) as resp:
    naver_dict = json.loads(resp.read().decode('utf-8'))

# 3. Fetch Unihan.zip
print("Fetching Unihan.zip from unicode.org...")
url_unihan = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip'
req_u = urllib.request.Request(url_unihan, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req_u, timeout=60) as resp:
    unihan_zip_data = resp.read()

rs_map = {}
total_map = {}
hangul_map = {}
with zipfile.ZipFile(io.BytesIO(unihan_zip_data)) as z:
    with z.open('Unihan_IRGSources.txt') as f:
        for line in f:
            line = line.decode('utf-8').strip()
            if not line or line.startswith('#'): continue
            parts = line.split('\t')
            if len(parts) >= 3:
                cp = int(parts[0][2:], 16)
                ch = chr(cp)
                if parts[1] == 'kRSUnicode':
                    rs_map[ch] = parts[2].split()[0]
                elif parts[1] == 'kTotalStrokes':
                    total_map[ch] = int(parts[2].split()[0])
    # kHangul: '세:0E 선:N' — 0=KS X 1001, E=교육용, N=인명용. 음이 여럿인 글자의 대표 음을 고르는 데 쓴다.
    with z.open('Unihan_Readings.txt') as f:
        for line in f:
            line = line.decode('utf-8').strip()
            parts = line.split('\t')
            if len(parts) >= 3 and parts[1] == 'kHangul':
                ch = chr(int(parts[0][2:], 16))
                hangul_map[ch] = dict(r.split(':', 1) if ':' in r else (r, '') for r in parts[2].split())

print(f"Unihan loaded. rs_map: {len(rs_map)}, total_map: {len(total_map)}")

# 자원오행(字源五行): 부수의 뜻으로 오행을 정한다. lib/premium/naming/strokes.ts 의 RADICAL_ELEMENT 와 같은 기본 표.
RADICAL_ELEMENT = {
  75: 'wood', 118: 'wood', 140: 'wood', 115: 'wood',
  86: 'fire', 72: 'fire', 61: 'fire',
  32: 'earth', 46: 'earth', 102: 'earth', 170: 'earth',
  167: 'metal', 96: 'metal', 112: 'metal',
  85: 'water', 173: 'water', 15: 'water',
}

# 확장 부수-오행 표(작명 관행의 부수별 자원오행을 따름). 기본 표에 없는 부수만 여기서 판정한다.
# 여기에도 없는 부수(一·乙·又·疒 등 뜻으로 오행을 정하기 어려운 부수)의 글자는 element=null(오행 미상)로 두고,
# 엔진은 이 글자에 오행 보완 점수를 주지도 빼지도 않는다.
# 발음오행으로 대신 채우지 않는다(발음오행은 자원오행이 아니다).
EXT_RADICAL_ELEMENT = {
  # 木: 网 米 糸 瓜 麻 片 爿 耒 韭 麥 黍 生 衣 手 目 儿 大 宀 广 文 爪 父 自 舟 虍 角 豆 門 風 香 示 巾 靑
  119: 'wood', 120: 'wood', 97: 'wood', 200: 'wood', 91: 'wood', 90: 'wood', 127: 'wood', 179: 'wood',
  199: 'wood', 202: 'wood', 100: 'wood', 145: 'wood', 64: 'wood', 109: 'wood', 10: 'wood', 37: 'wood',
  40: 'wood', 53: 'wood', 67: 'wood', 87: 'wood', 88: 'wood', 132: 'wood', 137: 'wood', 141: 'wood',
  148: 'wood', 151: 'wood', 169: 'wood', 182: 'wood', 186: 'wood', 113: 'wood', 50: 'wood', 174: 'wood',
  122: 'wood',
  # 火: 赤 人 彳 彡 弓 毛 玄 羽 行 見 身 車 隹 面 頁 飛 高 馬 鳥 耳 走 曰
  155: 'fire', 9: 'fire', 60: 'fire', 59: 'fire', 57: 'fire', 82: 'fire', 95: 'fire', 124: 'fire',
  144: 'fire', 147: 'fire', 158: 'fire', 159: 'fire', 172: 'fire', 176: 'fire', 181: 'fire', 183: 'fire',
  189: 'fire', 187: 'fire', 196: 'fire', 128: 'fire', 156: 'fire', 73: 'fire',
  # 土: 女 寸 支 方 止 甘 老 至 色 足 辰 辵 邑 里 黃 齊 龍 羊 牛 犬 鹿
  38: 'earth', 41: 'earth', 65: 'earth', 70: 'earth', 77: 'earth', 99: 'earth', 125: 'earth', 133: 'earth',
  139: 'earth', 157: 'earth', 161: 'earth', 162: 'earth', 163: 'earth', 166: 'earth', 201: 'earth',
  210: 'earth', 212: 'earth', 123: 'earth', 93: 'earth', 94: 'earth', 198: 'earth',
  # 金: 刀 戈 斤 矢 攴 欠 殳 牙 白 皿 立 言 貝 辛 酉 革 音 鼓 鼻 骨
  18: 'metal', 62: 'metal', 69: 'metal', 111: 'metal', 66: 'metal', 76: 'metal', 79: 'metal', 92: 'metal',
  106: 'metal', 108: 'metal', 117: 'metal', 149: 'metal', 154: 'metal', 160: 'metal', 164: 'metal',
  177: 'metal', 180: 'metal', 207: 'metal', 209: 'metal', 188: 'metal',
  # 水: 口 子 小 尸 巛 歹 气 用 而 肉 虫 谷 豕 非 食 首 魚 黑 龜 月 穴
  30: 'water', 39: 'water', 42: 'water', 44: 'water', 47: 'water', 78: 'water', 84: 'water', 101: 'water',
  126: 'water', 130: 'water', 142: 'water', 150: 'water', 152: 'water', 175: 'water', 184: 'water',
  185: 'water', 195: 'water', 203: 'water', 213: 'water', 74: 'water', 116: 'water',
}

def radical_of(rs):
    return int(rs.split(' ')[0].replace("'", "").split('.')[0])

def resource_element(rad):
    """기본 표에 있음 → None(빌드 스크립트가 판정), 확장 표에 있음 → 오행, 둘 다 없음 → False(오행 미상)."""
    if rad in RADICAL_ELEMENT:
        return None
    return EXT_RADICAL_ELEMENT.get(rad, False)

def dueum_source_syllables(syl):
    """lib/premium/naming/engine.ts 의 dueumSourceSyllables 와 같은 규칙. 율 → [률, 뉼], 나 → [라]."""
    code = ord(syl[0]) - 0xac00 if len(syl) == 1 else -1
    if code < 0 or code > 11171:
        return []
    cho, jung, jong = code // 588, (code % 588) // 28, code % 28
    make = lambda c: chr(0xac00 + c * 588 + jung * 28 + jong)
    IOTIZED = {2, 6, 7, 12, 17, 20}  # ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
    CHO_N, CHO_R, CHO_O = 2, 5, 11
    if cho == CHO_O and jung in IOTIZED:
        return [make(CHO_R), make(CHO_N)]
    if cho == CHO_N and jung not in IOTIZED:
        return [make(CHO_R)]
    return []

def reading_priority(c, eum):
    """대표 음일수록 작다: 교육용(E) → 표준 완성형(0) → 인명용(N) → 그 밖."""
    src = hangul_map.get(c, {}).get(eum)
    if src is None:
        return 3
    if 'E' in src:
        return 0
    if '0' in src:
        return 1
    if 'N' in src:
        return 2
    return 3

def parse_pron(pron):
    """'법칙 률(율)' → ('법칙', '률'). 괄호 속 두음 표기는 버리고 사전 음을 그대로 쓴다.
    음이 여럿인 표기('밟을 리(이)/신 리(이)')도 괄호를 모두 지운 뒤 나눈다."""
    pron = re.sub(r'\([^)]*\)', '', pron).strip()
    if ' ' not in pron:
        return None
    hun, eum = pron.rsplit(' ', 1)
    eum = eum.strip()
    if not hun.strip() or not eum:
        return None
    return hun, eum

TAG_KEYWORDS = {
    '밝음': ['밝을', '빛날', '빛', '비칠', '환할', '볕', '해', '새벽', '아침', '일어날', '찬란'],
    '지혜': ['지혜', '슬기', '알', '깨달을', '총명', '배울', '글', '문채', '이치', '생각', '뜻', '통할'],
    '따뜻함': ['따뜻할', '온화', '부드러울', '은혜', '사랑', '화목', '기쁠', '어질', '복', '화할', '순할'],
    '강인함': ['굳셀', '굳을', '강할', '용맹', '큰', '높을', '바를', '씩씩할', '세찰', '넓을', '우뚝할', '건장할', '정할'],
    '자연': ['나무', '숲', '꽃', '풀', '물', '맑을', '시내', '강', '바다', '산', '구름', '바람', '봄', '이슬', '달', '별'],
    '귀함': ['보배', '옥', '귀할', '벼슬', '상서로울', '옥돌', '아름다울', '단장할', '곱을', '존귀', '영화', '보석', '비단']
}

NEG_KEYWORDS = [
    '죽을', '병', '귀신', '도둑', '슬플', '더러울', '괴로울', '악할', '흉할', '패할', '거칠', '어지러울',
    '울', '속일', '해칠', '다칠', '미워할', '가난할', '종', '노비', '썩을', '무덤'
]
# 엔진(isNameWorthy)이 거르는 부적합 훈 패턴·글자도 데이터 단계에서 미리 뺀다.
with open('data/naming/name-exclude.json', encoding='utf-8') as f:
    _exclude = json.load(f)
NEG_KEYWORDS = list(dict.fromkeys(NEG_KEYWORDS + _exclude['hunPatterns']))
EXCLUDE_CHARS = set(_exclude['chars'])

def is_negative(hun):
    # 한 글자 키워드(울·병·종)는 단어 단위로만 본다('아름다울'의 '울'을 잘못 거르지 않도록).
    words = re.split(r'[\s·/,]+', hun)
    for neg in NEG_KEYWORDS:
        if len(neg) == 1:
            if neg in words:
                return True
        elif neg in hun:
            return True
    return False

# Preferred syllables for baby names (from popular names)
with open('data/naming/given-names.json', encoding='utf-8') as f:
    g_data = json.load(f)

popular_syllables = set()
for g in ['M', 'F']:
    for item in g_data[g]:
        for ch in item['name']:
            popular_syllables.add(ch)

candidates = []
seen_chars = set()

unknown_element = []

def make_entry(c, hun, eum, tags):
    rad = radical_of(rs_map[c])
    elem = resource_element(rad)
    entry = {'char': c, 'eum': eum, 'hun': hun, 'genders': ['M', 'F'], 'tags': tags}
    if elem is False:
        unknown_element.append((c, eum, rad))
        entry['element'] = None  # 오행 미상(보완 점수 0)
    elif elem:
        entry['element'] = elem
    return entry

# First pass: popular syllables with positive meanings.
# 음절 순서는 data-naver.json 키 순서(결정론), 음절 안 글자 순서는 사전 순서 그대로(엔진이 빈도 대용으로 씀).
# 사전 음이 인기 음절의 두음 원음(율 ← 률)이어도 받는다. eum 은 사전 음 그대로 저장한다.
# 음이 여럿인 글자(洗 세·선)는 대표 음 하나만 쓴다: Unihan kHangul 출처(교육용→완성형→인명용) → 목록 순위 → 키 순서.
pass1 = {}  # char -> (priority, rank, syl_order, syl, hun, eum)
pop_syls = [k for k in naver_dict if k in popular_syllables]
for syl_order, syl in enumerate(pop_syls):
    readings = [syl] + dueum_source_syllables(syl)
    items = [it for key in readings for it in naver_dict.get(key, [])]
    for rank, item in enumerate(items):
        c = item['entryName']
        if c not in inmyong or c not in rs_map or c in EXCLUDE_CHARS: continue
        parsed = parse_pron(item.get('pron') or '')
        if not parsed: continue
        hun, eum = parsed
        if eum not in readings: continue
        if is_negative(hun): continue
        cand = (reading_priority(c, eum), rank, syl_order, syl, hun, eum)
        if c not in pass1 or cand[:3] < pass1[c][:3]:
            pass1[c] = cand

pass1_rows = []  # 음절 순서 → 음절 안 사전 순서
for c, (_, rank, syl_order, syl, hun, eum) in pass1.items():
    pass1_rows.append((syl_order, rank, c, hun, eum))
pass1_rows.sort(key=lambda r: (r[0], r[1]))

for _, _, c, hun, eum in pass1_rows:
    tags = []
    for tag, kws in TAG_KEYWORDS.items():
        if any(kw in hun for kw in kws):
            tags.append(tag)
    if not tags:
        tags = ['귀함']
    tags = tags[:3]

    entry = make_entry(c, hun, eum, tags)
    if entry is None: continue
    candidates.append(entry)
    seen_chars.add(c)

print(f"Candidates from popular syllables: {len(candidates)}")

# Second pass: if less than 800, add more positive hanja from all syllables
if len(candidates) < 800:
    for syl, items in naver_dict.items():
        for item in items:
            c = item['entryName']
            if c in seen_chars: continue
            if c not in inmyong or c not in rs_map or c in EXCLUDE_CHARS: continue
            parsed = parse_pron(item.get('pron') or '')
            if not parsed: continue
            hun, eum = parsed
            if is_negative(hun): continue

            # Must match at least one positive tag
            tags = [tag for tag, kws in TAG_KEYWORDS.items() if any(kw in hun for kw in kws)]
            if not tags: continue
            tags = tags[:3]

            entry = make_entry(c, hun, eum, tags)
            if entry is None: continue
            candidates.append(entry)
            seen_chars.add(c)
            if len(candidates) >= 1000:
                break
        if len(candidates) >= 1000:
            break

print(f"Total candidates selected: {len(candidates)}")
print(f"Unknown resource element (element=null): {len(unknown_element)}")

# Write name-hanja.source.json
with open('data/naming/name-hanja.source.json', 'w', encoding='utf-8') as f:
    json.dump(candidates, f, ensure_ascii=False, indent=2)

print("Saved data/naming/name-hanja.source.json successfully.")

# Also collect all characters needed for unihan-subset.json:
# (All characters in name-hanja.source.json + all characters in surnames.json)
chars_for_unihan = set(seen_chars)
# apply_n1_n2.py 가 남성 글자로 직접 추가하는 글자(획수 계산에 Unihan 이 필요)
chars_for_unihan.update('彪郞郎丈夫')

with open('data/naming/surnames.json', encoding='utf-8') as f:
    surnames = json.load(f)

for s_items in surnames.values():
    for item in s_items:
        h = item['hanja']
        for c in h:
            chars_for_unihan.add(c)

print(f"Total characters for unihan-subset: {len(chars_for_unihan)}")

unihan_subset = {}
for c in sorted(list(chars_for_unihan)):
    rs = rs_map.get(c)
    tot = total_map.get(c)
    if rs is not None:
        unihan_subset[c] = {
            'rs': rs,
            'total': tot if tot is not None else 0
        }
    else:
        print(f"Warning: character {c} not found in Unihan!")

with open('data/naming/unihan-subset.json', 'w', encoding='utf-8') as f:
    json.dump(unihan_subset, f, ensure_ascii=False, indent=2)

print("Saved data/naming/unihan-subset.json successfully.")
