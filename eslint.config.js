import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";


/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ["**/*.{js,mjs,cjs,ts,vue}"],
        ignores: [
            "node_modules/**",
            "dist/**",
            "build/**",
            "coverage/**",
            "docs/**",
            "public/**",
            "scripts/**",
        ],
    },
    {
        languageOptions: {
            globals: globals.browser
        }
    },
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/essential"],
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser
            }
        }
    },
];