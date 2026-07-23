import paramiko
import json
from _creds import get_creds

HOST, USER, PASS = get_creds()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15, look_for_keys=False, allow_agent=False)

cmd = 'curl -s -m 90 -X POST http://localhost:3000/api/generate-destiny -H "Content-Type: application/json" -d \'{"name":"Test","dob":"1990-07-15","gender":"Male","masterName":"Master Karma","locale":"ko"}\' 2>/dev/null'

print("Testing generate-destiny API (may take up to 60s)...")
channel = client.get_transport().open_session()
channel.settimeout(120)
channel.exec_command(cmd)

raw = b""
while True:
    try:
        chunk = channel.recv(4096)
        if not chunk:
            break
        raw += chunk
    except Exception:
        break

text = raw.decode('utf-8', errors='replace')
try:
    data = json.loads(text)
    if 'core_essence' in data:
        print("API TEST: SUCCESS")
        ce = data.get('core_essence', '')
        print(f"  core_essence length: {len(ce)} chars")
        print(f"  fourPillars: {data.get('fourPillars', 'N/A')}")
        print(f"  dayMaster: {data.get('dayMaster', 'N/A')}")
        print(f"  lucky_elements: {data.get('lucky_elements', 'N/A')}")
        print(f"  fallback: {data.get('fallback', False)}")
        print(f"  keys: {list(data.keys())}")
    elif 'error' in data:
        print(f"API TEST: ERROR - {data['error']}")
    else:
        print(f"API TEST: UNEXPECTED - keys: {list(data.keys())}")
except json.JSONDecodeError:
    print(f"API TEST: INVALID JSON")
    print(f"  raw (first 300): {text[:300]}")

client.close()
