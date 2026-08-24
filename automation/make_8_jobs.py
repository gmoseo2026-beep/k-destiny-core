import json
from pathlib import Path
import copy

REF_IMAGE = "C:\\Users\\gmose\\OneDrive\\바탕 화면\\k-destiny\\public\\images\\master_karma_calm.webp.jpg"
BGM_PATH = "C:\\Users\\gmose\\OneDrive\\바탕 화면\\k-destiny\\automation\\assets\\bgm_mystical.mp3"

# ─── Veo 프롬프트 (씬별로 시각적 차별화) ───────────────────────────
scene_prompts = [
    # Scene 1 (Hook): 시선 고정, 카메라 DOLLY IN
    (
        "Animate this portrait: a dark, elegant Korean female fortune-teller's eyes narrow "
        "slightly with a knowing, piercing look directly into camera. She tilts her head slowly. "
        "Candlelight flickers intensely, swirling gold embers drift upward. Camera SLOW DOLLY IN "
        "pushing closer to her face. Dramatic shadows dance across her features. "
        "Cinematic lighting, 9:16 vertical, dark moody atmosphere. "
        "Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient mystical sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
    # Scene 2 (Body): 손동작 + 신비한 에너지, DUTCH ANGLE
    (
        "Animate this portrait: the fortune-teller slowly raises one hand, fingers slightly spread. "
        "Faint purple-gold mystical energy pulses around her fingers. Her eyes glow with a subtle "
        "supernatural light. Camera SLOW ORBIT, dramatic DUTCH ANGLE tilt. "
        "Shadows shift dramatically, candlelight surges then dims. Gold and purple particles swirl. "
        "Cinematic, 9:16 vertical, mystical dark atmosphere. "
        "Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient mystical sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
    # Scene 3 (CTA): 강렬한 눈빛, 어둠으로 PULL BACK
    (
        "Animate this portrait: the fortune-teller stares piercingly into the viewer's soul with "
        "wide, intense eyes. She slowly lowers her hand. The flames surge dramatically then "
        "gradually die down. Gold embers fade into darkness. Camera SLOW PULL BACK revealing "
        "her full mysterious silhouette. Final dramatic shadow engulfs the frame. "
        "Cinematic, 9:16 vertical, ominous dark atmosphere. "
        "Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient mystical sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    )
]

# ─── CTA (씬3) 공통 ───────────────────────────────────────────────
CTA = {
    "vo_ko": "당신의 운명이 궁금하다면, 지금 프로필 링크를 확인하세요.",
    "vo_en": "Curious about your destiny? Check the link in bio. Now.",
    "sub_ko": "당신의 운명이 궁금하다면...\n지금 프로필 링크를 확인하세요",
    "sub_en": "Curious about your destiny?\nCheck the link in bio. Now."
}

# ─── 8개 영상 콘텐츠 ────────────────────────────────────────────────
data = [
    {
        "id": "karma_warn_1994",
        "title": "1994년생 경고",
        "s1": {
            "vo_ko": "94년생. 스크롤 멈춰. 지금 당장.",
            "vo_en": "Born in ninety-four? Stop. Right. Now.",
            "sub_ko": "94년생.\n스크롤 멈춰. 지금 당장.",
            "sub_en": "Born in '94?\nStop. Right. Now."
        },
        "s2": {
            "vo_ko": "10월. 당신 인생을 뒤흔들 변화가 옵니다. 이건 경고입니다.",
            "vo_en": "October will shake your entire life. This is your warning.",
            "sub_ko": "10월...\n당신 인생을 뒤흔들\n변화가 옵니다.\n\n이건 경고입니다.",
            "sub_en": "October will shake\nyour entire life.\n\nThis is your warning."
        }
    },
    {
        "id": "karma_warn_1995",
        "title": "1995년생 경고",
        "s1": {
            "vo_ko": "95년생. 이 영상 넘기지 마.",
            "vo_en": "Born in ninety-five? Don't you dare skip.",
            "sub_ko": "95년생.\n이 영상 넘기지 마.",
            "sub_en": "Born in '95?\nDon't you dare skip."
        },
        "s2": {
            "vo_ko": "11월, 끊어야 할 인연이 있습니다. 흔들리면 끝입니다.",
            "vo_en": "November. There's a bond you must break. Hesitate and it's over.",
            "sub_ko": "11월,\n끊어야 할 인연이 있습니다.\n\n흔들리면 끝입니다.",
            "sub_en": "November.\nThere's a bond you must break.\n\nHesitate and it's over."
        }
    },
    {
        "id": "karma_fortune_1997",
        "title": "1997년생 재물운",
        "s1": {
            "vo_ko": "97년생. 축하드립니다.",
            "vo_en": "Born in ninety-seven? Congratulations.",
            "sub_ko": "97년생.\n축하드립니다.",
            "sub_en": "Born in '97?\nCongratulations."
        },
        "s2": {
            "vo_ko": "막혔던 금전운이 드디어 크게 열립니다. 준비하세요.",
            "vo_en": "Your blocked fortune is finally about to explode. Get ready.",
            "sub_ko": "막혔던 금전운이\n드디어 크게 열립니다.\n\n준비하세요.",
            "sub_en": "Your blocked fortune is\nfinally about to EXPLODE.\n\nGet ready."
        }
    },
    {
        "id": "karma_fortune_1998",
        "title": "1998년생 이동운",
        "s1": {
            "vo_ko": "98년생. 다음 달, 당신은 움직여야 합니다.",
            "vo_en": "Born in ninety-eight. Next month, you must move.",
            "sub_ko": "98년생.\n다음 달, 당신은\n움직여야 합니다.",
            "sub_en": "Born in '98.\nNext month,\nyou MUST move."
        },
        "s2": {
            "vo_ko": "새로운 곳이 당신을 기다리고 있습니다. 주저하지 마세요.",
            "vo_en": "A new place is waiting for you. Don't hesitate.",
            "sub_ko": "새로운 곳이\n당신을 기다리고 있습니다.\n\n주저하지 마세요.",
            "sub_en": "A new place is\nwaiting for you.\n\nDon't hesitate."
        }
    },
    {
        "id": "karma_love_1993",
        "title": "1993년생 애정운",
        "s1": {
            "vo_ko": "93년생. 과거가 돌아옵니다.",
            "vo_en": "Born in ninety-three. Your past is coming back.",
            "sub_ko": "93년생.\n과거가 돌아옵니다.",
            "sub_en": "Born in '93.\nYour past is coming back."
        },
        "s2": {
            "vo_ko": "흔들리면 안 됩니다. 단호하게 끊으세요. 지금.",
            "vo_en": "Don't waver. Cut it off. Now.",
            "sub_ko": "흔들리면 안 됩니다.\n단호하게 끊으세요.\n\n지금.",
            "sub_en": "Don't waver.\nCut it off.\n\nNow."
        }
    },
    {
        "id": "karma_love_1999",
        "title": "1999년생 귀인운",
        "s1": {
            "vo_ko": "99년생. 서쪽에서 귀인이 다가옵니다.",
            "vo_en": "Born in ninety-nine. A guardian angel approaches from the west.",
            "sub_ko": "99년생.\n서쪽에서 귀인이\n다가옵니다.",
            "sub_en": "Born in '99.\nA guardian angel approaches\nfrom the west."
        },
        "s2": {
            "vo_ko": "이 기회를 놓치면, 다시 오지 않습니다.",
            "vo_en": "Miss this chance, and it never comes again.",
            "sub_ko": "이 기회를 놓치면...\n\n다시 오지 않습니다.",
            "sub_en": "Miss this chance...\n\nIt never comes again."
        }
    },
    {
        "id": "karma_health_1992",
        "title": "1992년생 건강운",
        "s1": {
            "vo_ko": "92년생. 당신의 몸이 경고하고 있습니다.",
            "vo_en": "Born in ninety-two. Your body is warning you.",
            "sub_ko": "92년생.\n당신의 몸이\n경고하고 있습니다.",
            "sub_en": "Born in '92.\nYour body is\nwarning you."
        },
        "s2": {
            "vo_ko": "이번 주, 반드시 쉬세요. 이건 명령입니다.",
            "vo_en": "This week, you must rest. That's an order.",
            "sub_ko": "이번 주,\n반드시 쉬세요.\n\n이건 명령입니다.",
            "sub_en": "This week,\nyou MUST rest.\n\nThat's an order."
        }
    },
    {
        "id": "karma_secret_1996",
        "title": "1996년생 비밀운",
        "s1": {
            "vo_ko": "96년생. 가까운 사람이 비밀을 숨기고 있습니다.",
            "vo_en": "Born in ninety-six. Someone close is hiding a secret.",
            "sub_ko": "96년생.\n가까운 사람이\n비밀을 숨기고 있습니다.",
            "sub_en": "Born in '96.\nSomeone close is\nhiding a secret."
        },
        "s2": {
            "vo_ko": "알게 되더라도 모른 척하세요. 그게 당신을 지킵니다.",
            "vo_en": "When you find out, pretend you didn't. It will protect you.",
            "sub_ko": "알게 되더라도\n모른 척하세요.\n\n그게 당신을 지킵니다.",
            "sub_en": "When you find out,\npretend you didn't.\n\nIt will protect you."
        }
    }
]

# ─── 잡 생성 ─────────────────────────────────────────────────────
out_dir = Path("automation/jobs")
out_dir.mkdir(exist_ok=True)

# 기존 json 파일들 삭제 (smoke_1scene 제외)
for f in out_dir.glob("*.json"):
    if f.name != "smoke_1scene.json":
        f.unlink()

for i, d in enumerate(data):
    job = {
        "video_id": d["id"],
        "output_dir": "C:\\kd\\out",
        "bgm": BGM_PATH,
        "title_ko": d["title"],
        "scenes": [
            {
                "n": 1,
                "prompt": scene_prompts[0],
                "ref_image": REF_IMAGE,
                "extend": 0,
                "motion": "zoom_in",
                "sub_style": "hook",
                "speaker": "karma",
                "vo": {"ko": d["s1"]["vo_ko"], "en": d["s1"]["vo_en"]},
                "subs": {"ko": d["s1"]["sub_ko"], "en": d["s1"]["sub_en"]}
            },
            {
                "n": 2,
                "prompt": scene_prompts[1],
                "ref_image": REF_IMAGE,
                "extend": 0,
                "motion": "zoom_out",
                "sub_style": "body",
                "speaker": "karma",
                "vo": {"ko": d["s2"]["vo_ko"], "en": d["s2"]["vo_en"]},
                "subs": {"ko": d["s2"]["sub_ko"], "en": d["s2"]["sub_en"]}
            },
            {
                "n": 3,
                "prompt": scene_prompts[2],
                "ref_image": REF_IMAGE,
                "extend": 0,
                "motion": "zoom_in",
                "sub_style": "cta",
                "speaker": "karma",
                "vo": {"ko": CTA["vo_ko"], "en": CTA["vo_en"]},
                "subs": {"ko": CTA["sub_ko"], "en": CTA["sub_en"]}
            }
        ]
    }

    with open(out_dir / f"{i+1:02d}_{d['id']}.json", "w", encoding="utf-8") as f:
        json.dump(job, f, ensure_ascii=False, indent=2)

print(f"[완료] {len(data)}개 잡 생성 (3씬 x 한/영, BGM + 모션 + CTA 포함)")
