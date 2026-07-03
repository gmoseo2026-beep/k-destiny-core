/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HERMES AGENT — K-Destiny Autonomous Marketing Engine          ║
 * ║  100% Compliant · Official APIs Only · Enterprise Grade        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npx tsx scripts/hermes-agent.ts              # Run once
 *   npx tsx scripts/hermes-agent.ts --schedule   # Run with daily cron at 08:00 KST
 *
 * Required ENV variables (provision in .env.local):
 *   GEMINI_API_KEY          — Google AI Studio API key
 *   TWITTER_API_KEY         — Twitter v2 OAuth 1.0a Consumer Key
 *   TWITTER_API_SECRET      — Twitter v2 OAuth 1.0a Consumer Secret
 *   TWITTER_ACCESS_TOKEN    — Twitter v2 User Access Token
 *   TWITTER_ACCESS_SECRET   — Twitter v2 User Access Token Secret
 *   IG_ACCESS_TOKEN         — Meta Graph API (Instagram) Long-Lived Token
 *   IG_BUSINESS_ACCOUNT_ID  — Instagram Business Account ID
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import sharp from "sharp";

// ─── Load .env.local ───
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKGROUNDS_DIR = path.join(PROJECT_ROOT, "hermes");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "hermes", "output");
const OUTPUT_IMAGE = path.join(OUTPUT_DIR, "daily_marketing.jpg");

/* ═══════════════════════════════════════════════════════════════
 *  STEP 1 — GEMINI BRAIN: Generate Multi-Channel Marketing Copy
 * ═══════════════════════════════════════════════════════════════ */

interface MarketingContent {
  twitter: { text: string };
  instagram: { caption: string; overlay_text: string };
  threads: { text: string };
  reddit: { title: string; body: string };
}

const HERMES_MASTER_PROMPT = `You are Hermes, the divine marketing strategist for K-Destiny — a premium AI-powered Korean fortune-telling (사주/Saju) platform. Your job is to create compelling daily marketing content.

Today's Date: ${new Date().toISOString().split("T")[0]}

Generate fresh, engaging marketing content for ALL channels below. The tone should be mystical yet modern, creating urgency and curiosity. Include relevant emojis, hashtags, and hooks.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "twitter": {
    "text": "Tweet text (max 280 chars). Include 2-3 relevant hashtags. Create intrigue about destiny/fate."
  },
  "instagram": {
    "caption": "Instagram caption (2-4 paragraphs). Rich with emojis, storytelling, and a CTA to visit thekdestiny.com. Include 15-20 hashtags at the end.",
    "overlay_text": "Short powerful quote (max 12 words) for the image overlay. Mystical and inspiring."
  },
  "threads": {
    "text": "Threads post (1-2 paragraphs). Conversational, thought-provoking, with a soft CTA."
  },
  "reddit": {
    "title": "Engaging Reddit post title about astrology/destiny",
    "body": "Reddit post body (2-3 paragraphs). Educational/value-driven about Korean Saju astrology. Subtle mention of thekdestiny.com."
  }
}`;

async function generateContent(): Promise<MarketingContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("❌ GEMINI_API_KEY is not set");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  console.log("🧠 [Hermes Brain] Generating marketing content via Gemini...");
  const result = await model.generateContent(HERMES_MASTER_PROMPT);
  const raw = result.response.text();

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    const content: MarketingContent = JSON.parse(cleaned);
    console.log("✅ [Hermes Brain] Content generated successfully");
    console.log(`   📝 Twitter: "${content.twitter.text.substring(0, 60)}..."`);
    console.log(`   📸 Overlay: "${content.instagram.overlay_text}"`);
    return content;
  } catch {
    console.error("❌ [Hermes Brain] Failed to parse Gemini response:\n", cleaned);
    throw new Error("Gemini response was not valid JSON");
  }
}

/* ═══════════════════════════════════════════════════════════════
 *  STEP 2 — IMAGE FACTORY: Composite Text Overlay on Background
 * ═══════════════════════════════════════════════════════════════ */

