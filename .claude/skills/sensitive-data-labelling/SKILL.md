---
name: sensitive-data-labelling
description: >
  Apply Faster Fixes sensitive-data masking to an existing website before its
  screenshots are collected. Use when asked to redact personal data from
  feedback screenshots, label a client site for privacy, audit a page for PII,
  or add ff-exclude, ff-mask and ff-unmask to forms, identity documents,
  addresses, names, ID numbers, emails, phone numbers, account details, tables,
  media or third-party components. Covers the automatic PII rules, the gaps
  that still need classes, framework-specific markup, and the verification
  workflow.
---

# Sensitive Data Labelling

Use this skill when a site already runs the Faster Fixes widget and its
screenshots must not contain personal or sensitive data. The job is site
markup, not widget code. Do not modify the widget package, the API or the
database.

The widget masks twice:

1. **Automatically**, always on, on the capture clone. Personal form fields and
   common identifiers are detected and redacted without any markup change.
2. **By rule**, where the page carries `ff-exclude`, `ff-mask`, `ff-unmask` or
   their `data-ff-*` equivalents.

This skill assumes the current widget (the one with automatic PII detection).
If the site is on an older build, get it updated before labelling; a hard
refresh alone does not add the rules.

Your task is to audit the pages, rely on the automatic rules where they are
correct, and add rules where they are not.

## The rules

