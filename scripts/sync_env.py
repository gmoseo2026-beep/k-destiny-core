import os
import sys
import io
import time
from _creds import connect_client, get_host_user

# Windows 콘솔 인코딩 대응
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST, USER = get_host_user()

def sync_env():
    # 1. 로컬 .env 파일 찾기 (.env 우선, 없으면 .env.local)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_env_path = os.path.join(project_root, ".env")
    if not os.path.exists(local_env_path):
        local_env_path = os.path.join(project_root, ".env.local")
        if not os.path.exists(local_env_path):
            print("[ERROR] 로컬 프로젝트 루트에 .env 또는 .env.local 파일이 없습니다.")
            sys.exit(1)

    print(f"로컬 환경변수 파일: {os.path.basename(local_env_path)}")

    # 2. 포함된 키 목록만 파싱 (값은 절대 출력하지 않음)
    keys_found = []
    with open(local_env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k = line.split("=", 1)[0].strip()
                keys_found.append(k)

    print(f"동기화 대상 환경변수 키 ({len(keys_found)}개): {', '.join(keys_found)}")

    # 3. 서버 접속
    print(f"\n{HOST} 서버에 SSH 연결 중...")
    client = connect_client()
    print("연결 성공!")

    sftp = client.open_sftp()
    remote_app_dir = "/root/k-destiny-core"
    remote_env_path = f"{remote_app_dir}/.env"
    remote_bak_path = f"{remote_app_dir}/.env.bak"

    try:
        # 4. 기존 서버 .env 백업 (존재할 경우)
        try:
            sftp.stat(remote_env_path)
            # 백업 수행
            client.exec_command(f"cp {remote_env_path} {remote_bak_path}")
            print(f"[백업] 기존 서버 .env를 .env.bak으로 백업했습니다.")
        except IOError:
            print("[알림] 서버에 기존 .env 파일이 없어 새로 생성합니다.")

        # 5. SFTP를 통해 안전하게 파일 전송 (네트워크 암호화 채널)
        print(f"서버 {remote_env_path} 로 파일 전송 중...")
        sftp.put(local_env_path, remote_env_path)
        
        # 권한 설정 (600: 소유자만 읽기/쓰기 가능하도록 보안 강화)
        client.exec_command(f"chmod 600 {remote_env_path}")
        print("✅ .env 파일 전송 및 권한(600) 설정 완료!")

        # 6. PM2에 반영 알림
        print("\n[안내] 변경된 환경변수를 런타임에 적용하려면 배포를 실행하거나 PM2를 재시작해야 합니다.")
        print("  - 전체 배포 실행: python scripts/safe_deploy.py")
        print("  - 환경변수만 즉시 반영: python scripts/pm2_reload.py")

    finally:
        sftp.close()
        client.close()

if __name__ == "__main__":
    sync_env()