function pickRandomBackground(): string {
  const allFiles = fs.readdirSync(BACKGROUNDS_DIR).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  if (allFiles.length === 0) throw new Error("❌ No background images found in hermes/");
  const pick = allFiles[Math.floor(Math.random() * allFiles.length)];
  console.log(`🎨 [Image Factory] Selected background: ${pick}`);
  return path.join(BACKGROUNDS_DIR, pick);
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + " " + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

async function compositeImage(overlayText: string): Promise<string> {
  const bgPath = pickRandomBackground();

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Get image dimensions
  const metadata = await sharp(bgPath).metadata();
  const imgWidth = metadata.width || 1080;
  const imgHeight = metadata.height || 1080;

  // Typography settings
  const fontSize = Math.round(imgWidth * 0.055); // ~5.5% of width
  const lineHeight = Math.round(fontSize * 1.45);
  const maxCharsPerLine = Math.floor(imgWidth / (fontSize * 0.55));
  const lines = wrapText(overlayText.toUpperCase(), maxCharsPerLine);

  const totalTextHeight = lines.length * lineHeight;
  const startY = Math.round((imgHeight - totalTextHeight) / 2);

  // Build SVG text overlay with elegant dark-fantasy styling
  const textElements = lines
    .map((line, i) => {
      const y = startY + i * lineHeight + fontSize;
      return `
        <text x="50%" y="${y}" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-size="${fontSize}" font-weight="bold"
              letter-spacing="3" fill="none"
              stroke="rgba(0,0,0,0.7)" stroke-width="6">${escapeXml(line)}</text>
        <text x="50%" y="${y}" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-size="${fontSize}" font-weight="bold"
              letter-spacing="3" fill="url(#goldGradient)">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svgOverlay = `
    <svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
          <stop offset="45%" style="stop-color:#F5E6B8;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#D4AF37;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Subtle dark vignette band behind text -->
      <rect x="0" y="${startY - fontSize}" width="${imgWidth}" height="${totalTextHeight + fontSize * 2}"
            fill="rgba(0,0,0,0.45)" rx="0" />
      ${textElements}
    </svg>`;

  await sharp(bgPath)
    .resize(1080, 1080, { fit: "cover", position: "center" })
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toFile(OUTPUT_IMAGE);

  console.log(`✅ [Image Factory] Saved composited image → ${OUTPUT_IMAGE}`);
  return OUTPUT_IMAGE;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* ═══════════════════════════════════════════════════════════════
 *  STEP 3A — TWITTER/X: Official API v2 Posting
 *  Docs: https://developer.x.com/en/docs/x-api/tweets/manage-tweets
 * ═══════════════════════════════════════════════════════════════ */

function createOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string> = {}
): string {
  const consumerKey = process.env.TWITTER_API_KEY!;
  const consumerSecret = process.env.TWITTER_API_SECRET!;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN!;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET!;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Combine all params for signature base
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramStr = sortedKeys.map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(allParams[k])}`).join("&");
  const baseStr = `${method.toUpperCase()}&${encodeRFC3986(url)}&${encodeRFC3986(paramStr)}`;
  const signingKey = `${encodeRFC3986(consumerSecret)}&${encodeRFC3986(accessSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseStr).digest("base64");

  oauthParams["oauth_signature"] = signature;

  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeRFC3986(k)}="${encodeRFC3986(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

async function uploadMediaToTwitter(imagePath: string): Promise<string | null> {
  const UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
  const imageData = fs.readFileSync(imagePath);
  const base64Data = imageData.toString("base64");

  const formBody = new URLSearchParams();
  formBody.append("media_data", base64Data);

  const authHeader = createOAuth1Header("POST", UPLOAD_URL);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  if (!res.ok) {
    console.error(`❌ [Twitter] Media upload failed: ${res.status} ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  console.log(`✅ [Twitter] Media uploaded, ID: ${data.media_id_string}`);
  return data.media_id_string;
}

async function postToTwitter(text: string, imagePath: string): Promise<void> {
  const keys = [
    process.env.TWITTER_API_KEY,
    process.env.TWITTER_API_SECRET,
    process.env.TWITTER_ACCESS_TOKEN,
    process.env.TWITTER_ACCESS_SECRET,
  ];
  if (keys.some((k) => !k)) {
    console.warn("⏭️  [Twitter] API keys not configured — skipping");
    return;
  }

  console.log("🐦 [Twitter] Posting via API v2...");

  // Upload image first
  const mediaId = await uploadMediaToTwitter(imagePath);

  // Post tweet
  const TWEET_URL = "https://api.twitter.com/2/tweets";
  const body: Record<string, unknown> = { text };
  if (mediaId) {
    body.media = { media_ids: [mediaId] };
  }

  const authHeader = createOAuth1Header("POST", TWEET_URL);

  const res = await fetch(TWEET_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ [Twitter] Post failed: ${res.status} ${errText}`);
    return;
  }

  const data = await res.json();
  console.log(`✅ [Twitter] Tweet posted: https://x.com/i/status/${data.data?.id}`);
}

/* ═══════════════════════════════════════════════════════════════
 *  STEP 3B — INSTAGRAM: Official Meta Graph API Posting
 *  Docs: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
 * ═══════════════════════════════════════════════════════════════ */

async function postToInstagram(caption: string, imagePath: string): Promise<void> {
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const accountId = process.env.IG_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    console.warn("⏭️  [Instagram] API credentials not configured — skipping");
    return;
  }

  console.log("📸 [Instagram] Posting via Meta Graph API...");

  // Instagram Graph API requires a publicly accessible image URL.
  // In production, upload to your CDN/S3 first. For now, we log a reminder.
  // Using a placeholder approach: the CEO should host the image and provide the URL.

  const imageUrl = process.env.HERMES_IMAGE_CDN_URL || "";
  if (!imageUrl) {
    console.warn("⏭️  [Instagram] HERMES_IMAGE_CDN_URL not set — cannot publish.");
    console.warn("   ℹ️  Instagram Graph API requires a publicly accessible image URL.");
    console.warn(`   ℹ️  Upload ${imagePath} to your CDN and set HERMES_IMAGE_CDN_URL.`);
    return;
  }

  // Step 1: Create media container
  const containerUrl = `https://graph.facebook.com/v21.0/${accountId}/media`;
  const containerRes = await fetch(containerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  if (!containerRes.ok) {
    console.error(`❌ [Instagram] Container creation failed: ${await containerRes.text()}`);
    return;
  }

  const { id: creationId } = await containerRes.json();
  console.log(`   📦 Container created: ${creationId}`);

  // Step 2: Wait for processing (Instagram needs a few seconds)
  await sleep(5000);

  // Step 3: Publish the container
  const publishUrl = `https://graph.facebook.com/v21.0/${accountId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });

  if (!publishRes.ok) {
    console.error(`❌ [Instagram] Publish failed: ${await publishRes.text()}`);
    return;
  }

  const publishData = await publishRes.json();
  console.log(`✅ [Instagram] Published! Post ID: ${publishData.id}`);
}

/* ═══════════════════════════════════════════════════════════════
 *  STEP 4 — ORCHESTRATOR: Sequential Execution Pipeline
 * ═══════════════════════════════════════════════════════════════ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runHermesPipeline(): Promise<void> {
  const startTime = Date.now();
  const divider = "═".repeat(60);

  console.log(`\n${divider}`);
  console.log(`  🏛️  HERMES AGENT — ${new Date().toISOString()}`);
  console.log(`  🌐  K-Destiny Autonomous Marketing Engine`);
  console.log(`${divider}\n`);

  try {
    // ── Phase 1: Generate Content ──
    console.log("━━━ Phase 1: Content Generation ━━━");
    const content = await generateContent();

    // ── Phase 2: Composite Image ──
    console.log("\n━━━ Phase 2: Image Compositing ━━━");
    const imagePath = await compositeImage(content.instagram.overlay_text);

    // ── Phase 3: Distribute to Channels ──
    console.log("\n━━━ Phase 3: Channel Distribution ━━━");

    // Twitter
    await postToTwitter(content.twitter.text, imagePath);
    await sleep(2000); // Rate-limit courtesy delay

    // Instagram
    await postToInstagram(content.instagram.caption, imagePath);

    // Log content for manual Threads/Reddit posting (until APIs are provisioned)
    console.log("\n━━━ Manual Channel Payloads (Copy & Paste) ━━━");
    console.log("\n📱 [Threads Text]:");
    console.log(content.threads.text);
    console.log("\n🔴 [Reddit Title]:");
    console.log(content.reddit.title);
    console.log("\n🔴 [Reddit Body]:");
    console.log(content.reddit.body);

    // ── Summary ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${divider}`);
    console.log(`  ✅ HERMES PIPELINE COMPLETE — ${elapsed}s`);
    console.log(`  📁 Output Image: ${imagePath}`);
    console.log(`${divider}\n`);
  } catch (error) {
    console.error("\n💥 [Hermes] Pipeline failed:", error);
    process.exit(1);
  }
}

/* ═══════════════════════════════════════════════════════════════
 *  STEP 5 — CRON SCHEDULER (--schedule flag)
 * ═══════════════════════════════════════════════════════════════ */

function scheduleDaily(hour: number, minute: number, fn: () => Promise<void>): void {
  const checkInterval = () => {
    const now = new Date();
    // Target 08:00 KST (UTC+9)
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMinute = now.getUTCMinutes();

    if (kstHour === hour && kstMinute === minute) {
      console.log(`⏰ [Scheduler] Triggering daily run at ${hour}:${String(minute).padStart(2, "0")} KST`);
      fn().catch((err) => console.error("💥 Scheduled run failed:", err));
    }
  };

  // Check every 60 seconds
  setInterval(checkInterval, 60_000);
  console.log(`⏰ [Scheduler] Armed — will fire daily at ${hour}:${String(minute).padStart(2, "0")} KST`);
  console.log(`   Press Ctrl+C to stop.\n`);
}

/* ─── Entry Point ─── */
const args = process.argv.slice(2);

if (args.includes("--schedule")) {
  console.log("🏛️  Hermes Agent starting in SCHEDULER mode...");
  // Run once immediately, then schedule daily at 08:00 KST
  runHermesPipeline().then(() => {
    scheduleDaily(8, 0, runHermesPipeline);
  });
} else {
  // Single execution
  runHermesPipeline();
}
