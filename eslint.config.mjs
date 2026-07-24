import globals from "globals";
import eslint from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";

export default [
  eslint.configs.recommended,
  {
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
    },
    ignores: ["node_modules/*", "dist/*"],
    rules: {
      "no-undef": "error",
      semi: "error",
      "semi-spacing": "error",
      eqeqeq: "warn",
      // Mongoose schema hooks/methods/validators rely on the `this` binding
      // provided by Mongoose at call time (e.g. `UserSchema.pre('save', function () { this... })`,
      // `function (this: IDoc) { ... }` validators). This is a correct and
      // idiomatic pattern, not a bug, so the rule is disabled rather than
      // rewriting model logic.
      "no-invalid-this": "off",
      "no-return-assign": "error",
      "no-unused-expressions": ["error", { allowTernary: true }],
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "no-constant-condition": "warn",
      // Use the TypeScript-aware version instead of the core rule: the core
      // `no-unused-vars` does not understand TS-only constructs such as
      // `enum` members, `this: Type` parameter annotations, parameter names
      // inside function-type signatures, or interface method signatures,
      // and flags all of them as false positives.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_|req|res|next|__",
          varsIgnorePattern: "^_",
        },
      ],
      // This codebase's "const object + same-named type" idiom
      // (`export const Foo = {...} as const; export type Foo = (typeof Foo)[...]`)
      // declares `Foo` once in value-space and once in type-space, which is
      // valid, idiomatic TypeScript (the compiler keeps type and value
      // namespaces separate). Neither the core `no-redeclare` rule nor its
      // TypeScript-aware counterpart (even with `ignoreDeclarationMerge`)
      // recognize this pattern, so both are disabled here rather than
      // rewriting these models to plain TS enums.
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      indent: ["error", 2, { SwitchCase: 1 }],
      "no-mixed-spaces-and-tabs": "warn",
      "space-before-blocks": "error",
      "space-in-parens": "error",
      "space-infix-ops": "error",
      "space-unary-ops": "error",
      quotes: ["error", "single"],
      "max-len": ["error", { code: 200 }],
      "max-lines": ["error", { max: 500 }],
      "keyword-spacing": "error",
      "multiline-ternary": ["error", "never"],
      "no-mixed-operators": "error",
      "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
      "no-whitespace-before-property": "error",
      "nonblock-statement-body-position": "error",
      "object-property-newline": [
        "error",
        { allowAllPropertiesOnSameLine: true },
      ],
      "arrow-spacing": "error",
      "no-confusing-arrow": "error",
      "no-duplicate-imports": "error",
      "no-var": "error",
      "object-shorthand": "off",
      "prefer-const": "error",
      "prefer-template": "warn",
    },
  },
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        // TypeScript ambient/DOM-lib global namespace used for
        // `Express.Multer.File` type references in multer route files.
        // TypeScript itself already validates this via `tsc --noEmit`;
        // ESLint's core `no-undef` doesn't know about ambient type
        // namespaces, so it is declared as a global here.
        Express: "readonly",
      },
    },
  },
  {
    // Test files use the Jest global test API (describe/it/expect/...).
    files: ["src/__tests__/**/*.{ts,js}"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
