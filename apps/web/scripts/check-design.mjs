// Design rules check: fails the build when UI code bypasses the design tokens in src/theme.css.
// Run: npm run check:design (also part of npm run build).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|css)$/.test(name) && name !== 'theme.css') files.push(p);
  }
})(root);

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const RULES = [
  { re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, why: 'hex colour: add a token to theme.css and use it' },
  { re: new RegExp(`\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret|placeholder)-(?:${PALETTE})(?:-\\d{2,3})?\\b`, 'g'), why: "Tailwind default palette is switched off: use a token (bg-surface, text-muted …)" },
  { re: /\btext-\[\d[^\]]*\]/g, why: 'arbitrary font size: use the type scale (text-xs … text-display)' },
  { re: /\brounded(?:-[a-z]+)?-\[[^\]]*\]/g, why: 'arbitrary radius: use the radius scale (rounded-xs … rounded-pill)' },
  { re: /\b(?:bg|text|border|fill|stroke|outline|ring)-\[(?:#|rgb|hsl)[^\]]*\]/g, why: 'arbitrary colour: add a token' },
  { re: /\bfont-\['/g, why: 'arbitrary font family: use font-sans, font-mono or font-display' },
  { re: /\b(?:inset-|drop-)?shadow-\[[^\]]*\]/g, why: 'arbitrary shadow: add a --shadow-* token to theme.css' },
];

let failures = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (f.endsWith('.tsx') && /^\s*(\/\/|\*)/.test(line)) return;
    for (const { re, why } of RULES) {
      for (const m of line.matchAll(re)) {
        console.error(`${relative(root, f)}:${i + 1}: ${m[0]} — ${why}`);
        failures++;
      }
    }
  });
}
if (failures) {
  console.error(`\n${failures} design rule violation(s). See AGENTS.md "Design tokens and Tailwind".`);
  process.exit(1);
}
console.log(`Design rules: ${files.length} files clean.`);
