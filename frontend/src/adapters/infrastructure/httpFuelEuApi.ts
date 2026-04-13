import type { FuelEuApiPort, RouteFilters } from "../../core/ports/fuelEuApiPort.js";
import type {
  AdjustedCbResponse,
  ApplyBankResponse,
  CbResponse,
  ComparisonResponse,
  PoolCreateResponse,
  RouteDto,
} from "../../core/domain/types.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class HttpFuelEuApi implements FuelEuApiPort {
  constructor(private readonly baseUrl: string) {}

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(joinUrl(this.baseUrl, path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  }

  async listRoutes(filters?: RouteFilters): Promise<RouteDto[]> {
    const q = new URLSearchParams();
    if (filters?.vesselType) q.set("vesselType", filters.vesselType);
    if (filters?.fuelType) q.set("fuelType", filters.fuelType);
    if (filters?.year !== undefined) q.set("year", String(filters.year));
    const qs = q.toString();
    const res = await this.fetch(`/routes${qs ? `?${qs}` : ""}`);
    return parseJson<RouteDto[]>(res);
  }

  async setBaseline(routeId: string): Promise<void> {
    const res = await this.fetch(`/routes/${encodeURIComponent(routeId)}/baseline`, {
      method: "POST",
    });
    await parseJson<unknown>(res);
  }

  async getComparison(): Promise<ComparisonResponse> {
    const res = await this.fetch("/routes/comparison");
    return parseJson<ComparisonResponse>(res);
  }

  async getComplianceCb(shipId: string, year: number): Promise<CbResponse> {
    const q = new URLSearchParams({ year: String(year), shipId });
    const res = await this.fetch(`/compliance/cb?${q}`);
    return parseJson<CbResponse>(res);
  }

  async getAdjustedCb(year: number, shipId?: string): Promise<AdjustedCbResponse> {
    const q = new URLSearchParams({ year: String(year) });
    if (shipId) q.set("shipId", shipId);
    const res = await this.fetch(`/compliance/adjusted-cb?${q}`);
    return parseJson<AdjustedCbResponse>(res);
  }

  async getBankingRecords(
    shipId: string,
    year: number
  ): Promise<{
    shipId: string;
    year: number;
    records: { id: string; amountGco2eq: number; createdAt: string }[];
  }> {
    const q = new URLSearchParams({ year: String(year), shipId });
    const res = await this.fetch(`/banking/records?${q}`);
    return parseJson(res);
  }

  async bankSurplus(shipId: string, year: number): Promise<{ banked: number }> {
    const res = await this.fetch("/banking/bank", {
      method: "POST",
      body: JSON.stringify({ shipId, year }),
    });
    return parseJson(res);
  }

  async applyBanked(shipId: string, year: number, amount: number): Promise<ApplyBankResponse> {
    const res = await this.fetch("/banking/apply", {
      method: "POST",
      body: JSON.stringify({ shipId, year, amount }),
    });
    return parseJson(res);
  }

  async createPool(
    year: number,
    members: { shipId: string; adjustedCb: number }[]
  ): Promise<PoolCreateResponse> {
    const res = await this.fetch("/pools", {
      method: "POST",
      body: JSON.stringify({ year, members }),
    });
    return parseJson(res);
  }
}
