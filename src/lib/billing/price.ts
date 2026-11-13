/** Regular monthly price after the introductory year, in cents. */
export const regularMonthlyCents = 17_900;

/** Introductory monthly price for the first 12 paid months, in cents. */
export const introMonthlyCents = 13_900;

export const introDiscountCents = regularMonthlyCents - introMonthlyCents;

/**
 * Stripe counts this coupon from the day the subscription starts, which
 * includes the 30-day free trial. Thirteen months keeps the $40 discount on
 * the 12 paid months after that trial.
 */
export const introDiscountMonths = 13;

export const introCouponId = "bc_strata_139_for_12_months";

export const introPriceSummary =
  "Discounted to $139 CAD a month for the first 12 months after the 1-month free trial, then $179 CAD a month.";
