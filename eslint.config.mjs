import eslint from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "dist-test/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["test/**/*.ts", "migrations/**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts", "migrations/**/*.ts"],
    plugins: {
      perfectionist,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "perfectionist/sort-imports": [
        "error",
        {
          type: "alphabetical",
          order: "asc",
          ignoreCase: true,
          sortBy: "path",
          newlinesBetween: 1,
          useExperimentalDependencyDetection: false,
          groups: [
            [
              "value-builtin",
              "value-external",
              "value-internal",
              "value-parent",
              "value-sibling",
              "value-index",
              "value-subpath",
              "value-style",
              "value-import",
            ],
            [
              "type-builtin",
              "type-external",
              "type-internal",
              "type-parent",
              "type-sibling",
              "type-index",
              "type-subpath",
              "type-style",
              "type-import",
            ],
            "unknown",
          ],
        },
      ],
    },
  },
);
