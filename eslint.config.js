import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        ignores: ["dist/**", "build/**", "node_modules/**", "inspo-repos/**"],
    },
    eslint.configs.recommended,
    prettier,
    {
        files: ["**/*.js", "**/*.mjs", "**/*.ts"],
        languageOptions: {
            parser: tsParser,
        },
        rules: {
            "no-undef": "off",
            "no-unused-vars": "off",
        },
    },
];
