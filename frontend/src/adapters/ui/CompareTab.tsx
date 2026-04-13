import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TARGET_INTENSITY } from "../../shared/constants.js";
import { complianceIcon, formatNumber } from "../../core/application/formatting.js";
import type { ComparisonResponse } from "../../core/domain/types.js";
import { useApi } from "./apiContext.js";

export function CompareTab(): JSX.Element {
  const api = useApi();
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const c = await api.getComparison();
      setData(c);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: `${data.baseline.routeId} (baseline)`, ghg: data.baseline.ghgIntensity, kind: "baseline" },
      ...data.comparisons.map((c) => ({
        name: c.routeId,
        ghg: c.ghgIntensity,
        kind: "comparison",
      })),
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Target intensity: <strong className="text-slate-100">{TARGET_INTENSITY}</strong> gCO₂e/MJ (shown as reference
        on chart). Percent difference vs baseline:{" "}
        <code className="text-cyan-300 bg-slate-900 px-1 rounded">((comparison / baseline) − 1) × 100</code>
      </p>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && err && !data && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-amber-100 text-sm" role="status">
          {err} Set a baseline on the Routes tab to enable comparisons.
        </div>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-800 touch-pan-y">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Route
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    GHG intensity
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 font-medium">
                    % vs baseline
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Compliant vs target
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-800 bg-slate-900/30">
                  <td className="px-4 py-3 font-mono text-amber-300">{data.baseline.routeId} (baseline)</td>
                  <td className="px-4 py-3">{data.baseline.ghgIntensity}</td>
                  <td className="hidden sm:table-cell px-4 py-3">—</td>
                  <td className="px-4 py-3">
                    {complianceIcon(data.baseline.ghgIntensity <= data.targetIntensity)}
                  </td>
                </tr>
                {data.comparisons.map((c) => (
                  <tr key={c.routeId} className="border-t border-slate-800 hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-mono text-cyan-300">{c.routeId}</td>
                    <td className="px-4 py-3">{c.ghgIntensity}</td>
                    <td className="hidden sm:table-cell px-4 py-3">{formatNumber(c.percentDiff, 2)}%</td>
                    <td className="px-4 py-3 text-lg" aria-label={c.compliant ? "Compliant" : "Not compliant"}>
                      {complianceIcon(c.compliant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="h-64 sm:h-80 w-full min-w-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-20} height={70} />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  label={{ value: "gCO₂e/MJ", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <ReferenceLine y={data.targetIntensity} stroke="#fbbf24" strokeDasharray="4 4" label="Target" />
                <Bar dataKey="ghg" name="GHG intensity" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

