import { useCallback, useEffect, useMemo, useState } from "react";
import type { RouteDto } from "../../core/domain/types.js";
import { useApi } from "./apiContext.js";

export function RoutesTab(): JSX.Element {
  const api = useApi();
  const [rows, setRows] = useState<RouteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [vesselType, setVesselType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [year, setYear] = useState<string>("");
  const [currentBaseline, setCurrentBaseline] = useState<string | null>(null);
  const [savingBaseline, setSavingBaseline] = useState<string | null>(null);
  const [baselineErr, setBaselineErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await api.listRoutes({
        vesselType: vesselType || undefined,
        fuelType: fuelType || undefined,
        year: year ? Number(year) : undefined,
      });
      setRows(data);
      try {
        const c = await api.getComparison();
        setCurrentBaseline(c.baseline.routeId);
      } catch {
        setCurrentBaseline(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [api, vesselType, fuelType, year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSetBaseline(routeId: string) {
    setBaselineErr(null);
    setSavingBaseline(routeId);
    try {
      await api.setBaseline(routeId);
      setCurrentBaseline(routeId);
    } catch (e) {
      setBaselineErr(e instanceof Error ? e.message : "Could not set baseline");
    } finally {
      setSavingBaseline(null);
    }
  }

  const vesselOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.vesselType));
    return [...s].sort();
  }, [rows]);

  const fuelOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.fuelType));
    return [...s].sort();
  }, [rows]);

  const yearOptions = useMemo(() => {
    const s = new Set<number>();
    rows.forEach((r) => s.add(r.year));
    return [...s].sort((a, b) => b - a);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          <span>Vessel type</span>
          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
            value={vesselType}
            onChange={(e) => setVesselType(e.target.value)}
            aria-label="Filter by vessel type"
          >
            <option value="">All</option>
            {vesselOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          <span>Fuel type</span>
          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            aria-label="Filter by fuel type"
          >
            <option value="">All</option>
            {fuelOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          <span>Year</span>
          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Filter by year"
          >
            <option value="">All</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="w-full sm:w-auto rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-red-200 text-sm" role="alert">
          {err}
        </div>
      )}

      {baselineErr && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-red-200 text-sm" role="alert">
          {baselineErr}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800 touch-pan-y">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Route ID
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Vessel
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Fuel
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Year
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                GHG (gCO₂e/MJ)
              </th>
              <th scope="col" className="hidden sm:table-cell px-4 py-3 font-medium">
                Fuel (t)
              </th>
              <th scope="col" className="hidden lg:table-cell px-4 py-3 font-medium">
                Distance (km)
              </th>
              <th scope="col" className="hidden lg:table-cell px-4 py-3 font-medium">
                Emissions (t)
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Baseline
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isBaseline = r.routeId === currentBaseline;
                return (
                  <tr
                    key={r.routeId}
                    className={`border-t border-slate-800 hover:bg-slate-900/50 ${isBaseline ? "bg-amber-950/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {r.routeId}
                      {isBaseline && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300 bg-amber-900/40 px-1.5 py-0.5 rounded">
                          baseline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.vesselType}</td>
                    <td className="px-4 py-3">{r.fuelType}</td>
                    <td className="px-4 py-3">{r.year}</td>
                    <td className="px-4 py-3">{r.ghgIntensity}</td>
                    <td className="hidden sm:table-cell px-4 py-3">{r.fuelConsumption}</td>
                    <td className="hidden lg:table-cell px-4 py-3">{r.distance}</td>
                    <td className="hidden lg:table-cell px-4 py-3">{r.totalEmissions}</td>
                    <td className="px-4 py-3">
                      {isBaseline ? (
                        <span className="text-xs text-amber-300 font-medium">Active</span>
                      ) : (
                        <button
                          type="button"
                          className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          disabled={savingBaseline !== null}
                          onClick={() => void onSetBaseline(r.routeId)}
                        >
                          {savingBaseline === r.routeId ? "Saving…" : "Set as baseline"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
