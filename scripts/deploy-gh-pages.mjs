// scripts/deploy-gh-pages.mjs — deploy the static export to a GitHub Pages
// branch SAFELY.
//
// `next build` wipes out/ on every run, so a git repo living inside out/
// gets destroyed. This script copies the current out/ to a temp directory
// and pushes from there, leaving the working tree untouched.
//
// Usage:
//   node scripts/deploy-gh-pages.mjs <owner/repo> [branch]
//   node scripts/deploy-gh-pages.mjs Artem1981777/genlayer-console gh-pages
//
// The out/ directory must already contain the build FOR THAT REPO's basePath
// (set BASEPATH=<repo-name> npm run build when they differ) and .nojekyll
// (the build script writes it automatically).
import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

const [target, branchArg] = process.argv.slice(2);
if (!target || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(target)) {
  console.error("usage: node scripts/deploy-gh-pages.mjs <owner/repo> [branch]");
  process.exit(1);
}
const branch = branchArg || "gh-pages";
const outDir = resolve(process.cwd(), "out");
if (!existsSync(join(outDir, "index.html"))) {
  console.error("out/index.html missing — run `npm run build` first");
  process.exit(1);
}
if (!existsSync(join(outDir, ".nojekyll"))) {
  // The postbuild script should have written it; belt and suspenders.
  writeFileSync(join(outDir, ".nojekyll"), "");
}

const tmp = join(process.env.TEMP || process.cwd(), "kilo-gh-pages-" + target.replace(/\//g, "-"));
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
cpSync(outDir, tmp, { recursive: true });

const run = (cmd, opts = {}) =>
  execSync(cmd, { cwd: tmp, stdio: "inherit", ...opts });

run("git init -q");
run("git config user.name Artem1981777");
run('git config user.email "artemgromov629@gmail.com"');
run("git add -A");
const sha = readFileSync(join(outDir, "index.html"), "utf8").length;
run('git commit -q -m "Deploy static export (' + sha + ' bytes index.html)"');
run("git remote add origin https://github.com/" + target + ".git");
run("git push -q origin HEAD:" + branch + " --force");
console.log("deployed " + target + ":" + branch + " from a temp copy (" + tmp + ")");
