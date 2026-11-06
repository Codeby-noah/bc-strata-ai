import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type StripeEvent = {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function verifySignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts
    .filter(([key]) => key === "v1")
    .map(([, value]) => value)
    .filter((value): value is string => Boolean(value));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest();
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const actual = Buffer.from(signature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

function getId(value: unknown) {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.id === "string") return value.id;
  return null;
}

async function updateBilling(
  strataId: string,
  update: {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    subscription_status?: string;
    current_period_end?: string | null;
  },
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("strata_billing").upsert(
    { strata_id: strataId, ...update, updated_at: new Date().toISOString() },
    { onConflict: "strata_id" },
  );
  if (error) throw new Error("Unable to persist Stripe subscription status.");
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  if (!verifySignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      !isRecord(parsed) ||
      typeof parsed.type !== "string" ||
      !isRecord(parsed.data) ||
      !isRecord(parsed.data.object)
    ) {
      throw new Error("Invalid Stripe event.");
    }
    event = parsed as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe event payload." }, { status: 400 });
  }

  const object = event.data.object;
  const metadata = isRecord(object.metadata) ? object.metadata : {};
  const metadataStrataId =
    typeof metadata.strata_id === "string" ? metadata.strata_id : null;

  try {
    if (event.type === "checkout.session.completed") {
      const strataId =
        metadataStrataId ??
        (typeof object.client_reference_id === "string"
          ? object.client_reference_id
          : null);
      const customerId = getId(object.customer);
      const subscriptionId = getId(object.subscription);
      if (!strataId || !customerId || !subscriptionId) {
        return NextResponse.json({ error: "Checkout session is missing subscription metadata." }, { status: 400 });
      }

      const supabase = createSupabaseAdminClient();
      const { data: existing, error: readError } = await supabase
        .from("strata_billing")
        .select("strata_id")
        .eq("strata_id", strataId)
        .maybeSingle();
      if (readError) throw new Error("Unable to load billing record.");
      const values = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      };
      const result = existing
        ? await supabase
            .from("strata_billing")
            .update(values)
            .eq("strata_id", strataId)
        : await supabase.from("strata_billing").insert({
            strata_id: strataId,
            ...values,
            subscription_status: "pending",
          });
      if (result.error) throw new Error("Unable to save checkout identifiers.");
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscriptionId = getId(object.id);
      const customerId = getId(object.customer);
      const status =
        typeof object.status === "string" ? object.status : null;
      const periodEnd =
        typeof object.current_period_end === "number"
          ? new Date(object.current_period_end * 1000).toISOString()
          : null;
      if (!subscriptionId || !customerId || !status) {
        return NextResponse.json({ error: "Subscription event is incomplete." }, { status: 400 });
      }
      if (
        ![
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "canceled",
          "incomplete",
          "incomplete_expired",
          "paused",
        ].includes(status)
      ) {
        return NextResponse.json({ error: "Unsupported subscription status." }, { status: 400 });
      }
      if (!metadataStrataId) {
        return NextResponse.json({ error: "Subscription event has no strata metadata." }, { status: 400 });
      }
      await updateBilling(metadataStrataId, {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: status,
        current_period_end: periodEnd,
      });
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Stripe event could not be processed. Stripe can retry this delivery." },
      { status: 500 },
    );
  }
}
