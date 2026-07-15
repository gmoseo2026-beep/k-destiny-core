/**
 * True Solar Time (진태양시) Calculator
 * 
 * Traditional Saju (Four Pillars) relies on the position of the sun,
 * not the clock time. This module converts standard clock time to
 * True Solar Time using:
 * 1. Longitude correction (difference from standard meridian)
 * 2. Equation of Time (Earth's orbital eccentricity + axial tilt)
 */

/** Get the day of year (1-366) */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the Equation of Time correction in minutes.
 * This accounts for Earth's elliptical orbit and axial tilt.
 */
function getEquationOfTime(dayOfYear: number): number {
  const B = ((360 / 365) * (dayOfYear - 81)) * (Math.PI / 180);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * Get the standard meridian for a given longitude.
 * Time zones are typically centered on meridians at 15° intervals.
 */
function getStandardMeridian(longitude: number): number {
  return Math.round(longitude / 15) * 15;
}

/**
 * Convert standard clock time to True Solar Time.
 * 
 * @param standardTime - The local clock time as a Date object
 * @param longitude - The longitude of the birth location (e.g., 126.9780 for Seoul)
 * @returns Object with corrected Date and correction details
 */
export function getTrueSolarTime(
  standardTime: Date,
  longitude: number
): {
  trueSolarTime: Date;
  correctionMinutes: number;
  longitudeCorrection: number;
  equationOfTime: number;
} {
  const dayOfYear = getDayOfYear(standardTime);

  // 1. Longitude correction: 4 minutes per degree from standard meridian
  const standardMeridian = getStandardMeridian(longitude);
  const longitudeCorrection = (longitude - standardMeridian) * 4; // minutes

  // 2. Equation of Time correction
  const equationOfTime = getEquationOfTime(dayOfYear);

  // 3. Total correction
  const correctionMinutes = longitudeCorrection + equationOfTime;

  // 4. Apply correction
  const trueSolarTime = new Date(
    standardTime.getTime() + correctionMinutes * 60 * 1000
  );

  return {
    trueSolarTime,
    correctionMinutes: Math.round(correctionMinutes * 10) / 10,
    longitudeCorrection: Math.round(longitudeCorrection * 10) / 10,
    equationOfTime: Math.round(equationOfTime * 10) / 10,
  };
}

/**
 * Well-known city coordinates for auto-lookup when precise coords unavailable.
 * Key = "COUNTRY_CODE:CITY_NAME" (uppercase)
 */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "KR:SEOUL": { lat: 37.5665, lng: 126.978 },
  "KR:BUSAN": { lat: 35.1796, lng: 129.0756 },
  "KR:DAEGU": { lat: 35.8714, lng: 128.6014 },
  "KR:INCHEON": { lat: 37.4563, lng: 126.7052 },
  "KR:GWANGJU": { lat: 35.1595, lng: 126.8526 },
  "KR:DAEJEON": { lat: 36.3504, lng: 127.3845 },
  "US:NEW YORK": { lat: 40.7128, lng: -74.006 },
  "US:LOS ANGELES": { lat: 34.0522, lng: -118.2437 },
  "US:CHICAGO": { lat: 41.8781, lng: -87.6298 },
  "JP:TOKYO": { lat: 35.6762, lng: 139.6503 },
  "JP:OSAKA": { lat: 34.6937, lng: 135.5023 },
  "CN:BEIJING": { lat: 39.9042, lng: 116.4074 },
  "CN:SHANGHAI": { lat: 31.2304, lng: 121.4737 },
  "GB:LONDON": { lat: 51.5074, lng: -0.1278 },
  "FR:PARIS": { lat: 48.8566, lng: 2.3522 },
  "DE:BERLIN": { lat: 52.52, lng: 13.405 },
  "AU:SYDNEY": { lat: -33.8688, lng: 151.2093 },
  "IN:MUMBAI": { lat: 19.076, lng: 72.8777 },
  "BR:SAO PAULO": { lat: -23.5505, lng: -46.6333 },
  "TH:BANGKOK": { lat: 13.7563, lng: 100.5018 },
  "VN:HANOI": { lat: 21.0278, lng: 105.8342 },
  "SG:SINGAPORE": { lat: 1.3521, lng: 103.8198 },
};

/**
 * Look up coordinates for a country+city pair.
 * Returns null if not found (caller should use IP-based fallback).
 */
export function getCityCoordinates(
  country: string,
  city: string
): { lat: number; lng: number } | null {
  if (!country || !city) return null;
  const key = `${country.toUpperCase()}:${city.toUpperCase()}`;
  return CITY_COORDS[key] || null;
}

/**
 * Determine if the True Solar Time correction changes the Saju hour pillar.
 * Traditional Saju divides the day into 12 two-hour segments (시진/時辰).
 * If the correction pushes the time across a boundary, the hour pillar changes.
 */
export function wouldChangeSajuHour(
  standardHour: number,
  correctionMinutes: number
): boolean {
  const standardMinutes = standardHour * 60;
  const correctedMinutes = standardMinutes + correctionMinutes;
  const correctedHour = Math.floor(correctedMinutes / 60) % 24;

  // Saju hour boundaries (each 시진 = 2 hours, starting from 子時 23:00)
  const getSajuPeriod = (h: number): number => {
    if (h >= 23 || h < 1) return 0;  // 子
    if (h < 3) return 1;              // 丑
    if (h < 5) return 2;              // 寅
    if (h < 7) return 3;              // 卯
    if (h < 9) return 4;              // 辰
    if (h < 11) return 5;             // 巳
    if (h < 13) return 6;             // 午
    if (h < 15) return 7;             // 未
    if (h < 17) return 8;             // 申
    if (h < 19) return 9;             // 酉
    if (h < 21) return 10;            // 戌
    return 11;                         // 亥
  };

  return getSajuPeriod(standardHour) !== getSajuPeriod(correctedHour);
}
