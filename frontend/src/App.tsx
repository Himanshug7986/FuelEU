import { useState } from "react";
import { HttpFuelEuApi } from "./adapters/infrastructure/httpFuelEuApi.js";
import { ApiProvider } from "./adapters/ui/apiContext.js";
import { BankingTab } from "./adapters/ui/BankingTab.js";
import { CompareTab } from "./adapters/ui/CompareTab.js";
import { PoolingTab } from "./adapters/ui/PoolingTab.js";
import { RoutesTab } from "./adapters/ui/RoutesTab.js";

const apiBase = import.meta.env.VITE_API_BASE ?? "/api";
const api = new HttpFuelEuApi(apiBase);

type TabId = "routes" | "compare" | "banking" | "pooling";

const tabs: { id: TabId; label: string }[] = [
  { id: "routes", label: "Routes" },
  { id: "compare", label: "Compare" },
  { id: "banking", label: "Banking" },
  { id: "pooling", label: "Pooling" },
];

export function App(): JSX.Element {
  const [tab, setTab] = useState<TabId>("routes");

  return (
    <ApiProvider api={api}>
      <div className="min-h-[100dvh] flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">FuelEU Maritime</h1>
              <p className="text-xs sm:text-sm text-slate-400">Compliance dashboard</p>
            </div>
          </div>
          <nav
            className="max-w-6xl mx-auto px-3 sm:px-4 pb-3 flex gap-1 overflow-x-auto no-scrollbar ios-scroll touch-pan-x"
            role="tablist"
            aria-label="Dashboard sections"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                className={`shrink-0 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="max-w-6xl w-full mx-auto px-3 sm:px-4 pt-6 pb-16 sm:py-8 flex-1">
          <div className="safe-bottom" />
          {tabs.map((t) => (
            <section
              key={t.id}
              id={`panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              hidden={tab !== t.id}
              className={tab === t.id ? "block" : "hidden"}
            >
              <h2 className="sr-only">{t.label}</h2>
              {t.id === "routes" && <RoutesTab />}
              {t.id === "compare" && <CompareTab />}
              {t.id === "banking" && <BankingTab />}
              {t.id === "pooling" && <PoolingTab />}
            </section>
          ))}
        </main>
      </div>
    </ApiProvider>
  );
}
