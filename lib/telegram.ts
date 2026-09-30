/**
 * lib/telegram.ts
 * Minimal Telegram Bot API Utility for SaaS Monitoring
 */

export async function sendTelegramMessage(text: string, parseMode: 'HTML' | 'MarkdownV2' = 'HTML') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.CEO_TELEGRAM_ID;

  if (!token || !chatId) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN or CEO_TELEGRAM_ID not set");
    return { ok: false, error: 'missing_config' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("[telegram] API error:", data);
      return { ok: false, error: data.description };
    }

    return { ok: true };
  } catch (e) {
    console.error("[telegram] Network error:", e);
    return { ok: false, error: 'network_error' };
  }
}
