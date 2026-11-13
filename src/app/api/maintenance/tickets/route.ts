import { NextResponse } from "next/server";
import { z } from "zod";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ticketSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(3).max(160),
  location: z.string().trim().min(1).max(160),
  description: z.string().trim().min(3).max(5000),
  urgency: z.enum(["low", "medium", "high", "emergency"]),
  photo_url: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const strata = context.activeMembership;
  if (!strata || context.membershipAccessStatus !== "ready") {
    return NextResponse.json(
      { error: "Your strata workspace is not ready yet." },
      { status: 409 },
    );
  }
  const subscription = await paidWorkspaceResponse(strata.id);
  if (subscription) return subscription;

  const body: unknown = await request.json().catch(() => null);
  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check the maintenance request fields and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const ticket = parsed.data;
  if (
    ticket.photo_url &&
    (!ticket.photo_url.startsWith(`${strata.id}/${context.userId}/`) ||
      ticket.photo_url.includes("..") ||
      ticket.photo_url.includes("\\"))
  ) {
    return NextResponse.json(
      { error: "The attached photo does not belong to this resident workspace." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      id: ticket.id,
      strata_id: strata.id,
      submitted_by: context.userId,
      title: ticket.title,
      location: ticket.location,
      description: ticket.description,
      urgency: ticket.urgency,
      photo_url: ticket.photo_url ?? null,
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "The maintenance request could not be saved." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ticket: data }, { status: 201 });
}
