export function formatNumber(n: number, digits = 2): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function complianceIcon(compliant: boolean): string {
  return compliant ? "✅" : "❌";
}
