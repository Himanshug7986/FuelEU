import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdjustedShip, PoolCreateResponse } from "../../core/domain/types.js";
import { formatNumber } from "../../core/application/formatting.js";
import { useApi } from "./apiContext.js";

export function PoolingTab(): JSX.Element {
  const api = useApi();
  const [year, setYear] = useState(2024);
  const [ships, setShips] = useState<AdjustedShip[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<PoolCreateResponse | null>(null);
  /** CB after pool allocation from the last successful POST /pools (only ships that were in that pool). */
  const [cbAfterByShip, setCbAfterByShip] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.getAdjustedCb(year);
      setShips(r.ships);
      setSelected({});
      setResult(null);
      setCbAfterByShip({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load ships");
    } finally {
      setLoading(false);
    }
  }, [api, year]);

  const refreshShipsOnly = useCallback(async () => {
    const r = await api.getAdjustedCb(year);
    setShips(r.ships);
  }, [api, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const members = useMemo(
    () => ships.filter((s) => selected[s.shipId]),
    [ships, selected]
  );

  const poolSum = useMemo(() => members.reduce((a, m) => a + m.adjustedCb, 0), [members]);

  const poolValid = members.length >= 2 && poolSum >= 0;

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
    setResult(null);
  }

  async function onCreate() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.createPool(
        year,
        members.map((m) => ({ shipId: m.shipId, adjustedCb: m.adjustedCb }))
      );
      setResult(r);
      setCbAfterByShip(Object.fromEntries(r.members.map((m) => [m.shipId, m.cbAfter])));
      setSelected({});
      await refreshShipsOnly();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pool creation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Article 21 — Pooling. <strong className="text-slate-300">CB before</strong> is the entering position from{" "}
        <code className="text-cyan-300 bg-slate-900 px-1 rounded">GET /compliance/adjusted-cb</code>.{" "}
        <strong className="text-slate-300">CB after</strong> appears once a pool is created (per ship in that pool).
        Banked (ledger) is unchanged. Pool is valid when ∑ CB before ≥ 0 and at least two members are selected.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_auto] gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Year
          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </label>
        <button
          type="button"
          className="w-full sm:w-auto sm:mt-6 rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700"
          onClick={() => void load()}
        >
          Reload
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-red-200 text-sm" role="alert">
          {err}
        </div>
      )}

      <div
        className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${
          poolSum >= 0 ? "border-emerald-800 bg-emerald-950/20" : "border-red-900/60 bg-red-950/30"
        }`}
      >
        <span className="text-sm text-slate-300">Pool sum (selected)</span>
        <span className={`text-lg font-semibold font-mono ${poolSum >= 0 ? "text-emerald-300" : "text-red-300"}`}>
          {loading ? "…" : formatNumber(poolSum, 0)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 touch-pan-y">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 w-12">
                Pool
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Ship
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                CB before
              </th>
              <th scope="col" className="hidden sm:table-cell px-4 py-3 font-medium">
                CB after
              </th>
              <th scope="col" className="hidden lg:table-cell px-4 py-3 font-medium">
                Banked (ledger)
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              ships.map((s) => (
                <tr key={s.shipId} className="border-t border-slate-800 hover:bg-slate-900/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!selected[s.shipId]}
                      onChange={() => toggle(s.shipId)}
                      aria-label={`Include ${s.shipId} in pool`}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-cyan-300">{s.shipId}</td>
                  <td className="px-4 py-3">{formatNumber(s.adjustedCb, 0)}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-slate-300">
                    {Object.hasOwn(cbAfterByShip, s.shipId)
                      ? formatNumber(cbAfterByShip[s.shipId] ?? 0, 0)
                      : "—"}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-slate-400">{formatNumber(s.bankedAmount, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        disabled={!poolValid || busy}
        className="w-full sm:w-auto rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-500"
        onClick={() => void onCreate()}
      >
        Create pool
      </button>

      {result && (
        <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-4 space-y-3">
          <h3 className="text-sm font-medium text-violet-200">Pool {result.poolId}</h3>
          <p className="text-xs text-slate-500">Pool sum: {formatNumber(result.poolSum, 0)}</p>
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="py-2 pr-4">Ship</th>
                <th className="py-2 pr-4">CB before</th>
                <th className="py-2">CB after</th>
              </tr>
            </thead>
            <tbody>
              {result.members.map((m) => (
                <tr key={m.shipId} className="border-t border-slate-800">
                  <td className="py-2 pr-4 font-mono">{m.shipId}</td>
                  <td className="py-2 pr-4">{formatNumber(m.cbBefore, 0)}</td>
                  <td className="py-2">{formatNumber(m.cbAfter, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
