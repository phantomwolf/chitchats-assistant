import { execSync } from "node:child_process";
import { cp, mkdir, rename, rm } from "node:fs/promises";
import * as fs from "node:fs";
import archiver from "archiver";

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
      options: "src/options.ts",
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome109"],
    outdir: "dist",
    logLevel: "info",
  });

  await cp("public", "dist", { recursive: true });

  // Generate zip file.
  const zipFileName = "chitchats-assistant.zip";
  const zipFile = fs.createWriteStream(zipFileName);
  const archive = archiver("zip", { zlib: { level: 9 } });
  zipFile.on("close", () => {
    console.log(`ZIP created: ${archive.pointer()} bytes`);
  });
  archive.on("error", (err) => {
    throw err;
  });
  archive.pipe(zipFile);
  archive.directory("dist/", false);
  await archive.finalize();

  // Move zip file to dist/ folder.
  await rename(zipFileName, `dist/${zipFileName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
