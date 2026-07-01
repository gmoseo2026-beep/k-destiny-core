/**
 * Shared Master data used across select-master and chat pages.
 * Single source of truth to avoid duplication and ensure consistency.
 */
export interface Master {
  id: number;
  name: string;
  specialty: string;
  image: string;
  imageChecked: string;
}

export const MASTERS: readonly Master[] = [
  { id: 5, name: "Master Karma", specialty: "Wealth Energy", image: "/images/master_karma_calm.webp.jpg", imageChecked: "/images/master_karma_joy.webp.jpg" },
  { id: 1, name: "Master Hana", specialty: "Calm Water", image: "/images/master_hana_calm.webp.jpg", imageChecked: "/images/master_hana_joy.webp.jpg" },
  { id: 2, name: "Master Ian", specialty: "Iron Will", image: "/images/master_ian_calm.webp.jpg", imageChecked: "/images/master_ian_joy.webp.jpg" },
  { id: 3, name: "Master Jay", specialty: "Wind Chaser", image: "/images/master_jay_calm.webp.jpg", imageChecked: "/images/master_jay_joy.webp.jpg" },
  { id: 4, name: "Master Jin", specialty: "Golden Flame", image: "/images/master_jin_calm.webp.jpg", imageChecked: "/images/master_jin_joy.webp.jpg" },
  { id: 6, name: "Master Muwi", specialty: "Void Flow", image: "/images/master_muwi_calm.webp.jpg", imageChecked: "/images/master_muwi_joy.webp.jpg" },
  { id: 7, name: "Master Rin", specialty: "Lunar Echo", image: "/images/master_rin_calm.webp.jpg", imageChecked: "/images/master_rin_joy.webp.jpg" },
  { id: 8, name: "Master Ryu", specialty: "Dragon Path", image: "/images/master_ryu_calm.webp.jpg", imageChecked: "/images/master_ryu_joy.webp.jpg" },
  { id: 9, name: "Master Seoa", specialty: "Star Whisper", image: "/images/master_seoa_calm.webp.jpg", imageChecked: "/images/master_seoa_joy.webp.jpg" },
  { id: 10, name: "Master Yura", specialty: "Earth Soul", image: "/images/master_yura_calm.webp.jpg", imageChecked: "/images/master_yura_joy.webp.jpg" },
] as const;
