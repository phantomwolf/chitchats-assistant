import { execSync } from "node:child_process";
import { cp, rm, mkdir } from "node:fs/promises";

async function main() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  execSync("npx tsc", { stdio: "inherit" });

  await cp("public", "dist", { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
