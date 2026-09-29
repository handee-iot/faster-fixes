---
"@fasterfixes/widget": patch
---

Keep the Reviewer token out of the URL when a router puts it back. `init` removes the `ff_token` query parameter, but a router that finishes its first navigation afterwards, such as Vue Router, wrote back the URL it read at load. The token then stayed in the address bar, was saved in the page URL of new Feedback, and hid the pins of the current page. The Widget now removes the parameter again whenever it reappears, and keeps the router's history state.
