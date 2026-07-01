# Quiz du bar

App de quiz de bar en temps réel (React + Vite + TanStack Router + Tailwind v4),
backend **Supabase** (Postgres + Realtime).

## Setup backend (Supabase)

1. Créer un projet Supabase (sur **votre** compte).
2. Appliquer le schéma : coller `supabase/migrations/0001_init.sql` dans le SQL Editor
   du dashboard (ou `supabase db push` si le projet est linké).
3. Renseigner `.env.local` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
   (dashboard → Project Settings → API).
4. `npm install` puis `npm run dev`.

La réactivité temps réel (host ↔ écran télé) passe par Supabase Realtime, encapsulé
dans le hook `src/lib/useLiveQuery.ts`. Toute la couche d'accès données est dans
`src/lib/api.ts`.

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
