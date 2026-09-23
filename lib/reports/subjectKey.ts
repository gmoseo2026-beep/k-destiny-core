import { subjectHash } from "@/lib/subject";
import type { PersonInput, ChildNamingInput, DateSelectionInput } from "@/lib/validation/inputs";

export function personSubject(p: PersonInput): string {
  return subjectHash(["person", p.name, p.dob, p.time ?? "-", p.gender]);
}
export function coupleSubject(compatId: string): string {
  return subjectHash(["couple", compatId]);
}

export function premium2027Subject(p: PersonInput): string {
  return subjectHash(["premium_2027", p.name, p.dob, p.time ?? "-", p.gender]);
}

export function namingSubject(input: ChildNamingInput): string {
  return subjectHash([
    "naming",
    input.surnameHangul,
    input.surnameHanja,
    input.gender,
    input.dob,
    input.time ?? "-",
    input.dollim?.syllable ?? "-",
    String(input.dollim?.position ?? "-"),
    input.dollim?.hanja ?? "-",
  ]);
}

export function datesSubject(input: DateSelectionInput, people: PersonInput[]): string {
  return subjectHash([
    "dates",
    input.purpose,
    input.start,
    input.end,
    ...people.flatMap((p) => [p.dob, p.time ?? "-", p.gender]),
    input.weekdays.join(","),
    input.excludeDates.join(","),
  ]);
}
