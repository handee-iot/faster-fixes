import { isPiiField, isTextLikeControl, maskPiiText, maskText } from "./pii.js";

export { maskText };

/**
 * Sensitive-data masking for captures (ADR-0027, ADR-0028).
 *
 * The site owner marks elements with `ff-exclude`, `ff-mask` or `ff-unmask`
 * (or the `data-ff-*` attribute forms), and personal form fields and
 * identifiers are detected automatically. `maskSensitiveData` runs on
 * modern-screenshot's DOM clone, before it is rasterised, so the live page is
 * never changed and the original text never reaches the uploaded image.
 */

export const MASK_CLASS = "ff-mask";
export const EXCLUDE_CLASS = "ff-exclude";
export const UNMASK_CLASS = "ff-unmask";
export const MASK_ATTRIBUTE = "data-ff-mask";
export const EXCLUDE_ATTRIBUTE = "data-ff-exclude";
export const UNMASK_ATTRIBUTE = "data-ff-unmask";

const EXCLUDE_SELECTOR = `.${EXCLUDE_CLASS}, [${EXCLUDE_ATTRIBUTE}]`;
const MASK_SELECTOR = `.${MASK_CLASS}, [${MASK_ATTRIBUTE}]`;
const UNMASK_SELECTOR = `.${UNMASK_CLASS}, [${UNMASK_ATTRIBUTE}]`;

/**
 * Controls browsers and password managers fill without the site owner having
 * to add a class. These cannot be unmasked: a stray `ff-unmask` inside a
 * password form must not expose it.
 */
const SENSITIVE_SELECTOR = [
  'input[type="password" i]',
  'input[autocomplete*="password" i]',
  'textarea[autocomplete*="password" i]',
  'input[autocomplete*="cc-" i]',
  'textarea[autocomplete*="cc-" i]',
  'select[autocomplete*="cc-" i]',
  'input[autocomplete*="one-time-code" i]',
  'textarea[autocomplete*="one-time-code" i]',
].join(", ");

/** The placeholder pattern an excluded element is painted with. */
const EXCLUDED_BACKGROUND =
  "repeating-linear-gradient(135deg, #d4d4d8 0px, #d4d4d8 8px, #e4e4e7 8px, #e4e4e7 16px)";

/**
 * Pseudo-element content is rendered by modern-screenshot after the clone hook,
 * so the walk cannot reach it. Hide it on the live page for the capture window;
 * the clone inherits the rule and the original content never reaches the image.
 * Decorative icons vanish too, which is the safe side of the trade.
 */
const PSEUDO_CONTENT_CSS = `
.${EXCLUDE_CLASS}::before, .${EXCLUDE_CLASS}::after,
.${EXCLUDE_CLASS} *::before, .${EXCLUDE_CLASS} *::after,
[${EXCLUDE_ATTRIBUTE}]::before, [${EXCLUDE_ATTRIBUTE}]::after,
[${EXCLUDE_ATTRIBUTE}] *::before, [${EXCLUDE_ATTRIBUTE}] *::after,
.${MASK_CLASS}::before, .${MASK_CLASS}::after,
.${MASK_CLASS} *::before, .${MASK_CLASS} *::after,
[${MASK_ATTRIBUTE}]::before, [${MASK_ATTRIBUTE}]::after,
[${MASK_ATTRIBUTE}] *::before, [${MASK_ATTRIBUTE}] *::after {
  content: none !important;
}
`;

/** A measured box for an excluded element, in CSS pixels. */
export type ExcludedBox = {
  width: number;
  height: number;
};

export type CaptureMasking = {
  /** The attribute this capture run put on the excluded elements. */
  attribute: string;
  boxes: ReadonlyMap<string, ExcludedBox>;
  cleanup: () => void;
};

let captureRun = 0;

/**
 * Tags the live page's excluded elements with a run-specific attribute and
 * records their boxes, so the clone pass can paint a placeholder of the same
 * size even when the element's height comes from its children. The attribute
 * is invisible and is removed by `cleanup` once the capture settles.
 */
export function prepareCaptureMasking(doc: Document): CaptureMasking {
  const attribute = `data-ff-capture-${++captureRun}`;
  const boxes = new Map<string, ExcludedBox>();
  const elements = Array.from(doc.querySelectorAll(EXCLUDE_SELECTOR)).filter(
    (element) => !element.closest("[data-ff-widget]"),
  );

  elements.forEach((element, index) => {
    const id = String(index);
    element.setAttribute(attribute, id);
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      boxes.set(id, { width: rect.width, height: rect.height });
    }
  });

  const restorePseudoContent = hidePseudoContent(doc);

  return {
    attribute,
    boxes,
    cleanup() {
      for (const element of elements) element.removeAttribute(attribute);
      restorePseudoContent();
    },
  };
}

/**
 * Hides `::before`/`::after` content in masked regions. A document-level
 * constructable stylesheet keeps this out of the DOM and works under a strict
 * `style-src`; a `<style>` element is the fallback for older engines.
 */
function hidePseudoContent(doc: Document): () => void {
  type DocumentWithSheets = Document & {
    adoptedStyleSheets?: CSSStyleSheet[];
  };
  const target = doc as DocumentWithSheets;
  const sheets = target.adoptedStyleSheets;

  try {
    if (typeof CSSStyleSheet !== "undefined" && Array.isArray(sheets)) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(PSEUDO_CONTENT_CSS);
      target.adoptedStyleSheets = [...sheets, sheet];
      return () => {
        target.adoptedStyleSheets = target.adoptedStyleSheets.filter(
          (entry) => entry !== sheet,
        );
      };
    }
  } catch {
    // Fall through to the style element for engines without constructable sheets.
  }

  const style = doc.createElement("style");
  style.textContent = PSEUDO_CONTENT_CSS;
  doc.head.appendChild(style);
  return () => style.remove();
}

