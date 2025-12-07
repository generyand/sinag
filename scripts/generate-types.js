#!/usr/bin/env node

import fs from "fs";
import { generate } from "orval";
import path from "path";

/**
 * Reads a simple key=value .env file and returns an object
 */
function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    content.split("\n").forEach((line) => {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join("=").trim();
      }
    });
  }
  return env;
}

/**
 * Gets the API port from various sources in priority order:
 * 1. API_PORT environment variable
 * 2. Root .env file (API_PORT)
 * 3. .worktree-info file (API_PORT)
 * 4. Default: 8000
 */
function getApiPort() {
  // 1. Check environment variable first
  if (process.env.API_PORT) {
    console.log(`📍 Using API_PORT from environment: ${process.env.API_PORT}`);
    return process.env.API_PORT;
  }

  // 2. Check root .env file
  const rootEnv = loadEnvFile(".env");
  if (rootEnv.API_PORT) {
    console.log(`📍 Using API_PORT from .env: ${rootEnv.API_PORT}`);
    return rootEnv.API_PORT;
  }

  // 3. Check .worktree-info file (for worktree setups)
  const worktreeInfo = loadEnvFile(".worktree-info");
  if (worktreeInfo.API_PORT) {
    console.log(`📍 Using API_PORT from .worktree-info: ${worktreeInfo.API_PORT}`);
    return worktreeInfo.API_PORT;
  }

  // 4. Default fallback
  console.log(`📍 Using default API_PORT: 8000`);
  return "8000";
}

// Support worktree development - check multiple sources for port config
const API_PORT = getApiPort();
const API_URL = process.env.API_URL || `http://localhost:${API_PORT}/openapi.json`;
const OUTPUT_DIR = "packages/shared/src/generated";
const SCHEMAS_DIR = path.join(OUTPUT_DIR, "schemas");

console.log("🚀 Generating TypeScript types with Orval + React Query...");

async function fetchOpenAPISpec() {
  console.log("📡 Fetching OpenAPI spec to extract tags...");

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const spec = await response.json();
    return spec;
  } catch (error) {
    console.warn(
      "⚠️  Could not fetch OpenAPI spec for tag extraction:",
      error.message
    );
    console.log("🔄 Falling back to auto-detection...");
    return null;
  }
}

function extractTagsFromOpenAPI(openAPISpec) {
  if (!openAPISpec) return null;

  console.log("🏷️  Extracting FastAPI tags from OpenAPI spec...");

  // Get tags defined in the spec
  const definedTags =
    openAPISpec.tags?.map((tag) => ({
      name: tag.name.toLowerCase(),
      description: tag.description,
      originalName: tag.name,
    })) || [];

  // Also scan paths to find any tags used in operations
  const usedTags = new Set();
  Object.values(openAPISpec.paths || {}).forEach((pathItem) => {
    Object.values(pathItem).forEach((operation) => {
      if (operation.tags) {
        operation.tags.forEach((tag) => usedTags.add(tag.toLowerCase()));
      }
    });
  });

  // Combine defined and used tags
  const allTags = [
    ...new Set([...definedTags.map((t) => t.name), ...Array.from(usedTags)]),
  ];

  console.log(`📊 Found FastAPI tags: ${allTags.join(", ")}`);

  return {
    tags: allTags,
    tagDetails: definedTags,
  };
}

