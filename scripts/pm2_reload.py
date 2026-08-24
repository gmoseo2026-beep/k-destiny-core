import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from _creds import connect_client

try:
    print("Connecting...")
    client = connect_client()
    print("Connected!")
    
    cmd = "curl -s -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"hello\",\"masterName\":\"Master Karma\"}'"
    print(f">>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    res = stdout.read().decode('utf-8', errors='ignore')
    print("RESULT:")
    print(res)
    
finally:
    client.close()
