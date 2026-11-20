// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { isPiiField, maskPiiText } from "./pii.js";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(html: string) {
  document.body.innerHTML = html;
  return document.body;
}

function only(field: Element | null): Element {
  if (!field) throw new Error("No field in fixture");
  return field;
}

describe("isPiiField", () => {
  it("detects a control from its label", () => {
    mount(`
      <label for="fullName">Full name, as on your ID</label>
      <input id="fullName" />
      <label for="idNumber">ID number</label>
      <input id="idNumber" />
      <label for="phone">Phone number</label>
      <input id="phone" />
      <label for="email">Email</label>
      <input id="email" />
      <label for="address">Home address</label>
      <input id="address" />
      <label for="dob">Date of birth</label>
      <input id="dob" />
    `);

    for (const id of [
      "#fullName",
      "#idNumber",
      "#phone",
      "#email",
      "#address",
      "#dob",
    ]) {
      expect(isPiiField(only(document.querySelector(id)))).toBe(true);
    }
  });

  it("detects descriptive ids, autocomplete tokens and input types", () => {
    mount(`
      <input id="fullName" />
      <input id="nothing" autocomplete="name" />
      <input id="nothing2" autocomplete="street-address" />
      <input id="nothing3" type="email" />
      <input id="nothing4" type="tel" />
      <textarea id="homeAddress"></textarea>
    `);

    for (const id of [
      "#fullName",
      "#nothing",
      "#nothing2",
      "#nothing3",
      "#nothing4",
      "#homeAddress",
    ]) {
      expect(isPiiField(only(document.querySelector(id)))).toBe(true);
    }
  });

  it("detects contenteditable and select controls", () => {
    mount(`
      <div id="editor" contenteditable="true" aria-label="Home address"></div>
      <label for="marital">Marital status</label>
      <select id="marital"><option>Single</option></select>
    `);

    expect(isPiiField(only(document.querySelector("#editor")))).toBe(true);
    expect(isPiiField(only(document.querySelector("#marital")))).toBe(true);
  });

  it("leaves ordinary controls alone", () => {
    mount(`
      <label for="search">Search</label>
      <input id="search" value="invoice" />
      <label for="company">Company</label>
      <input id="company" value="Handee" />
      <label for="agree">Email me about updates</label>
      <input id="agree" type="checkbox" />
      <label for="upload">Passport</label>
      <input id="upload" type="file" />
    `);

    for (const id of ["#search", "#company", "#agree", "#upload"]) {
      expect(isPiiField(only(document.querySelector(id)))).toBe(false);
    }
  });
});

describe("maskPiiText", () => {
  it("masks email addresses", () => {
    expect(maskPiiText("Write to dawie@example.com please")).not.toContain(
      "dawie@example.com",
    );
  });

  it("masks a valid South African ID number, but not an arbitrary 13 digits", () => {
    expect(maskPiiText("ID 8301045067083")).not.toContain("8301045067083");
    expect(maskPiiText("Order 1234567890123")).toContain("1234567890123");
  });

  it("masks card numbers that pass Luhn", () => {
    expect(maskPiiText("Card 4111 1111 1111 1111")).not.toContain(
      "4111 1111 1111 1111",
    );
    expect(maskPiiText("Reference 4111 1111 1111 1112")).toContain(
      "4111 1111 1111 1112",
    );
  });

  it("masks South African phone numbers", () => {
    expect(maskPiiText("Call 0825672884")).not.toContain("0825672884");
    expect(maskPiiText("Call 082 567 2884")).not.toContain("082 567 2884");
    expect(maskPiiText("Call +27 82 567 2884")).not.toContain(
      "+27 82 567 2884",
    );
  });

  it("masks the value beside a personal-data label", () => {
    const masked = maskPiiText("Date of birth: 4 January 1983.");
    expect(masked).toContain("Date of birth: ");
    expect(masked).not.toContain("1983");

    const named = maskPiiText("Full name: Dawid Pieter Harmse");
    expect(named).toContain("Full name: ");
    expect(named).not.toContain("Dawid");
  });

  it("does not mistake file, project or company names for personal names", () => {
    for (const value of [
      "File name: report.pdf",
      "Project name: Kinstead",
      "Company name: Acme",
    ]) {
      expect(maskPiiText(value)).toBe(value);
    }
  });
});
