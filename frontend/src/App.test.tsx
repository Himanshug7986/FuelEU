import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HttpFuelEuApi } from "./adapters/infrastructure/httpFuelEuApi.js";
import { ApiProvider } from "./adapters/ui/apiContext.js";
import { RoutesTab } from "./adapters/ui/RoutesTab.js";

describe("RoutesTab", () => {
  it("renders table headers", async () => {
    const api = new HttpFuelEuApi("http://test");
    vi.spyOn(api, "listRoutes").mockResolvedValue([
      {
        routeId: "R001",
        vesselType: "Container",
        fuelType: "HFO",
        year: 2024,
        ghgIntensity: 91,
        fuelConsumption: 5000,
        distance: 12000,
        totalEmissions: 4500,
      },
    ]);
    vi.spyOn(api, "getComparison").mockResolvedValue({
      baseline: { routeId: "R001", ghgIntensity: 91 },
      targetIntensity: 89.3368,
      comparisons: [],
    });

    render(
      <ApiProvider api={api}>
        <RoutesTab />
      </ApiProvider>
    );

    expect(await screen.findByRole("columnheader", { name: /route id/i })).toBeInTheDocument();
    expect(await screen.findByText("R001")).toBeInTheDocument();
  });
});
