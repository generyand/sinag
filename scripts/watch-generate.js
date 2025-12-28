#!/usr/bin/env node

import { watch } from "fs";
import { spawn } from "child_process";
import { debounce } from "lodash-es";

const API_DIR = "apps/api/app";
const OPENAPI_URL = "http://localhost:8000/openapi.json";

console.log("🔍 Watching for API changes...");

// Debounced regeneration function
const regenerateTypes = debounce(async () => {
  console.log("🔄 API changes detected, regenerating types...");

  try {
    // Check if API is running
    const response = await fetch(OPENAPI_URL);
    if (!response.ok) {
      console.log("⚠️  API server not running, skipping regeneration");
      return;
    }

    // Run type generation
    const child = spawn("pnpm", ["generate-types"], {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Types regenerated successfully!");
      } else {
        console.log("❌ Type regeneration failed");
      }
    });
  } catch (error) {
    console.log("⚠️  Could not reach API server, skipping regeneration");
  }
}, 1000); // Wait 1 second after changes stop

// Watch for changes in API directory
watch(API_DIR, { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith(".py") || filename.endsWith(".yaml"))) {
    console.log(`📝 ${eventType}: ${filename}`);
    regenerateTypes();
  }
});

console.log(`👀 Watching ${API_DIR} for changes...`);
console.log("💡 Make changes to your API and types will auto-regenerate!");
