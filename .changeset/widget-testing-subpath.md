---
"@fasterfixes/widget": minor
---

Add `createFakeWidget` under the `@fasterfixes/widget/testing` subpath: a Widget double for testing code that drives the Widget, such as a framework Embed. It records the arguments of every call in `calls`, `emit(patch)` updates `isVisible`, `feedbackItems` or `showPins` and notifies subscribers, and `listenerCount` reports the live listeners. It depends on no test runner. The subpath is unstable, like `@fasterfixes/widget/internal`: it may change in any release.
