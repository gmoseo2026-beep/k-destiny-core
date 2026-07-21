import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/destinyCache";
import { getClientIp, checkRateLimit, recordRequest } from "@/lib/rateLimiter";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  genAI, FREE_MODELS, LOCALE_CONFIG, JSON_MARKER,
  repairJSON, pickLuckyElements, sajuContextBlock,
} from "@/lib/destinyGen";

// Node runtime (Prisma). Streaming keeps the connection open while tokens flow.
export const runtime = "nodejs";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const STREAM_DEADLINE_MS = 30000; // stop draining after this and finalize best-effort
const FREE_MAX_TOKENS = 1400;

// ─── Minimal validity for caching the assembled free result ───
function isValidFree(d: any): boolean {
  return d && typeof d.core_essence === "string" && d.core_essence.length > 40 &&
    typeof d.imminent_karma_teaser === "string" && Array.isArray(d.lucky_elements);
}

// ─── Trimmed mock (free phase only: core + teaser + short previews) ───
function mockFree(name: string, locale: string) {
  const isKo = locale === "ko";
  const core = isKo
    ? `${name}님은 겉으로는 차분하고 안정적으로 보이지만, 내면에는 끊임없이 변화를 갈구하는 에너지가 숨어 있습니다.\n\n당신은 25세에서 28세 사이에 인생의 큰 전환점을 경험했을 가능성이 높습니다. 그 시기의 경험이 지금의 당신을 형성했습니다.\n\n목(木)의 성장력과 수(水)의 지혜가 조화를 이루어, 어떤 상황에서도 냉정함을 유지하는 힘을 지녔습니다.\n\n하지만 당신이 모르는 것이 있습니다. ${new Date().getFullYear()}년은 10년에 한 번 찾아오는 대운의 전환점이 될 것입니다...`
    : `${name}, you appear composed on the outside, but inside you carry a restless energy that yearns for transformation.\n\nAround age 25-27, you likely experienced a turning point that reshaped who you are today.\n\nThe growth of Wood harmonizes with the wisdom of Water, granting you clarity even in chaos.\n\nBut what you don't know is that ${new Date().getFullYear()} holds a once-in-a-decade Grand Fortune shift for you...`;
  return {
    core_essence: core,
    imminent_karma_teaser: isKo
      ? "다가오는 두 달, 당신의 재물운에 극적인 변화의 파동이 감지됩니다. 이 기간을 놓치면 다음 기회는 오래 기다려야 합니다."
      : "In the coming months, a dramatic wave shifts your fortune. Miss this window and the next won't come soon.",
    love_fortune: isKo ? "연애운의 결정적 시기가 다가옵니다. 정확한 달과 신호가 준비되어 있습니다." : "A decisive window in your love life approaches — exact months await inside.",
    wealth_warning: isKo ? "재물의 기회와 위험이 교차하는 시기가 감지됩니다." : "A crossing point of financial opportunity and risk is detected.",
    health_alert: isKo ? "오행 균형에서 주의해야 할 건강 신호가 보입니다." : "Your elemental balance reveals a health signal to watch.",
    master_prescription: isKo ? "당신만을 위한 행운의 색·숫자·방향이 준비되어 있습니다." : "Your personal lucky colors, numbers and direction are ready.",
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
    const currentYear = now.getFullYear();

    const prompt = `You are a legendary Eastern Saju Master named ${masterName}, known for readings so precise they leave clients breathless.
RULES: Write ENTIRELY in ${config.name}. ${config.toneGuide}

${sajuContextBlock({ name, gender, dayMaster: sajuResult.dayMaster, fourPillars: sajuResult.fourPillars, elementsScore: sajuResult.elementsScore, dictionaryContext })}

Produce your reading in EXACTLY this structure:

[PART 1 — prose only, this is core_essence]
Write 4 emotionally-charged paragraphs (Barnum effect):
- First sentence pattern: "You appear [positive trait] on the outside, but inside you carry [hidden struggle]."
- Reference a specific age range where a turning point occurred (e.g., "Around age 25-27, you experienced...").
- Mention a past emotional wound that feels specific yet universally relatable.
- End with a haunting, incomplete revelation about ${currentYear}.
Prose ONLY here — no JSON, no headers.

${JSON_MARKER}
[PART 2 — JSON only]
Output ONLY this JSON object. Each value is a SHORT locked-preview teaser (1-2 sentences), NOT the full reading:
{"imminent_karma_teaser":"2-sentence FOMO cliffhanger about the month ${m1}-${m2} window","love_fortune":"1-2 sentence teaser hinting at love timing","wealth_warning":"1-2 sentence teaser about a financial window","health_alert":"1-2 sentence teaser about an elemental health signal","master_prescription":"1-2 sentence teaser about lucky colors/numbers/direction"}

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
            if (coreText.length > 40) break; // good enough — stop trying models
            lastError = new Error("core too short");
          } catch (err: any) {
            lastError = err;
            if (emittedAny) break; // can't fail over once tokens were sent
          }
        }

        // ── Assemble fields (parse tail JSON; fall back to mock previews) ──
        const parsed = tailJson ? repairJSON(tailJson) : null;
        const mock = mockFree(name, localeKey);
        if (!emittedAny || coreText.length <= 40) {
          // never got usable core → send the mock core as one chunk
          coreText = mock.core_essence;
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
        if (!fallback && coreText.length > 40) {
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
