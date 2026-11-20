/**
 * Automatic personal-data detection for captures (ADR-0028).
 *
 * Two layers, both on the clone and both client-side:
 * - form controls whose labels, names, autocomplete tokens or input types say
 *   they hold personal data (name, ID, phone, email, address, birth date,
 *   banking details and similar);
 * - high-confidence identifiers in text: South African ID numbers, credit
 *   cards, email addresses, phone numbers and labelled values such as
 *   "Date of birth: ...".
 *
 * Names and addresses have no reliable pattern; their controls are detected by
 * what the page calls them, which covers the normal form case but not a name in
 * prose. That still needs `ff-mask` on the element.
 */

/** The replacement glyph used for every masked non-whitespace character. */
export function maskText(value: string): string {
  return value.replace(/[^\s]/g, "\u2022");
}

const PII_AUTOCOMPLETE = new Set([
  "name",
  "honorific-prefix",
  "given-name",
  "additional-name",
  "family-name",
  "honorific-suffix",
  "nickname",
  "username",
  "email",
  "tel",
  "tel-national",
  "tel-area-code",
  "tel-country-code",
  "tel-extension",
  "impp",
  "street-address",
  "address-line1",
  "address-line2",
  "address-line3",
  "address-level1",
  "address-level2",
  "address-level3",
  "address-level4",
  "country",
  "country-name",
  "postal-code",
  "bday",
  "bday-day",
  "bday-month",
  "bday-year",
  "sex",
  "organization-title",
]);

const PII_WORDS = [
  "name",
  "full name",
  "first name",
  "last name",
  "given name",
  "family name",
  "surname",
  "id number",
  "identity",
  "identity number",
  "national id",
  "passport",
  "phone",
  "telephone",
  "mobile",
  "cell",
  "cellphone",
  "contact number",
  "email",
  "e mail",
  "address",
  "street",
  "suburb",
  "city",
  "town",
  "province",
  "postal code",
  "postcode",
  "zip code",
  "date of birth",
  "dob",
  "birth date",
  "birthday",
  "bank",
  "account number",
  "account no",
  "branch code",
  "iban",
  "sort code",
  "tax number",
  "vat number",
  "salary",
  "income",
  "marital",
  "gender",
  "sex",
  "nationality",
  "race",
  "ethnicity",
  "religion",
  "disability",
  "licence number",
  "license number",
  "driver s licence",
  "driver s license",
];

const NON_TEXT_INPUT_TYPES = new Set([
  "hidden",
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "file",
  "image",
  "range",
  "color",
]);

const CONTENTEDITABLE_SELECTOR =
  '[contenteditable=""], [contenteditable="true" i], [contenteditable="plaintext-only" i]';

/** Whether the element can show a value a screenshot would capture. */
export function isTextLikeControl(element: Element): boolean {
  if (element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
    return true;
  }
  if (element.tagName !== "INPUT") return false;
  const type = (element.getAttribute("type") ?? "text").toLowerCase();
  return !NON_TEXT_INPUT_TYPES.has(type);
}

function isContentEditable(element: Element): boolean {
  return element.matches(CONTENTEDITABLE_SELECTOR);
}

function normalize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasPiiWord(normalized: string): boolean {
  const padded = ` ${normalized} `;
  return PII_WORDS.some((word) => padded.includes(` ${word} `));
}

function elementHints(element: Element): string {
  const parts: string[] = [];
  for (const name of [
    "name",
    "id",
    "placeholder",
    "aria-label",
    "autocomplete",
    "type",
    "inputmode",
  ]) {
    const value = element.getAttribute(name);
    if (value) parts.push(value);
  }

  const labels = (element as HTMLInputElement).labels;
  if (labels) {
    for (const label of labels) {
      if (label.textContent) parts.push(label.textContent);
    }
  }

  const wrapping = element.closest("label");
  if (wrapping?.textContent) parts.push(wrapping.textContent);

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const label = element.ownerDocument.getElementById(id);
      if (label?.textContent) parts.push(label.textContent);
    }
  }

  return normalize(parts.join(" "));
}

/**
 * True when a control is named, labelled or typed as personal data. The
 * control is then treated like `ff-mask`: its value is cleared and its text
 * (for a select or contenteditable) is bulleted.
 */
export function isPiiField(element: Element): boolean {
  if (!isTextLikeControl(element) && !isContentEditable(element)) {
    return false;
  }

  const autocomplete = (element.getAttribute("autocomplete") ?? "")
    .toLowerCase()
    .split(/\s+/);
  if (autocomplete.some((token) => PII_AUTOCOMPLETE.has(token))) return true;

  const type = (element.getAttribute("type") ?? "").toLowerCase();
  if (type === "email" || type === "tel") return true;

  const inputmode = (element.getAttribute("inputmode") ?? "").toLowerCase();
  if (inputmode === "email" || inputmode === "tel") return true;

  return hasPiiWord(elementHints(element));
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SA_ID_PATTERN = /\b\d{13}\b/g;
const CARD_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;
const PHONE_PATTERN = /(?:\+27|0)\s?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g;

const LABELLED_VALUE =
  /\b(full name|first name|last name|given name|family name|surname|name|id number|identity number|national id|passport(?: number)?|phone(?: number)?|telephone(?: number)?|mobile(?: number)?|cell(?:phone)?(?: number)?|email(?: address)?|e mail|street address|address|date of birth|dob|birth date|bank account|account number|account no|branch code|tax number|vat number|postal code|postcode|zip code)\b(\s*[:-]\s*)([^\n]+)/gi;

// "File name", "Project name" and friends are not personal data.
const NON_PERSONAL_LABEL =
  /\b(file|filename|project|company|business|product|brand|document|page|host|server|app|application)\s*$/i;

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits.charAt(index));
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function isSouthAfricanId(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) return false;

  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const yearPart = Number(digits.slice(0, 2));
  const validDate = [1900 + yearPart, 2000 + yearPart].some((year) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  });

  return validDate && luhn(digits);
}

function isCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19 && luhn(digits);
}

function maskLabelledValues(value: string): string {
  return value.replace(
    LABELLED_VALUE,
    (
      match: string,
      label: string,
      separator: string,
      content: string,
      offset: number,
    ) => {
      const before = value.slice(Math.max(0, offset - 24), offset);
      if (NON_PERSONAL_LABEL.test(before)) return match;
      return `${label}${separator}${maskText(content)}`;
    },
  );
}

/**
 * Masks the identifiers it can prove: emails, valid SA ID numbers, card
 * numbers that pass Luhn, phone numbers and values labelled as personal data.
 * Names and addresses in free prose cannot be proven and are left to
 * `ff-mask`.
 */
export function maskPiiText(value: string): string {
  let masked = maskLabelledValues(value);
  masked = masked.replace(EMAIL_PATTERN, (match) => maskText(match));
  masked = masked.replace(SA_ID_PATTERN, (match) =>
    isSouthAfricanId(match) ? maskText(match) : match,
  );
  masked = masked.replace(CARD_PATTERN, (match) =>
    isCardNumber(match) ? maskText(match) : match,
  );
  masked = masked.replace(PHONE_PATTERN, (match) => maskText(match));
  return masked;
}
