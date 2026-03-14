# Exploratory Validation Plan

## Goal
Verify that FORGE's deterministic shell outputs actually behave like usable apps in the browser. No LLM calls — pure offline validation.

## Architecture
1. **Fixtures**: Deterministic AppSpec fixtures for all 5 shells (universal, dashboard, landing, kanban, wizard)
2. **Shell Contracts**: Per-shell checklists of required UI elements, interactive behaviors, and above-the-fold content
3. **Playwright Harness**: Renders each shell's App.tsx with Vite, opens in headless Chromium, runs contract assertions
4. **Dead-Interaction Detection**: Clicks every interactive element; flags any that don't change DOM state
5. **Reporting**: JSON + console summary with pass/fail per shell + screenshots on failure

## Files
- `scripts/exploratory-validation.ts` — main harness (Playwright + Vite)
- `scripts/fixtures/` — 5 shell fixture specs
- `scripts/shell-contracts.ts` — per-shell capability contracts
- `reports/exploratory/` — output screenshots + JSON report

## Shell Contracts (What Each Shell Must Deliver)

### Universal
- Sidebar navigation visible
- Search input functional
- KPI cards rendered (4)
- Data table with rows
- Filter controls
- Add button opens modal
- Detail view accessible

### Dashboard
- KPI cards rendered (4)
- Chart visualization present
- Data table with sorting
- Filter dropdown functional
- Status badges rendered

### Landing
- Hero section with CTA
- Feature grid
- Pricing block
- FAQ section with toggles
- Navigation header

### Kanban
- Stage columns rendered
- Cards in columns
- Priority badges
- Card click opens detail
- Board/List toggle

### Wizard
- Step indicator/progress
- Navigation (Next/Back)
- Option cards selectable
- Review step accessible
- Result/recommendation panel

## Acceptance Criteria
- All 5 shells render without console errors
- All contract assertions pass
- Zero dead interactions detected
- Above-the-fold content renders in <2s
- Screenshots captured for visual review
