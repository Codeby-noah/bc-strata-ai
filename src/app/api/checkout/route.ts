import { NextResponse } from "next/server";
import {
  introCouponId,
  introDiscountCents,
  introDiscountMonths,
  introPriceSummary,
  regularMonthlyCents,
} from "@/lib/billing/price";
import { getStrataContext } from "@/lib/strata/context";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StripeCoupon = {
  id?: string;
  amount_off?: number | null;
  currency?: string | null;
  duration?: string | null;
  duration_in_months?: number | null;
  valid?: boolean;
};

async function stripeRequest(secretKey: string, path: string, body?: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await response.json()) as StripeCoupon & {
    error?: { code?: string; message?: string };
  };
  return { ok: response.ok, status: response.status, result };
}

function couponMatchesIntro(coupon: StripeCoupon) {
  return (
    coupon.amount_off === introDiscountCents &&
    coupon.currency === "cad" &&
    coupon.duration === "repeating" &&
    coupon.duration_in_months === introDiscountMonths &&
    coupon.valid !== false
  );
}

async function ensureIntroCoupon(secretKey: string) {
  const existing = await stripeRequest(secretKey, `coupons/${introCouponId}`);
  if (existing.ok) {
    return couponMatchesIntro(existing.result) ? introCouponId : null;
  }
  if (existing.status !== 404) return null;

  const created = await stripeRequest(
    secretKey,
    "coupons",
    new URLSearchParams({
      id: introCouponId,
      amount_off: String(introDiscountCents),
      currency: "cad",
      duration: "repeating",
      duration_in_months: String(introDiscountMonths),
      name: "$40 off for the first 12 months",
    }),
  );
  if (created.ok && created.result.id) return created.result.id;
  if (created.result.error?.code !== "resource_already_exists") return null;

  const retry = await stripeRequest(secretKey, `coupons/${introCouponId}`);
  return retry.ok && couponMatchesIntro(retry.result) ? introCouponId : null;
}

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const strata = context.activeMembership;
  if (!strata || strata.role !== "admin") {
    return NextResponse.json(
      { error: "Only a strata administrator can manage billing." },
      { status: 403 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = getSiteUrl();
  if (!secretKey || !siteUrl) {
    return NextResponse.json(
      { error: "Billing is not configured. Add the server-side Stripe key and site URL." },
      { status: 503 },
    );
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== siteUrl) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: billing, error: billingError } = await supabase
    .from("strata_billing")
    .select("stripe_customer_id, subscription_status")
    .eq("strata_id", strata.id)
    .maybeSingle();
  if (billingError) {
    return NextResponse.json(
      { error: "Billing setup is not ready. Apply the prepared billing migration first." },
      { status: 503 },
    );
  }
  if (billing && ["active", "trialing"].includes(billing.subscription_status)) {
    return NextResponse.json(
      { error: "This strata already has an active subscription." },
      { status: 409 },
    );
  }

  const introCoupon = await ensureIntroCoupon(secretKey);
  if (!introCoupon) {
    return NextResponse.json(
      { error: "Stripe could not start the introductory price. Try again or contact support." },
      { status: 502 },
    );
  }

  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${siteUrl}/billing?checkout=success`,
    cancel_url: `${siteUrl}/billing?checkout=cancelled`,
    "line_items[0][price_data][currency]": "cad",
    "line_items[0][price_data][unit_amount]": String(regularMonthlyCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "StrataDock",
    "line_items[0][price_data][product_data][description]": introPriceSummary,
    "line_items[0][quantity]": "1",
    "discounts[0][coupon]": introCoupon,
    client_reference_id: strata.id,
    "metadata[strata_id]": strata.id,
    "subscription_data[metadata][strata_id]": strata.id,
    "subscription_data[trial_period_days]": "30",
  });
  if (typeof billing?.stripe_customer_id === "string") {
    params.set("customer", billing.stripe_customer_id);
  } else if (context.email) {
    params.set("customer_email", context.email);
  }

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: params,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const result = (await stripeResponse.json()) as {
      id?: string;
      url?: string;
    };
    if (!stripeResponse.ok || !result.url) {
      return NextResponse.json(
        { error: "Stripe could not start checkout. Try again or contact support." },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: result.url });
  } catch {
    return NextResponse.json(
      { error: "Stripe checkout is temporarily unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
