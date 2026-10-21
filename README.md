# FinWise

## Landing page (`/`)

The signed-out front door lives in `src/landing/` and is rendered by `src/pages/Landing.tsx`.
It uses the FinWise brand (deep magenta `#980042` into wine `#4f0022`, with white) and
Poppins, scoped to the landing page so the app screens are unchanged.

| Section | What happens |
| --- | --- |
| Hero | Headline, demo and sign-up buttons, and a phone running the FinWise home screen that leans toward the pointer, with glass notes around it |
| How FinWise thinks | Pinned: scrolling runs the calendar forward. Ada's salary is late, FinWise warns her, she adjusts, and the salary lands without her going below ₦0 |
| Decision Simulator | Pick a decision, drag the slider, and the next 60 days, lowest balance and verdict update live |
| What it does | Stacking cards: sorted transactions, early-warning budgets, insights with their evidence, and a phone that flips between Personal and Business |
| Notifications | A lock screen with "Is this Food?" that you can answer |
| Trust, story, FAQ, finale | Read-only bank access, Ada's story, questions, and the call to action |

All numbers on the landing page are sample data for the demo persona Ada.

**Photos:** add `public/landing/story.webp` (a wide portrait) and it becomes the background
of the story section; until then that section uses a brand-coloured light field.

---

# React + TypeScript + Vite

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
