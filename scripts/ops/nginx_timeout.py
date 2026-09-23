"""kongdak.kr nginx 프록시 타임아웃을 120초로 늘린다 (프리미엄 리포트 생성 대기용).

사용:
  python scripts/ops/nginx_timeout.py            # 시험 실행(변경 없음): 현재 설정과 바뀔 내용만 출력
  python scripts/ops/nginx_timeout.py --apply    # 적용: 백업 → 수정 → nginx -t 통과 시에만 reload, 실패하면 자동 원복

안전장치:
  - 자격증명은 scripts/_creds.py(connect_client)로만 읽는다. 값은 출력하지 않는다.
  - 이미 proxy_read_timeout 이 있으면 아무것도 바꾸지 않는다(여러 번 실행해도 안전).
  - 수정 전 설정 파일을 .bak-<시각> 으로 백업하고, nginx -t 실패 시 백업으로 되돌린다.
"""
import io
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from _creds import connect_client  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SITE = "/etc/nginx/sites-available/kongdak.kr"
TIMEOUT = "120s"


def run(client, cmd, tmo=60):
    _, out, err = client.exec_command(cmd, timeout=tmo)
    code = out.channel.recv_exit_status()
    text = (out.read() + err.read()).decode("utf-8", "replace").strip()
    return code, text


def main():
    apply = "--apply" in sys.argv
    client = connect_client()
    try:
        code, _ = run(client, f"test -f {SITE}")
        if code != 0:
            print(f"✖ 설정 파일이 없습니다: {SITE}  → 중단(아무것도 바꾸지 않음)")
            return 1

        _, current = run(client, f"grep -n 'proxy_pass\\|proxy_read_timeout\\|proxy_send_timeout' {SITE}")
        print("[현재 설정]\n" + (current or "(proxy 관련 줄 없음)"))

        code, _ = run(client, f"grep -q 'proxy_read_timeout' {SITE}")
        if code == 0:
            print("\n✓ 이미 proxy_read_timeout 이 설정돼 있습니다. 변경하지 않습니다.")
            return 0

        code, count = run(client, f"grep -c 'proxy_pass' {SITE}")
        if code != 0 or count.strip() in ("", "0"):
            print("\n✖ proxy_pass 줄을 찾지 못했습니다. 수동 확인이 필요합니다 → 중단")
            return 1

        print(f"\n[바뀔 내용] proxy_pass 가 있는 {count.strip()}곳 바로 아래에 다음 두 줄을 추가합니다:")
        print(f"    proxy_read_timeout {TIMEOUT};\n    proxy_send_timeout {TIMEOUT};")

        if not apply:
            print("\n(시험 실행입니다. 적용하려면 --apply 를 붙여 다시 실행하세요.)")
            return 0

        backup = f"{SITE}.bak-{time.strftime('%Y%m%d%H%M%S')}"
        code, text = run(client, f"cp -p {SITE} {backup}")
        if code != 0:
            print(f"✖ 백업 실패 → 중단\n{text}")
            return 1
        print(f"\n백업: {backup}")

        sed = (
            f"sed -i '/proxy_pass/a\\        proxy_read_timeout {TIMEOUT};\\n"
            f"        proxy_send_timeout {TIMEOUT};' {SITE}"
        )
        code, text = run(client, sed)
        if code != 0:
            run(client, f"cp -p {backup} {SITE}")
            print(f"✖ 수정 실패 → 백업으로 되돌렸습니다\n{text}")
            return 1

        code, text = run(client, "nginx -t 2>&1")
        print("\n[nginx -t]\n" + text)
        if code != 0:
            run(client, f"cp -p {backup} {SITE}")
            _, text2 = run(client, "nginx -t 2>&1")
            print("\n✖ 설정 검사 실패 → 백업으로 되돌렸습니다(reload 하지 않음)\n" + text2)
            return 1

        code, text = run(client, "systemctl reload nginx 2>&1")
        if code != 0:
            print("✖ reload 실패\n" + text)
            return 1

        _, after = run(client, f"grep -n 'proxy_read_timeout\\|proxy_send_timeout' {SITE}")
        _, status = run(client, "curl -s -o /dev/null -w '%{http_code}' https://kongdak.kr/ko")
        print("\n[적용 결과]\n" + after)
        print(f"\nhttps://kongdak.kr/ko 응답: {status}")
        if status.strip() != "200":
            print("⚠ 응답이 200이 아닙니다. 필요하면 백업으로 되돌리세요:")
            print(f"   cp -p {backup} {SITE} && nginx -t && systemctl reload nginx")
            return 1
        print("✓ 완료")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
