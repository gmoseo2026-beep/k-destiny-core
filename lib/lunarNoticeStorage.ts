// lib/lunarNoticeStorage.ts
// 결과 화면의 "음력 ○월 ○일(양력 ○월 ○일)로 봤어요" 안내 문구를 현재 브라우저 탭(sessionStorage)에만 보관한다.
// URL·서버·공유 이미지에는 생일 정보를 절대 실지 않는다(PII 보호).

export interface CompatLunarNotices {
  aNotice?: string | null;
  bNotice?: string | null;
}

const COMPAT_KEY = (key: string) => `kd_lunar_compat_${key}`;
const PERSON_LAST_KEY = "kd_lunar_person_last";
const PRODUCT_KEY = (catalogId: string) => `kd_lunar_product_${catalogId}`;
const REPORT_KEY = (reportId: string) => `kd_lunar_report_${reportId}`;

export function saveCompatLunarNotices(
  keys: Array<string | null | undefined>,
  notices: CompatLunarNotices,
): void {
  if (typeof window === "undefined") return;
  const payload: CompatLunarNotices = {
    aNotice: notices.aNotice || null,
    bNotice: notices.bNotice || null,
  };
  const hasAny = Boolean(payload.aNotice || payload.bNotice);
  try {
    for (const k of keys) {
      if (!k) continue;
      if (hasAny) {
        window.sessionStorage.setItem(COMPAT_KEY(k), JSON.stringify(payload));
      } else {
        window.sessionStorage.removeItem(COMPAT_KEY(k));
      }
    }
  } catch {
    // sessionStorage 차단 환경 무시
  }
}

export function loadCompatLunarNotices(
  ...keys: Array<string | null | undefined>
): CompatLunarNotices | null {
  if (typeof window === "undefined") return null;
  try {
    for (const k of keys) {
      if (!k) continue;
      const raw = window.sessionStorage.getItem(COMPAT_KEY(k));
      if (!raw) continue;
      const parsed = JSON.parse(raw) as CompatLunarNotices;
      if (parsed && (parsed.aNotice || parsed.bNotice)) {
        return {
          aNotice: typeof parsed.aNotice === "string" ? parsed.aNotice : null,
          bNotice: typeof parsed.bNotice === "string" ? parsed.bNotice : null,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function savePersonLunarNotice(
  notice: string | null,
  catalogId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (notice) {
      window.sessionStorage.setItem(PERSON_LAST_KEY, notice);
      if (catalogId) window.sessionStorage.setItem(PRODUCT_KEY(catalogId), notice);
    } else {
      window.sessionStorage.removeItem(PERSON_LAST_KEY);
      if (catalogId) window.sessionStorage.removeItem(PRODUCT_KEY(catalogId));
    }
  } catch {
    // ignore
  }
}

export function loadPersonLunarNotice(catalogId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (catalogId) {
      const byProduct = window.sessionStorage.getItem(PRODUCT_KEY(catalogId));
      if (byProduct) return byProduct;
    }
    return window.sessionStorage.getItem(PERSON_LAST_KEY);
  } catch {
    return null;
  }
}

export function saveReportLunarNotice(reportId: string, notice: string | null): void {
  if (typeof window === "undefined" || !reportId) return;
  try {
    if (notice) {
      window.sessionStorage.setItem(REPORT_KEY(reportId), notice);
    } else {
      window.sessionStorage.removeItem(REPORT_KEY(reportId));
    }
  } catch {
    // ignore
  }
}

export function loadReportLunarNotice(
  reportId?: string | null,
  catalogId?: string | null,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (reportId) {
      const byReport = window.sessionStorage.getItem(REPORT_KEY(reportId));
      if (byReport) return byReport;
    }
  } catch {
    // ignore
  }
  return loadPersonLunarNotice(catalogId);
}

/**
 * 커플 결과 화면에서 한 사람 또는 두 사람의 음력 안내 줄 배열을 만든다.
 * 두 사람 중 음력으로 넣은 사람만 표시하며, 원문 `"음력 ○월 ○일(양력 ○월 ○일)로 봤어요"`를 그대로 포함한다.
 */
export function buildCoupleLunarLines(args: {
  notices: CompatLunarNotices | null | undefined;
  nameA?: string | null;
  nameB?: string | null;
}): string[] {
  const { notices, nameA, nameB } = args;
  if (!notices) return [];
  const lines: string[] = [];
  const bothLunar = Boolean(notices.aNotice && notices.bNotice);
  const labelA = nameA && nameA.trim() && nameA.trim() !== "나" ? `${nameA.trim()}님` : "나";
  const labelB =
    nameB && nameB.trim() && nameB.trim() !== "상대방" ? `${nameB.trim()}님` : "상대방";

  if (notices.aNotice) {
    lines.push(bothLunar || labelA !== "나" ? `${labelA} · ${notices.aNotice}` : notices.aNotice);
  }
  if (notices.bNotice) {
    lines.push(`${labelB} · ${notices.bNotice}`);
  }
  return lines;
}
