/**
 * Load .envrc or .env into process.env without logging secrets.
 * Usage: node -r ./scripts/loadEnv.js scripts/run-pipeline.js
 * Or: require('./scripts/loadEnv') at top of script (after setting __dirname).
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const envrc = path.join(projectRoot, ".envrc");
const env = path.join(projectRoot, ".env");

function setEnv(key, val) {
  process.env[key] = val;
}

function parseLine(line) {
  const m = line.match(/^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:'([^']*)'|"([^"]*)")\s*$/);
  if (m) {
    setEnv(m[1], m[2] !== undefined ? m[2] : m[3]);
    return true;
  }
  const m2 = line.match(/^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
  if (m2) {
    setEnv(m2[1], m2[2].trim());
    return true;
  }
  return false;
}

function loadFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split("\n").forEach((line) => parseLine(line));
}

loadFile(envrc);
loadFile(env);
