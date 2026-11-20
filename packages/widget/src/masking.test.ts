// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  maskSensitiveData,
  maskText,
  prepareCaptureMasking,
} from "./masking.js";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(html: string) {
  document.body.innerHTML = html;
  return document.body;
}

/** jsdom has no layout; give an element the box a real browser would report. */
function withBox(element: Element, width: number, height: number) {
  element.getBoundingClientRect = () =>
    ({ width, height, top: 0, left: 0 }) as DOMRect;
}

describe("maskText", () => {
  it("replaces every non-whitespace character and keeps the shape", () => {
    expect(maskText("Hello world")).toBe("••••• •••••");
    expect(maskText("a\nb\tc")).toBe("•\n•\t•");
    expect(maskText("   ")).toBe("   ");
  });
});

describe("ff-mask", () => {
  it("masks the element's text and its descendants only", () => {
    const root = mount(`
      <div class="ff-mask"><p>Account 12345</p><div><span>Nested</span></div></div>
      <p id="outside">Visible</p>
    `);

    maskSensitiveData(root);

    const masked = root.querySelector(".ff-mask") as HTMLElement;
    expect(masked.querySelector("p")?.textContent).toBe(
      maskText("Account 12345"),
    );
    expect(masked.querySelector("span")?.textContent).toBe(maskText("Nested"));
    expect(root.querySelector("#outside")?.textContent).toBe("Visible");
  });

  it("lets ff-unmask restore a descendant in a masked region", () => {
    const root = mount(`
      <div class="ff-mask">
        <p>Secret</p>
        <span class="ff-unmask">Public <b class="ff-mask">Hidden</b></span>
      </div>
    `);

    maskSensitiveData(root);

    const masked = root.querySelector(".ff-mask") as HTMLElement;
    expect(masked.querySelector("p")?.textContent).toBe(maskText("Secret"));
    const unmasked = masked.querySelector(".ff-unmask") as HTMLElement;
    expect(unmasked.textContent).toBe(`Public ${maskText("Hidden")}`);
    expect(unmasked.querySelector("b")?.textContent).toBe(maskText("Hidden"));
  });

  it("clears input values and image alt text inside a masked region", () => {
    const root = mount(`
      <div class="ff-mask">
        <input id="name" value="Dawie" placeholder="Your name" />
        <img id="photo" src="photo.png" alt="Dawie portrait" />
      </div>
    `);

    maskSensitiveData(root);

    expect(root.querySelector("#name")?.hasAttribute("value")).toBe(false);
    expect(root.querySelector("#name")?.hasAttribute("placeholder")).toBe(
      false,
    );
    expect(root.querySelector("#photo")?.hasAttribute("alt")).toBe(false);
    expect(root.querySelector("#photo")?.getAttribute("src")).toBe("photo.png");
  });
});

describe("ff-exclude", () => {
  it("replaces the element with a measured block and drops its content", () => {
    const root = mount(`
      <div class="ff-exclude" id="card">
        <p>Card 4111 1111 1111 1111</p>
        <img src="receipt.png" alt="receipt" />
      </div>
      <p id="after">After</p>
    `);
    const card = root.querySelector("#card") as HTMLElement;
    withBox(card, 200, 80);

    const masking = prepareCaptureMasking(document);
    maskSensitiveData(root, masking);
    masking.cleanup();

    const block = root.querySelector("#card") as HTMLElement;
    expect(block.textContent).toBe("");
    expect(block.querySelector("img")).toBeNull();
    expect(block.style.width).toBe("200px");
    expect(block.style.height).toBe("80px");
    expect(block.style.background).toContain("repeating-linear-gradient");
    expect(root.querySelector("#after")?.textContent).toBe("After");
  });

  it("applies without a prepared capture, just without a measured box", () => {
    const root = mount(`<div class="ff-exclude" id="secret">Secret</div>`);

    maskSensitiveData(root);

    const block = root.querySelector("#secret") as HTMLElement;
    expect(block.textContent).toBe("");
    expect(block.style.background).toContain("repeating-linear-gradient");
  });
});

