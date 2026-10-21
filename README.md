# FinWise

## Landing page (`/`)

The signed-out front door lives in `src/landing/` and is rendered by `src/pages/Landing.tsx`.
It uses the FinWise brand (deep magenta `#980042` into wine `#4f0022`, with white) and
Poppins, scoped to the landing page so the app screens are unchanged.

| Section | What happens |
| --- | --- |
| Hero | A soft sky (`public/landing/sky-*.webp`, upscaled from the supplied photo) with faint guide lines, a centred headline, one black button, and the phone rising out of the clouds |
| Proof | Read-only badge, three key facts, and four cards of things FinWise will tell you |
| Features | Four rows of text beside a pale card: the working Decision Simulator, budgets and insights, personal and business, and "Is this Food?" notifications, with phones peeking out |
| FAQs and closing | A simple FAQ, then the sky again with the final call to action |

All numbers on the landing page are sample data for the demo persona Ada.


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

## Sign in, sign up and onboarding

`src/pages/SignIn.tsx`, `SignUp.tsx` and `Onboarding.tsx` use `src/landing/AuthShell.tsx`: a brand
panel on the left and the form on the right (a brand header on phones). The fields, button and
cards there are separate from `src/components/ui.tsx`, so the app screens are unchanged.

The brand panel runs a slideshow of the app, one screen every 3 seconds (pauses on hover):
Overview, Analytics, AI Insight, Create Budget and Activity, rebuilt from the app designs in
`src/landing/Screens.tsx`. Each slide shows the top of the phone, a card that pops out over it,
a title, a line and dots. Edit the slides in `SLIDES` at the bottom of that file.

**Photo (optional):** add `public/auth/woman.webp` and it replaces the slideshow.

## The app (signed in)

Rebuilt from the five app designs, in magenta (`#980042`) with Poppins. The colours live in
`src/index.css` (`--color-brand`, `bg-brand-grad`) and the app icon is `public/icon.svg`.

- **Layout** (`src/components/AppShell.tsx`): on phones, a tab bar with Overview, Analytics, a raised
  button for quick actions (Simulator, Add transactions, Create a budget, Review), AI Insights and
  Activities. On laptops, a side panel with every page, the Personal/Business switch and sign out.
- **Overview** `/home`: balance (tap the eye to hide amounts), the first AI insight, income and
  expenses this month, the next transaction to answer and recent transactions. Tap the avatar to
  switch Personal/Business or sign out.
- **Analytics** `/analytics`: pick a month; total, daily average, money in and out by week, budgets
  and spending by category (tap one to see its transactions).
- **AI Insight** `/insights`: monthly summary, insight cards with "Why?", a suggested weekly target.
  "Ask FinWise anything" opens the Decision Simulator on the matching scenario.
- **Create Budget** `/budgets/new?category=`: weekly limits are saved as their monthly equivalent
  (budgets are stored per month); other budgets are kept as they are.
- **Activity** `/transactions`: search, All/Income/Expenses, filters, grouped by day.

Shared pieces are in `src/app/` (`kit.tsx` icons, category colours and rows; `data.ts` types and
loaders). No server changes were needed.
