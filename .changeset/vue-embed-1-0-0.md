---
"@fasterfixes/vue": major
---

First release of `@fasterfixes/vue`, the Vue Embed of the FasterFixes Widget. Install it with `app.use(createFasterFixes({ projectId }))` and control the Widget from any component with `useFeedback()`, which returns `show`, `hide`, `startAnnotation` and `togglePins`, plus `isVisible`, `feedbackItems` and `showPins` as readonly refs. The plugin takes the same options as `@fasterfixes/widget`, does nothing during server rendering, destroys the Widget when the app unmounts, and ignores a second install on the same app. Requires Vue 3.5 or later.
