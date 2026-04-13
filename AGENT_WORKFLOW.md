# AI Agent Workflow Log

## Agents Used
* **ChatGPT (Primary):** Strategic planning, domain logic formulation, and architectural guidance.
* **GitHub Copilot:** Accelerated boilerplate generation for repositories and DTOs.
* **Cursor:** Context-aware refactoring and cross-file synchronization within the hexagonal structure.

## Prompts & Outputs

### 1. Project Scaffolding
**Prompt:** "I'm building a backend for FuelEU Maritime compliance. I want to use Hexagonal Architecture in Node.js with   . Can you suggest a folder structure that keeps my business logic completely separate from the database?"

**Generated Output:**
```text
backend/
├── src/
│   ├── core/
│   │   ├── domain/       # Pure logic (Calculations, Entities)
│   │   ├── application/  # Use cases (Orchestration)
│   │   └── ports/        # Interfaces (Repository definitions)
│   ├── adapters/
│   │   └── outbound/     # Implementations (Postgres, External APIs)
│   └── shared/           # Constants and Utilities
```


---

### 2. Compliance Math Logic
**Prompt:** "I need to calculate the 'Compliance Balance' for a ship. I have the fuel consumption in tonnes and the GHG intensity. I know I need to convert tonnes to Megajoules (MJ) first. Can you write a clean TypeScript function for this?"

**Generated Output:**
```  
export function energyInScopeMj(fuelConsumptionT: number): number {
  return fuelConsumptionT * MJ_PER_TONNE_FUEL;
}

export function computeComplianceBalanceGco2eq(
  actualGhgIntensity: number,
  fuelConsumptionT: number,
  targetIntensity: number = TARGET_INTENSITY_GCO2E_PER_MJ
): number {
  const energyMj = energyInScopeMj(fuelConsumptionT);
  return (targetIntensity - actualGhgIntensity) * energyMj;
}
```


**Validation / Corrections:**
* **Correction:** Ensure `MJ_PER_TONNE_FUEL` is set to exactly `41,000` as per standard marine fuel estimates to avoid calculation drift.

---

### 3. Database Schema Design
**Prompt:** "Help me design a SQL schema for this project. I need to store routes (including a baseline flag), ship compliance snapshots, and banking entries for surplus energy. Use UUIDs for primary keys."

**Generated Output:**
```sql
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id TEXT NOT NULL UNIQUE,
  is_baseline BOOLEAN NOT NULL DEFAULT FALSE
  -- ... other fields
);

CREATE TABLE IF NOT EXISTS ship_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id TEXT NOT NULL,
  year INT NOT NULL,
  cb_gco2eq DOUBLE PRECISION NOT NULL,
  UNIQUE (ship_id, year)
);
```


---

### 4. Greedy Pooling Algorithm
**Prompt:** "I have a group of ships in a pool. Some have a surplus (positive balance) and some have a deficit (negative). Write a 'greedy' algorithm that moves surplus from the richest ships to the ones in debt until the debt is cleared."

**Generated Output:**
```  
export function allocatePoolGreedy(members: PoolMemberInput[]): PoolMemberResult[] {
  const balances = members.map((m) => ({ shipId: m.shipId, cb: m.cbBefore }));
  while (true) {
    // Find max surplus and max deficit...
    const transfer = Math.min(maxVal, -minVal);
    balances[maxIdx].cb -= transfer;
    balances[minIdx].cb += transfer;
  }
}
```


**Validation / Corrections:**
* **Validation:** Added a `validatePoolInvariants` check to ensure that the total sum of the pool remains the same before and after the transfers.

---

### 5. Repository Implementation
**Prompt:** "Write a Postgres repository implementation for saving compliance snapshots. It should use an 'UPSERT' so that if a record for that ship and year already exists, it just updates the balance."

**Generated Output:**
```  
async upsertSnapshot(shipId: string, year: number, cb_gco2eq: number): Promise<void> {
  await this.pool.query(
    `INSERT INTO ship_compliance (ship_id, year, cb_gco2eq)
     VALUES ($1, $2, $3)
     ON CONFLICT (ship_id, year) DO UPDATE SET cb_gco2eq = EXCLUDED.cb_gco2eq`,
    [shipId, year, cb_gco2eq]
  );
}
```


