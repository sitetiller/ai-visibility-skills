// Validate every skills/<name>/SKILL.md: frontmatter (name matches folder, 1-64 lowercase/digits/hyphens,
// description 1-1024 chars), under 500 lines, has a references/ folder with at least one file,
// and every `npx sitetiller <cmd>` it mentions is a real CLI command.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const cli = await readFile(join(root, "cli/bin/sitetiller.mjs"), "utf8");
const commands = new Set([...cli.matchAll(/case "([a-z0-9-]+)":/g)].map((m) => m[1]));
let errors = 0;
const fail = (s, m) => { errors++; console.log(`✗ ${s}: ${m}`); };
const dirs = (await readdir(join(root, "skills"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const d of dirs) {
  const file = join(root, "skills", d, "SKILL.md");
  let t;
  try { t = await readFile(file, "utf8"); } catch { fail(d, "missing SKILL.md"); continue; }
  const fm = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { fail(d, "missing frontmatter"); continue; }
  const name = (fm[1].match(/^name:\s*(.+)$/m) || [])[1]?.trim();
  const desc = (fm[1].match(/^description:\s*"?([\s\S]*?)"?\s*$/m) || [])[1]?.trim();
  if (name !== d) fail(d, `name "${name}" must equal folder name`);
  if (!/^[a-z0-9-]{1,64}$/.test(name || "")) fail(d, "name must be 1-64 chars: a-z, 0-9, hyphen");
  if (!desc || desc.length > 1024) fail(d, `description length ${desc?.length ?? 0} (1-1024)`);
  if (t.split("\n").length > 500) fail(d, "SKILL.md over 500 lines; move detail to references/");
  for (const m of t.matchAll(/npx sitetiller ([a-z0-9-]+)/g)) if (!commands.has(m[1])) fail(d, `unknown CLI command "${m[1]}"`);
  try { const r = await readdir(join(root, "skills", d, "references")); if (!r.length) fail(d, "references/ is empty"); } catch { fail(d, "missing references/ with sources"); }
  if (!/## Guardrails/.test(t)) fail(d, "missing ## Guardrails section");
}
console.log(errors ? `\n${errors} problem(s) in ${dirs.length} skills` : `All ${dirs.length} skills valid.`);
process.exitCode = errors ? 1 : 0;
