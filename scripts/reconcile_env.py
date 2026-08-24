import os
import sys
import io
import re
from urllib.parse import urlparse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add scripts directory to path to import _creds
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _creds import connect_client, get_host_user

def parse_env_lines(content: str):
    """
    Parses an env file content into an ordered dict of (key -> value)
    while preserving comments and blank lines structure if possible,
    or returning a key-value dictionary and original line records.
    """
    env_dict = {}
    lines = content.splitlines()
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" in stripped:
            k, v = stripped.split("=", 1)
            k = k.strip()
            v = v.strip()
            # Do not strip quotes if they are part of the value, but normalize
            env_dict[k] = v
    return env_dict

def get_server_env():
    print("[1/5] Connecting to server via SSH...")
    client = connect_client()
    sftp = client.open_sftp()
    remote_path = "/root/k-destiny-core/.env"
    print(f"Reading {remote_path} from server...")
    try:
        with sftp.open(remote_path, "r") as f:
            content = f.read().decode("utf-8")
        print("Server .env downloaded successfully! ✅")
    except Exception as e:
        print(f"[ERROR] Failed to read {remote_path}: {e}")
        sftp.close()
        client.close()
        sys.exit(1)
    finally:
        sftp.close()
        client.close()
    return content

def verify_supabase_url(key_name, val):
    if not val:
        return "[WARN] Empty URL"
    # Remove quotes
    raw_val = val.strip("\"'")
    try:
        parsed = urlparse(raw_val)
        hostname = parsed.hostname or "unknown"
        port = parsed.port
        # Mask hostname partially if needed, but showing domain supabase.co is safe and confirms config
        if "supabase" in hostname:
            return f"✅ Supabase host verified: {hostname}:{port}"
        else:
            return f"⚠️ Non-Supabase host: {hostname}:{port}"
    except Exception as e:
        return f"[ERROR] Failed to parse URL: {e}"

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_env_path = os.path.join(project_root, ".env")
    local_env_local_path = os.path.join(project_root, ".env.local")
    
    # 1. Download server .env
    server_content = get_server_env()
    
    # Save a backup of server .env locally
    backup_server_path = os.path.join(project_root, ".env.server.bak")
    with open(backup_server_path, "w", encoding="utf-8") as f:
        f.write(server_content)
    print(f"Saved server .env backup to .env.server.bak")

    server_vars = parse_env_lines(server_content)
    
    # 2. Read local .env.local
    local_env_local_vars = {}
    if os.path.exists(local_env_local_path):
        with open(local_env_local_path, "r", encoding="utf-8") as f:
            local_env_local_vars = parse_env_lines(f.read())
        print(f"[2/5] Read local .env.local ({len(local_env_local_vars)} keys found)")
    else:
        print("[2/5] Notice: local .env.local not found")

    # Read existing local .env
    local_env_vars = {}
    if os.path.exists(local_env_path):
        with open(local_env_path, "r", encoding="utf-8") as f:
            local_env_vars = parse_env_lines(f.read())
        print(f"Read existing local .env ({len(local_env_vars)} keys found)")

    # 3. Merge dictionary
    # Base is server_vars
    merged = {}
    source_map = {}
    
    # Add all server vars
    for k, v in server_vars.items():
        merged[k] = v
        source_map[k] = "server .env"

    # Merge from local .env.local (fill missing or overwrite if server value was empty and local is not)
    for k, v in local_env_local_vars.items():
        if k not in merged or (merged[k] == "" and v != ""):
            merged[k] = v
            source_map[k] = ".env.local"

    # Merge from local .env
    for k, v in local_env_vars.items():
        if k not in merged or (merged[k] == "" and v != ""):
            merged[k] = v
            source_map[k] = "local .env"

    # 4. Kongdak keys
    print("[3/5] Applying Kongdak configuration...")
    # BIRTH_HASH_PEPPER (empty)
    merged["BIRTH_HASH_PEPPER"] = ""
    source_map["BIRTH_HASH_PEPPER"] = "kongdak (to fill)"

    # NEXT_PUBLIC_GA_ID (empty)
    merged["NEXT_PUBLIC_GA_ID"] = ""
    source_map["NEXT_PUBLIC_GA_ID"] = "kongdak (to fill)"

    # NEXT_PUBLIC_SITE_URL
    merged["NEXT_PUBLIC_SITE_URL"] = "https://kongdak.kr"
    source_map["NEXT_PUBLIC_SITE_URL"] = "kongdak"

    # 5. Verify DATABASE_URL and DIRECT_URL
    print("\n[4/5] Checking Database URLs:")
    db_url = merged.get("DATABASE_URL", "")
    direct_url = merged.get("DIRECT_URL", "")
    print(f" - DATABASE_URL: {verify_supabase_url('DATABASE_URL', db_url)}")
    print(f" - DIRECT_URL:   {verify_supabase_url('DIRECT_URL', direct_url)}")

    # 6. Write final .env
    # Format output nicely grouped
    output_lines = [
        "# ========================================================",
        "# 콩닥(Kongdak) / K-Destiny 통합 환경변수 설정 파일 (.env)",
        "# 주의: 비밀 키가 포함되어 있으므로 Git에 커밋하지 마세요.",
        "# ========================================================",
        ""
    ]

    # Pre-defined section ordering
    sections = {
        "데이터베이스 (Database)": ["DATABASE_URL", "DIRECT_URL"],
        "사이트 기본 설정 (Site Config)": ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_GA_ID", "PORT", "NODE_ENV"],
        "보안 및 해시 (Security)": ["BIRTH_HASH_PEPPER", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "CRON_SECRET"],
        "인증 (Auth Providers)": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET", "NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
        "AI 및 LLM (AI Models)": ["GEMINI_API_KEY", "OPENAI_API_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY"],
        "결제 (Payments)": ["TOSS_CLIENT_KEY", "TOSS_SECRET_KEY", "GUMROAD_ACCESS_TOKEN", "GUMROAD_PRODUCT_PERMALINK"],
        "기타 (Others)": []
    }

    allocated_keys = set()
    for s_name, keys in sections.items():
        if s_name == "기타 (Others)":
            continue
        section_lines = []
        for k in keys:
            if k in merged:
                section_lines.append(f"{k}={merged[k]}")
                allocated_keys.add(k)
        if section_lines:
            output_lines.append(f"# --- {s_name} ---")
            output_lines.extend(section_lines)
            output_lines.append("")

    # Others
    other_lines = []
    for k, v in merged.items():
        if k not in allocated_keys:
            other_lines.append(f"{k}={v}")
    if other_lines:
        output_lines.append("# --- 기타 환경변수 ---")
        output_lines.extend(other_lines)
        output_lines.append("")

    # Save backup of current local .env if it exists
    if os.path.exists(local_env_path):
        backup_local_path = os.path.join(project_root, ".env.local_prev.bak")
        with open(backup_local_path, "w", encoding="utf-8") as f:
            if os.path.exists(local_env_path):
                with open(local_env_path, "r", encoding="utf-8") as cur_f:
                    f.write(cur_f.read())
        print(f"Backed up previous local .env to .env.local_prev.bak")

    with open(local_env_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    print(f"\n[5/5] Successfully generated unified local .env! ✅\n")

    # 7. Summary report (NO SECRET VALUES LOGGED!)
    print("=" * 70)
    print(f"{'Key Name':<32} | {'Status':<18} | {'Source'}")
    print("-" * 70)
    empty_keys = []
    for k in sorted(merged.keys()):
        val = merged[k]
        if val == "":
            status = "⚪ EMPTY"
            empty_keys.append(k)
        else:
            status = f"🟢 Set ({len(val)} chars)"
        src = source_map.get(k, "unknown")
        print(f"{k:<32} | {status:<18} | {src}")
    print("=" * 70)

    print("\n[검증 결과]")
    if set(empty_keys) == {"BIRTH_HASH_PEPPER", "NEXT_PUBLIC_GA_ID"}:
        print("✅ 완벽합니다! 비어있는 키는 요청하신 2개(BIRTH_HASH_PEPPER, NEXT_PUBLIC_GA_ID)뿐입니다.")
    else:
        print(f"ℹ️ 현재 비어있는 키 목록: {empty_keys}")

if __name__ == "__main__":
    main()
