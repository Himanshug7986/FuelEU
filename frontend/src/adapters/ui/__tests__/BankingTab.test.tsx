import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiProvider } from "../apiContext.js";
import { BankingTab } from "../BankingTab.js";
import type { FuelEuApiPort } from "../../../core/ports/fuelEuApiPort.js";

function makeApi(overrides?: Partial<FuelEuApiPort>): FuelEuApiPort {
  const api: FuelEuApiPort = {
    listRoutes: vi.fn(async () => []),
    setBaseline: vi.fn(async () => {}),
    getComparison: vi.fn(async () => ({
      baseline: { routeId: "R001", ghgIntensity: 91 },
      targetIntensity: 89.3368,
      comparisons: [],
    })),
    getComplianceCb: vi.fn(async (shipId, year) => ({ shipId, year, cbGco2eq: 100, energyMj: 1_000 })),
    getAdjustedCb: vi.fn(async (year) => ({
      year,
      ships: [
        { shipId: "SHIP-002", adjustedCb: 100, bankedAmount: 0 },
        { shipId: "SHIP-003", adjustedCb: -50, bankedAmount: 10 },
      ],
    })),
    getBankingRecords: vi.fn(async (shipId, year) => ({
      shipId,
      year,
      records: [{ id: "1", amountGco2eq: 25, createdAt: "2026-01-01T00:00:00.000Z" }],
    })),
    bankSurplus: vi.fn(async () => ({ banked: 100 })),
    applyBanked: vi.fn(async (shipId, year, amount) => ({
      shipId,
      year,
      cb_before: -100,
      applied: amount,
      cb_after: -100 + amount,
    })),
    createPool: vi.fn(async () => ({ poolId: "p", poolSum: 0, members: [] })),
    ...overrides,
  };
  return api;
}

describe("BankingTab", () => {
  it("loads ships for year and shows CB + ledger", async () => {
    const api = makeApi();
    render(
      <ApiProvider api={api}>
        <BankingTab />
      </ApiProvider>
    );

    expect(await screen.findByText(/Current CB \(gCO₂e\)/i)).toBeInTheDocument();
    expect(api.getAdjustedCb).toHaveBeenCalledWith(2024);
    await waitFor(() => expect(api.getComplianceCb).toHaveBeenCalled());

    expect(screen.getByText(/Net bank ledger/i)).toBeInTheDocument();
    // ledger = 25
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("can change ship and bank surplus", async () => {
    const api = makeApi();
    render(
      <ApiProvider api={api}>
        <BankingTab />
      </ApiProvider>
    );

    const shipSelect = await screen.findByLabelText(/Ship for banking/i);
    fireEvent.change(shipSelect, { target: { value: "SHIP-003" } });
    await waitFor(() => expect(api.getComplianceCb).toHaveBeenCalledWith("SHIP-003", 2024));

    const bankBtn = screen.getByRole("button", { name: /bank surplus/i });
    fireEvent.click(bankBtn);
    await waitFor(() => expect(api.bankSurplus).toHaveBeenCalledWith("SHIP-003", 2024));
  }, 20_000);

  it("shows error on apply failure", async () => {
    const api = makeApi({
      getComplianceCb: vi.fn(async (shipId, year) => ({ shipId, year, cbGco2eq: -100, energyMj: 1 })),
      getBankingRecords: vi.fn(async (shipId, year) => ({ shipId, year, records: [{ id: "1", amountGco2eq: 1000, createdAt: "x" }] })),
      applyBanked: vi.fn(async () => {
        throw new Error("Amount exceeds available banked surplus");
      }),
    });

    render(
      <ApiProvider api={api}>
        <BankingTab />
      </ApiProvider>
    );

    const input = await screen.findByLabelText(/Amount \(gCO₂e\)/i);
    fireEvent.change(input, { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: /^Apply$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/exceeds available/i);
  });
});

