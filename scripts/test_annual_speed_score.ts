import { calculateAnnualYearScore, buildAnnualTeaserPrompt } from '../lib/destinyGen';
import { calculateFourPillars } from '../lib/saju';

async function runTests() {
  console.log("=== 1. Testing calculateAnnualYearScore Determinism ===");

  const testCases = [
    { dob: "1990-05-15", time: "14:30", gender: "F" as const },
    { dob: "1985-11-20", time: "09:15", gender: "M" as const },
    { dob: "2000-01-01", time: null, gender: "F" as const },
    { dob: "1975-07-07", time: "22:45", gender: "M" as const },
  ];

  for (const tc of testCases) {
    const saju = calculateFourPillars(tc.dob, tc.time, tc.gender, "Seoul, KR");
    
    // Call 5 times to verify 100% determinism
    const scores = Array.from({ length: 5 }, () =>
      calculateAnnualYearScore({
        dayMaster: saju.dayMasterSignKey,
        fourPillars: saju.fourPillars as any,
        elementsScore: saju.elementsScore as any,
        year: 2026,
      })
    );

    const isConsistent = scores.every((s) => s === scores[0]);
    console.log(
      `DOB: ${tc.dob} | Gender: ${tc.gender} | Score: ${scores[0]} | Consistent (5 runs): ${isConsistent} (scores: [${scores.join(", ")}])`
    );

    if (!isConsistent) {
      throw new Error(`Inconsistent score detected for ${tc.dob}`);
    }
    if (scores[0] < 60 || scores[0] > 100) {
      throw new Error(`Score out of range: ${scores[0]}`);
    }
  }

  console.log("\n=== 2. Testing buildAnnualTeaserPrompt Requirements ===");
  const samplePrompt = buildAnnualTeaserPrompt("SAMPLE_CONTEXT", 2026, "두근이");
  const hasLoveOnlyRequirement = samplePrompt.includes("Generate ONLY the 'love' section");
  const forbidsOtherSections = samplePrompt.includes("Do NOT generate money, career, health, or relationship");
  const forbidsTimeline = samplePrompt.includes("Do NOT generate monthlyHighlights or luckyPoints");

  console.log(`Prompt specifies love only: ${hasLoveOnlyRequirement}`);
  console.log(`Prompt forbids other sections: ${forbidsOtherSections}`);
  console.log(`Prompt forbids timeline/points: ${forbidsTimeline}`);

  if (!hasLoveOnlyRequirement || !forbidsOtherSections || !forbidsTimeline) {
    throw new Error("Teaser prompt missing critical size-reduction instructions");
  }

  console.log("\n✅ ALL TESTS PASSED! Determinism and teaser specs are verified.");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