---

### 6. Banking Surplus Logic
**Prompt:** "I need a domain rule for banking. A ship should only be allowed to 'bank' its compliance balance if that balance is positive (a surplus). If it's negative, throw an error."

**Generated Output:**
```  
export function assertPositiveBankable(cb: number): void {
  if (cb <= 0) {
    throw new Error("Cannot bank non-positive compliance balance");
  }
}
```


---

### 7. Applying Banked Balances
**Prompt:** "Create a use case that lets a ship use its banked surplus from previous years to cover a current deficit. It needs to update the compliance snapshot and record the deduction in the bank."

**Generated Output:**
```  
export async function applyBanked(...) {
  const available = await bankRepo.totalBankedForYear(shipId, year);
  const currentCb = await complianceRepo.getSnapshot(shipId, year);
  
  assertApplyAmount(amount, available, currentCb);

  await complianceRepo.upsertSnapshot(shipId, year, currentCb + amount);
  await bankRepo.insertBankEntry(shipId, year, -amount);
}
```


---

### 8. Route Comparison Utility
**Prompt:** "I want to compare different ship routes against a baseline. Write a function that calculates the percentage difference in GHG intensity between a target route and the baseline."

**Generated Output:**
```  
export function computePercentDiff(baselineIntensity: number, comparisonIntensity: number): number {
  if (baselineIntensity === 0) return 0;
  return ((comparisonIntensity / baselineIntensity) - 1) * 100;
}
```


---

### 9. Unit Testing with Vitest
**Prompt:** "Write a unit test for my compliance balance calculation. I want to make sure that with an intensity of 91 and 5000 tonnes of fuel, it returns the correct value based on the 2025 target intensity."

**Generated Output:**
```  
describe("computeComplianceBalanceGco2eq", () => {
  it("matches KPI row R001", () => {
    const cb = computeComplianceBalanceGco2eq(91, 5000, TARGET_INTENSITY_GCO2E_PER_MJ);
    expect(cb).toBeCloseTo((TARGET_INTENSITY_GCO2E_PER_MJ - 91) * 5000 * 41000, 0);
  });
});
```


---

### 10. Shared Constants
**Prompt:** "What are the key constants I'll need for FuelEU 2025? I need the target intensity (which is 2% below the baseline of 91.16) and the standard energy content of fuel."

**Generated Output:**
```  
/** Target intensity (2025) gCO₂e/MJ — 2% below 91.16 */
export const TARGET_INTENSITY_GCO2E_PER_MJ = 89.3368;

/** Approximate energy content for marine fuels (MJ per tonne) */
export const MJ_PER_TONNE_FUEL = 41_000;
```

11. Backend Server Entry Point
Prompt: "I'm ready to launch the backend. Can you write a clean index.ts for my server? It needs to pull the port from environment variables, initialize the Postgres pool, run migrations, and then start the Express server."

Generated Output:

  
import { pool } from "../db/pool.js";
import { runMigrations } from "../db/migrate.js";
import { createApp } from "../../adapters/inbound/http/createApp.js";
import { PgRouteRepository } from "../../adapters/outbound/postgres/pgRouteRepository.js";
import { PgShipComplianceRepository } from "../../adapters/outbound/postgres/pgShipComplianceRepository.js";
import { PgRouteDataForCompliance } from "../../adapters/outbound/postgres/pgRouteDataForCompliance.js";
import { PgBankRepository } from "../../adapters/outbound/postgres/pgBankRepository.js";
import { PgPoolRepository } from "../../adapters/outbound/postgres/pgPoolRepository.js";

const PORT = process.env.PORT || 3000;

