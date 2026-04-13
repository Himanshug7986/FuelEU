import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApiProvider } from "../apiContext.js";
import { PoolingTab } from "../PoolingTab.js";
import type { FuelEuApiPort } from "../../../core/ports/fuelEuApiPort.js";

type PoolMemberInput = { shipId: string; adjustedCb: number };

function makeApi(overrides?: Partial<FuelEuApiPort>): FuelEuApiPort {
  const api: FuelEuApiPort = {
    listRoutes: vi.fn(async () => []),
    setBaseline: vi.fn(async () => {}),
    getComparison: vi.fn(async () => ({ baseline: { routeId: "R001", ghgIntensity: 91 }, targetIntensity: 89.3368, comparisons: [] })),
    getComplianceCb: vi.fn(async (shipId, year) => ({ shipId, year, cbGco2eq: 0, energyMj: 0 })),
    getAdjustedCb: vi.fn(async (year) => ({
      year,
      ships: [
        { shipId: "SHIP-004", adjustedCb: 10, bankedAmount: 0 },
        { shipId: "SHIP-005", adjustedCb: -10, bankedAmount: 0 },
      ],
    })),
    getBankingRecords: vi.fn(async (shipId, year) => ({ shipId, year, records: [] })),
    bankSurplus: vi.fn(async () => ({ banked: 0 })),
    applyBanked: vi.fn(async (shipId, year, amount) => ({ shipId, year, cb_before: 0, applied: amount, cb_after: 0 })),
    createPool: vi.fn(async (_year: number, members: PoolMemberInput[]) => ({
      poolId: "pool-1",
      poolSum: members.reduce((a: number, m: PoolMemberInput) => a + m.adjustedCb, 0),
      members: members.map((m: PoolMemberInput) => ({ shipId: m.shipId, cbBefore: m.adjustedCb, cbAfter: 0 })),
    })),
    ...overrides,
  };
  return api;
}

describe("PoolingTab", () => {
  it("disables Create pool until valid selection; then shows result and CB after column updates", async () => {
    const api = makeApi();
    render(
      <ApiProvider api={api}>
        <PoolingTab />
      </ApiProvider>
    );

    expect(await screen.findByText(/Pool sum \(selected\)/i)).toBeInTheDocument();
    const createBtn = screen.getByRole("button", { name: /create pool/i });
    expect(createBtn).toBeDisabled();

    const cb1 = await screen.findByLabelText(/Include SHIP-004 in pool/i);
    const cb2 = await screen.findByLabelText(/Include SHIP-005 in pool/i);
    fireEvent.click(cb1);
    fireEvent.click(cb2);

    // Sum is 0, valid with 2 ships
    await waitFor(() => expect(createBtn).not.toBeDisabled());
    fireEvent.click(createBtn);

    const poolHeading = await screen.findByText(/Pool pool-1/i);
    const poolCard = poolHeading.closest("div") ?? poolHeading.parentElement ?? document.body;
    expect(within(poolCard).getAllByText("SHIP-004").length).toBeGreaterThan(0);
    expect(within(poolCard).getAllByText("SHIP-005").length).toBeGreaterThan(0);
  }, 20_000);

  it("shows error alert when API fails", async () => {
    const api = makeApi({
      getAdjustedCb: vi.fn(async () => {
        throw new Error("Boom");
      }),
    });

    render(
      <ApiProvider api={api}>
        <PoolingTab />
      </ApiProvider>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
  });
});

