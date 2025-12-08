export default {
  // TypeScript/JavaScript files in web app
  "apps/web/**/*.{ts,tsx,js,jsx}": ["eslint --fix --config apps/web/eslint.config.mjs", "prettier --write"],

  // TypeScript/JavaScript files in packages
  "packages/**/*.{ts,tsx,js,jsx}": ["prettier --write"],

  // JSON files (but not package-lock or pnpm-lock)
  "*.json": ["prettier --write"],
  "!pnpm-lock.yaml": [],
  "!package-lock.json": [],

  // CSS and styling files
  "**/*.css": ["prettier --write"],

  // Markdown files (optional formatting)
  "**/*.md": ["prettier --write --prose-wrap always"],
};
