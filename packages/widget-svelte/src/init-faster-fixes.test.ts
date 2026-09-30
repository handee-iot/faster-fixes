import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "@fasterfixes/widget";
import { createFakeWidget } from "@fasterfixes/widget/testing";
import Root from "./test-components/Root.svelte";

vi.mock("@fasterfixes/widget", () => ({ init: vi.fn() }));

const initMock = vi.mocked(init);
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  initMock.mockImplementation(() => createFakeWidget());
});

afterEach(async () => {
  if (component) await unmount(component);
  component = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("initFasterFixes", () => {
  it("initialises the Widget with the option object unchanged", () => {
    const options = {
      projectId: "proj_1",
      apiOrigin: "https://api.example.com",
      color: "#ff0000",
      position: "top-left",
      labels: { submitButton: "Send" },
      captureDiagnostics: false,
    } as const;

    component = mount(Root, { target: document.body, props: { options } });
    flushSync();

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(options);
    expect(initMock.mock.calls[0]?.[0]).toBe(options);
    expect(document.body.textContent).toBe("true-0-true");
  });
});
