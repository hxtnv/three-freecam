// Reports what three-freecam adds to an application bundle: the entry point bundled,
// minified and gzipped, with `three` left external the way a real app has it.
// The README quotes this number and CI fails the build if it grows past the budget.
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const BUDGET_BYTES = 2048;

const result = await build({
  entryPoints: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  external: ["three"],
  write: false,
  legalComments: "none",
});

const output = result.outputFiles[0];
if (!output) {
  console.error("esbuild produced no output. Run `npm run build` first.");
  process.exit(1);
}

const minified = output.contents.byteLength;
const gzipped = gzipSync(output.contents, { level: 9 }).length;

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
console.log(`minified          ${kb(minified)}`);
console.log(`minified + gzip   ${kb(gzipped)}  (budget ${kb(BUDGET_BYTES)})`);

if (gzipped > BUDGET_BYTES) {
  console.error(
    `Over budget by ${gzipped - BUDGET_BYTES} bytes. ` +
      "Trim the code, or raise BUDGET_BYTES and record the new size in CHANGELOG.md.",
  );
  process.exit(1);
}
