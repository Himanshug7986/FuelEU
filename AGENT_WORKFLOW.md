# AI Agent Workflow Log

## Agents Used
* **ChatGPT (Primary):** Strategic planning, domain logic formulation, and architectural guidance.
* **GitHub Copilot:** Accelerated boilerplate generation for repositories and DTOs.
* **Cursor:** Context-aware refactoring and cross-file synchronization within the hexagonal structure.

## Prompts & Outputs

### 1. Project Scaffolding
**Prompt:** "I'm building a backend for FuelEU Maritime compliance. I want to use Hexagonal Architecture in Node.js with TypeScript. Can you suggest a folder structure that keeps my business logic completely separate from the database?"

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
```typescript
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
```typescript
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
```typescript
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
```typescript
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
```typescript
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
```typescript
export function computePercentDiff(baselineIntensity: number, comparisonIntensity: number): number {
  if (baselineIntensity === 0) return 0;
  return ((comparisonIntensity / baselineIntensity) - 1) * 100;
}
```


---

### 9. Unit Testing with Vitest
**Prompt:** "Write a unit test for my compliance balance calculation. I want to make sure that with an intensity of 91 and 5000 tonnes of fuel, it returns the correct value based on the 2025 target intensity."

**Generated Output:**
```typescript
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
```typescript
/** Target intensity (2025) gCO₂e/MJ — 2% below 91.16 */
export const TARGET_INTENSITY_GCO2E_PER_MJ = 89.3368;

/** Approximate energy content for marine fuels (MJ per tonne) */
export const MJ_PER_TONNE_FUEL = 41_000;
```


## Observations
* **Where AI helped:** Rapidly established the **Hexagonal Architecture** and handled complex SQL "UPSERT" syntax.
* **Where it failed:** Often forgot the specific energy conversion factor (41,000 MJ/t) unless explicitly prompted, which is critical for maritime compliance.
* **Best Practices:** All business logic is kept in pure TypeScript files within the `domain` folder, ensuring it remains testable without a database.