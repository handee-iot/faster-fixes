# ADR-0028: Personal data is detected automatically

- **Status**: Accepted
- **Date**: 2026-11-20

## Context

ADR-0027 masks what the markup marks. A real capture showed the limit: a
certified-copy application with a full name, South African ID number, date of
birth, phone, email and address was captured untouched because no one had added
`ff-mask` to the fields. Opt-in classes only work when every developer
remembers them, and the most sensitive screen is often the one nobody thought
about.

The user asked for names, ID numbers, addresses and similar personal data to be
redacted by default, not only passwords and card fields.

## Decision

Automatic personal-data masking is **always on**, client-side, on the same
capture clone as ADR-0027. It has two layers.

### Form fields

A text-like control (or a `select` or `contenteditable`) is treated like
`ff-mask` when any of its hints says it holds personal data:

- `autocomplete` tokens: name, given/family name, nickname, username, email,
  telephone, street address, address lines and levels, country, postal code,
  birth date, sex, organization title.
- `type="email"`, `type="tel"`, `inputmode` email/tel.
- `name`, `id`, `placeholder`, `aria-label`, associated `<label>`,
  `closest("label")` and `aria-labelledby` text containing personal-data terms:
  name, surname, ID/identity/passport, phone/mobile/cell, email, address,
  street, suburb, city, province, postal code, date of birth/DOB, bank/account/
  branch/IBAN, tax/VAT, salary/income, marital/gender/sex/nationality/race/
  ethnicity/religion/disability, licence number.

The control's value is cleared (property and attribute), a `select`'s selection
is cleared, option text and `contenteditable` text are bulleted. Labels stay
readable: the screenshot should still show what the form was asking for.

### Identifiers in text

Text nodes are scanned for:

- South African ID numbers: 13 digits, a valid date part and a valid Luhn check
  digit.
- Card numbers: 13 to 19 digits (spaces or hyphens allowed) that pass Luhn.
- Email addresses.
- South African phone numbers (`0XX XXX XXXX`, `0XXXXXXXXX`, `+27 ...`).
- Values beside a personal-data label, such as `Date of birth: 4 January 1983`,
  `Full name: Dawid`, `ID number: ...`, `Phone: ...`, `Address: ...`.
  `File name`, `Project name`, `Company name`, `Business name`, `Product name`,
  `Brand name`, `Document name`, `Page name`, `Host name`, `Server name` and
  `Application name` are excluded from the name rule.

`.ff-unmask` opts a field or region out of automatic detection, except inside an
automatically masked secret field (password, card, one-time code), which stays
locked.

There is no project setting: privacy is the default. A field that must stay
readable can carry `ff-unmask`.

## Alternatives considered

- **Client-side NLP or a named-entity model**: a reliable model is far larger
  than the widget's whole bundle, adds latency and language risk, and still
  cannot guarantee names in prose. Field semantics plus identifiers cover the
  real form case.
- **Server-side detection before storage**: too late by definition; the image
  would already have reached the server.
- **Only fields, no patterns**: misses an email or ID printed in a confirmation
  paragraph.
- **Only patterns**: names and addresses have no dependable shape.
- **Making it opt-in**: recreates the leak this decision exists to close.

## Consequences

- False positives are accepted in favour of privacy: a field called
  "Project name" or "File name" can be masked, and a 13-digit number that
  happens to look like an SA ID or a card can be bulleted. Labels and layout
  stay.
- Names and addresses in free prose without a label cannot be proven and still
  need `ff-mask`. Radio and checkbox group selections are not auto-detected;
  put `ff-mask` on the group or `ff-exclude` on the fieldset.
- The keyword vocabulary is English, with `autocomplete` and input types
  carrying most of the weight. Other languages need classes until the
  vocabulary is extended.
- SA ID and phone patterns are South African; more locales can be added behind
  the same detection function.
- The widget IIFE grew by 4.4KB (110.5KB to 114.9KB); the ceiling moved to
  120,000 in its own commit.
- Existing screenshots are not retroactive. Masking only affects captures made
  after the change.
