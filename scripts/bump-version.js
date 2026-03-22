#!/usr/bin/env node
/**
 * scripts/bump-version.js
 *
 * Usage:
 *   node scripts/bump-version.js 1.0.12      # Set version
 *   node scripts/bump-version.js --check      # Check consistency only
 *
 * Syncs version across:
 *   - packages/app/package.json
 *   - packages/app/src-tauri/tauri.conf.json
 *   - packages/app-expo/package.json
 *   - packages/app-expo/app.json (expo.version)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const VERSION_FILES = [
  {
    path: "packages/app/package.json",
    read: (content) => JSON.parse(content).version,
    write: (content, version) => {
      const json = JSON.parse(content);
      json.version = version;
      return JSON.stringify(json, null, 2) + "\n";
    },
  },
  {
    path: "packages/app/src-tauri/tauri.conf.json",
    read: (content) => JSON.parse(content).version,
    write: (content, version) => {
      const json = JSON.parse(content);
      json.version = version;
      return JSON.stringify(json, null, 2) + "\n";
    },
  },
  {
    path: "packages/app-expo/package.json",
    read: (content) => JSON.parse(content).version,
    write: (content, version) => {
      const json = JSON.parse(content);
      json.version = version;
      return JSON.stringify(json, null, 2) + "\n";
    },
  },
  {
    path: "packages/app-expo/app.json",
    read: (content) => JSON.parse(content).expo.version,
    write: (content, version) => {
      const json = JSON.parse(content);
      json.expo.version = version;
      return JSON.stringify(json, null, 2) + "\n";
    },
  },
];

function readVersions() {
  return VERSION_FILES.map((f) => {
    const fullPath = path.join(ROOT, f.path);
    const content = fs.readFileSync(fullPath, "utf8");
    return { file: f.path, version: f.read(content) };
  });
}

function checkConsistency() {
  const versions = readVersions();
  const unique = [...new Set(versions.map((v) => v.version))];

  console.log("Version check:");
  for (const v of versions) {
    console.log(`  ${v.file}: ${v.version}`);
  }

  if (unique.length !== 1) {
    console.error("\nERROR: Version mismatch detected!");
    process.exit(1);
  }

  console.log(`\nAll versions consistent: ${unique[0]}`);
  return unique[0];
}

function setVersion(newVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error(`Invalid version format: ${newVersion} (expected x.y.z)`);
    process.exit(1);
  }

  for (const f of VERSION_FILES) {
    const fullPath = path.join(ROOT, f.path);
    const content = fs.readFileSync(fullPath, "utf8");
    const updated = f.write(content, newVersion);
    fs.writeFileSync(fullPath, updated, "utf8");
    console.log(`  Updated ${f.path} -> ${newVersion}`);
  }

  console.log(`\nVersion bumped to ${newVersion}`);
}

// Main
const arg = process.argv[2];

if (!arg) {
  console.log("Usage:");
  console.log("  node scripts/bump-version.js <version>   # Set version");
  console.log("  node scripts/bump-version.js --check     # Check consistency");
  process.exit(0);
}

if (arg === "--check") {
  checkConsistency();
} else {
  setVersion(arg);
  checkConsistency();
}
