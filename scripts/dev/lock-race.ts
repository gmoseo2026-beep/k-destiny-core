import { claimGeneration, failGeneration, completeGeneration } from "../../lib/reports/generationLock";

async function runRace() {
  const cacheKey = `test_lock_${Date.now()}`;
  const key = {
    cacheKey,
    kind: "TEASER" as const,
    catalogId: "test",
    orderId: null,
    userId: null,
    compatId: null,
    subjectHash: "testhash",
  };

  console.log(`Starting lock race test with key: ${cacheKey}`);

  // Send two requests concurrently
  const [res1, res2] = await Promise.all([
    claimGeneration(key),
    claimGeneration(key),
  ]);

  console.log("Result 1:", res1);
  console.log("Result 2:", res2);

  const ownedCount = [res1, res2].filter(r => r.state === "OWNED").length;
  const busyCount = [res1, res2].filter(r => r.state === "BUSY").length;

  if (ownedCount === 1 && busyCount === 1) {
    console.log("✅ Lock race test PASSED! Only one request got OWNED.");
    
    // Cleanup/Complete the owned one
    const owned = res1.state === "OWNED" ? res1 : res2;
    await completeGeneration((owned as any).reportId, { msg: "done" }, "test-model");
    console.log(`Completed report ${(owned as any).reportId}`);
  } else {
    console.error(`❌ Lock race test FAILED! owned: ${ownedCount}, busy: ${busyCount}`);
    process.exit(1);
  }
}

runRace().catch(console.error);
