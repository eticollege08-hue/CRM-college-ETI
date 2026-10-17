import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/**", "node_modules/**", "coverage/**", ".npm-cache/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
            ],
        },
    },
    {
        files: ["src/public/js/**/*.js"],
        languageOptions: {
            globals: {
                document: "readonly",
                fetch: "readonly",
                HTMLButtonElement: "readonly",
                HTMLFormElement: "readonly",
                Request: "readonly",
                URL: "readonly",
                window: "readonly",
            },
        },
    },
    prettier,
);
