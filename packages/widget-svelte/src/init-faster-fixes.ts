import { setContext } from "svelte";
import { init } from "@fasterfixes/widget";
import type { WidgetOptions } from "@fasterfixes/widget";
import { FEEDBACK_SLOT_KEY, createFeedbackSlot } from "./feedback-slot.js";

/**
 * Mounts the Widget for the component tree under the calling component. Call
 * it in the script of the root component. The options are the Widget's own,
 * forwarded unchanged to `init`, and read once.
 */
export function initFasterFixes(options: WidgetOptions): void {
  const slot = createFeedbackSlot();
  setContext(FEEDBACK_SLOT_KEY, slot);

  // At the call, not in onMount: children mount before their parent, so a
  // child's onMount would otherwise find no instance.
  slot.attach(init(options));
}
