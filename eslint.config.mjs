// @ts-check
import eslint from "@eslint/js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // @ts-expect-error I don't know
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
  },
)
