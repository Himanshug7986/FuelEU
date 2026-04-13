import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiProvider } from "../apiContext.js";
import { CompareTab } from "../CompareTab.js";
import type { FuelEuApiPort } from "../../../core/ports/fuelEuApiPort.js";

beforeAll(() => {
  // Recharts' ResponsiveContainer uses ResizeObserver in jsdom.
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function makeApi(overrides?: Partial<FuelEuApiPort>): FuelEuApiPort {
  const api: FuelEuApiPort = {
    listRoutes: vi.fn(async () => []),
    setBaseline: vi.fn(async () => {}),
    getComparison: vi.fn(async () => ({
      baseline: { routeId: "R001", ghgIntensity: 91 },
      targetIntensity: 89.3368,
      comparisons: [{ routeId: "R002", ghgIntensity: 88, percentDiff: -3.29, compliant: true }],
    })),
    getComplianceCb: vi.fn(async (shipId, year) => ({ shipId, year, cbGco2eq: 0, energyMj: 0 })),
    getAdjustedCb: vi.fn(async (year) => ({ year, ships: [] })),
    getBankingRecords: vi.fn(async (shipId, year) => ({ shipId, year, records: [] })),
    bankSurplus: vi.fn(async () => ({ banked: 0 })),
    applyBanked: vi.fn(async (shipId, year, amount) => ({ shipId, year, cb_before: 0, applied: amount, cb_after: 0 })),
    createPool: vi.fn(async () => ({ poolId: "p", poolSum: 0, members: [] })),
    ...overrides,
  };
  return api;
}

describe("CompareTab", () => {
  it("renders comparison table when data loads", async () => {
    const api = makeApi();
    render(
      <ApiProvider api={api}>
        <CompareTab />
      </ApiProvider>
    );

    expect(await screen.findByRole("columnheader", { name: /% vs baseline/i })).toBeInTheDocument();
    expect(screen.getByText(/R001 \(baseline\)/i)).toBeInTheDocument();
    expect(screen.getByText("R002")).toBeInTheDocument();
    expect(screen.getByText(/-3\.29%/)).toBeInTheDocument();
  });

  it("shows friendly status on error", async () => {
    const api = makeApi({
      getComparison: vi.fn(async () => {
        throw new Error("No baseline route configured");
      }),
    });

    render(
      <ApiProvider api={api}>
        <CompareTab />
      </ApiProvider>
    );

    expect(await screen.findByRole("status")).toHaveTextContent(/baseline/i);
  });
});

