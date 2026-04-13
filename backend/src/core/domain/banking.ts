export type BankApplyResult = {
  cbBefore: number;
  applied: number;
  cbAfter: number;
};

export function assertPositiveBankable(cb: number): void {
  if (cb <= 0) {
    throw new Error("Cannot bank non-positive compliance balance");
  }
}

export function assertApplyAmount(amount: number, availableBanked: number, currentCb: number): void {
  if (amount <= 0) throw new Error("Apply amount must be positive");
  if (amount > availableBanked) throw new Error("Amount exceeds available banked surplus");
  if (currentCb >= 0) throw new Error("Apply is only meaningful for a deficit position");
}
