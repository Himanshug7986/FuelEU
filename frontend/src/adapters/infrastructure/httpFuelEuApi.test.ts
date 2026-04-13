import { describe, expect, it, vi } from "vitest";
import { HttpFuelEuApi } from "./httpFuelEuApi.js";

describe("HttpFuelEuApi", () => {
  it("listRoutes uses query params and parses JSON", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [{ routeId: "R001" }],
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const api = new HttpFuelEuApi("http://example");
    const out = await api.listRoutes({ vesselType: "Container", year: 2024 });

    expect(out).toHaveLength(1);
    expect(out[0]!.routeId).toBe("R001");
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(firstCall[0]).toMatch(/\/routes\?/);
    expect(firstCall[0]).toMatch(/vesselType=Container/);
    expect(firstCall[0]).toMatch(/year=2024/);

    vi.unstubAllGlobals();
  });

  it("setBaseline calls POST and accepts 204", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock as any);

    const api = new HttpFuelEuApi("http://example");
    await api.setBaseline("R002");

    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(firstCall[0]).toContain("/routes/R002/baseline");
    expect(firstCall[1]?.method).toBe("POST");

    vi.unstubAllGlobals();
  });

  it("propagates API error message from {error}", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "No baseline route configured" }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const api = new HttpFuelEuApi("http://example");
    await expect(api.getComparison()).rejects.toThrow(/no baseline/i);

    vi.unstubAllGlobals();
  });
});

