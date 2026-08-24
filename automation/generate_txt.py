import json
from pathlib import Path

work = Path(r"C:\kd\out\karma_warn_1994")
json_path = work / "_upload_meta.json"
meta = json.loads(json_path.read_text(encoding="utf-8"))

txt_content = f"""========== [ 유튜브 (YouTube) ] ==========

[ 한국어 (KO) ]
제목: {meta['youtube']['ko']['title']}
내용:
{meta['youtube']['ko']['description']}


[ 영어 (EN) ]
제목: {meta['youtube']['en']['title']}
내용:
{meta['youtube']['en']['description']}


========== [ 틱톡 (TikTok) ] ==========

[ 한국어 (KO) ]
내용(해시태그 포함):
{meta['tiktok']['ko']['caption']}


[ 영어 (EN) ]
내용(해시태그 포함):
{meta['tiktok']['en']['caption']}
"""

txt_path = work / "_upload_meta.txt"
txt_path.write_text(txt_content, encoding="utf-8")
print(f"Created {txt_path}")
