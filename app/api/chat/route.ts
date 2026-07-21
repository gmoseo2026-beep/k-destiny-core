import { getClientIp, checkChatRateLimit, checkGuestChatLimit, recordChatRequest } from "@/lib/rateLimiter";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";
import { loadKarmaState, consumeKarma } from "@/lib/karma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Streaming keeps the socket open while tokens flow — no more "blank screen then
// fail" waits. Paid Gemini tier is assumed (billing enabled), which removes most
// 429s; the multi-model failover + streaming handles the residual 503s.
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Reliability-first: 2.0-flash leads (fast + available); 2.5-flash is a quality
// fallback, never the blocking first hop. First-token failover across these.
const CHAT_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"];

const LOCALE_LANGUAGES: Record<string, string> = {
  ko: "Korean (한국어)", en: "English", es: "Spanish (Español)",
  de: "German (Deutsch)", fr: "French (Français)", ja: "Japanese (日本語)",
};

const MASTER_PERSONALITIES: Record<string, string> = {
  "Master Ian": "Traditional, noble, deeply philosophical scholar. Your tone is formal and profound.",
  "Master Jin": "Sharp, logical, confident, dandy CEO. Your tone is decisive and practical.",
  "Master Ryu": "Cynical, dark, seductive bad boy. Your tone is dangerously charming and direct.",
  "Master Jay": "Trendy, Gen-Z slang, upbeat hipster. Your tone is energetic, informal, and fun.",
  "Master Muwi": "Minimalist, Zen, speaks softly. Your tone is sparse, calm, and void of excess.",
  "Master Rin": "Ethereal, elegant shaman. Your tone is poetic, lunar, and highly intuitive.",
  "Master Karma": "Dark, gothic, intense. Your tone is heavy with destiny, karma, and authority.",
  "Master Seoa": "Modern, objective analyst. Your tone is clinical, precise, and structural.",
  "Master Yura": "Luxurious, old-money elegance. Your tone is refined, graceful, and deeply motherly.",
  "Master Hana": "Vibrant pop-idol, highly energetic. Your tone is bubbly, encouraging, and bright.",
};

