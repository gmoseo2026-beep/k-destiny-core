import { config } from "dotenv";
import { claimGeneration, completeGeneration } from "../../lib/reports/generationLock";

const read = (path: string) => config({ path, processEnv: {}, quiet: true }).parsed?.DATABASE_URL ?? "";
const ident = (u: string) => {
  try {
    const x = new URL(u);
    return `${x.username}@${x.host}`;
  } catch {
    return "";
  }
};

const prod = read(".env");
const dev = read(".env.development.local");
if (!dev) {
  console.error("✖ .env.development.local 에 DATABASE_URL 이 없습니다. 개발 DB를 먼저 준비하세요.");
  process.exit(1);
}
if (ident(dev) === ident(prod)) {
  console.error("✖ 개발 DB가 운영 DB와 같은 프로젝트입니다. 중단합니다.");
  process.exit(1);
}

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
    if ("reportId" in owned) {
      await completeGeneration(owned.reportId, { msg: "done" }, "test-model");
      console.log(`Completed report ${owned.reportId}`);
    }
  } else {
    console.error(`❌ Lock race test FAILED! owned: ${ownedCount}, busy: ${busyCount}`);
    process.exit(1);
  }
}

runRace().catch(console.error);