| Rule         | Result                                                                                                                                                                                                                                     | Use for                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ff-exclude` | The element and its whole subtree are replaced by a neutral hatched block of the same size. Nothing inside is rendered.                                                                                                                    | Identity documents, uploaded file previews, signatures, avatars, full certified-copy steps, mixed text and media, charts and canvas, a card with an image.                      |
| `ff-mask`    | Every non-whitespace character in the element's text becomes a bullet, preserving length and layout. Input values, `textarea` content and image `alt` text inside the region are cleared. Pseudo-element content is hidden during capture. | A value whose label should stay readable, a paragraph containing a name or address, a table cell with text, a group of radio labels, a form section that should keep its shape. |
| `ff-unmask`  | Restores a descendant inside `ff-mask`, or opts a field out of automatic PII detection. No effect inside `ff-exclude`. Secret fields (password, card, one-time code) stay locked.                                                          | A safe value inside a masked card: "Preferred language: English" inside a masked customer block. Use sparingly.                                                                 |

The attribute forms are `data-ff-exclude`, `data-ff-mask` and `data-ff-unmask`.
Use them when the template system strips classes unexpectedly or when a CMS
field only exposes attributes. Do not use `.mk-*` classes; this widget does not
read Marker.io's classes.

Masking happens client-side on a clone of the page. It does not change the live
page, so the user never sees a masked form. It also cannot protect what the
clone cannot reach: images, canvas, video and CSS background images are pixels,
not text.

## What is automatic

Do not add classes to fields that the widget already detects. It clears a
text-like control when any of these says it holds personal data:

- `autocomplete` tokens such as `name`, `given-name`, `family-name`, `email`,
  `tel`, `street-address`, `address-line1`, `postal-code`, `bday`, `sex`.
- `type="email"`, `type="tel"`, `inputmode="email|tel"`.
- The control's `name`, `id`, `placeholder`, `aria-label`, associated
  `<label>`, wrapping `<label>` or `aria-labelledby` text, when it contains
  terms such as name, surname, ID/identity/passport, phone/mobile/cell, email,
  address/street/suburb/city/province/postal, date of birth/DOB,
  bank/account/branch/IBAN, tax/VAT, salary/income, marital, gender, sex,
  nationality, race, ethnicity, religion, disability or licence number.

It also masks these patterns in ordinary text:

- Valid South African ID numbers: 13 digits, valid date part and Luhn check.
- Card numbers that pass Luhn.
- Email addresses.
- South African phone numbers (`0XX XXX XXXX`, `0XXXXXXXXX`, `+27 ...`).
- Values immediately after a personal-data label, for example
  `Date of birth: 4 January 1983` or `Full name: Dawid`.
  `File name`, `Project name`, `Company name`, `Business name`, `Product name`,
  `Brand name`, `Document name`, `Page name`, `Host name`, `Server name` and
  `Application name` are excluded from the name rule.

The labels themselves stay readable. That is deliberate: a reviewer should
still see that the form asked for an ID number without seeing the number.

Automatic detection is English-first and South-Africa-first. It does not cover
every language, every country's identifiers, radio groups or free prose names.
Those are your job below.

## What is not automatic

These are the usual gaps. Check every page for them.

- **Radio and checkbox groups.** The checked option's label is personal data.
  Put `ff-mask` on the fieldset or the option wrapper, or `ff-exclude` on the
  whole fieldset. `ff-mask` keeps the layout but the selected dot's position is
  still visible; `ff-exclude` is safest for marital status, gender, disability,
  ethnicity and similar groups.
- **Names and addresses in prose.** "Welcome back, Dawid" and an address in a
  confirmation paragraph have no dependable pattern. Put `ff-mask` on the
  paragraph or wrap only the value in a `<span class="ff-mask">`.
- **Labels in another language.** Automatic detection may miss them. Put
  `ff-mask` on the control or add the correct `autocomplete` attribute.
- **Images, avatars, signatures, uploaded documents, PDF previews, canvas,
  charts and CSS background images.** Use `ff-exclude`.
- **File names.** An uploaded file list can contain a person's name or ID.
  `ff-mask` the list or `ff-exclude` the file item.
- **Debug panels and tokens.** API keys, bearer tokens and console-style
  panels are text; `ff-mask` or `ff-exclude` them. The Diagnostics Trail is
  separate and is not affected by these classes.
- **Third-party components** that render their own DOM. Put the rule on the
  wrapper. Rules do not reach inside shadow roots or cross-origin iframes;
  `ff-exclude` the host so the whole area reads as a hatched block.
- **Values inside a component that re-renders.** The class must survive the
  render. Use a stable wrapper, not a class that the framework replaces.

## Workflow

### 1. Inventory the site

List every route, modal and multi-step flow that collects or displays personal
data. At minimum check:

- signup, login, profile and account settings;
- checkout, billing and payment methods;
- applications, KYC, certified copies, document upload;
- address books, contact details, dependants;
- support, chat and complaint forms;
- admin and staff views that show customer records;
- confirmation and summary screens, which often repeat the data as prose.

Search the codebase for the terms: `name`, `surname`, `fullName`, `idNumber`,
`passport`, `phone`, `mobile`, `email`, `address`, `street`, `suburb`,
`postal`, `dob`, `birth`, `bank`, `account`, `iban`, `tax`, `salary`,
`marital`, `gender`, `nationality`, `disability`, `document`, `upload`.
Also inspect rendered pages, because labels and components often hide the
field names.

Record the list before editing:

| Route or step     | What it shows               | Why it matters         |
| ----------------- | --------------------------- | ---------------------- |
| `/apply/identity` | Name, SA ID, date of birth  | Identity document step |
| `/apply/address`  | Street, suburb, postal code | Home address           |
| `/account`        | Email, phone                | Contact details        |

### 2. Inspect the real markup

For each page, open it with synthetic data filled in and inspect the elements
that actually contain the sensitive values. Check:

- Is the value in an `<input>`, `<textarea>`, `<select>`, `contenteditable`, a
  table cell, a paragraph, an image or a canvas?
- Does the control have a meaningful `name`, `id`, `autocomplete` or label?
  If yes, automatic detection probably covers it.
- Is the sensitive value repeated in a summary card, a confirmation banner or a
  heading? Those copies are not automatic.
- Is the element inside a component that re-renders, a shadow root or an iframe?
- Is the element in the viewport when a report is started? Screenshots are
  viewport-only, but the class still matters if the user scrolls.

### 3. Apply the right rule

Prefer the smallest rule that hides the data without destroying useful context.
Leave a normally labelled text field alone when automatic detection already
covers it; adding `ff-mask` there changes nothing and becomes stale if the
field is relabelled.

**A single form value, label should stay readable:**

```html
<label for="fullName">Full name, as on your ID</label>
<input id="fullName" class="ff-mask" />
```

Automatic detection normally clears this already. Add the class only if the
label is unusual or translated.

**A field row, including its label:**

```html
<div class="ff-mask">
  <label for="idNumber">ID number</label>
  <input id="idNumber" />
