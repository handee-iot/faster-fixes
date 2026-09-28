import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "@fasterfixes/widget";
import { createFakeWidget } from "@fasterfixes/widget/testing";
import { createFasterFixes } from "./create-faster-fixes.js";

vi.mock("@fasterfixes/widget", () => ({ init: vi.fn() }));

const initMock = vi.mocked(init);

beforeEach(() => {
  initMock.mockImplementation(() => createFakeWidget());
});

afterEach(() => {
  vi.clearAllMocks();
});

const Child = defineComponent(() => () => h("p", "child"));

describe("createFasterFixes", () => {
  it("initialises the Widget with the option object unchanged", () => {
    const options = {
      projectId: "proj_1",
      apiOrigin: "https://api.example.com",
      color: "#ff0000",
      position: "top-left",
      labels: { submitButton: "Send" },
      captureDiagnostics: false,
    } as const;

    const wrapper = mount(Child, {
      global: { plugins: [createFasterFixes(options)] },
    });

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(options);
    expect(initMock.mock.calls[0]?.[0]).toBe(options);
    expect(wrapper.text()).toBe("child");
  });
});
