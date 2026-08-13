import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const namedTailwindWeight =
  /(?:^|\s)!?(?:[a-z-]+:)*font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?=\s|$)/;

const wayfindingRules = {
  "no-named-tailwind-weight": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Keep operational-wayfinding hierarchy independent of named Tailwind font-weight utilities.",
      },
      messages: {
        namedWeight:
          "Use hierarchy from layout or an explicit --weight-* token, not a named Tailwind font-weight utility.",
      },
      schema: [],
    },
    create(context) {
      const reportNamedWeight = (node, value) => {
        if (typeof value === "string" && namedTailwindWeight.test(value)) {
          context.report({ node, messageId: "namedWeight" });
        }
      };

      return {
        Literal(node) {
          reportNamedWeight(node, node.value);
        },
        TemplateElement(node) {
          reportNamedWeight(node, node.value.cooked);
        },
      };
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "docs/superpowers/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,mjs}", "*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: [
      "src/components/sidebar/**/*.{ts,tsx}",
      "src/components/ui/Wayfinding*.tsx",
      "src/components/aircraft/preview/**/*.{ts,tsx}",
    ],
    ignores: ["src/components/aircraft/preview/PlaneHunterStudioModern.tsx"],
    plugins: {
      wayfinding: { rules: wayfindingRules },
    },
    rules: {
      "wayfinding/no-named-tailwind-weight": "error",
    },
  },
);
