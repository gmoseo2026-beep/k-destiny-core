import re,sys
src=open('flow_rpa.py',encoding='utf-8').read()
defined=set(re.findall(r'"([a-z_]+)":\s*\[', src.split('SELECTORS = {')[1].split('\n    }')[0]))
used=set(re.findall(r'SELECTORS\["([a-z_]+)"\]', src)) | set(re.findall(r'any_visible\([a-z_]+, "([a-z_]+)"\)', src)) | set(re.findall(r'first_locator\([a-z_]+, "([a-z_]+)"', src))
miss=used-defined
print('정의:',sorted(defined)); print('사용:',sorted(used)); print('누락:',sorted(miss) or 'NONE')
sys.exit(1 if miss else 0)
