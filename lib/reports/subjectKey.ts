import { subjectHash } from "@/lib/subject";
import type { PersonInput } from "@/lib/validation/inputs";

export function personSubject(p: PersonInput): string {
  return subjectHash(["person", p.name, p.dob, p.time ?? "-", p.gender]);
}
export function coupleSubject(compatId: string): string {
  return subjectHash(["couple", compatId]);
}
