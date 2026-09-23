import json
import urllib.request
import zipfile
import io
import os
import sys

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

print(f"Unihan loaded. rs_map: {len(rs_map)}, total_map: {len(total_map)}")

RADICAL_ELEMENT = {
  75: 'wood', 118: 'wood', 140: 'wood', 115: 'wood',
  86: 'fire', 72: 'fire', 61: 'fire',
  32: 'earth', 46: 'earth', 102: 'earth', 170: 'earth',
  167: 'metal', 96: 'metal', 112: 'metal',
  85: 'water', 173: 'water', 15: 'water',
}

CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
CHO_ELEMENT = {
  'ㄱ': 'wood', 'ㄲ': 'wood', 'ㅋ': 'wood',
  'ㄴ': 'fire', 'ㄷ': 'fire', 'ㄸ': 'fire', 'ㄹ': 'fire', 'ㅌ': 'fire',
  'ㅇ': 'earth', 'ㅎ': 'earth',
  'ㅅ': 'metal', 'ㅆ': 'metal', 'ㅈ': 'metal', 'ㅉ': 'metal', 'ㅊ': 'metal',
  'ㅁ': 'water', 'ㅂ': 'water', 'ㅃ': 'water', 'ㅍ': 'water',
}

def get_sound_element(syllable):
    code = ord(syllable[0]) - 0xac00
    if 0 <= code <= 11171:
        cho_idx = code // 588
        return CHO_ELEMENT[CHO[cho_idx]]
    return 'wood'

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

# First pass: popular syllables with positive meanings
for syl in popular_syllables:
    items = naver_dict.get(syl, [])
    for item in items:
        c = item['entryName']
        if c in seen_chars: continue
        if c not in inmyong or c not in rs_map: continue
        pron = item.get('pron') or ''
        if ' ' not in pron: continue
        hun, eum = pron.rsplit(' ', 1)
        if eum != syl: continue
        if any(neg in hun for neg in NEG_KEYWORDS): continue
        
        tags = []
        for tag, kws in TAG_KEYWORDS.items():
            if any(kw in hun for kw in kws):
                tags.append(tag)
        if not tags:
            tags = ['귀함']
        tags = tags[:3]

        rs = rs_map[c]
        rad = int(rs.split(' ')[0].replace("'", "").split('.')[0])
        
        entry = {
            'char': c,
            'eum': eum,
            'hun': hun,
            'genders': ['M', 'F'],
            'tags': tags
        }
        if rad not in RADICAL_ELEMENT:
            entry['element'] = get_sound_element(eum)

        candidates.append(entry)
        seen_chars.add(c)

print(f"Candidates from popular syllables: {len(candidates)}")

# Second pass: if less than 800, add more positive hanja from all syllables
if len(candidates) < 800:
    for syl, items in naver_dict.items():
        for item in items:
            c = item['entryName']
            if c in seen_chars: continue
            if c not in inmyong or c not in rs_map: continue
            pron = item.get('pron') or ''
            if ' ' not in pron: continue
            hun, eum = pron.rsplit(' ', 1)
            if any(neg in hun for neg in NEG_KEYWORDS): continue
            
            # Must match at least one positive tag
            tags = [tag for tag, kws in TAG_KEYWORDS.items() if any(kw in hun for kw in kws)]
            if not tags: continue
            tags = tags[:3]

            rs = rs_map[c]
            rad = int(rs.split(' ')[0].replace("'", "").split('.')[0])
            
            entry = {
                'char': c,
                'eum': eum,
                'hun': hun,
                'genders': ['M', 'F'],
                'tags': tags
            }
            if rad not in RADICAL_ELEMENT:
                entry['element'] = get_sound_element(eum)

            candidates.append(entry)
            seen_chars.add(c)
            if len(candidates) >= 1000:
                break
        if len(candidates) >= 1000:
            break

print(f"Total candidates selected: {len(candidates)}")

# Write name-hanja.source.json
with open('data/naming/name-hanja.source.json', 'w', encoding='utf-8') as f:
    json.dump(candidates, f, ensure_ascii=False, indent=2)

print("Saved data/naming/name-hanja.source.json successfully.")

# Also collect all characters needed for unihan-subset.json:
# (All characters in name-hanja.source.json + all characters in surnames.json)
chars_for_unihan = set(seen_chars)

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