async function start() {
  await runMigrations();

  const routeRepo = new PgRouteRepository(pool);
  const complianceRepo = new PgShipComplianceRepository(pool);
  const routeData = new PgRouteDataForCompliance(pool);
  const bankRepo = new PgBankRepository(pool);
  const poolRepo = new PgPoolRepository(pool);

  const app = createApp(routeRepo, complianceRepo, routeData, bankRepo, poolRepo);

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(console.error);
Validation / Corrections:

Correction: Added the runMigrations() call before starting the server to ensure the schema is up-to-date in ephemeral container environments.

12. Express App Setup (Inbound Adapter)
Prompt: "I need to set up my Express app using the hexagonal ports I created. Can you write a createApp function that takes the repositories as dependencies and defines the API routes for routes, compliance snapshots, banking, and pooling?"

Generated Output:

  
export function createApp(
  routeRepo: RouteRepositoryPort,
  complianceRepo: ShipComplianceRepositoryPort,
  routeData: RouteDataForCompliancePort,
  bankRepo: BankRepositoryPort,
  poolRepo: PoolRepositoryPort
) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.get("/api/routes", async (req, res) => {
    const routes = await listRoutes(routeRepo);
    res.json(routes);
  });

  app.post("/api/routes/:id/baseline", async (req, res) => {
    await setBaseline(routeRepo, req.params.id);
    res.sendStatus(204);
  });

  app.get("/api/compliance/:shipId/:year", async (req, res) => {
    const result = await computeAndStoreCB(routeData, complianceRepo, req.params.shipId, Number(req.params.year));
    res.json(result);
  });
  // ... (banking and pooling routes)
  return app;
}
Validation / Corrections:

Correction: Included cors() middleware to allow the frontend to communicate with the backend during local development.

13. Frontend API Port Implementation
Prompt: "I'm building the frontend now. I need an implementation of my FuelEuApiPort that uses fetch to talk to my Node.js backend. Can you handle the GET and POST requests for ship routes and compliance data?"

Generated Output:

  
export class HttpFuelEuApi implements FuelEuApiPort {
  private readonly baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  async getRoutes(): Promise<RouteRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/routes`);
    return res.json();
  }

  async setBaseline(routeId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/routes/${routeId}/baseline`, { method: "POST" });
  }

  async getCompliance(shipId: string, year: number): Promise<ComputeCBResult> {
    const res = await fetch(`${this.baseUrl}/api/compliance/${shipId}/${year}`);
    return res.json();
  }
  // ...
}
Validation / Corrections:

Validation: Ensured the baseUrl uses import.meta.env.VITE_API_URL to allow easy environment configuration in Vite.

14. React API Context & Hook
Prompt: "To avoid passing the API instance down through every component, I want to use React Context. Can you set up a simple ApiContext and a useApi hook that provides the FuelEuApiPort?"

Generated Output:

  
const ApiContext = createContext<FuelEuApiPort | null>(null);

export const ApiProvider: React.FC<{ api: FuelEuApiPort; children: React.ReactNode }> = ({ api, children }) => (
  <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
);

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) throw new Error("useApi must be used within ApiProvider");
  return context;
}
Validation / Corrections:

Refinement: Added a runtime check to throw an error if useApi is used outside of its provider, preventing silent null-reference bugs.

15. Main Frontend Dashboard Layout
Prompt: "I want a clean, professional dashboard for the maritime app. Can you create a main App.tsx using Tailwind CSS with tabs for 'Routes', 'Compare', 'Banking', and 'Pooling'?"

Generated Output:

  
function App() {
  const [activeTab, setActiveTab] = useState("routes");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-900">FuelEU Maritime Compliance</h1>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex space-x-4 border-b mb-6">
          {["routes", "compare", "banking", "pooling"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={...}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {activeTab === "routes" && <RoutesTab />}
        {/* ... (other tabs) */}
      </main>
    </div>
  );
}
Validation / Corrections:

Correction: Used a consistent slate-50 background and blue-900 accents to give it a "maritime/corporate" feel rather than a generic UI.

16. Numeric Formatting Utilities
Prompt: "I need to display large compliance numbers (gCO2eq) and percentages in the UI. Can you write a few utility functions to format these with commas and fixed decimal places?"

Generated Output:

  
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}
Validation / Corrections:

Refinement: Added a + sign prefix for positive percentages to clearly indicate "over-intensity" in comparison views.

