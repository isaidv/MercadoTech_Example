import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Copia de referencia del canvas de diseño (bundle de terceros
      // generado, no es código de la app — ver docs/design-reference/README.md).
      "docs/design-reference/**",
      // Carpeta de trabajo interna del Supabase CLI (archivos efímeros que
      // regenera en cada `supabase start`, no forman parte del repo lógico).
      "supabase/.temp/**",
    ],
  },
];

export default eslintConfig;
