import sys
import os
sys.path.append('./scripts')
import _creds
client = _creds.connect_client()
sftp = client.open_sftp()
sftp.put('fix-sql.js', '/root/k-destiny-core/fix-sql.js')
sftp.close()

stdin, stdout, stderr = client.exec_command('cd /root/k-destiny-core && node fix-sql.js')
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
client.close()
