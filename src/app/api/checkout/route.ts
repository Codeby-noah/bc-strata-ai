import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const monthlyAmountCents = 11_900;

function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
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

  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${siteUrl}/billing?checkout=success`,
    cancel_url: `${siteUrl}/billing?checkout=cancelled`,
    "line_items[0][price_data][currency]": "cad",
    "line_items[0][price_data][unit_amount]": String(monthlyAmountCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "BC Strata AI",
    "line_items[0][price_data][product_data][description]":
      "Strata council operations subscription",
    "line_items[0][quantity]": "1",
    client_reference_id: strata.id,
    "metadata[strata_id]": strata.id,
    "subscription_data[metadata][strata_id]": strata.id,
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
