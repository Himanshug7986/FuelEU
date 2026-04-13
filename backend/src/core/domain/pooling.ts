export type PoolMemberInput = { shipId: string; cbBefore: number };

export type PoolMemberResult = { shipId: string; cbBefore: number; cbAfter: number };

/**
 * Greedy transfers: repeatedly move surplus from the largest positive balance
 * to the most negative until no negatives remain. Preserves total sum.
 * Preconditions: sum(cbBefore) >= 0 (validated by caller).
 */
export function allocatePoolGreedy(members: PoolMemberInput[]): PoolMemberResult[] {
  const balances = members.map((m) => ({ shipId: m.shipId, cb: m.cbBefore }));
  const initial = new Map(members.map((m) => [m.shipId, m.cbBefore]));

  while (true) {
    let maxIdx = -1;
    let maxVal = 0;
    let minIdx = -1;
    let minVal = 0;

    for (let i = 0; i < balances.length; i++) {
      const b = balances[i].cb;
      if (b > maxVal) {
        maxVal = b;
        maxIdx = i;
      }
      if (b < minVal) {
        minVal = b;
        minIdx = i;
      }
    }

    if (minIdx < 0 || minVal >= 0) break;
    if (maxIdx < 0 || maxVal <= 0) break;

    const transfer = Math.min(maxVal, -minVal);
    balances[maxIdx].cb -= transfer;
    balances[minIdx].cb += transfer;
  }

  return balances.map((b) => {
    const before = initial.get(b.shipId) ?? b.cb;
    return { shipId: b.shipId, cbBefore: before, cbAfter: b.cb };
  });
}

export function validatePoolInvariants(
  members: PoolMemberResult[],
  poolSum: number
): void {
  if (poolSum < 0) {
    throw new Error("Pool sum of adjusted CB must be non-negative");
  }
  for (const m of members) {
    if (m.cbBefore < 0 && m.cbAfter < m.cbBefore) {
      throw new Error(`Deficit ship ${m.shipId} cannot exit worse than before`);
    }
    if (m.cbBefore > 0 && m.cbAfter < 0) {
      throw new Error(`Surplus ship ${m.shipId} cannot exit negative`);
    }
  }
}

export function assertPoolFeasible(members: PoolMemberInput[]): void {
  const sum = members.reduce((a, m) => a + m.cbBefore, 0);
  if (sum < 0) {
    throw new Error("Sum of member adjusted CB must be >= 0");
  }
}
