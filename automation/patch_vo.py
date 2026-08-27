import re

with open('automation/flow_rpa.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Scene class
target_scene = """    extend: int = CONFIG.DEFAULT_EXTEND
    caption: str = \"\""""

replacement_scene = """    extend: int = CONFIG.DEFAULT_EXTEND
    caption: str = \"\"
    vo: dict = None
    subs: dict = None
    speaker: str = \"\""""
    
code = code.replace(target_scene, replacement_scene)

# 2. Update Scene instantiation in run_job
target_init = """    scenes = [Scene(n=s["n"], prompt=s["prompt"], ref_image=s.get("ref_image", ""),
                    extend=s.get("extend", CONFIG.DEFAULT_EXTEND),
                    caption=s.get("caption", "")) for s in job["scenes"]]"""

replacement_init = """    scenes = [Scene(n=s["n"], prompt=s["prompt"], ref_image=s.get("ref_image", ""),
                    extend=s.get("extend", CONFIG.DEFAULT_EXTEND),
                    caption=s.get("caption", ""),
                    vo=s.get("vo"), subs=s.get("subs"), speaker=s.get("speaker", "")) for s in job["scenes"]]"""

code = code.replace(target_init, replacement_init)

# 3. Update manifest["scenes"].append in run_job
target_append = """        manifest["scenes"].append({"n": sc.n, "caption": sc.caption,
                                   "files": [c.name for c in clips]})"""

replacement_append = """        manifest["scenes"].append({"n": sc.n, "caption": sc.caption,
                                   "files": [c.name for c in clips],
                                   "vo": sc.vo, "subs": sc.subs, "speaker": sc.speaker})"""

code = code.replace(target_append, replacement_append)

with open('automation/flow_rpa.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("flow_rpa.py patched for VO!")
