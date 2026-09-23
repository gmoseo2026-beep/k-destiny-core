import { execSync } from "child_process";
import fs from "fs";

if (!fs.existsSync(".env.development.local")) {
  console.error("❌ .env.development.local file not found.");
  process.exit(1);
}

const args = process.argv.slice(2).join(" ");
const command = `npx dotenv -e .env.development.local -- npx prisma ${args}`;

try {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: "inherit" });
} catch (error) {
  process.exit(1);
}
