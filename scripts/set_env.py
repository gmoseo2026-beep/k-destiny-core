import paramiko
from _creds import get_creds, get_env

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
HOST, USER, PASS = get_creds()
client.connect(HOST, username=USER, password=PASS)

# Set OPENAI_API_KEY in /root/k-destiny-core/.env from the local env / deploy.env
# (never hardcode the key here). Replaces any existing line so rotations apply.
OPENAI_API_KEY = get_env("OPENAI_API_KEY")
cmd = f"""
sed -i '/^OPENAI_API_KEY/d' /root/k-destiny-core/.env
echo 'OPENAI_API_KEY="{OPENAI_API_KEY}"' >> /root/k-destiny-core/.env
"""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())
client.close()
