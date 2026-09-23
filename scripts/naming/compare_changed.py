import subprocess, json, sys

sys.stdout.reconfigure(encoding='utf-8')
raw = subprocess.check_output(['git', 'show', 'HEAD:data/naming/name-hanja.source.json'], encoding='utf-8')
head_items = {it['char']: it for it in json.loads(raw)}

with open('data/naming/name-hanja.source.json', encoding='utf-8') as f:
    current = json.load(f)

changed = []
for it in current:
    c = it['char']
    if c not in head_items:
        changed.append({'char': c, 'hun': it['hun'], 'eum': it['eum'], 'genders': it['genders'], 'reason': 'new'})
    elif head_items[c].get('genders') != it.get('genders'):
        changed.append({'char': c, 'hun': it['hun'], 'eum': it['eum'], 'genders': it['genders'], 'old_genders': head_items[c].get('genders')})

print('Total changed genders vs HEAD:', len(changed))
with open('data/naming/changed-genders-n1.json', 'w', encoding='utf-8') as f:
    json.dump(changed, f, ensure_ascii=False, indent=2)

f_list = [c for c in changed if c['genders'] == ['F']]
m_list = [c for c in changed if c['genders'] == ['M']]
print(f'F changed: {len(f_list)}, M changed: {len(m_list)}')
for item in changed:
    print(f"{item['char']} ({item['eum']}, {item['hun']}): {item.get('old_genders', ['M','F'])} -> {item['genders']}")
