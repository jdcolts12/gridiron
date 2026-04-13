const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** In-game balance and prices (integer dollars). */
export function formatDollars(amount: number): string {
  return usd0.format(amount);
}