describe("automatic secret fields", () => {
  it("masks password, card and one-time-code controls without a class", () => {
    const root = mount(`
      <input id="pw" type="password" value="hunter2" />
      <input id="cc" autocomplete="cc-number" value="4111111111111111" />
      <input id="otp" autocomplete="one-time-code" value="123456" />
      <input id="plain" value="keep me" />
      <textarea id="pw2" autocomplete="current-password">secret</textarea>
      <select id="exp" autocomplete="cc-exp"><option selected>12/30</option></select>
    `);

    maskSensitiveData(root);

    for (const id of ["#pw", "#cc", "#otp"]) {
      expect(root.querySelector(id)?.hasAttribute("value")).toBe(false);
    }
    expect(root.querySelector("#plain")?.getAttribute("value")).toBe("keep me");
    expect(root.querySelector("#pw2")?.textContent).toBe("");
    expect(root.querySelector("#exp")?.textContent).toMatch(/^(?:|\u2022+)$/);
  });

  it("cannot be unmasked by a descendant", () => {
    const root = mount(`
      <div class="ff-mask">
        <span class="ff-unmask"><input id="pw" type="password" value="x" /></span>
      </div>
      <input id="pw2" class="ff-unmask" type="password" value="y" />
    `);

    maskSensitiveData(root);

    expect(root.querySelector("#pw")?.hasAttribute("value")).toBe(false);
    expect(root.querySelector("#pw2")?.hasAttribute("value")).toBe(false);
  });
});

describe("attribute forms", () => {
  it("honours data-ff-mask, data-ff-unmask and data-ff-exclude", () => {
    const root = mount(`
      <div data-ff-mask>
        <p>Secret</p>
        <span data-ff-unmask>Public</span>
      </div>
      <div data-ff-exclude id="excluded"><p>Card</p></div>
    `);

    maskSensitiveData(root);

    expect(root.querySelector("[data-ff-mask] > p")?.textContent).toBe(
      maskText("Secret"),
    );
    expect(root.querySelector("[data-ff-unmask]")?.textContent).toBe("Public");
    expect(root.querySelector("#excluded")?.textContent).toBe("");
  });
});

describe("automatic personal data", () => {
  it("clears fields named or labelled as personal data", () => {
    const root = mount(`
      <label for="fullName">Full name, as on your ID</label>
      <input id="fullName" value="Dawid Pieter Harmse" />
      <label for="idNumber">ID number</label>
      <input id="idNumber" value="8301045067083" />
      <label for="email">Email</label>
      <input id="email" type="email" value="dawie@example.com" />
      <label for="phone">Phone number</label>
      <input id="phone" value="0825672884" />
      <label for="address">Home address</label>
      <input id="address" value="12 Main Street" />
      <label for="search">Search</label>
      <input id="search" value="invoice" />
    `);

    maskSensitiveData(root);

    for (const id of [
      "#fullName",
      "#idNumber",
      "#email",
      "#phone",
      "#address",
    ]) {
      expect(root.querySelector(id)?.hasAttribute("value")).toBe(false);
    }
    expect(root.querySelector("#search")?.getAttribute("value")).toBe(
      "invoice",
    );
  });

  it("masks identifiers in ordinary text", () => {
    const root = mount(
      `<p id="note">Email dawie@example.com, ID 8301045067083, call 0825672884.</p>`,
    );

    maskSensitiveData(root);

    const text = root.querySelector("#note")?.textContent ?? "";
    expect(text).not.toContain("dawie@example.com");
    expect(text).not.toContain("8301045067083");
    expect(text).not.toContain("0825672884");
  });

  it("masks a contenteditable address", () => {
    const root = mount(
      `<div id="editor" contenteditable="true" aria-label="Home address">12 Main Street</div>`,
    );

    maskSensitiveData(root);

    expect(root.querySelector("#editor")?.textContent).not.toContain("Main");
  });

  it("hides a personal select value", () => {
    const root = mount(`
      <label for="marital">Marital status</label>
      <select id="marital"><option selected>Married out of community</option></select>
    `);

    maskSensitiveData(root);

    expect(root.querySelector("#marital")?.textContent).not.toContain(
      "Married",
    );
  });

  it("lets ff-unmask opt out of automatic detection, except for secrets", () => {
    const root = mount(`
      <p>dawie@example.com</p>
      <p id="kept" class="ff-unmask">dawie@example.com</p>
      <label for="name">Full name</label>
      <input id="name" class="ff-unmask" value="Dawid" />
      <input id="pw" class="ff-unmask" type="password" value="hunter2" />
    `);

    maskSensitiveData(root);

    expect(root.querySelector("p")?.textContent).not.toContain(
      "dawie@example.com",
    );
    expect(root.querySelector("#kept")?.textContent).toContain(
      "dawie@example.com",
    );
    expect(root.querySelector("#name")?.getAttribute("value")).toBe("Dawid");
    expect(root.querySelector("#pw")?.hasAttribute("value")).toBe(false);
  });
});
