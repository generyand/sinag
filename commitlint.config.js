export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Enforce conventional commit types
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation only
        "style", // Code style (formatting, semicolons, etc.)
        "refactor", // Code refactoring (no feature or bug fix)
        "perf", // Performance improvement
        "test", // Adding or updating tests
        "chore", // Maintenance tasks
        "ci", // CI/CD changes
        "build", // Build system changes
        "revert", // Reverting a previous commit
      ],
    ],
    // Allow any case in subject
    "subject-case": [0],
    // Limit subject length
    "subject-max-length": [2, "always", 100],
    // Body should wrap at 100 characters
    "body-max-line-length": [2, "always", 100],
  },
};
