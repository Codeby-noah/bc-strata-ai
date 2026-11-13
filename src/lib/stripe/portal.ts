"use server";

import { redirect } from "next/navigation";
import { getStrataContext } from "@/lib/strata/context";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createCustomerPortalSession() {
  const context = await getStrataContext();
  if (!context?.activeMembership || context.activeMembership.role !== "admin") {
    redirect("/settings?portal=forbidden");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = getSiteUrl();
  if (!secretKey || !siteUrl) {
    redirect("/settings?portal=unconfigured");
  }

  const supabase = await createSupabaseServerClient();
  const { data: billing, error } = await supabase
    .from("strata_billing")
    .select("stripe_customer_id, subscription_status")
    .eq("strata_id", context.activeMembership.id)
    .maybeSingle();

  if (error) {
    redirect("/settings?portal=unavailable");
  }

  const customerId = billing?.stripe_customer_id;
  if (typeof customerId !== "string" || customerId.length === 0) {
    redirect("/billing?reason=portal_needs_checkout");
  }

  const params = new URLSearchParams({
    customer: customerId,
    return_url: `${siteUrl}/settings?portal=returned`,
  });

  let portalUrl: string | undefined;
  try {
    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
    const result = (await stripeResponse.json()) as { url?: string };
    if (stripeResponse.ok && result.url) {
      portalUrl = result.url;
    }
  } catch {
    portalUrl = undefined;
  }

  if (!portalUrl) {
    redirect("/settings?portal=error");
  }

  redirect(portalUrl);
}
