import { EnvironmentInjector } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "@fasterfixes/widget";
import { createFakeWidget } from "@fasterfixes/widget/testing";
import { provideFasterFixes } from "./provide-faster-fixes.js";

vi.mock("@fasterfixes/widget", () => ({ init: vi.fn() }));

const initMock = vi.mocked(init);

beforeEach(() => {
  initMock.mockImplementation(() => createFakeWidget());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("provideFasterFixes", () => {
  it("initialises the Widget with the option object unchanged", () => {
    const options = {
      projectId: "proj_1",
      apiOrigin: "https://api.example.com",
      color: "#ff0000",
      position: "top-left",
      labels: { submitButton: "Send" },
      captureDiagnostics: false,
    } as const;

    TestBed.configureTestingModule({
      providers: [provideFasterFixes(options)],
    });
    // Creating the injector runs the environment initializers.
    TestBed.inject(EnvironmentInjector);

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(options);
    expect(initMock.mock.calls[0]?.[0]).toBe(options);
  });
});
