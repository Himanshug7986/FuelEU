import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SHIP_ID } from "../../shared/constants.js";
import { formatNumber } from "../../core/application/formatting.js";
import type { AdjustedShip, ApplyBankResponse, CbResponse } from "../../core/domain/types.js";
import { useApi } from "./apiContext.js";

export function BankingTab(): JSX.Element {
  const api = useApi();
  const [year, setYear] = useState(2024);
  const [shipId, setShipId] = useState(DEFAULT_SHIP_ID);
  const [shipsForYear, setShipsForYear] = useState<AdjustedShip[]>([]);
  const [shipsLoading, setShipsLoading] = useState(true);
  const [cb, setCb] = useState<CbResponse | null>(null);
  const [bankedLedger, setBankedLedger] = useState(0);
  const [applyAmount, setApplyAmount] = useState("");
  const [lastApply, setLastApply] = useState<ApplyBankResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Loads ships for the year, fixes ship if missing for that year, then loads CB + ledger. */
  const refresh = useCallback(async () => {
    setErr(null);
    setShipsLoading(true);
    try {
      const r = await api.getAdjustedCb(year);
      setShipsForYear(r.ships);
      const ids = r.ships.map((s) => s.shipId);
      let sid = shipId;
      if (!ids.includes(sid)) {
        sid = r.ships[0]?.shipId ?? DEFAULT_SHIP_ID;
        setShipId(sid);
      }
      const c = await api.getComplianceCb(sid, year);
      const rec = await api.getBankingRecords(sid, year);
      setCb(c);
      setBankedLedger(rec.records.reduce((a, row) => a + row.amountGco2eq, 0));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setShipsLoading(false);
    }
  }, [api, year, shipId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setLastApply(null);
  }, [shipId, year]);

  const currentCb = cb?.cbGco2eq ?? 0;
  const bankDisabled = busy || shipsLoading || currentCb <= 0;
  const applyVal = Number(applyAmount);
  const applyDisabled =
    busy ||
    shipsLoading ||
    !Number.isFinite(applyVal) ||
    applyVal <= 0 ||
    bankedLedger <= 0 ||
    currentCb >= 0;

  async function onBank() {
    setBusy(true);
    setErr(null);
    try {
      await api.bankSurplus(shipId, year);
      setLastApply(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bank failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApply() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.applyBanked(shipId, year, applyVal);
      setLastApply(r);
      setApplyAmount("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-slate-400 text-sm">
        Article 20 — Banking. Compliance balance from{" "}
        <code className="text-cyan-300 bg-slate-900 px-1 rounded">GET /compliance/cb</code> for the selected ship and
        year. Ships listed for the chosen year come from{" "}
        <code className="text-cyan-300 bg-slate-900 px-1 rounded">GET /compliance/adjusted-cb</code>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Year
          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Reporting year"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Ship
          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 font-mono"
            value={shipId}
            onChange={(e) => setShipId(e.target.value)}
            disabled={shipsLoading || shipsForYear.length === 0}
            aria-label="Ship for banking"
          >
            {shipsForYear.length === 0 && !shipsLoading ? (
              <option value={shipId}>{shipId}</option>
            ) : (
              shipsForYear.map((s) => (
                <option key={s.shipId} value={s.shipId}>
                  {s.shipId} — adj. CB {formatNumber(s.adjustedCb, 0)}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          className="w-full sm:w-auto rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700"
          onClick={() => void refresh().catch((e) => setErr(e instanceof Error ? e.message : "Refresh failed"))}
        >
          Refresh CB
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-red-200 text-sm" role="alert">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">Current CB (gCO₂e)</h3>
          <p className="text-2xl font-semibold text-slate-100">{cb ? formatNumber(cb.cbGco2eq, 0) : "—"}</p>
          <p className="text-xs text-slate-500 mt-2">Energy in scope: {cb ? formatNumber(cb.energyMj, 0) : "—"} MJ</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">Net bank ledger</h3>
          <p className="text-2xl font-semibold text-slate-100">{formatNumber(bankedLedger, 0)}</p>
          <p className="text-xs text-slate-500 mt-2">Sum of bank entry amounts for this ship/year</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={bankDisabled}
          className="w-full sm:w-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500"
          onClick={() => void onBank()}
        >
          Bank surplus
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 p-4 space-y-3">
        <h3 className="text-sm font-medium text-slate-200">Apply banked surplus to deficit</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount (gCO₂e)
          <input
            type="number"
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100"
            value={applyAmount}
            onChange={(e) => setApplyAmount(e.target.value)}
            min={0}
          />
        </label>
        <button
          type="button"
          disabled={applyDisabled}
          className="w-full sm:w-auto rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500"
          onClick={() => void onApply()}
        >
          Apply
        </button>
        </div>
      </div>

      {lastApply && (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4">
          <h3 className="text-sm font-medium text-emerald-200 mb-3">Last apply — KPIs</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">cb_before</dt>
              <dd className="font-mono text-slate-100">{formatNumber(lastApply.cb_before, 0)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">applied</dt>
              <dd className="font-mono text-slate-100">{formatNumber(lastApply.applied, 0)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">cb_after</dt>
              <dd className="font-mono text-slate-100">{formatNumber(lastApply.cb_after, 0)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