</div>
```

**A whole identity or document step:**

```html
<section class="ff-exclude" aria-label="Certified copy details">...</section>
```

This is the safest choice for certified copies, uploaded IDs, passport pages,
signatures and document previews. The reviewer sees a hatched block, not the
form.

**An address block:**

```html
<address class="ff-mask">12 Long Street, Cape Town, 8001</address>
```

If it contains a map, avatar or other image, use `ff-exclude` on the wrapper.

**A customer summary with one safe value:**

```html
<div class="ff-mask">
  <p>Jane Doe, 12 Long Street, Cape Town</p>
  <p class="ff-unmask">Preferred language: English</p>
</div>
```

**A radio group:**

```html
<fieldset>
  <legend>Marital status</legend>
  <div class="ff-mask">
    <label><input type="radio" name="marital" /> Single</label>
    <label><input type="radio" name="marital" /> Married</label>
    <label><input type="radio" name="marital" /> Widowed</label>
  </div>
</fieldset>
```

The question stays readable; the option labels are bullets. The selected dot
still shows a position, so use `ff-exclude` on the whole fieldset when the
selection itself is sensitive.

**An image, signature, document preview or chart:**

```html
<img class="ff-exclude" src="/id-document.png" alt="" />
<canvas class="ff-exclude"></canvas>
<div class="ff-exclude"><PdfPreview /></div>
```

**A table:**

```html
<td class="ff-mask">Jane Doe</td>
<td class="ff-exclude"><img src="/avatar.jpg" alt="" /></td>
```

`ff-exclude` keeps the table cell; it paints a hatched block in place of its
contents.

### 4. Cover the gaps

After the obvious fields, page through the whole flow and look for repeated
data:

- a summary screen repeating the name, ID and address as prose;
- an email or phone in a "contact us" panel;
- a file name in an upload list;
- an avatar or signature;
- a success page saying "Thanks, Dawid";
- an error message that echoes the submitted value.

Use `ff-mask` on the smallest paragraph or cell that contains the value. If
the value sits beside unrelated safe text, wrap only the value:

```html
<p>Application for <span class="ff-mask">Dawid Pieter Harmse</span></p>
```

### 5. Framework notes

- **React / Next.js**: use `className="ff-mask"` or `className="ff-exclude"`.
  Do not replace the class with a CSS module class.
- **Vue**: `class="ff-mask"`.
- **Angular**: `class="ff-mask"`; `[class.ff-mask]="true"` also works.
- **Svelte**: `class="ff-mask"`.
- **Server-rendered CMS or WordPress**: use the class or the `data-ff-*`
  attribute on the field wrapper, shortcode or block.
- **Component libraries**: put the rule on a stable wrapper if the component
  does not forward `className` or `class`. If it forwards arbitrary attributes,
  `data-ff-mask` is often safer.
- **Conditional rendering**: test both the empty and filled states. A class on
  a branch that is replaced on submit will not protect the next render.
- **Shared components**: check every use before adding a rule. A class on a
  shared address card can mask a billing form, a support view and an admin
  table; make the rule opt-in at the call site if the uses differ.
- **CSS**: `ff-*` classes are behaviour markers, not styling. Do not define
  them in a stylesheet and do not replace them with `filter: blur`,
  `visibility: hidden` or `display: none`. Blur can be reversed, and hiding an
  element changes the user's page.

### 6. Verify with a real capture

Use synthetic data only. Never put real customer data into a test report.

For every page or step changed:

1. Load the page and fill the fields with obvious fake data. Use plausible
   values so the automatic rules run: a valid-looking SA ID, a fake email
   such as `test.person@example.com`, a fake phone such as `082 555 0100`.
2. Hard refresh once so the latest widget is loaded. The widget bundle is
   served with `no-store`; older cached copies may not have automatic PII.
3. Start a report on the page, give it a clear test comment, and submit it.
4. Open the report in the Faster Fixes inbox and inspect the screenshot.
5. Confirm:
   - every personal value is gone or bulleted;
   - labels and layout still make sense;
   - safe values marked `ff-unmask` are still readable;
   - nothing important was masked by accident;
   - images, signatures and documents are hatched, not visible.
6. Check the page at the same scroll position and viewport size a reviewer
   would use. The capture is viewport-only.
7. Delete the test report when finished.

If a value still appears, inspect the live DOM:

- Is the class on the element that actually renders the value, or on a parent
  that a framework replaced?
- Is the value inside an iframe, shadow root or canvas? Classes cannot reach
  into those; exclude the host instead.
- Is the value an image? `ff-mask` does not change pixels; use `ff-exclude`.
- Is it a radio or checkbox selection? Use the group rule.
- Is the field label in another language? Add `ff-mask` or a correct
  `autocomplete`.
- Is the widget old? Hard refresh and check the bundle version.

### 7. Report the result

Return a short inventory with the rule used and the verification evidence:

| Page or step       | Element            | Rule         | Why                         | Verified           |
| ------------------ | ------------------ | ------------ | --------------------------- | ------------------ |
| `/apply/identity`  | Identity form      | `ff-exclude` | Whole certified-copy step   | Screenshot hatched |
| `/apply/contact`   | Name, phone, email | Automatic    | Labelled text fields        | Values blank       |
| `/apply/marital`   | Radio group        | `ff-exclude` | Selection is sensitive      | Screenshot hatched |
| `/apply/summary`   | Name paragraph     | `ff-mask`    | Name in prose               | Bullets            |
| `/apply/documents` | File list          | `ff-exclude` | File names contain a person | Hatched            |

Include a note for anything intentionally left visible and why.

## Anti-patterns

- Adding `ff-mask` to `<body>` or a whole route when one section is sensitive.
- Using `ff-unmask` to expose real personal data because a test was noisy.
- Relying on blur, pixelation, `display: none` or `visibility: hidden`.
- Using `.mk-exclude`, `.mk-mask` or `.mk-unmask`; this widget does not read
  them.
- Adding classes to a parent that a framework re-renders away.
- Masking the widget's own UI. It lives in a shadow root and is excluded
  automatically.
- Changing the widget package for a site-specific rule; put the rule in the
  site.
- Testing with real customer records.
- Masking everything and calling it done. Reviewers still need enough context
  to understand the report.

## Done when

- Every route and step in the inventory is either automatically covered or has
  an explicit rule, and the inventory table says which.
- Each changed page or step has a synthetic report whose screenshot shows no
  personal value, and the evidence is attached to the report.
- The gaps that remain are named, with the reason and the rule a future change
  should use.

## Copy-paste prompt for the implementing agent

> You are implementing Faster Fixes sensitive-data masking on an existing site.
> Follow `.claude/skills/sensitive-data-labelling/SKILL.md` exactly. Do not
> modify the widget package, API or database.
>
> 1. Inventory every route and multi-step flow that collects or displays
>    personal data. Include confirmation, summary and account pages.
> 2. Rely on automatic PII detection for normally labelled form fields. Add
>    `ff-mask`, `ff-exclude` or `data-ff-*` only for the gaps: radio and
>    checkbox groups, names and addresses in prose, translated labels, images,
>    signatures, documents, canvas, file lists, third-party components and
>    repeated values in summaries.
> 3. Prefer `ff-exclude` for entire identity, document and mixed-media
>    sections. Prefer `ff-mask` when labels and layout should remain readable.
>    Use `ff-unmask` only for a safe value inside a masked region.
> 4. Test every changed page with synthetic data by submitting a Faster Fixes
>    report and inspecting the screenshot. Do not use real personal data.
> 5. Return the page inventory, the changed files, and the verification
>    evidence. Call out anything still exposed and why.
