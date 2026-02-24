import { execSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";

async function main() {
  let build;
  try {
    ({ build } = await import("esbuild"));
  } catch {
    throw new Error("esbuild is required for bundling. Run: npm install");
  }

  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  execSync("npx tsc --noEmit", { stdio: "inherit" });

  await build({
    entryPoints: {
      content: "src/content.ts",
      background: "src/background.ts",
      popup: "src/popup.ts",
      "options/index": "src/options/index.ts",
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome109"],
    outdir: "dist",
    logLevel: "info",
  });

  await cp("public", "dist", { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
