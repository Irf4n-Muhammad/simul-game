// ESLint 9 (flat config). Aturan minimum: nama yang tidak ada (no-undef) dan variabel yang tidak dipakai (no-unused-vars).
// Modul game adalah skrip klasik yang saling kenal lewat global (Engine, Status, ...), jadi nama global itu didaftarkan di sini.
// `claude` = runtime Artifact claude.ai (window.claude), dipakai ui.js dengan penjagaan globalThis.claude.
// Skrip UI diperiksa sebagai satu bundel (ui.js hasil tools/build_ui.py), karena fragmen ui/*.js hidup dalam satu lingkup.
const globals = require("globals");
const MODULES = Object.fromEntries(["Engine", "Storylets", "Agenda", "Status", "Tree", "Cosmetics", "Career", "Market", "Venture", "Work", "Pets",
  "Mag", "Wants", "Today", "Soon", "Weather", "Balik", "GameLayer", "Net", "Moments", "Brands", "Tele", "Town", "TOWN_ASSETS", "THREE"].map(k => [k, "readonly"]));
const RULES = { "no-undef": "error", "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] };
module.exports = [
  { ignores: ["node_modules/**", "_site/**", "_release/**", ".tmp/**", "lib/**", "town-assets.js", "ui/**"] },
  { files: ["*.js"], languageOptions: { ecmaVersion: 2024, sourceType: "script", globals: { ...globals.browser, ...globals.node, ...MODULES, claude: "readonly" } }, rules: RULES },
  { files: ["sim/**/*.js", "test/**/*.js"], languageOptions: { ecmaVersion: 2024, sourceType: "commonjs", globals: { ...globals.node, ...MODULES } }, rules: RULES },
];
