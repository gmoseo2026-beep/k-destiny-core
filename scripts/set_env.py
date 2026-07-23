from _creds import connect_client, get_env

client = connect_client()

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
