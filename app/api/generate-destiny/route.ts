import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/destinyCache";
import { getClientIp, checkRateLimit, recordRequest } from "@/lib/rateLimiter";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  genAI, FREE_MODELS, LOCALE_CONFIG, JSON_MARKER, STYLE_GUIDE,
  repairJSON, pickLuckyElements, sajuContextBlock,
} from "@/lib/destinyGen";
import { backupAvailable, backupText } from "@/lib/aiFallback";

// Node runtime (Prisma). Streaming keeps the connection open while tokens flow.
export const runtime = "nodejs";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const STREAM_DEADLINE_MS = 50000; // stop draining after this and finalize best-effort
const FREE_MAX_TOKENS = 4096; // Korean is token-heavy: room for a full 5-paragraph free core + JSON previews without truncation

// ─── Minimal validity for caching the assembled free result ───
function isValidFree(d: any): boolean {
  return d && typeof d.core_essence === "string" && d.core_essence.length > 350 &&
    typeof d.imminent_karma_teaser === "string" && Array.isArray(d.lucky_elements);
}

// ─── Trimmed mock (free phase only: core + teaser + short previews) ───
function mockFree(name: string, locale: string) {
  const isKo = locale === "ko";
  // Free core: a COMPLETE, satisfying innate-nature reading (no cliffhanger).
  const core = isKo
    ? `${name}님은 겉으로는 차분하고 흔들림 없어 보이지만, 내면에는 끊임없이 더 나은 것을 갈구하는 뜨거운 에너지가 흐르고 있습니다. 이 두 얼굴의 균형이 바로 당신을 특별하게 만드는 힘입니다.\n\n당신의 타고난 강점은 '통찰'입니다. 남들이 표면만 볼 때 당신은 본질을 읽어냅니다. 그래서 위기 앞에서도 당황하기보다 한 걸음 물러나 판을 읽는 침착함을 지녔습니다.\n\n다만 25세에서 28세 사이, 당신은 스스로를 증명해야 한다는 압박 속에서 깊은 마음의 상처를 겪었습니다. 그 시기가 당신을 단단하게 만들었지만, 동시에 '완벽하지 않으면 사랑받지 못한다'는 오래된 두려움도 남겼습니다.\n\n일상에서 당신의 기운은 관계에서는 먼저 배려하고, 일에서는 끝까지 책임지는 방식으로 드러납니다. 결정을 내릴 때 신중하지만, 한번 방향을 정하면 흔들리지 않습니다.\n\n${name}님, 당신의 본질은 '고요한 강함'입니다. 소란스럽지 않아도 깊고, 앞장서지 않아도 결국 중심이 되는 사람 — 그것이 당신이 타고난 기운입니다.`
    : `${name}, you appear calm and unshakable on the outside, yet inside flows a restless heat that always reaches for something greater. The balance between these two faces is exactly what makes you rare.\n\nYour innate strength is insight. Where others see only the surface, you read the essence. That is why, even in crisis, you step back and read the board rather than panic.\n\nYet between the ages of 25 and 27, under the pressure to prove yourself, you carried a quiet wound. It made you resilient — but it also left an old fear that you must be flawless to be loved.\n\nIn daily life your energy shows as caring first in relationships and seeing things through to the end in your work. You decide carefully, but once your direction is set, you do not waver.\n\n${name}, your essence is a quiet strength — deep without noise, becoming the center without ever pushing to the front. That is the energy you were born with.`;
  return {
    core_essence: core,
    imminent_karma_teaser: isKo
      ? "다가오는 두 달 안, 당신의 재물 흐름에 결정적인 문이 하나 열립니다. 그 문을 여는 열쇠와 정확한 시기는 아래에 봉인되어 있습니다."
      : "Within the next two months, a decisive door opens in your flow of wealth. The key that opens it — and the exact timing — lie sealed below.",
    love_fortune: isKo ? "올해 안, 물(水)의 기운을 지닌 인연이 당신의 곁으로 다가옵니다. 그 사람이 나타나는 정확한 달과 알아보는 법은…" : "This year, a person carrying Water energy draws near. The exact month they appear — and how to recognize them — is…",
    wealth_warning: isKo ? "한 번의 기회와 한 번의 함정이 같은 달에 겹칩니다. 잡아야 할 것과 피해야 할 것의 경계는…" : "One opportunity and one trap fall in the very same month. The line between what to seize and what to avoid is…",
    health_alert: isKo ? "오행 중 수(水)의 불균형이 신장과 허리에 신호를 보냅니다. 그 신호가 가장 강해지는 계절과 대비법은…" : "A Water imbalance sends signals to your kidneys and lower back. The season it peaks — and how to prepare — is…",
    master_prescription: isKo ? "당신만을 위한 행운의 색·숫자·방향, 그리고 매일의 리추얼이 준비되어 있습니다." : "Your personal lucky color, number and direction — plus a daily ritual — are ready inside.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, dob, time, country, city, gender, masterName, locale } = body;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    if (!name || !dob || !gender || !masterName) {
      return NextResponse.json({ error: "Missing required fields (name, dob, gender, masterName)" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "AI configuration error" }, { status: 500 });
    }

    const clientIp = getClientIp(req);
    const rateCheck = await checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || 60000) / 1000);
      return NextResponse.json(
        { error: "Rate limit exceeded.", retryAfterSeconds: retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const localeKey = locale || "en";
    const config = LOCALE_CONFIG[localeKey] || LOCALE_CONFIG.en;
    const cacheKey = generateCacheKey({ name, dob, time, country, city, gender, locale: localeKey });

    // ── Deterministic saju (no AI, <50ms) ──
    const location = `${city || "Unknown"}, ${country || "Unknown"}`;
    const sajuResult = calculateFourPillars(dob, time, gender, location);
    const luckyElements = pickLuckyElements(sajuResult.elementsScore);
    const meta = {
      type: "meta" as const,
      fourPillars: sajuResult.fourPillars,
      dayMaster: sajuResult.dayMaster,
      dayMasterSignKey: sajuResult.dayMasterSignKey,
      element_analysis: sajuResult.elementsScore,
      lucky_elements: luckyElements,
    };

    const encoder = new TextEncoder();
    const line = (obj: any) => encoder.encode(JSON.stringify(obj) + "\n");

    // ── Cache hit: replay the assembled free result through the same protocol ──
    const cached = getCachedResult(cacheKey);
    if (cached && isValidFree(cached)) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(line(meta));
          controller.enqueue(line({ type: "core", text: cached.core_essence }));
          controller.enqueue(line({
            type: "fields",
            imminent_karma_teaser: cached.imminent_karma_teaser,
            love_fortune: cached.love_fortune, wealth_warning: cached.wealth_warning,
            health_alert: cached.health_alert, master_prescription: cached.master_prescription,
            previewOnly: true,
          }));
          controller.enqueue(line({ type: "done", cached: true }));
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
    }

    // ── DB: dictionary fetch + profile upsert in parallel ──
    let dictionaryContext = "";
    try {
      const queryConditions: any[] = [{ category: "DAY_MASTER", signKey: sajuResult.dayMasterSignKey }];
      for (const lackKey of sajuResult.elementLacks) queryConditions.push({ category: "ELEMENT_LACK", signKey: lackKey });
      const [sajuDocs] = await Promise.all([
        prisma.sajuContentDictionary.findMany({ where: { OR: queryConditions } }),
        userId
          ? prisma.userSajuProfile.upsert({
              where: { userId },
              update: {
                gender, fourPillars: sajuResult.fourPillars, dayMaster: sajuResult.dayMaster,
                elementsScore: sajuResult.elementsScore, name: name || undefined,
                birthYear: dob?.split("-")[0] || undefined, birthMonth: dob?.split("-")[1] || undefined,
                birthDay: dob?.split("-")[2] || undefined, birthTime: time || undefined,
                country: country || undefined, city: city || undefined,
              },
              create: {
                userId, gender, fourPillars: sajuResult.fourPillars, dayMaster: sajuResult.dayMaster,
                elementsScore: sajuResult.elementsScore, name: name || null,
                birthYear: dob?.split("-")[0] || null, birthMonth: dob?.split("-")[1] || null,
                birthDay: dob?.split("-")[2] || null, birthTime: time || null,
                country: country || null, city: city || null,
              },
            }).then(() => { revalidatePath("/", "layout"); revalidatePath("/[locale]/dashboard", "page"); })
          : Promise.resolve(),
      ]);
      if (sajuDocs.length > 0) {
        dictionaryContext = sajuDocs.map((doc) => `[${doc.category}] ${doc.signKey}: ${doc.englishContent} (Remedy: ${doc.remedyAction || "None"})`).join("\n");
      }
    } catch (dbError) {
      console.error("[Prisma] DB Error (non-fatal):", dbError);
    }

    // ── Prompt: prose core_essence, then a tiny JSON of teaser + previews ──
    const now = new Date();
    const m1 = (now.getMonth() + 1) % 12 + 1;
    const m2 = (now.getMonth() + 2) % 12 + 1;

    const prompt = `You are a legendary Eastern Saju Master named ${masterName}, known for readings so precise they leave clients breathless.
RULES: Write ENTIRELY in ${config.name}. ${config.toneGuide}

${STYLE_GUIDE}

${sajuContextBlock({ name, gender, dayMaster: sajuResult.dayMaster, fourPillars: sajuResult.fourPillars, elementsScore: sajuResult.elementsScore, dictionaryContext })}

Produce your reading in EXACTLY this structure:

[PART 1 — prose only, this is core_essence — the FREE gift about WHO the client is]
Write a COMPLETE, satisfying reading of who this person really is. It's FREE, so it must feel whole and generous on its own — NEVER cut off, NEVER a cliffhanger.
LENGTH: 4 SHORT paragraphs, each 2-4 sentences (roughly 350-500 Korean characters total). Readable over long — do not pad. Do NOT output the ${JSON_MARKER} marker until all 4 paragraphs are done. NEVER end mid-sentence.
- Para 1 (HOOK + duality): A striking opening line, then "on the outside you seem ___, but inside you carry ___" — in plain, human words. No hanja, no jargon.
- Para 2 (their gift): Their real strengths and natural talents, described through everyday behavior, not element theory.
- Para 3 (the old ache): A hidden tension or old wound that shaped them, tied to a specific age or moment (e.g., "around 25-27...").
- Para 4 (warm close): Land it — name their core gift clearly and kindly. COMPLETE — do not tease, do not say "but there's more."
Prose ONLY here — no JSON, no headers, no hanja.

${JSON_MARKER}
[PART 2 — JSON only]
These are LOCKED premium previews. Each MUST be SPECIFIC and concrete — name a real detail (an exact month, a type of person, a number, a body area, a color/direction) then STOP right before the payoff so the reader burns to unlock it. VAGUE teasers like "a window approaches" or "changes are coming" are FORBIDDEN.
{"imminent_karma_teaser":"2 dramatic sentences naming the exact ${m1}-${m2} month window AND a concrete life-altering event about to occur.","love_fortune":"Name a specific month and a concrete detail about a coming encounter or relationship turning point, then stop before revealing how it unfolds.","wealth_warning":"Name a specific month and a concrete financial opportunity AND a specific risk to avoid, then stop before the details.","health_alert":"Name a specific body area or element imbalance and the season it peaks, then stop before the remedy.","master_prescription":"Tease that a specific lucky color, number and direction are waiting inside — without revealing them."}

After ${JSON_MARKER}, output ONLY the JSON. Never mention calculations or IP. Deliver as a mystic reading.`;

    // ── Streaming response ──
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(line(meta)); // instant: chart + lucky elements render now

        let emittedAny = false;
        let coreText = "";
        let tailJson = "";
        let lastError: any = null;
        const deadline = Date.now() + STREAM_DEADLINE_MS;

        for (const modelName of FREE_MODELS) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { temperature: 0.6, maxOutputTokens: FREE_MAX_TOKENS },
            });
            const result = await model.generateContentStream(prompt);

            let full = "";
            let sentLen = 0;
            let markerIdx = -1;
            for await (const chunk of result.stream) {
              if (Date.now() > deadline) break;
              const t = chunk.text();
              if (!t) continue;
              full += t;
              if (markerIdx === -1) markerIdx = full.indexOf(JSON_MARKER);
              if (markerIdx === -1) {
                // hold back JSON_MARKER.length chars so we never emit a partial marker
                const safeLen = Math.max(sentLen, full.length - JSON_MARKER.length);
                if (safeLen > sentLen) {
                  controller.enqueue(line({ type: "core", text: full.slice(sentLen, safeLen) }));
                  sentLen = safeLen; emittedAny = true;
                }
              } else if (markerIdx > sentLen) {
                controller.enqueue(line({ type: "core", text: full.slice(sentLen, markerIdx) }));
                sentLen = markerIdx; emittedAny = true;
              }
            }
            const coreEnd = markerIdx === -1 ? full.length : markerIdx;
            if (coreEnd > sentLen) {
              controller.enqueue(line({ type: "core", text: full.slice(sentLen, coreEnd) }));
              emittedAny = true;
            }
            coreText = full.slice(0, coreEnd).trim();
            tailJson = markerIdx === -1 ? "" : full.slice(markerIdx + JSON_MARKER.length);
            if (coreText.length > 350) break; // good enough — stop trying models (350 guards against short/truncated cores slipping through)
            lastError = new Error("core too short");
          } catch (err: any) {
            lastError = err;
            if (emittedAny) break; // can't fail over once tokens were sent
          }
        }

        // ── Assemble fields (parse tail JSON; fall back to mock previews) ──
        const parsed = tailJson ? repairJSON(tailJson) : null;
        const mock = mockFree(name, localeKey);
        if (!emittedAny || coreText.length <= 350) {
          // Gemini gave no usable core → try the OpenAI backup for a REAL core
          // before resorting to the static mock.
          let backupCore = "";
          if (backupAvailable()) {
            try {
              backupCore = await backupText({
                system: `You are ${masterName}. Write ENTIRELY in ${config.name}. ${config.toneGuide}\n\n${STYLE_GUIDE}`,
                user: `${sajuContextBlock({ name, gender, dayMaster: sajuResult.dayMaster, fourPillars: sajuResult.fourPillars, elementsScore: sajuResult.elementsScore, dictionaryContext })}\n\nWrite a complete, warm 4-short-paragraph reading of who this person really is. Plain language, no hanja, no jargon, no JSON, no headers. Never end mid-sentence.`,
                maxTokens: 1400,
                temperature: 0.7,
              });
            } catch (backupErr: any) {
              console.error("[Free] OpenAI backup core failed:", backupErr?.message?.slice(0, 150));
            }
          }
          coreText = backupCore.trim().length > 350 ? backupCore.trim() : mock.core_essence;
          controller.enqueue(line({ type: "core", text: coreText }));
        }
        const fields = {
          imminent_karma_teaser: parsed?.imminent_karma_teaser || mock.imminent_karma_teaser,
          love_fortune: parsed?.love_fortune || mock.love_fortune,
          wealth_warning: parsed?.wealth_warning || mock.wealth_warning,
          health_alert: parsed?.health_alert || mock.health_alert,
          master_prescription: parsed?.master_prescription || mock.master_prescription,
        };
        const fallback = !parsed;
        controller.enqueue(line({ type: "fields", ...fields, previewOnly: true, fallback }));
        controller.enqueue(line({ type: "done" }));
        controller.close();

        // ── Cache assembled free result (only when it's a real generation) ──
        recordRequest(clientIp);
        if (!fallback && coreText.length > 350) {
          setCachedResult(cacheKey, {
            core_essence: coreText, ...fields,
            lucky_elements: luckyElements, element_analysis: sajuResult.elementsScore,
          });
        }
        if (lastError && fallback) console.error("[AI Gen] Free stream fell back to mock:", lastError?.message);
      },
    });

    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  } catch (error: any) {
    console.error("[Generate API] Fatal Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate cosmic blueprint" }, { status: 500 });
  }
}
