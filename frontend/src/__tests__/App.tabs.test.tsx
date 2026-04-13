import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { FuelEuApiPort } from "../core/ports/fuelEuApiPort.js";

beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const { api } = vi.hoisted(() => {
  const api: FuelEuApiPort = {
    listRoutes: vi.fn(async () => []),
    setBaseline: vi.fn(async () => {}),
    getComparison: vi.fn(async () => ({
      baseline: { routeId: "R001", ghgIntensity: 91 },
      targetIntensity: 89.3368,
      comparisons: [],
    })),
    getComplianceCb: vi.fn(async () => ({ shipId: "SHIP-002", year: 2024, cbGco2eq: 1, energyMj: 1 })),
    getAdjustedCb: vi.fn(async () => ({
      year: 2024,
      ships: [{ shipId: "SHIP-002", adjustedCb: 1, bankedAmount: 0 }],
    })),
    getBankingRecords: vi.fn(async () => ({ shipId: "SHIP-002", year: 2024, records: [] })),
    bankSurplus: vi.fn(async () => ({ banked: 1 })),
    applyBanked: vi.fn(async () => ({ shipId: "SHIP-002", year: 2024, cb_before: -1, applied: 1, cb_after: 0 })),
    createPool: vi.fn(async () => ({
      poolId: "p",
      poolSum: 0,
      members: [
        { shipId: "SHIP-002", cbBefore: 1, cbAfter: 1 },
        { shipId: "SHIP-003", cbBefore: -1, cbAfter: 0 },
      ],
    })),
  };
  return { api };
});

vi.mock("../adapters/infrastructure/httpFuelEuApi.js", () => {
  return {
    HttpFuelEuApi: class {
      constructor() {
        return api;
      }
    },
  };
});

import { App } from "../App.js";

describe("App", () => {
  it("renders header and switches tabs", async () => {
    render(<App />);

    expect(screen.getByText(/FuelEU Maritime/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Routes" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Compare" }));
    expect(screen.getByRole("tab", { name: "Compare" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("columnheader", { name: /route/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Banking" }));
    expect(await screen.findByText(/Article 20/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Pooling" }));
    expect(await screen.findByText(/Article 21/i)).toBeInTheDocument();
  }, 20_000);
});

