import { init } from "@fasterfixes/widget";
import type { WidgetOptions } from "@fasterfixes/widget";
import type { Plugin } from "vue";
import { FEEDBACK_SLOT_KEY, createFeedbackSlot } from "./feedback-slot.js";

/**
 * Vue plugin that mounts the Widget. The options are the Widget's own,
 * forwarded unchanged to `init`, and read once for the lifetime of the app.
 */
export function createFasterFixes(options: WidgetOptions): Plugin {
  return {
    install(app) {
      const slot = createFeedbackSlot();
      // Provided on the server too, so `useFeedback` renders the defaults.
      app.provide(FEEDBACK_SLOT_KEY, slot);
      if (typeof document === "undefined") return;
      slot.attach(init(options));
    },
  };
}
