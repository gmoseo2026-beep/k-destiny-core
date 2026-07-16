import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/hermes/health — Service health check for Hermes monitoring
 * Protected by HERMES_SECRET header
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-hermes-secret");
  if (secret !== process.env.HERMES_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const checks = {
      api: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
      },
      env: {
        geminiKey: !!process.env.GEMINI_API_KEY,
        database: !!process.env.DATABASE_URL,
        hermesSecret: !!process.env.HERMES_SECRET,
      },
    };

    return NextResponse.json({ status: "healthy", checks });
  } catch (error: any) {
    return NextResponse.json({ status: "unhealthy", error: error.message }, { status: 500 });
  }
}