17. Routes Table with Baseline Toggle
Prompt: "Let's build the 'Routes' tab. I need a table that lists all ship routes and allows me to toggle which one is the 'baseline' with a simple button click."

Generated Output:

  
export const RoutesTab: React.FC = () => {
  const api = useApi();
  const [routes, setRoutes] = useState<RouteRecord[]>([]);

  const load = async () => setRoutes(await api.getRoutes());
  useEffect(() => { load(); }, []);

  const handleSetBaseline = async (id: string) => {
    await api.setBaseline(id);
    await load();
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-left border-collapse">
        {/* ... table headers ... */}
        <tbody>
          {routes.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-4">{r.routeId}</td>
              <td className="p-4">
                {r.isBaseline ? (
                  <span className="text-green-600 font-bold">Baseline</span>
                ) : (
                  <button onClick={() => handleSetBaseline(r.id)} className="...">Set Baseline</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
Validation / Corrections:

Correction: Added an automatic re-fetch (load()) after setting a new baseline so the UI updates immediately without a manual refresh.

18. Banking Management UI
Prompt: "I'm working on the banking feature UI. It should fetch the available banked surplus and show a form where the user can enter an amount to apply against a ship's deficit."

Generated Output:

  
export const BankingTab: React.FC = () => {
  const api = useApi();
  const [banked, setBanked] = useState(0);
  const [applyAmount, setApplyAmount] = useState("");

  const handleApply = async () => {
    await api.applyBanked("SHIP-001", 2025, Number(applyAmount));
    // refresh data...
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-blue-800 font-semibold mb-2">Banked Surplus (2025)</h3>
        <p className="text-3xl font-bold">{formatNumber(banked)} gCO₂eq</p>
      </div>
      {/* ... form for applyAmount ... */}
    </div>
  );
};
Validation / Corrections:

Validation: Tied the formatNumber utility directly into the banking display to handle the high precision required for gCO₂eq values.

19. API Integration Testing
Prompt: "I want to make sure my backend API actually talks to the database correctly. Can you write an integration test using supertest that checks if the GET /api/routes endpoint returns data?"

Generated Output:

  
describe("GET /api/routes", () => {
  it("returns all routes from the database", async () => {
    const routeRepo = new InMemoryRouteRepository(); // or mock pg
    const app = createApp(routeRepo, ...);
    
    await routeRepo.save({ routeId: "R1", ... });
    
    const response = await request(app).get("/api/routes");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].routeId).toBe("R1");
  });
});
Validation / Corrections:

Correction: Switched to a shared createApp factory in tests to ensure the testing environment perfectly mirrors the production route configuration.

20. Pooling Dashboard Logic
Prompt: "Finally, I need a UI for 'Pooling'. It should list all ships in a year, let me pick members, and show the 'before' and 'after' compliance balances in a side-by-side view."

Generated Output:

  
export const PoolingTab: React.FC = () => {
  const [results, setResults] = useState<PoolMemberResult[]>([]);
  
  const handleCreatePool = async () => {
    const res = await api.createPool(2025, ["SHIP-A", "SHIP-B"]);
    setResults(res.members);
  };

  return (
    <div className="space-y-4">
      <button onClick={handleCreatePool} className="...">Simulate Pool</button>
      <div className="grid grid-cols-1 gap-4">
        {results.map((r) => (
          <div key={r.shipId} className="p-4 border rounded bg-white flex justify-between">
            <span>{r.shipId}</span>
            <div className="text-right">
              <div className="text-sm text-gray-500">Before: {formatNumber(r.cbBefore)}</div>
              <div className="font-bold text-blue-600">After: {formatNumber(r.cbAfter)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
Validation / Corrections:

Validation: Used a grid layout to show the redistribution of compliance balance clearly, highlighting the "After" value to show the impact of the pool.


## Observations
* **Where AI helped:** Rapidly established the **Hexagonal Architecture** and handled complex SQL "UPSERT" syntax.
* **Where it failed:** Often forgot the specific energy conversion factor (41,000 MJ/t) unless explicitly prompted, which is critical for maritime compliance.
* **Best Practices:** All business logic is kept in pure    files within the `domain` folder, ensuring it remains testable without a database.