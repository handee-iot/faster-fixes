---
"@fasterfixes/svelte": major
---

First release of `@fasterfixes/svelte`, the Svelte Embed of the FasterFixes Widget. Install it with `initFasterFixes({ projectId })` in the script of your root component (the root `+layout.svelte` in SvelteKit) and control the Widget from any component under it with `getFeedback()`, which returns `show`, `hide`, `startAnnotation` and `togglePins`, plus `isVisible`, `feedbackItems` and `showPins` as read-only reactive properties. The install takes the same options as `@fasterfixes/widget`, does nothing during server rendering, destroys the Widget when the root component is destroyed, and ignores a second install under the same root. Requires Svelte 5.7 or later.
