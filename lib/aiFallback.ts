/**
 * Backup AI provider = OpenAI (gpt-4o-mini), used ONLY when every Gemini attempt
 * has failed. This turns a single-provider outage (503/429/timeout) into an
 * invisible failover instead of a user-facing failure.
 *
 * SECURITY: the key lives in the OPENAI_API_KEY env var — NEVER hardcode it.
 * If the key is absent, `backupAvailable()` is false and callers simply fall
 * through to their existing mock, so the build/deploy is always safe.
 */
import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const BACKUP_MODEL = process.env.OPENAI_BACKUP_MODEL || "gpt-4o-mini"; // cheap + fast
const BACKUP_TIMEOUT_MS = 30000;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set");
  if (!_client) _client = new OpenAI({ apiKey: OPENAI_KEY });
  return _client;
}

/** True only when a backup key is configured. Callers must guard with this. */
export function backupAvailable(): boolean {
  return !!OPENAI_KEY;
}

/** Plain-text completion via the backup provider. Throws on any failure. */
export async function backupText(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const r = await client().chat.completions.create(
    {
      model: BACKUP_MODEL,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 4096,
    },
    { timeout: BACKUP_TIMEOUT_MS }
  );
  const text = r.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("backup returned empty text");
  return text;
}

/**
 * JSON completion via the backup provider (OpenAI JSON mode). Returns the parsed
 * object. The caller's prompt MUST mention JSON (OpenAI requires it for json mode).
 * Throws on any failure or unparseable output.
 */
export async function backupJSON(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<any> {
  const r = await client().chat.completions.create(
    {
      model: BACKUP_MODEL,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 4096,
      response_format: { type: "json_object" },
    },
    { timeout: BACKUP_TIMEOUT_MS }
  );
  const text = r.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("backup returned empty JSON");
  return JSON.parse(text);
}
