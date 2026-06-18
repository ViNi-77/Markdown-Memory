# UI Design Improvements

## Design Skill Choice

Markdown Memory uses the `application` skill from `bergside/awesome-design-skills`.

This is the best fit because the product is a daily-use application workspace: users manage Markdown files, switch between reading and editing, share selected documents, and send content to AI tools. It needs clarity, speed, state visibility, and predictable controls more than analytics-style dashboards or marketing polish.

| Candidate      | Fit                                                                                | Decision    |
| -------------- | ---------------------------------------------------------------------------------- | ----------- |
| `application`  | App dashboard, Inter-based UI, developer/product workflow density                  | Adopted     |
| `dashboard`    | Strong for KPI/data monitoring, but too analytics and dark-theme oriented          | Not adopted |
| `professional` | Business-ready name, but current skill is closer to an electronics-shop palette    | Not adopted |
| `enterprise`   | BtoB name fits, but typography and palette are too opinionated for the current app | Not adopted |

## Markdown Memory Rules

- Keep the four-pane model: folders, file list, Markdown surface, details/actions.
- Use existing shadcn/base-nova semantic tokens before introducing new visual values.
- Do not convert the app to a top-bar-only layout just because the upstream skill mentions it.
- Treat Markdown readability, save safety, and mobile pane navigation as product-critical.
- Design every changed component with default, hover, focus-visible, active, disabled, loading, empty, and error states where relevant.

## Improvement Backlog

1. Pane 2 file list hierarchy
   - Make selected, loading, empty, and search-result states easier to scan.
   - Keep file name, updated date, and optional status/share cues in a stable row rhythm.
   - Verify long file names and empty folders at desktop and mobile widths.

2. Pane 3 Markdown surface
   - Tighten the document toolbar so save state, preview/edit, fullscreen, and delete actions read as one tool surface.
   - Preserve the reading surface as the visual priority.
   - Confirm empty body, loading body, long headings, tables, and code blocks do not shift or overlap controls.

3. Pane 4 details and AI actions
   - Group metadata, file actions, sharing, AI handoff, and in-app AI with consistent headings and spacing.
   - Make destructive and public-sharing states visually explicit without adding raw color classes.
   - Ensure long AI output and API errors stay contained and never expose secrets.

4. Mobile workspace
   - Keep bottom navigation and action sheets, but polish active/focus/disabled states.
   - Make the selected-document recovery path obvious from the file list.
   - Re-test the files, document, details, document, files round trip at 430px width.

5. Login and share pages
   - Align cards, headings, buttons, and empty/error states with the app workspace tokens.
   - Avoid marketing-page composition; these pages should feel like product utility screens.

## Quality Gates

- Run `npm run lint`, `npm run test`, and `npm run build` when UI code changes.
- Browser-check desktop and 430px mobile widths for overlap, overflow, and focus visibility.
- Verify light and dark modes before changing tokens.
- Prefer small PRs: start with one surface, then expand shared patterns only after the direction is confirmed.
