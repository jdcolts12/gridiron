/**
 * Validates that a balance can cover a cost without mutation.
 * @param balance - Current cash balance
 * @param cost - Price to check
 */
export function canAfford(_balance: number, _cost: number): boolean {
  return false;
}

/**
 * Returns new cash balance after spending, or null if insufficient funds.
 * @param balance - Current cash
 * @param cost - Cash to deduct
 */
export function spend(_balance: number, _cost: number): number | null {
  return null;
}

/**
 * Returns new cash balance after earning (clamped if you add max caps later).
 * @param balance - Current cash
 * @param amount - Cash to add
 */
export function earn(_balance: number, _amount: number): number {
  return _balance;
}

/**
 * Validates a transaction payload before applying server-side.
 */
export function validateSpendRequest(
  _balance: number,
  _cost: number,
  _reason: string
): { ok: true } | { ok: false; error: string } {
  return { ok: false, error: "not implemented" };
}
