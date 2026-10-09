import type { WidgetPosition } from "@fasterfixes/core";

import { createIcon } from "./icons.js";
import type { IconName } from "./icons.js";
import type { ResolvedDisplayOptions } from "./options.js";

type ToolbarActions = {
  /** The collapsed button: opens the bar. */
  onOpen: () => void;
  /** The + control: starts or cancels element selection. */
  onToggleCreate: () => void;
  /** The close control: leaves feedback mode and collapses the bar. */
  onExit: () => void;
  onTogglePins: () => void;
  onToggleList: () => void;
};

export type Toolbar = {
  element: HTMLElement;
  /** Collapsed shows the button, open shows the bar's controls. */
  setOpen: (open: boolean) => void;
  /** Reflects whether element selection is active in the + control. */
  setAnnotating: (annotating: boolean) => void;
  /** Reflects whether pins are shown in the markers control. */
  setPinsShown: (shown: boolean) => void;
  /** Reflects whether the Feedback list is open in the list control. */
  setListShown: (shown: boolean) => void;
};

function tooltipSide(position: WidgetPosition) {
  return position.includes("right") ? "left" : "right";
}

function createTooltip(document: Document, text: string, side: string) {
  const tooltip = document.createElement("span");
  tooltip.className = "tooltip";
  tooltip.dataset.side = side;
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.textContent = text;
  return tooltip;
}

function createControl(
  document: Document,
  label: string,
  icon: IconName,
  side: string,
  onClick: () => void,
) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "control";
  control.addEventListener("click", onClick);
  const tooltip = createTooltip(document, label, side);
  control.append(createIcon(document, icon, 16), tooltip);

  function setContent(nextLabel: string, nextIcon: IconName) {
    control.setAttribute("aria-label", nextLabel);
    tooltip.textContent = nextLabel;
    control.firstChild?.replaceWith(createIcon(document, nextIcon, 16));
  }
  control.setAttribute("aria-label", label);
  return { control, setContent };
}

/**
 * The floating button while collapsed; opened, it becomes the bar with its
 * controls, the close control nearest the screen edge. The + control starts
 * element selection, so opening the bar never does anything to the page.
 */
export function createToolbar(
  document: Document,
  { labels, position }: ResolvedDisplayOptions,
  {
    onOpen,
    onToggleCreate,
    onExit,
    onTogglePins,
    onToggleList,
  }: ToolbarActions,
): Toolbar {
  const side = tooltipSide(position);
  // One pill that grows from the button into the controls, so the shadow and
  // the `button` part stay on the shape the user sees.
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  toolbar.setAttribute("part", "button");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "button";
  trigger.setAttribute("aria-label", labels.startFeedback);
  trigger.appendChild(createIcon(document, "message", 18));
  trigger.appendChild(createTooltip(document, labels.startFeedback, side));
  trigger.addEventListener("click", onOpen);

  const controls = document.createElement("div");
  controls.className = "controls";
  const create = createControl(
    document,
    labels.newFeedback,
    "plus",
    side,
    onToggleCreate,
  );
  const exit = createControl(
    document,
    labels.exitFeedbackMode,
    "close",
    side,
    onExit,
  );
  const markers = createControl(
    document,
    labels.hideMarkers,
    "eye",
    side,
    onTogglePins,
  );
  const list = createControl(
    document,
    labels.showFeedbackList,
    "list",
    side,
    onToggleList,
  );
  controls.append(
    ...(position.includes("top")
      ? [exit.control, create.control, list.control, markers.control]
      : [create.control, list.control, markers.control, exit.control]),
  );

  toolbar.append(trigger, controls);

  // Both layers stay rendered so they can cross-fade; `inert` takes the
  // faded one out of the tab order and the accessibility tree.
  function applyState(open: boolean) {
    toolbar.dataset.state = open ? "expanded" : "collapsed";
    for (const [layer, visible] of [
      [trigger, !open],
      [controls, open],
    ] as const) {
      layer.dataset.visible = String(visible);
      layer.inert = !visible;
      layer.setAttribute("aria-hidden", String(!visible));
    }
  }
  applyState(false);

  return {
    element: toolbar,
    setOpen(open) {
      const root = toolbar.getRootNode();
      const focusWasInside =
        root instanceof ShadowRoot && toolbar.contains(root.activeElement);
      applyState(open);
      // Keeps keyboard users on the toolbar when the button they pressed hides.
      if (focusWasInside) {
        (open ? create.control : trigger).focus();
      }
    },
    setAnnotating(annotating) {
      create.control.setAttribute("aria-pressed", String(annotating));
      create.control.classList.toggle("control-pressed", annotating);
    },
    setPinsShown(shown) {
      markers.setContent(
        shown ? labels.hideMarkers : labels.showMarkers,
        shown ? "eye" : "eyeOff",
      );
      markers.control.classList.toggle("control-pressed", !shown);
    },
    setListShown(shown) {
      list.setContent(
        shown ? labels.hideFeedbackList : labels.showFeedbackList,
        "list",
      );
      list.control.setAttribute("aria-expanded", String(shown));
      list.control.classList.toggle("control-pressed", shown);
    },
  };
}