const STREAM_DEADLINE_MS = 35000;
const EMOTIONS = ["calm", "joy", "warn", "surprise", "sullen"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { message } = body;
    const { history, masterName, locale, profile } = body;

    // Identity comes from the server session, never the request body.
    const session = await getServerSession(authOptions);
    const sessionUserId: string | null = session?.user?.id || null;

    // Input sanitization (prompt-injection mitigation).
    if (typeof message === "string") {
      message = message.slice(0, 2000).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    }
    if (!message || !masterName) {
      return NextResponse.json({ error: "Missing message or masterName" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    // Rate limit + guest backstop.
    const clientIp = getClientIp(req);
    const rateCheck = await checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || 10000) / 1000);
      return NextResponse.json({ error: `Too many whispers to the stars. Try again in ${retryAfterSec}s.` }, { status: 429 });
    }
    if (!sessionUserId) {
      const guestCheck = await checkGuestChatLimit(clientIp);
      if (!guestCheck.allowed) {
        return NextResponse.json({ error: "Free consultations exhausted. Create a free account to continue your reading." }, { status: 403 });
      }
    }

    // ─── Karma (lib/karma = single source of truth) ───
    const effectiveUserId = sessionUserId;
    let karmaTokens = 0, isAdmin = false, isPremiumActive = false, shouldDecrementToken = false;
    if (effectiveUserId) {
      const state = await loadKarmaState(effectiveUserId);
      isAdmin = state.isAdmin; isPremiumActive = state.isPremiumActive; karmaTokens = state.karma;
      if (!isAdmin && karmaTokens <= 0) {
        return NextResponse.json(
          {
            error: isPremiumActive ? "Daily Karma spent. Your 20 questions refresh tomorrow." : "Karma Energy depleted. Master is meditating.",
            remainingTokens: 0, dailyLimit: isPremiumActive,
          },
          { status: 403 }
        );
      }
      shouldDecrementToken = !isAdmin;
    }
    const hasFullAccess = isAdmin || isPremiumActive || (!!effectiveUserId && karmaTokens > 0);
    const language = LOCALE_LANGUAGES[locale || "en"] || "English";
    const masterPersonality = MASTER_PERSONALITIES[masterName] || "You speak with wise, mystical authority.";

    // ─── System prompt (lightweight sentinel format — no strict JSON) ───
    let systemPart = `You are ${masterName}. Personality: ${masterPersonality} NEVER break character.

RESPONSE FORMAT (follow EXACTLY):
- Your FIRST line must be exactly: EMOTION: X   (where X is one of: calm, joy, warn, surprise, sullen)
- From the SECOND line onward, write your reply. Plain text only — no JSON, no code fences.

TWO-PART STRUCTURE:
Step 1 (Human Connection): open by chatting warmly and empathetically from your personality. Do NOT mention Saju/stars/destiny yet.
Step 2 (Astrology): smoothly transition (e.g. "But looking at your energy flow...") into a professional 5-Elements Saju analysis.`;

    if (hasFullAccess) {
      systemPart += `

PREMIUM RULE:
- Give deep, multi-paragraph advice for Step 2.
- Structure with clear "##" section headers.
- Provide actionable remedies (colors, timings).
- Write in ${language}. Do NOT mix languages.`;
    } else {
      systemPart += `

FREEMIUM RULE:
- Keep Step 1 + Step 2 very short (1-2 sentences total). Be vague yet captivating — make them DESPERATE to know more.
- No detailed advice or specific remedies.
- End your message EXACTLY with: [SYSTEM_PAYWALL]
- Write in ${language}, except the [SYSTEM_PAYWALL] tag which must be exact.`;
    }

    // ─── Saju injection (single call — no function-calling round-trip) ───
    // The birth data is already known (profile from the client / DB), so compute
    // the Four Pillars deterministically and inject. No second AI call needed.
    if (profile?.year && profile?.month && profile?.day) {
      try {
        const dob = `${profile.year}-${String(profile.month).padStart(2, "0")}-${String(profile.day).padStart(2, "0")}`;
        const loc = `${profile.city || "Unknown"}, ${profile.country || "Unknown"}`;
        const saju = calculateFourPillars(dob, profile.unknownTime ? null : (profile.time || null), profile.gender || "M", loc);
        let dict = "";
        try {
          const cond: any[] = [{ category: "DAY_MASTER", signKey: saju.dayMasterSignKey }];
          for (const l of saju.elementLacks) cond.push({ category: "ELEMENT_LACK", signKey: l });
          const docs = await prisma.sajuContentDictionary.findMany({ where: { OR: cond } });
          if (docs.length) dict = docs.map((d) => `[${d.category}] ${d.signKey}: ${d.englishContent}`).join("\n");
        } catch { /* dictionary optional */ }
        systemPart += `

[BACKEND-COMPUTED SAJU — DO NOT recalculate; use ONLY this]
- Gender: ${profile.gender || "Unknown"}
- Four Pillars: Year=${saju.fourPillars.year}, Month=${saju.fourPillars.month}, Day=${saju.fourPillars.day}, Time=${saju.fourPillars.time || "Unknown"}
- Day Master: ${saju.dayMaster}
- Five Elements: ${JSON.stringify(saju.elementsScore)}
<Proprietary interpretation guide>
${dict || "Use standard Eastern Saju wisdom."}`;
      } catch { /* saju optional — never block the chat */ }
    }

    // Conversation context.
    let ctx = "";
    if (history && Array.isArray(history) && history.length > 0) {
      ctx += "--- Previous conversation ---\n";
      for (const entry of history) {
        const role = entry.role === "user" ? "User" : masterName;
        const text = entry.parts?.[0]?.text || "";
        if (text) ctx += `${role}: ${text}\n`;
      }
      ctx += "--- End ---\n\n";
    }
    const fullPrompt = `${ctx}User: ${message}\n${masterName}:`;

    // ─── Streaming response with first-token model failover ───
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (o: any) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
        let emittedAny = false, emotionSent = false, consumed = false;
        let remainingTokens: number | null = isAdmin || !effectiveUserId ? null : karmaTokens;
        let lastError: any = null;
        const deadline = Date.now() + STREAM_DEADLINE_MS;

        // Charge only once, and only after a real answer has begun streaming.
        const doConsume = async () => {
          if (consumed) return;
          consumed = true;
          recordChatRequest(clientIp);
          if (shouldDecrementToken && effectiveUserId) {
            try { remainingTokens = await consumeKarma(effectiveUserId); }
            catch { remainingTokens = Math.max(0, karmaTokens - 1); }
          }
        };

        for (const modelName of CHAT_MODELS) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: systemPart,
              generationConfig: { maxOutputTokens: 4096, temperature: 0.85 },
            });
            const result = await model.generateContentStream(fullPrompt);

            let full = "", headerParsed = false, headerEnd = 0, bodySent = 0;
            for await (const chunk of result.stream) {
              if (Date.now() > deadline) break;
              const t = chunk.text();
              if (!t) continue;
              full += t;

              if (!headerParsed) {
                const nl = full.indexOf("\n");
                if (nl === -1) {
                  if (full.length <= 60) continue; // still waiting for the EMOTION line
                  headerParsed = true; headerEnd = 0; // no header appeared → treat all as body
                } else {
                  const m = full.slice(0, nl).match(/EMOTION:\s*(\w+)/i);
                  const emotion = m && EMOTIONS.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "calm";
                  send({ type: "emotion", emotion }); emotionSent = true;
                  headerParsed = true; headerEnd = nl + 1;
                }
                if (!emotionSent) { send({ type: "emotion", emotion: "calm" }); emotionSent = true; }
              }

              if (headerParsed) {
                const bodyLen = full.length - headerEnd;
                if (bodyLen > bodySent) {
                  send({ type: "delta", text: full.slice(headerEnd + bodySent) });
                  bodySent = bodyLen; emittedAny = true;
                  await doConsume();
                }
              }
            }

            // Stream ended — flush any remainder (handles short replies that
            // never contained a newline / EMOTION header).
            if (!headerParsed && full.trim().length > 0) {
              if (!emotionSent) { send({ type: "emotion", emotion: "calm" }); emotionSent = true; }
              send({ type: "delta", text: full }); emittedAny = true; await doConsume();
            } else if (headerParsed) {
              const bodyLen = full.length - headerEnd;
              if (bodyLen > bodySent) {
                send({ type: "delta", text: full.slice(headerEnd + bodySent) });
                bodySent = bodyLen; emittedAny = true; await doConsume();
              }
            }

            if (emittedAny) { send({ type: "done", remainingTokens }); controller.close(); return; }
            lastError = new Error(`${modelName} produced empty stream`);
          } catch (err: any) {
            lastError = err;
            // Once tokens have gone out we can't fail over — finalize what we have.
            if (emittedAny) { send({ type: "done", remainingTokens }); controller.close(); return; }
            // else try the next model
          }
        }

        // Every model failed before a single token — graceful non-answer, no charge.
        console.error("[Chat] All models failed:", lastError?.message);
        if (!emotionSent) send({ type: "emotion", emotion: "calm" });
        send({ type: "delta", text: "마스터 카르마가 현재 깊은 명상 중입니다. 잠시 후 다시 말을 걸어주세요." });
        send({ type: "done", fallback: true, remainingTokens: isAdmin || !effectiveUserId ? null : karmaTokens });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  } catch (error: any) {
    console.error("Error in chat API route:", error);
    return NextResponse.json({ error: error.message || "Failed to communicate with master" }, { status: 500 });
  }
}
