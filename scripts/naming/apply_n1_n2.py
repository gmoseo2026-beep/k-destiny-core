import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data/naming/name-hanja.source.json', encoding='utf-8') as f:
    source = json.load(f)

with open('data/naming/unihan-subset.json', encoding='utf-8') as f:
    unihan = json.load(f)

NEUTRAL_EXCEPTIONS = {'始', '委', '威', '姿', '好', '如', '妙', '姜'}
FEMALE_WORDS = ['예쁠', '아름다울', '아리따울', '계집', '여자', '아가씨', '왕비', '부인']
MALE_CHARS = {'雄', '彪', '郞', '郎', '丈', '夫'}
MALE_WORDS = ['수컷', '사내', '사나이']

# Add explicit male characters if not present in source
# element 는 prepare_data.py 의 부수-자원오행 표와 같은 기준(虍·大 → 木, 邑 → 土, 一 → 미상 null)
male_char_data = [
    {'char': '彪', 'eum': '표', 'hun': '호랑이무늬', 'genders': ['M'], 'tags': ['강인함', '귀함'], 'element': 'wood'},
    {'char': '郞', 'eum': '랑', 'hun': '사내·밝을', 'genders': ['M'], 'tags': ['밝음', '귀함'], 'element': 'earth'},
    {'char': '郎', 'eum': '랑', 'hun': '사내·밝을', 'genders': ['M'], 'tags': ['밝음', '귀함'], 'element': 'earth'},
    {'char': '丈', 'eum': '장', 'hun': '어른·길', 'genders': ['M'], 'tags': ['강인함', '귀함'], 'element': None},
    {'char': '夫', 'eum': '부', 'hun': '지아비·사내', 'genders': ['M'], 'tags': ['강인함', '귀함'], 'element': 'wood'},
]
existing_chars = {it['char'] for it in source}
for mcd in male_char_data:
    if mcd['char'] not in existing_chars:
        source.append(mcd)
        existing_chars.add(mcd['char'])

CUSTOM_HUN_FIXES = {
    '羊': '상서로울·순할',
    '私': '사사로울',
    '壇': '제터',
    '兄': '맏',
    '窓': '창문',
    '槍': '창검·찌를',
    '窗': '창문',
    '臺': '누각',
    '坮': '누각',
    '乺': '땅이름',
    '詩': '시구·노래',
    '韻': '운치·소리',
    '韵': '운치·소리',
    '江': '가람·큰물',
    '銀': '백금',
    '旗': '깃발',
    '旂': '깃발',
    '洑': '물굽이·보루',
    '湺': '물굽이·보루',
    '疔': '부스럼',
}

def clean_hun(raw_hun, eum, char):
    if char in CUSTOM_HUN_FIXES:
        return CUSTOM_HUN_FIXES[char]
    parts = [p.strip() for p in raw_hun.replace('/', '·').split('·') if p.strip()]
    cleaned_parts = []
    for p in parts:
        p_clean = p
        # 띄어 쓴 음만 뗀다. 붙어 있는 끝 글자는 낱말의 일부다(은혜·기린·인륜 — 떼면 '은'·'기'·'인'이 된다).
        if p_clean.endswith(' ' + eum):
            p_clean = p_clean[:-len(' ' + eum)].strip()
        if p_clean == eum:
            continue
        if p_clean and p_clean not in cleaned_parts:
            cleaned_parts.append(p_clean)
    if not cleaned_parts:
        cleaned_parts = [raw_hun]
    result = '·'.join(cleaned_parts[:2])
    # final sanity check: if result ends with a spaced eum, strip it
    if result.endswith(' ' + eum):
        result = result[:-len(' ' + eum)].strip()
    return result

changed_genders = []
cleaned_huns = 0

for item in source:
    c = item['char']
    eum = item['eum']
    raw_hun = item['hun']
    
    # 1. Clean hun
    new_hun = clean_hun(raw_hun, eum, c)
    if new_hun != raw_hun:
        cleaned_huns += 1
    item['hun'] = new_hun

    # 2. Determine gender
    u = unihan.get(c, {})
    rs = u.get('rs', '0.0')
    rad = int(rs.split(' ')[0].replace("'", "").split('.')[0])
    
    is_female = False
    is_male = False
    
    if rad == 38 and c not in NEUTRAL_EXCEPTIONS:
        is_female = True
    elif any(w in raw_hun for w in FEMALE_WORDS) or any(w in new_hun for w in FEMALE_WORDS):
        if c not in NEUTRAL_EXCEPTIONS:
            is_female = True

    if c in MALE_CHARS or any(w in raw_hun for w in MALE_WORDS) or any(w in new_hun for w in MALE_WORDS):
        is_male = True
        
    old_g = item.get('genders', ['M', 'F'])
    if is_female and not is_male:
        item['genders'] = ['F']
    elif is_male and not is_female:
        item['genders'] = ['M']
    else:
        item['genders'] = ['M', 'F']
        
    if item['genders'] != old_g:
        changed_genders.append({
            'char': c,
            'hun': new_hun,
            'eum': eum,
            'genders': item['genders']
        })

print(f"Total items in source: {len(source)}")
print(f"Cleaned huns: {cleaned_huns}")
print(f"Changed genders count: {len(changed_genders)}")
f_count = sum(1 for it in source if it['genders'] == ['F'])
m_count = sum(1 for it in source if it['genders'] == ['M'])
mf_count = sum(1 for it in source if it['genders'] == ['M', 'F'])
print(f"Final gender distribution: F={f_count}, M={m_count}, MF={mf_count}")

# Check specific test cases requested in N1:
# 娟·婷·媛·娥는 ["F"], 雄은 ["M"], 始·如는 ["M","F"]
test_expectations = {
    '娟': ['F'],
    '婷': ['F'],
    '媛': ['F'],
    '娥': ['F'],
    '雄': ['M'],
    '始': ['M', 'F'],
    '如': ['M', 'F']
}

for c, exp in test_expectations.items():
    found = [it for it in source if it['char'] == c]
    if found:
        actual = found[0]['genders']
        print(f"Test char {c}: expected={exp}, actual={actual} -> {'PASS' if actual == exp else 'FAIL'}")
    else:
        print(f"Test char {c}: NOT FOUND in source")

# Save updated source
with open('data/naming/name-hanja.source.json', 'w', encoding='utf-8') as f:
    json.dump(source, f, ensure_ascii=False, indent=2)

print("Saved updated data/naming/name-hanja.source.json successfully.")

# Save changed_genders list to a json for Checkpoint 4 reporting
with open('data/naming/changed-genders-n1.json', 'w', encoding='utf-8') as f:
    json.dump(changed_genders, f, ensure_ascii=False, indent=2)

print("Saved data/naming/changed-genders-n1.json successfully.")