function mapSchemasToTags(schemaNames, tagInfo) {
  if (!tagInfo) {
    console.log("🔄 No tag info available, using smart auto-detection...");
    return autoDetectGroups(schemaNames);
  }

  const { tags } = tagInfo;
  const groups = {};
  const processed = new Set();

  console.log("🎯 Mapping schemas to FastAPI tags...");

  // Map schemas to tags based on naming patterns
  tags.forEach((tag) => {
    const tagSchemas = schemaNames.filter((schemaName) => {
      // Skip if already processed (only add to first matching group)
      if (processed.has(schemaName)) {
        return false;
      }

      // Check if schema name contains the tag name
      const schemaLower = schemaName.toLowerCase();
      const tagLower = tag.toLowerCase();

      // Handle plural/singular variations (projects <-> project)
      const tagSingular = tagLower.endsWith("s")
        ? tagLower.slice(0, -1)
        : tagLower;
      const tagPlural = tagLower.endsWith("s") ? tagLower : tagLower + "s";

      // Direct match, contains, starts with, or base name match (with plural/singular)
      return (
        schemaLower.includes(tagLower) ||
        schemaLower.includes(tagSingular) ||
        schemaLower.includes(tagPlural) ||
        extractBaseName(schemaName).toLowerCase() === tagLower ||
        extractBaseName(schemaName).toLowerCase() === tagSingular ||
        schemaLower.startsWith(tagLower) ||
        schemaLower.startsWith(tagSingular)
      );
    });

    if (tagSchemas.length > 0) {
      groups[tag] = tagSchemas;
      tagSchemas.forEach((schema) => processed.add(schema));
      console.log(`  📁 ${tag}: ${tagSchemas.join(", ")}`);
    }
  });

  // Handle unmatched schemas
  const unmatched = schemaNames.filter((name) => !processed.has(name));
  if (unmatched.length > 0) {
    // Try to group unmatched schemas by base name
    const unmatchedGroups = autoDetectGroups(unmatched);

    // Merge groups with the same name instead of overwriting
    Object.entries(unmatchedGroups).forEach(([groupName, schemas]) => {
      if (groups[groupName]) {
        // Merge with existing group
        groups[groupName] = [...groups[groupName], ...schemas];
      } else {
        // Create new group
        groups[groupName] = schemas;
      }
    });

    console.log("📦 Auto-grouped unmatched schemas:");
    Object.entries(unmatchedGroups).forEach(([group, schemas]) => {
      console.log(`  📁 ${group}: ${schemas.join(", ")}`);
    });
  }

  return groups;
}

function autoDetectGroups(schemaNames) {
  const groups = {};
  const processed = new Set();

  // Step 1: Group by exact base name matches
  schemaNames.forEach((schemaName) => {
    if (processed.has(schemaName)) return;

    // Extract the base name (remove common suffixes)
    const baseName = extractBaseName(schemaName);

    // Find all schemas that share this base name
    const relatedSchemas = schemaNames.filter((name) => {
      const nameBase = extractBaseName(name);
      return (
        nameBase.toLowerCase() === baseName.toLowerCase() &&
        !processed.has(name)
      );
    });

    if (relatedSchemas.length > 1) {
      // Use the base name as group key (lowercase)
      const groupKey = baseName.toLowerCase();
      groups[groupKey] = relatedSchemas;
      relatedSchemas.forEach((name) => processed.add(name));
    }
  });

  // Step 2: Group remaining schemas by common patterns
  const commonPatterns = {
    auth: ["Auth", "Token", "Login", "Logout", "Credential"],
    system: ["Health", "Api", "Response", "Meta", "Config"],
    error: ["Error", "Validation", "Exception", "HTTP"],
  };

  schemaNames.forEach((schemaName) => {
    if (processed.has(schemaName)) return;

    for (const [domain, patterns] of Object.entries(commonPatterns)) {
      const matches = patterns.some((pattern) =>
        schemaName.toLowerCase().includes(pattern.toLowerCase())
      );

      if (matches) {
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(schemaName);
        processed.add(schemaName);
        break;
      }
    }
  });

  // Step 3: Put remaining schemas in a 'common' group
  const remaining = schemaNames.filter((name) => !processed.has(name));
  if (remaining.length > 0) {
    groups.common = remaining;
  }

  return groups;
}

function extractBaseName(schemaName) {
  // Remove common suffixes to find the base entity name
  const suffixes = [
    "Create",
    "Update",
    "Delete",
    "List",
    "Response",
    "Request",
    "Input",
    "Output",
    "Data",
    "Info",
    "Details",
    "Summary",
    "Description",
    "Meta",
    "Params",
    "Query",
    "Body",
  ];

  let baseName = schemaName;

  // Try to remove suffixes to find the core entity name
  for (const suffix of suffixes) {
    if (baseName.endsWith(suffix) && baseName !== suffix) {
      const withoutSuffix = baseName.slice(0, -suffix.length);
      // Only use it if we still have a meaningful name
      if (withoutSuffix.length > 0) {
        baseName = withoutSuffix;
        break;
      }
    }
  }

  return baseName;
}

