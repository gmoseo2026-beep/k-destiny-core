export type Gender = "M" | "F";

export interface PersonInput {
  name: string;
  dob: string;
  time: string | null;
  gender: Gender;
}

export const NAMING_TAGS = ["지혜", "밝음", "따뜻함", "강인함", "자연", "귀함"] as const;
export type NamingTag = (typeof NAMING_TAGS)[number];

export interface ChildNamingInput {
  surnameHangul: string;
  surnameHanja: string;
  gender: Gender;
  dob: string;
  time: string | null;
  dollim: { syllable: string; position: 1 | 2; hanja: string | null } | null;
  tags: NamingTag[];
  avoidSyllables: string[];
  /** 만 14세 미만 아동 정보 — 법정대리인(부모 등)의 입력·처리 동의. true 가 아니면 입력 거부 */
  guardianConsent: true;
}

export const PURPOSES = ["WEDDING", "MOVING", "OPENING", "CONTRACT"] as const;
export type SelectablePurpose = (typeof PURPOSES)[number];

export interface DateSelectionInput {
  purpose: SelectablePurpose;
  start: string;
  end: string;
  people: PersonInput[];
  weekdays: number[];
  excludeDates: string[];
}

export function todayKST(now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

export function isValidDateString(v: unknown, now = new Date()): v is string {
  if (typeof v !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  if (v !== d.toISOString().split("T")[0]) return false; // Reject 2023-02-29
  const year = parseInt(v.split("-")[0], 10);
  if (year < 1900) return false;
  const today = todayKST(now);
  if (v > today) return false;
  return true;
}

export function isValidTimeString(v: unknown): v is string | null | undefined {
  if (v === null || v === undefined) return true;
  if (typeof v !== "string") return false;
  if (v === "") return true;
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return false;
  return true;
}

export function parsePersonInput(raw: unknown, now?: Date): PersonInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const dob = r.dob;
  const time = r.time === "" || r.time === undefined ? null : r.time;
  if (!isValidDateString(dob, now) || !isValidTimeString(time)) return null;
  if (r.gender !== "M" && r.gender !== "F") return null;
  const name = typeof r.name === "string" ? r.name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 20) : "";
  return { name: name || "나", dob, time: (time as string | null) ?? null, gender: r.gender };
}

export type SurnameTable = Record<string, string[]>;

export function parseChildNamingInput(raw: unknown, surnames: SurnameTable, now?: Date): ChildNamingInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.guardianConsent !== true) return null; // 법정대리인 동의 필수
  if (typeof r.surnameHangul !== "string" || typeof r.surnameHanja !== "string") return null;
  
  const hTable = surnames[r.surnameHangul];
  if (!hTable || !hTable.includes(r.surnameHanja)) return null;

  if (r.gender !== "M" && r.gender !== "F") return null;
  
  const dob = r.dob;
  const time = r.time === "" || r.time === undefined ? null : r.time;
  if (!isValidDateString(dob, now) || !isValidTimeString(time)) return null;

  let dollim = null;
  if (r.dollim && typeof r.dollim === "object") {
    const d = r.dollim as Record<string, unknown>;
    if (typeof d.syllable === "string" && d.syllable.length === 1 && (d.position === 1 || d.position === 2)) {
      const h = typeof d.hanja === "string" ? d.hanja : null;
      dollim = { syllable: d.syllable, position: d.position as 1 | 2, hanja: h };
    } else {
      return null;
    }
  }

  if (!Array.isArray(r.tags)) return null;
  const tags: NamingTag[] = [];
  for (const t of r.tags) {
    if (typeof t === "string" && (NAMING_TAGS as readonly string[]).includes(t)) tags.push(t as NamingTag);
  }
  if (tags.length > 3) return null;

  if (!Array.isArray(r.avoidSyllables)) return null;
  const avoid = r.avoidSyllables.filter(x => typeof x === "string" && x.length === 1);
  if (avoid.length > 5) return null;

  return {
    surnameHangul: r.surnameHangul,
    surnameHanja: r.surnameHanja,
    gender: r.gender,
    dob,
    time: (time as string | null) ?? null,
    dollim,
    tags,
    avoidSyllables: avoid,
    guardianConsent: true,
  };
}

export function parseDateSelectionInput(raw: unknown, today: string): DateSelectionInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  
  if (typeof r.purpose !== "string" || !(PURPOSES as readonly string[]).includes(r.purpose)) return null;
  const purpose = r.purpose as SelectablePurpose;

  if (typeof r.start !== "string" || typeof r.end !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.start) || !/^\d{4}-\d{2}-\d{2}$/.test(r.end)) return null;

  const startD = new Date(`${r.start}T00:00:00Z`);
  const endD = new Date(`${r.end}T00:00:00Z`);
  if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) return null;
  if (r.start !== startD.toISOString().split("T")[0] || r.end !== endD.toISOString().split("T")[0]) return null;
  if (r.start > r.end) return null;

  // start >= tomorrow (KST)
  const todayD = new Date(`${today}T00:00:00Z`);
  const tomorrowD = new Date(todayD.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = tomorrowD.toISOString().split("T")[0];
  if (r.start < tomorrow) return null;

  // end <= today + 730 days
  const maxEndD = new Date(todayD.getTime() + 730 * 24 * 60 * 60 * 1000);
  const maxEnd = maxEndD.toISOString().split("T")[0];
  if (r.end > maxEnd) return null;

  // duration 7 to 180 days
  const durationDays = Math.round((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (durationDays < 7 || durationDays > 180) return null;

  if (!Array.isArray(r.people)) return null;
  const people: PersonInput[] = [];
  for (const p of r.people) {
    const parsed = parsePersonInput(p);
    if (!parsed) return null;
    people.push(parsed);
  }
  
  if (purpose === "WEDDING") {
    if (people.length !== 2) return null;
  } else {
    if (people.length < 1 || people.length > 2) return null;
  }

  const weekdays: number[] = [];
  if (Array.isArray(r.weekdays)) {
    for (const w of r.weekdays) {
      if (typeof w === "number" && w >= 0 && w <= 6) weekdays.push(w);
    }
  }

  const excludeDates: string[] = [];
  if (Array.isArray(r.excludeDates)) {
    for (const ed of r.excludeDates) {
      if (typeof ed !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ed)) return null;
      if (ed < r.start || ed > r.end) return null;
      excludeDates.push(ed);
    }
    if (excludeDates.length > 20) return null;
  }

  return { purpose, start: r.start, end: r.end, people, weekdays, excludeDates };
}