type MaskState = {
  masked: boolean;
  /** Automatic secret fields cannot be unmasked by a descendant. */
  locked: boolean;
  /** Whether unmarked text in this region is scanned for PII patterns. */
  patterns: boolean;
};

const ROOT_STATE: MaskState = { masked: false, locked: false, patterns: true };
const UNMASKED: MaskState = { masked: false, locked: false, patterns: false };

const NON_RENDERED_SELECTOR = "script, style, noscript, template, title";

function resolveState(element: Element, inherited: MaskState): MaskState {
  if (element.matches(SENSITIVE_SELECTOR)) {
    return { masked: true, locked: true, patterns: false };
  }
  if (element.matches(MASK_SELECTOR)) {
    return { masked: true, locked: false, patterns: false };
  }
  if (element.matches(UNMASK_SELECTOR) && !inherited.locked) {
    return UNMASKED;
  }
  if (isPiiField(element)) {
    return { masked: true, locked: false, patterns: false };
  }
  return inherited;
}

/**
 * Applies the masking rules to a captured clone. Excluded elements are
 * replaced first, then the tree is walked for masked text and automatic
 * secret controls. `attribute` and `boxes` come from `prepareCaptureMasking`
 * and are optional: without them the rules still apply, just without measured
 * placeholder boxes.
 */
export function maskSensitiveData(
  root: Element,
  masking?: Pick<CaptureMasking, "attribute" | "boxes">,
): void {
  const excluded = Array.from(root.querySelectorAll(EXCLUDE_SELECTOR));
  for (const element of excluded) {
    if (element === root || !element.parentNode) continue;
    const id = masking ? element.getAttribute(masking.attribute) : null;
    replaceWithBlock(element, id ? masking?.boxes.get(id) : undefined, masking);
  }

  walk(root, ROOT_STATE);
}

function walk(element: Element, inherited: MaskState): void {
  // A replaced element is a plain block now; never look inside it.
  if (element.matches(EXCLUDE_SELECTOR)) return;
  if (element.matches(NON_RENDERED_SELECTOR)) return;

  const state = resolveState(element, inherited);

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      if (state.masked) node.textContent = maskText(text);
      else if (state.patterns) node.textContent = maskPiiText(text);
      continue;
    }
    if (node.nodeType === 1) walk(node as Element, state);
  }

  if (isTextLikeControl(element)) {
    if (state.masked) blankControl(element);
    else if (state.patterns) maskControlPatterns(element);
  }

  // A missing image shows its alt text, which can name the thing being hidden.
  if (state.masked && element.tagName === "IMG") element.removeAttribute("alt");
}

/** Clears a value the capture would otherwise show. */
function blankControl(element: Element): void {
  if (element.tagName === "INPUT") {
    const input = element as HTMLInputElement;
    input.value = "";
    element.removeAttribute("value");
    element.removeAttribute("placeholder");
  } else if (element.tagName === "TEXTAREA") {
    const textarea = element as HTMLTextAreaElement;
    textarea.value = "";
    textarea.textContent = "";
    element.removeAttribute("placeholder");
  } else if (element.tagName === "SELECT") {
    (element as HTMLSelectElement).selectedIndex = -1;
  }
}

/** Masks an identifier typed into a control whose labels did not give it away. */
function maskControlPatterns(element: Element): void {
  if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA") return;
  const control = element as HTMLInputElement | HTMLTextAreaElement;
  const value =
    control.value === ""
      ? (element.getAttribute("value") ?? "")
      : control.value;
  if (value === "") return;
  const masked = maskPiiText(value);
  if (masked === value) return;
  control.value = masked;
  if (element.tagName === "INPUT") element.setAttribute("value", masked);
}

/**
 * Paints the measured box with a neutral hatch and drops everything inside.
 * Cloning the tag rather than using a div keeps tables, lists and inline
 * layout intact.
 */
function replaceWithBlock(
  element: Element,
  box: ExcludedBox | undefined,
  masking?: Pick<CaptureMasking, "attribute" | "boxes">,
): void {
  const block = element.cloneNode(false) as Element;
  block.textContent = "";
  block.classList.remove(EXCLUDE_CLASS);
  block.removeAttribute(EXCLUDE_ATTRIBUTE);
  if (masking) block.removeAttribute(masking.attribute);

  for (const name of [
    "src",
    "srcset",
    "poster",
    "data",
    "alt",
    "value",
    "href",
  ]) {
    block.removeAttribute(name);
  }

  const style = (block as HTMLElement).style;
  style.background = EXCLUDED_BACKGROUND;
  style.color = "transparent";
  style.textShadow = "none";
  style.boxShadow = "none";
  style.visibility = "visible";
  style.opacity = "1";
  style.overflow = "hidden";
  style.boxSizing = "border-box";
  if (style.display === "inline") style.display = "inline-block";
  if (style.display === "contents") style.display = "block";

  if (box) {
    style.width = `${box.width}px`;
    style.height = `${box.height}px`;
    style.minWidth = `${box.width}px`;
    style.minHeight = `${box.height}px`;
  }

  element.replaceWith(block);
}
