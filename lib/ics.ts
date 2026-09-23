// lib/ics.ts
// 클라이언트에서 VCALENDAR/VEVENT .ics 파일을 만들어 Blob 다운로드한다.
// 서버 호출 없이 브라우저 내에서만 동작한다.

export interface IcsEventItem {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
}

function formatDateToIcs(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function getNextDayIcs(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

export function generateIcsContent(events: IcsEventItem[]): string {
  const nowIcs = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const eventBlocks = events.map((ev, idx) => {
    const dtstart = formatDateToIcs(ev.date);
    const dtend = getNextDayIcs(ev.date);
    const desc = (ev.description || "").replace(/\n/g, "\\n");

    return [
      "BEGIN:VEVENT",
      `UID:kongdak-${dtstart}-${idx}-${Date.now()}@kongdak.kr`,
      `DTSTAMP:${nowIcs}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${ev.title}`,
      desc ? `DESCRIPTION:${desc}` : "",
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kongdak//Premium Date Selection//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventBlocks,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile(event: IcsEventItem, customFilename?: string): void {
  if (typeof window === "undefined") return;
  const content = generateIcsContent([event]);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = customFilename || `kongdak_${event.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMultipleIcsFile(events: IcsEventItem[], filename = "kongdak_dates.ics"): void {
  if (typeof window === "undefined" || events.length === 0) return;
  const content = generateIcsContent(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