async function analyzeSchemaRelationships() {
  console.log("🔍 Analyzing schemas with FastAPI tag information...");

  // Fetch OpenAPI spec to get tag information
  const openAPISpec = await fetchOpenAPISpec();
  const tagInfo = extractTagsFromOpenAPI(openAPISpec);

  // Read all generated schema files
  const schemaFiles = fs
    .readdirSync(SCHEMAS_DIR)
    .filter((file) => file.endsWith(".ts") && file !== "index.ts");

  const allSchemas = {};

  // Read content of each schema file and extract info
  schemaFiles.forEach((file) => {
    const filePath = path.join(SCHEMAS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const schemaName = path.basename(file, ".ts");

    // Convert filename back to PascalCase for matching
    const pascalCaseName =
      schemaName.charAt(0).toUpperCase() + schemaName.slice(1);

    // Extract imports to understand relationships
    const imports = [];
    const lines = content.split("\n");
    lines.forEach((line) => {
      if (line.startsWith("import type {") && line.includes("./")) {
        const importMatch = line.match(/import type { (.+) } from '\.\/(.+)'/);
        if (importMatch) {
          imports.push(importMatch[1]);
        }
      }
    });

    allSchemas[pascalCaseName] = {
      content,
      fileName: file,
      filePath,
      imports,
      originalName: schemaName,
    };
  });

  // Map schemas to FastAPI tags or auto-detect groups
  const detectedGroups = mapSchemasToTags(Object.keys(allSchemas), tagInfo);

  return { allSchemas, groups: detectedGroups, tagInfo };
}

async function main() {
  try {
    // Clean output directory
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }

    console.log("📡 Fetching OpenAPI schema from:", API_URL);

    // Generate types with Orval
    await generate("orval.config.ts");

    // Restructure endpoints to use index.ts
    await restructureEndpoints();

    // Group related schemas by FastAPI tags
    await groupSchemas();

    // NEW: Create a barrel file for the endpoints directory
    await generateEndpointsIndex();

    // Generate the main barrel file with updated paths
    await generateDynamicIndex();

    console.log("✅ Types and React Query hooks generated successfully!");
    console.log(`📁 Generated files saved to: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("❌ Error generating types:");
    console.error(error.message);
    console.error("\nFalling back to using cached OpenAPI schema...");

    // Create empty directories to prevent build failures
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(SCHEMAS_DIR)) {
      fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
    }

    // Create minimal index files
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "index.ts"),
      "// Placeholder - regenerate with API running\n"
    );
    fs.writeFileSync(
      path.join(SCHEMAS_DIR, "index.ts"),
      "// Placeholder - regenerate with API running\n"
    );

    console.log(
      "✅ Created placeholder type files. Run API and rebuild to generate actual types."
    );
  }
}

main(); // Execute the main function

// --- HELPER FUNCTIONS ---

// NEW: Renames endpoint files to index.ts
async function restructureEndpoints() {
  console.log("🔄 Restructuring endpoint files to use index.ts...");
  const endpointsDir = path.join(OUTPUT_DIR, "endpoints");
  const endpointTags = fs
    .readdirSync(endpointsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  endpointTags.forEach((tag) => {
    const oldPath = path.join(endpointsDir, tag, `${tag}.ts`);
    const newPath = path.join(endpointsDir, tag, "index.ts");
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  });
}

// MODIFIED: Groups schemas into subdirectories with index.ts
function groupSchemas() {
  console.log("📦 Grouping schemas by FastAPI tags into subdirectories...");

  return analyzeSchemaRelationships().then(
    ({ allSchemas, groups, tagInfo }) => {
      Object.entries(groups).forEach(([groupName, schemaNames]) => {
        const groupSchemas = schemaNames.filter((name) => allSchemas[name]);
        if (groupSchemas.length === 0) return;

        const groupDir = path.join(SCHEMAS_DIR, groupName);
        fs.mkdirSync(groupDir, { recursive: true });

        console.log(
          `  📄 Creating ${groupName}.ts with ${groupSchemas.length} types`
        );

        // Build grouped file content
        let groupedContent = `// 🚀 Auto-generated by Orval (Grouped by FastAPI Tags)
// 🔄 Do not edit manually - regenerate with: pnpm generate-types
// 📁 ${groupName.charAt(0).toUpperCase() + groupName.slice(1)}-related types
// 🏷️  Based on FastAPI tag: "${groupName}"

`;

        // Collect all imports needed
        const imports = new Set();
        const typeDefinitions = [];

        groupSchemas.forEach((schemaName) => {
          const schema = allSchemas[schemaName];
          const lines = schema.content.split("\n");

          // Extract imports
          lines.forEach((line) => {
            if (line.startsWith("import type {") && line.includes("./")) {
              const importMatch = line.match(
                /import type { (.+) } from '\.\/(.+)'/
              );
              if (importMatch) {
                const [, importedType, importFile] = importMatch;
                // Only add imports for types not in current group
                if (!groupSchemas.includes(importedType)) {
                  // Check if the imported type is in another group
                  const targetGroup = Object.keys(groups).find((group) =>
                    groups[group].includes(importedType)
                  );

                  if (targetGroup) {
                    imports.add(
                      `import type { ${importedType} } from '../${targetGroup}';`
                    );
                  } else {
                    imports.add(
                      `import type { ${importedType} } from './${importFile}';`
                    );
                  }
                }
              }
            }
          });

          // Extract type definition (skip header comments and imports)
          const definitionStart = lines.findIndex(
            (line) =>
              line.includes("export interface") || line.includes("export type")
          );

          if (definitionStart !== -1) {
            const definition = lines.slice(definitionStart).join("\n");
            typeDefinitions.push(`/**
 * ${schemaName}
 */
${definition}`);
          }
        });

        // Add imports if any
        if (imports.size > 0) {
          groupedContent += Array.from(imports).join("\n") + "\n\n";
        }

        // Add all type definitions
        groupedContent += typeDefinitions.join("\n\n");

        const groupedFilePath = path.join(groupDir, "index.ts"); // Use index.ts
        fs.writeFileSync(groupedFilePath, groupedContent);

        // Remove individual files that were grouped
        groupSchemas.forEach((schemaName) => {
          const schema = allSchemas[schemaName];
          if (fs.existsSync(schema.filePath)) {
            fs.unlinkSync(schema.filePath);
          }
        });
      });

      // MODIFIED: Update schemas/index.ts to export from subdirectories
      const groupNames = Object.keys(groups);
      const newIndexContent = `// 🚀 Auto-generated by Orval (Grouped by FastAPI Tags)
// 🔄 Do not edit manually - regenerate with: pnpm generate-types
// 📁 Organized by FastAPI tags for maximum maintainability
// 🏷️  Groups: ${groupNames.join(", ")}

// Export all grouped schema modules
${groupNames.map((group) => `export * from './${group}';`).join("\n")}
`;
      fs.writeFileSync(path.join(SCHEMAS_DIR, "index.ts"), newIndexContent);

      console.log("✅ Schema grouping completed!");
    }
  );
}

// NEW: Generates a barrel file for the endpoints directory
async function generateEndpointsIndex() {
  console.log("📦 Generating barrel file for endpoints...");
  const endpointsDir = path.join(OUTPUT_DIR, "endpoints");
  const endpointTags = fs
    .readdirSync(endpointsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const endpointExports = endpointTags
    .map((tag) => `export * from './${tag}';`)
    .join("\n");

  const indexContent = `// 🚀 Auto-generated by Orval
// 🔄 Do not edit manually - regenerate with: pnpm generate-types
// 📁 Barrel file for all endpoint modules.

${endpointExports}
`;

  fs.writeFileSync(path.join(endpointsDir, "index.ts"), indexContent);
}

// MODIFIED: Generates the main index.ts with clean, consistent paths
async function generateDynamicIndex() {
  console.log("📦 Generating dynamic main index.ts file...");

  const indexContent = `// 🚀 Auto-generated by Orval
// 🔄 Do not edit manually - regenerate with: pnpm generate-types
// 📁 Main barrel file for the generated client.

// 📦 Export all endpoint modules
export * from './endpoints';

// 📝 Export all schema modules
export * from './schemas';
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "index.ts"), indexContent);
}
