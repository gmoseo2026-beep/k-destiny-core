#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_29_jobs.py — Karma 9편 + Seoa 10편 + Ryu 10편 = 29편 job JSON 생성
===================================================================
실행: python automation/make_29_jobs.py
결과: automation/jobs/ 에 29개 JSON + C:\kd\clips\ 에 29개 폴더
"""

import json
from pathlib import Path

# ─── 경로 ────────────────────────────────────────────────────────
IMG_BASE = "C:\\Users\\gmose\\OneDrive\\바탕 화면\\k-destiny\\public\\images"
BGM_PATH = "C:\\Users\\gmose\\OneDrive\\바탕 화면\\k-destiny\\automation\\assets\\bgm_mystical.mp3"
CLIPS_ROOT = Path("C:/kd/clips")
JOBS_DIR = Path(__file__).resolve().parent / "jobs"

def img(master, mood="calm"):
    return f"{IMG_BASE}\\master_{master}_{mood}.webp.jpg"

# ─── Veo 프롬프트 템플릿 (캐릭터별) ──────────────────────────────

KARMA_PROMPTS = [
    (
        "Animate this portrait: a dark, elegant Korean female fortune-teller in gothic black lace "
        "stands among moonlit stone ruins. Her eyes narrow slowly with a cold, piercing gaze directly "
        "into the camera. Candlelight flickers casting dancing shadows on her pale face. Golden embers "
        "drift upward lazily. Camera SLOW DOLLY IN pushing closer to her face. Cinematic lighting, "
        "9:16 vertical, dark moody atmosphere. Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient mystical sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
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
    (
        "Animate this portrait: the fortune-teller stares piercingly into the viewer's soul with "
        "wide, intense eyes. She slowly lowers her hand. The flames surge dramatically then "
        "gradually die down. Gold embers fade into darkness. Camera SLOW PULL BACK revealing "
        "her full mysterious silhouette. Final dramatic shadow engulfs the frame. "
        "Cinematic, 9:16 vertical, ominous dark atmosphere. "
        "Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient mystical sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
]

SEOA_PROMPTS = [
    (
        "Animate this portrait: an elegant Korean female scholar in navy blazer and gold-rimmed "
        "glasses sits in a dark oak library. She slowly looks up from an ancient book and gazes "
        "directly into camera with quiet intensity, as if she just discovered something about "
        "the viewer. Soft warm lamplight illuminates floating dust motes. Camera SLOW DOLLY IN. "
        "Books and star charts visible on shelves behind her. Cinematic, 9:16 vertical, intimate "
        "scholarly atmosphere. Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient library sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
    (
        "Animate this portrait: the scholar traces her finger along an invisible constellation map "
        "in the air, leaving trails of soft blue-gold starlight. Her expression is focused, analytical, "
        "connecting dots only she can see. Camera SLOW ORBIT revealing the depth of her library. "
        "Warm amber and cool blue light interplay. Cinematic, 9:16 vertical, cerebral mystical "
        "atmosphere. Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
    (
        "Animate this portrait: the scholar lowers her hand, the star trails fading. She adjusts "
        "her glasses slightly and gives a warm, encouraging look into camera — a gentle nod. "
        "The lamplight softens. Camera SLOW PULL BACK revealing her full figure in the cozy "
        "library. Cinematic, 9:16 vertical, hopeful concluding atmosphere. "
        "Her mouth stays closed, no lip movement, no dialogue. "
        "Ambient sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
]

RYU_PROMPTS = [
    (
        "Animate this portrait: a striking Korean man in a dark leather jacket stands in a "
        "rain-soaked neon-lit alley. He looks directly at camera with intense, challenging eyes. "
        "Neon signs in pink and cyan reflect off wet pavement. Rain falls heavily, streaming "
        "down his face. Camera SLOW DOLLY IN through the rain. Cinematic, 9:16 vertical, "
        "cyberpunk noir atmosphere. His mouth stays closed, no lip movement, no dialogue. "
        "Ambient rain and city sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
    (
        "Animate this portrait: the man reaches out and touches the neon-lit wall beside him — "
        "cracks of golden energy spread from his fingertips across the wall like an earthquake. "
        "The neon signs flicker and shift colors. His expression is fierce, empowered. Rain "
        "intensifies. Camera DUTCH ANGLE ORBIT. Gold and neon particles scatter. Cinematic, "
        "9:16 vertical, transformative energy atmosphere. His mouth stays closed, no lip "
        "movement, no dialogue. Ambient sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
    (
        "Animate this portrait: the man pulls his hand back. The wall settles, now bearing "
        "golden vein-like patterns. He turns to camera with a knowing smirk and steps backward "
        "into the neon haze, his silhouette dissolving into the rain. Camera SLOW PULL BACK. "
        "Cinematic, 9:16 vertical, powerful concluding atmosphere. His mouth stays closed, "
        "no lip movement, no dialogue. Ambient sound only, no speech, no music. "
        "No text, no captions, no subtitles, no watermark."
    ),
]

# ─── CTA (씬3) 캐릭터별 통일 ──────────────────────────────────────
CTA = {
    "karma": {
        "vo_ko": "당신의 운명이 궁금하다면, 지금 프로필 링크를 확인하세요.",
        "vo_en": "Curious about your destiny? Check the link in bio. Now.",
        "sub_ko": "당신의 운명이 궁금하다면...\n지금 프로필 링크를 확인하세요",
        "sub_en": "Curious about your destiny?\nCheck the link in bio. Now.",
    },
    "seoa": {
        "vo_ko": "더 깊이 알고 싶다면, 프로필 링크에서 확인하세요.",
        "vo_en": "Want to know more? Check the link in my profile.",
        "sub_ko": "더 깊이 알고 싶다면...\n프로필 링크에서 확인하세요",
        "sub_en": "Want to know more?\nCheck the link in my profile.",
    },
    "ryu": {
        "vo_ko": "니 운명, 직접 확인해. 프로필 링크. 지금.",
        "vo_en": "Your fate. Your call. Link in bio. Now.",
        "sub_ko": "니 운명, 직접 확인해.\n프로필 링크. 지금.",
        "sub_en": "Your fate. Your call.\nLink in bio. Now.",
    },
}

# ─── 29편 콘텐츠 데이터 ────────────────────────────────────────────

karma_data = [
    {"id": "karma_warn_1995", "title": "1995년생 경고",
     "s1": {"vo_ko": "95년생. 이 영상 넘기지 마.", "vo_en": "Born in ninety-five? Don't you dare skip.", "sub_ko": "95년생.\n이 영상 넘기지 마.", "sub_en": "Born in '95?\nDon't you dare skip."},
     "s2": {"vo_ko": "11월, 끊어야 할 인연이 있습니다. 흔들리면 끝입니다.", "vo_en": "November. There's a bond you must break. Hesitate and it's over.", "sub_ko": "11월,\n끊어야 할 인연이 있습니다.\n\n흔들리면 끝입니다.", "sub_en": "November.\nThere's a bond you must break.\n\nHesitate and it's over."}},
    {"id": "karma_fortune_1997", "title": "1997년생 재물운",
     "s1": {"vo_ko": "97년생. 축하드립니다.", "vo_en": "Born in ninety-seven? Congratulations.", "sub_ko": "97년생.\n축하드립니다.", "sub_en": "Born in '97?\nCongratulations."},
     "s2": {"vo_ko": "막혔던 금전운이 드디어 크게 열립니다. 준비하세요.", "vo_en": "Your blocked fortune is finally about to explode. Get ready.", "sub_ko": "막혔던 금전운이\n드디어 크게 열립니다.\n\n준비하세요.", "sub_en": "Your blocked fortune is\nfinally about to EXPLODE.\n\nGet ready."}},
    {"id": "karma_fortune_1998", "title": "1998년생 이동운",
     "s1": {"vo_ko": "98년생. 다음 달, 당신은 움직여야 합니다.", "vo_en": "Born in ninety-eight. Next month, you must move.", "sub_ko": "98년생.\n다음 달, 당신은\n움직여야 합니다.", "sub_en": "Born in '98.\nNext month,\nyou MUST move."},
     "s2": {"vo_ko": "새로운 곳이 당신을 기다리고 있습니다. 주저하지 마세요.", "vo_en": "A new place is waiting for you. Don't hesitate.", "sub_ko": "새로운 곳이\n당신을 기다리고 있습니다.\n\n주저하지 마세요.", "sub_en": "A new place is\nwaiting for you.\n\nDon't hesitate."}},
    {"id": "karma_love_1993", "title": "1993년생 애정운",
     "s1": {"vo_ko": "93년생. 과거가 돌아옵니다.", "vo_en": "Born in ninety-three. Your past is coming back.", "sub_ko": "93년생.\n과거가 돌아옵니다.", "sub_en": "Born in '93.\nYour past is coming back."},
     "s2": {"vo_ko": "흔들리면 안 됩니다. 단호하게 끊으세요. 지금.", "vo_en": "Don't waver. Cut it off. Now.", "sub_ko": "흔들리면 안 됩니다.\n단호하게 끊으세요.\n\n지금.", "sub_en": "Don't waver.\nCut it off.\n\nNow."}},
    {"id": "karma_love_1999", "title": "1999년생 귀인운",
     "s1": {"vo_ko": "99년생. 서쪽에서 귀인이 다가옵니다.", "vo_en": "Born in ninety-nine. A guardian angel approaches from the west.", "sub_ko": "99년생.\n서쪽에서 귀인이\n다가옵니다.", "sub_en": "Born in '99.\nA guardian angel approaches\nfrom the west."},
     "s2": {"vo_ko": "이 기회를 놓치면, 다시 오지 않습니다.", "vo_en": "Miss this chance, and it never comes again.", "sub_ko": "이 기회를 놓치면...\n\n다시 오지 않습니다.", "sub_en": "Miss this chance...\n\nIt never comes again."}},
    {"id": "karma_health_1992", "title": "1992년생 건강운",
     "s1": {"vo_ko": "92년생. 당신의 몸이 경고하고 있습니다.", "vo_en": "Born in ninety-two. Your body is warning you.", "sub_ko": "92년생.\n당신의 몸이\n경고하고 있습니다.", "sub_en": "Born in '92.\nYour body is\nwarning you."},
     "s2": {"vo_ko": "이번 주, 반드시 쉬세요. 이건 명령입니다.", "vo_en": "This week, you must rest. That's an order.", "sub_ko": "이번 주,\n반드시 쉬세요.\n\n이건 명령입니다.", "sub_en": "This week,\nyou MUST rest.\n\nThat's an order."}},
    {"id": "karma_secret_1996", "title": "1996년생 비밀운",
     "s1": {"vo_ko": "96년생. 가까운 사람이 비밀을 숨기고 있습니다.", "vo_en": "Born in ninety-six. Someone close is hiding a secret.", "sub_ko": "96년생.\n가까운 사람이\n비밀을 숨기고 있습니다.", "sub_en": "Born in '96.\nSomeone close is\nhiding a secret."},
     "s2": {"vo_ko": "알게 되더라도 모른 척하세요. 그게 당신을 지킵니다.", "vo_en": "When you find out, pretend you didn't. It will protect you.", "sub_ko": "알게 되더라도\n모른 척하세요.\n\n그게 당신을 지킵니다.", "sub_en": "When you find out,\npretend you didn't.\n\nIt will protect you."}},
    {"id": "karma_career_2001", "title": "2001년생 직업운",
     "s1": {"vo_ko": "01년생. 지금, 갈림길에 서 있습니다.", "vo_en": "Born in two-thousand-one. You're standing at a crossroads. Right now.", "sub_ko": "01년생.\n지금, 갈림길에\n서 있습니다.", "sub_en": "Born in '01.\nYou're standing at\na crossroads. Right now."},
     "s2": {"vo_ko": "올해 안에 결정하세요. 기둥이 흔들립니다.", "vo_en": "Decide before this year ends. Your pillars are shaking.", "sub_ko": "올해 안에 결정하세요.\n\n기둥이 흔들립니다.", "sub_en": "Decide before\nthis year ends.\n\nYour pillars are shaking."}},
    {"id": "karma_block_1991", "title": "1991년생 관살혼잡",
     "s1": {"vo_ko": "91년생. 왜 안 풀리는지, 제가 보여드리겠습니다.", "vo_en": "Born in ninety-one. I'll show you why nothing has been working.", "sub_ko": "91년생.\n왜 안 풀리는지,\n제가 보여드리겠습니다.", "sub_en": "Born in '91.\nI'll show you why\nnothing has been working."},
     "s2": {"vo_ko": "막힌 기운을 깨야 합니다. 올 가을이 마지막 기회입니다.", "vo_en": "You must shatter the blockage. This autumn is your last window.", "sub_ko": "막힌 기운을\n깨야 합니다.\n\n올 가을이 마지막 기회입니다.", "sub_en": "You must shatter\nthe blockage.\n\nThis autumn is your\nlast window."}},
]

seoa_data = [
    {"id": "seoa_fate_2000", "title": "2000년생 인연의 신호",
     "s1": {"vo_ko": "00년생. 곧 한 사람이 다가옵니다.", "vo_en": "Born in two thousand. Someone is about to enter your life.", "sub_ko": "00년생.\n곧 한 사람이\n다가옵니다.", "sub_en": "Born in 2000.\nSomeone is about to\nenter your life."},
     "s2": {"vo_ko": "우연처럼 보이겠지만, 사주에선 이미 정해져 있었습니다.", "vo_en": "It will feel random. But in your chart, it was already written.", "sub_ko": "우연처럼 보이겠지만,\n사주에선 이미\n정해져 있었습니다.", "sub_en": "It will feel random.\nBut in your chart,\nit was already written."}},
    {"id": "seoa_timing_1996", "title": "1996년생 타이밍 경고",
     "s1": {"vo_ko": "96년생. 시간이 없습니다.", "vo_en": "Born in ninety-six. You're running out of time.", "sub_ko": "96년생.\n시간이 없습니다.", "sub_en": "Born in '96.\nYou're running out of time."},
     "s2": {"vo_ko": "이 결정, 9월 전에 끝내세요. 늦으면 다음 기회는 3년 뒤입니다.", "vo_en": "Make this decision before September. Miss it, and the next window is three years away.", "sub_ko": "이 결정,\n9월 전에 끝내세요.\n\n늦으면 다음 기회는\n3년 뒤입니다.", "sub_en": "Make this decision\nbefore September.\n\nMiss it, and the next window\nis three years away."}},
    {"id": "seoa_ex_1998", "title": "1998년생 전 애인의 기운",
     "s1": {"vo_ko": "98년생. 전 애인의 기운이 아직 남아 있습니다.", "vo_en": "Born in ninety-eight. Your ex's energy is still lingering.", "sub_ko": "98년생.\n전 애인의 기운이\n아직 남아 있습니다.", "sub_en": "Born in '98.\nYour ex's energy\nis still lingering."},
     "s2": {"vo_ko": "정리하지 않으면, 새 인연이 들어올 자리가 없습니다.", "vo_en": "Until you clear it, there's no room for someone new.", "sub_ko": "정리하지 않으면,\n새 인연이 들어올\n자리가 없습니다.", "sub_en": "Until you clear it,\nthere's no room\nfor someone new."}},
    {"id": "seoa_soulmate_1995", "title": "1995년생 천생연분",
     "s1": {"vo_ko": "95년생. 당신에겐 천생연분이 정해져 있습니다.", "vo_en": "Born in ninety-five. You have a destined soulmate.", "sub_ko": "95년생.\n당신에겐 천생연분이\n정해져 있습니다.", "sub_en": "Born in '95.\nYou have a destined\nsoulmate."},
     "s2": {"vo_ko": "조건이 있습니다. 먼저 당신이 변해야 합니다.", "vo_en": "But there's a condition. You must change first.", "sub_ko": "조건이 있습니다.\n\n먼저 당신이\n변해야 합니다.", "sub_en": "But there's a condition.\n\nYou must change first."}},
    {"id": "seoa_friend_1997", "title": "1997년생 우정 경고",
     "s1": {"vo_ko": "97년생. 가장 가까운 친구의 기운이 변하고 있습니다.", "vo_en": "Born in ninety-seven. Your closest friend's energy is shifting.", "sub_ko": "97년생.\n가장 가까운 친구의\n기운이 변하고 있습니다.", "sub_en": "Born in '97.\nYour closest friend's\nenergy is shifting."},
     "s2": {"vo_ko": "그 관계가 당신을 끌어내리고 있다면, 거리를 두세요.", "vo_en": "If that relationship is dragging you down, create distance.", "sub_ko": "그 관계가 당신을\n끌어내리고 있다면,\n\n거리를 두세요.", "sub_en": "If that relationship\nis dragging you down,\n\ncreate distance."}},
    {"id": "seoa_marriage_1993", "title": "1993년생 혼인궁",
     "s1": {"vo_ko": "93년생. 결혼의 시기가 보입니다.", "vo_en": "Born in ninety-three. I can see your marriage window.", "sub_ko": "93년생.\n결혼의 시기가\n보입니다.", "sub_en": "Born in '93.\nI can see your\nmarriage window."},
     "s2": {"vo_ko": "올해가 아니면 내후년. 그 사이는 공백입니다.", "vo_en": "It's either this year or the year after next. The gap between is empty.", "sub_ko": "올해가 아니면 내후년.\n\n그 사이는\n공백입니다.", "sub_en": "It's either this year\nor the year after next.\n\nThe gap between is empty."}},
    {"id": "seoa_parent_2002", "title": "2002년생 부모와의 연",
     "s1": {"vo_ko": "02년생. 부모님에 대해 말해야 할 게 있습니다.", "vo_en": "Born in two-thousand-two. There's something I need to tell you about your parents.", "sub_ko": "02년생.\n부모님에 대해\n말해야 할 게 있습니다.", "sub_en": "Born in '02.\nThere's something I need\nto tell you about your parents."},
     "s2": {"vo_ko": "지금 대화하지 않으면, 나중에 후회합니다. 사주가 그걸 말하고 있어요.", "vo_en": "If you don't talk to them now, you'll regret it later. Your chart is telling me this.", "sub_ko": "지금 대화하지 않으면,\n나중에 후회합니다.\n\n사주가 그걸 말하고 있어요.", "sub_en": "If you don't talk to them now,\nyou'll regret it later.\n\nYour chart is telling me this."}},
    {"id": "seoa_crush_1999", "title": "1999년생 짝사랑의 결말",
     "s1": {"vo_ko": "99년생. 그 사람, 당신을 좋아할까요?", "vo_en": "Born in ninety-nine. Does that person like you back?", "sub_ko": "99년생.\n그 사람, 당신을\n좋아할까요?", "sub_en": "Born in '99.\nDoes that person\nlike you back?"},
     "s2": {"vo_ko": "사주로 봤습니다. 솔직하게 말하겠습니다.", "vo_en": "I checked your chart. I'll be honest with you.", "sub_ko": "사주로 봤습니다.\n\n솔직하게\n말하겠습니다.", "sub_en": "I checked your chart.\n\nI'll be honest with you."}},
    {"id": "seoa_reconnect_1994", "title": "1994년생 재회의 사주",
     "s1": {"vo_ko": "94년생. 끊겼던 인연이 다시 돌아옵니다.", "vo_en": "Born in ninety-four. A broken connection is coming back.", "sub_ko": "94년생.\n끊겼던 인연이\n다시 돌아옵니다.", "sub_en": "Born in '94.\nA broken connection\nis coming back."},
     "s2": {"vo_ko": "이번엔 다릅니다. 당신이 준비됐기 때문입니다.", "vo_en": "This time it's different. Because you're ready.", "sub_ko": "이번엔 다릅니다.\n\n당신이 준비됐기\n때문입니다.", "sub_en": "This time it's different.\n\nBecause you're ready."}},
    {"id": "seoa_toxic_1992", "title": "1992년생 독이 되는 관계",
     "s1": {"vo_ko": "92년생. 지금 옆에 있는 사람, 한 번 돌아보세요.", "vo_en": "Born in ninety-two. Take a good look at the person beside you.", "sub_ko": "92년생.\n지금 옆에 있는 사람,\n한 번 돌아보세요.", "sub_en": "Born in '92.\nTake a good look at\nthe person beside you."},
     "s2": {"vo_ko": "그 관계가 독입니다. 사주가 경고하고 있습니다.", "vo_en": "That relationship is poison. Your chart is warning you.", "sub_ko": "그 관계가 독입니다.\n\n사주가\n경고하고 있습니다.", "sub_en": "That relationship is poison.\n\nYour chart is warning you."}},
]

ryu_data = [
    {"id": "ryu_change_1990", "title": "1990년생 대운 전환",
     "s1": {"vo_ko": "90년생. 10년짜리 대운이 바뀝니다.", "vo_en": "Born in ninety. Your ten-year cycle is shifting.", "sub_ko": "90년생.\n10년짜리 대운이\n바뀝니다.", "sub_en": "Born in '90.\nYour ten-year cycle\nis shifting."},
     "s2": {"vo_ko": "여태까지와 완전히 다른 삶이 시작됩니다. 준비됐습니까?", "vo_en": "A completely different life begins now. Are you ready?", "sub_ko": "여태까지와 완전히\n다른 삶이 시작됩니다.\n\n준비됐습니까?", "sub_en": "A completely different life\nbegins now.\n\nAre you ready?"}},
    {"id": "ryu_dragon_2000", "title": "2000년생 용의 해",
     "s1": {"vo_ko": "00년생. 용의 해에 태어난 당신.", "vo_en": "Born in the year of the Dragon. Two thousand.", "sub_ko": "00년생.\n용의 해에 태어난\n당신.", "sub_en": "Born in the year\nof the Dragon.\nTwo thousand."},
     "s2": {"vo_ko": "진짜 용은 아직 깨어나지 않았습니다. 올해, 깨어납니다.", "vo_en": "The real dragon hasn't awakened yet. This year, it does.", "sub_ko": "진짜 용은 아직\n깨어나지 않았습니다.\n\n올해, 깨어납니다.", "sub_en": "The real dragon\nhasn't awakened yet.\n\nThis year, it does."}},
    {"id": "ryu_break_1988", "title": "1988년생 벽을 깨라",
     "s1": {"vo_ko": "88년생. 왜 멈춰 있는지 알고 있습니다.", "vo_en": "Born in eighty-eight. I know why you're stuck.", "sub_ko": "88년생.\n왜 멈춰 있는지\n알고 있습니다.", "sub_en": "Born in '88.\nI know why\nyou're stuck."},
     "s2": {"vo_ko": "벽을 피하지 마세요. 부수세요. 지금이 그 타이밍입니다.", "vo_en": "Don't avoid the wall. Break it. Now is the time.", "sub_ko": "벽을 피하지 마세요.\n부수세요.\n\n지금이 그 타이밍입니다.", "sub_en": "Don't avoid the wall.\nBreak it.\n\nNow is the time."}},
    {"id": "ryu_flow_1997", "title": "1997년생 흐름을 타라",
     "s1": {"vo_ko": "97년생. 지금은 밀지 마세요.", "vo_en": "Born in ninety-seven. Stop pushing. Right now.", "sub_ko": "97년생.\n지금은\n밀지 마세요.", "sub_en": "Born in '97.\nStop pushing.\nRight now."},
     "s2": {"vo_ko": "흐름에 맡기세요. 이번 달, 흐름이 당신 편입니다.", "vo_en": "Let the current carry you. This month, the flow is on your side.", "sub_ko": "흐름에 맡기세요.\n\n이번 달,\n흐름이 당신 편입니다.", "sub_en": "Let the current carry you.\n\nThis month,\nthe flow is on your side."}},
    {"id": "ryu_storm_1996", "title": "1996년생 폭풍 전야",
     "s1": {"vo_ko": "96년생. 지금 너무 조용하지 않습니까?", "vo_en": "Born in ninety-six. Isn't it too quiet right now?", "sub_ko": "96년생.\n지금 너무\n조용하지 않습니까?", "sub_en": "Born in '96.\nIsn't it too quiet\nright now?"},
     "s2": {"vo_ko": "폭풍 전야입니다. 흔들리지 마세요. 버틴 자만 살아남습니다.", "vo_en": "This is the calm before the storm. Don't flinch. Only those who hold on survive.", "sub_ko": "폭풍 전야입니다.\n흔들리지 마세요.\n\n버틴 자만 살아남습니다.", "sub_en": "This is the calm\nbefore the storm.\n\nOnly those who hold on\nsurvive."}},
    {"id": "ryu_awaken_2001", "title": "2001년생 각성의 해",
     "s1": {"vo_ko": "01년생. 거울을 보세요.", "vo_en": "Born in two-thousand-one. Look in the mirror.", "sub_ko": "01년생.\n거울을 보세요.", "sub_en": "Born in '01.\nLook in the mirror."},
     "s2": {"vo_ko": "거기 있는 사람, 진짜 당신이 아닙니다. 올해, 진짜가 깨어납니다.", "vo_en": "The person there — that's not the real you. This year, the real you wakes up.", "sub_ko": "거기 있는 사람,\n진짜 당신이 아닙니다.\n\n올해, 진짜가 깨어납니다.", "sub_en": "The person there —\nthat's not the real you.\n\nThis year,\nthe real you wakes up."}},
    {"id": "ryu_money_1995", "title": "1995년생 재물 흐름 반전",
     "s1": {"vo_ko": "95년생. 돈의 흐름이 방향을 바꿉니다.", "vo_en": "Born in ninety-five. The flow of money is reversing direction.", "sub_ko": "95년생.\n돈의 흐름이\n방향을 바꿉니다.", "sub_en": "Born in '95.\nThe flow of money\nis reversing direction."},
     "s2": {"vo_ko": "나가기만 하던 돈이, 이제 들어옵니다. 손 벌릴 준비하세요.", "vo_en": "Money that only flowed out is now flowing in. Get ready to receive.", "sub_ko": "나가기만 하던 돈이,\n이제 들어옵니다.\n\n손 벌릴 준비하세요.", "sub_en": "Money that only flowed out\nis now flowing in.\n\nGet ready to receive."}},
    {"id": "ryu_move_1993", "title": "1993년생 이동의 기운",
     "s1": {"vo_ko": "93년생. 지금 있는 곳, 답이 아닙니다.", "vo_en": "Born in ninety-three. Where you are right now is not the answer.", "sub_ko": "93년생.\n지금 있는 곳,\n답이 아닙니다.", "sub_en": "Born in '93.\nWhere you are right now\nis not the answer."},
     "s2": {"vo_ko": "움직이세요. 물리적으로. 그게 모든 걸 바꿉니다.", "vo_en": "Move. Physically. That changes everything.", "sub_ko": "움직이세요.\n물리적으로.\n\n그게 모든 걸 바꿉니다.", "sub_en": "Move. Physically.\n\nThat changes everything."}},
    {"id": "ryu_fire_1998", "title": "1998년생 불의 기운",
     "s1": {"vo_ko": "98년생. 불의 기운이 타오르고 있습니다.", "vo_en": "Born in ninety-eight. The fire energy is blazing inside you.", "sub_ko": "98년생.\n불의 기운이\n타오르고 있습니다.", "sub_en": "Born in '98.\nThe fire energy is\nblazing inside you."},
     "s2": {"vo_ko": "이 에너지를 두려워하지 마세요. 태우세요. 불은 정화입니다.", "vo_en": "Don't fear this energy. Let it burn. Fire is purification.", "sub_ko": "이 에너지를\n두려워하지 마세요.\n\n태우세요.\n불은 정화입니다.", "sub_en": "Don't fear this energy.\nLet it burn.\n\nFire is purification."}},
    {"id": "ryu_rebirth_1991", "title": "1991년생 재탄생",
     "s1": {"vo_ko": "91년생. 끝났다고 생각했죠?", "vo_en": "Born in ninety-one. You thought it was over, didn't you?", "sub_ko": "91년생.\n끝났다고\n생각했죠?", "sub_en": "Born in '91.\nYou thought it was over,\ndidn't you?"},
     "s2": {"vo_ko": "아닙니다. 지금부터가 시작입니다. 완전한 재탄생.", "vo_en": "No. It starts now. A complete rebirth.", "sub_ko": "아닙니다.\n지금부터가 시작입니다.\n\n완전한 재탄생.", "sub_en": "No. It starts now.\n\nA complete rebirth."}},
]


def build_job(master, prompts, entry):
    cta = CTA[master]
    ref_images = [img(master, "calm"), img(master, "warn"), img(master, "calm")]
    return {
        "video_id": entry["id"],
        "output_dir": "C:\\kd\\out",
        "clip_dir": f"C:\\kd\\clips\\{entry['id']}",
        "bgm": BGM_PATH,
        "title_ko": entry["title"],
        "scenes": [
            {"n": 1, "prompt": prompts[0], "ref_image": ref_images[0], "extend": 0, "motion": "zoom_in", "sub_style": "hook", "speaker": master,
             "vo": {"ko": entry["s1"]["vo_ko"], "en": entry["s1"]["vo_en"]}, "subs": {"ko": entry["s1"]["sub_ko"], "en": entry["s1"]["sub_en"]}},
            {"n": 2, "prompt": prompts[1], "ref_image": ref_images[1], "extend": 0, "motion": "zoom_out", "sub_style": "body", "speaker": master,
             "vo": {"ko": entry["s2"]["vo_ko"], "en": entry["s2"]["vo_en"]}, "subs": {"ko": entry["s2"]["sub_ko"], "en": entry["s2"]["sub_en"]}},
            {"n": 3, "prompt": prompts[2], "ref_image": ref_images[2], "extend": 0, "motion": "zoom_in", "sub_style": "cta", "speaker": master,
             "vo": {"ko": cta["vo_ko"], "en": cta["vo_en"]}, "subs": {"ko": cta["sub_ko"], "en": cta["sub_en"]}},
        ],
    }


def main():
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    CLIPS_ROOT.mkdir(parents=True, exist_ok=True)

    KEEP = {"smoke_1scene.json", "01_karma_warn_1994.json"}
    for f in JOBS_DIR.glob("*.json"):
        if f.name not in KEEP:
            f.unlink()
            print(f"  [삭제] {f.name}")

    idx = 2
    all_entries = []

    for entry in karma_data:
        all_entries.append((idx, entry["id"], build_job("karma", KARMA_PROMPTS, entry)))
        idx += 1

    for entry in seoa_data:
        all_entries.append((idx, entry["id"], build_job("seoa", SEOA_PROMPTS, entry)))
        idx += 1

    for entry in ryu_data:
        all_entries.append((idx, entry["id"], build_job("ryu", RYU_PROMPTS, entry)))
        idx += 1

    for num, vid_id, job in all_entries:
        fname = f"{num:02d}_{vid_id}.json"
        with open(JOBS_DIR / fname, "w", encoding="utf-8") as f:
            json.dump(job, f, ensure_ascii=False, indent=2)
        clip_dir = CLIPS_ROOT / vid_id
        clip_dir.mkdir(parents=True, exist_ok=True)
        print(f"  [생성] {fname} + C:\\kd\\clips\\{vid_id}\\")

    print(f"\n[완료] {len(all_entries)}개 잡 생성 (3씬 x 한/영)")
    print(f"       클립 저장 위치: C:\\kd\\clips\\<video_id>\\scene_01.mp4 ~ scene_03.mp4")


if __name__ == "__main__":
    main()
