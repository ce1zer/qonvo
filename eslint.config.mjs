import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: new URL(".", import.meta.url).pathname
});

export default [
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/next-env.d.ts"]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

