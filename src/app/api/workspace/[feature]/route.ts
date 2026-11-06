import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Feature =
  | "maintenance"
  | "amenities"
  | "parking"
  | "voting"
  | "compliance"
  | "forms";

const features = new Set<Feature>([
  "maintenance",
  "amenities",
  "parking",
  "voting",
  "compliance",
  "forms",
]);
const councilRoles = new Set(["admin", "council"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getFeatureContext(featureName: string) {
  if (!features.has(featureName as Feature)) {
    return { response: fail("This workspace section was not found.", 404) } as const;
  }
  const context = await getStrataContext();
  if (!context) {
    return { response: fail("Sign in to continue.", 401) } as const;
  }
  if (context.membershipAccessStatus !== "ready" || !context.activeMembership) {
    return { response: fail("Your strata workspace is not ready yet.", 409) } as const;
  }
  return {
    context,
    activeMembership: context.activeMembership,
    feature: featureName as Feature,
  } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ feature: string }> },
) {
  const { feature: featureName } = await params;
  const access = await getFeatureContext(featureName);
  if ("response" in access) {
    return access.response;
  }

  const { activeMembership } = access;
  const supabase = await createSupabaseServerClient();
  let query;
  switch (access.feature) {
    case "maintenance":
      query = supabase
        .from("maintenance_requests")
        .select("*")
        .eq("strata_id", activeMembership.id)
        .order("created_at", { ascending: false })
        .limit(100);
      break;
    case "amenities": {
      const [spaces, reservations] = await Promise.all([
        supabase
          .from("amenity_spaces")
          .select("*")
          .eq("strata_id", activeMembership.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("amenity_reservations")
          .select("*, amenity_spaces(name)")
          .eq("strata_id", activeMembership.id)
          .order("starts_at", { ascending: false })
          .limit(100),
      ]);
      if (spaces.error || reservations.error) {
        return fail("Amenity booking setup is not ready. Ask the workspace owner to complete database setup.", 503);
      }
      return NextResponse.json({
        spaces: spaces.data ?? [],
        reservations: reservations.data ?? [],
        role: activeMembership.role,
        userId: access.context.userId,
      });
    }
    case "parking":
      query = supabase
        .from("visitor_parking_passes")
        .select("*")
        .eq("strata_id", activeMembership.id)
        .order("starts_at", { ascending: false })
        .limit(100);
      break;
    case "voting":
      query = supabase
        .from("governance_proposals")
        .select("*, governance_votes(id, user_id, choice, created_at)")
        .eq("strata_id", activeMembership.id)
        .order("created_at", { ascending: false })
        .limit(100);
      break;
    case "compliance":
      query = supabase
        .from("strata_compliance_items")
        .select("*")
        .eq("strata_id", activeMembership.id)
        .order("due_date", { ascending: true })
        .limit(100);
      break;
    case "forms":
      query = supabase
        .from("strata_forms")
        .select("*")
        .eq("strata_id", activeMembership.id)
        .order("created_at", { ascending: false })
        .limit(100);
      break;
  }

  const { data, error } = await query;
  if (error) {
    return fail("This section needs its database setup before it can load or save records.", 503);
  }
  return NextResponse.json({
    items: data ?? [],
    role: access.activeMembership.role,
    userId: access.context.userId,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ feature: string }> },
) {
  const { feature: featureName } = await params;
  const access = await getFeatureContext(featureName);
  if ("response" in access) {
    return access.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Submit valid form data.");
  }
  if (!isRecord(body)) {
    return fail("Submit valid form data.");
  }

  const { context, feature } = access;
  const strataId = access.activeMembership.id;
  const role = access.activeMembership.role;
  const supabase = await createSupabaseServerClient();
  let result;

  if (feature === "maintenance") {
    if (
      !text(body.title, 1, 160) ||
      !text(body.location, 1, 160) ||
      !text(body.description, 1, 5000) ||
      !["low", "normal", "high", "emergency"].includes(String(body.priority))
    ) {
      return fail("Add a title, location, description, and valid priority.");
    }
    result = await supabase.from("maintenance_requests").insert({
      strata_id: strataId,
      reported_by: context.userId,
      title: body.title.trim(),
      location: body.location.trim(),
      description: body.description.trim(),
      priority: body.priority,
    });
  } else if (feature === "amenities") {
    if (body.operation === "create_space") {
      if (!councilRoles.has(role)) {
        return fail("Only council members can add shared spaces.", 403);
      }
      if (!text(body.name, 1, 120) || (body.description !== undefined && !text(body.description, 0, 1000))) {
        return fail("Add a valid space name and description.");
      }
      result = await supabase.from("amenity_spaces").insert({
        strata_id: strataId,
        created_by: context.userId,
        name: body.name.trim(),
        description: typeof body.description === "string" ? body.description.trim() : "",
      });
    } else {
      if (
        !text(body.space_id, 36, 36) ||
        !validDate(body.starts_at) ||
        !validDate(body.ends_at) ||
        Date.parse(String(body.starts_at)) <= Date.now() ||
        Date.parse(String(body.ends_at)) <= Date.parse(String(body.starts_at)) ||
        !text(body.purpose, 1, 500)
      ) {
        return fail("Choose a shared space, valid start and end times, and a purpose.");
      }
      result = await supabase.from("amenity_reservations").insert({
        strata_id: strataId,
        requested_by: context.userId,
        space_id: body.space_id,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        purpose: body.purpose.trim(),
      });
    }
  } else if (feature === "parking") {
    if (
      !text(body.visitor_name, 1, 120) ||
      !text(body.vehicle_plate, 1, 24) ||
      !text(body.stall, 1, 80) ||
      !validDate(body.starts_at) ||
      !validDate(body.ends_at) ||
      Date.parse(String(body.starts_at)) <= Date.now() ||
      Date.parse(String(body.ends_at)) <= Date.parse(String(body.starts_at))
    ) {
      return fail("Add visitor and vehicle details with a valid pass time range.");
    }
    result = await supabase.from("visitor_parking_passes").insert({
      strata_id: strataId,
      issued_by: context.userId,
      visitor_name: body.visitor_name.trim(),
      vehicle_plate: body.vehicle_plate.trim(),
      stall: body.stall.trim(),
      starts_at: body.starts_at,
      ends_at: body.ends_at,
    });
  } else if (feature === "voting") {
    if (body.operation === "vote") {
      if (!councilRoles.has(role)) {
        return fail("Only active council members can vote on council decisions.", 403);
      }
      if (!text(body.proposal_id, 36, 36) || !text(body.choice, 1, 80)) {
        return fail("Choose an option for an open council vote.");
      }
      result = await supabase.from("governance_votes").insert({
        strata_id: strataId,
        proposal_id: body.proposal_id,
        user_id: context.userId,
        choice: body.choice,
      });
    } else {
      if (!councilRoles.has(role)) {
        return fail("Only council members can open a council vote.", 403);
      }
      const options = typeof body.options === "string"
        ? body.options.split(",").map((option) => option.trim()).filter(Boolean)
        : [];
      if (
        !text(body.title, 1, 200) ||
        (body.description !== undefined && !text(body.description, 0, 5000)) ||
        options.length < 2 ||
        options.length > 8 ||
        new Set(options.map((option) => option.toLowerCase())).size !== options.length ||
        options.some((option) => option.length > 80) ||
        !validDate(body.closes_at) ||
        Date.parse(String(body.closes_at)) <= Date.now()
      ) {
        return fail("Add a title, at least two options, and a closing time in the future.");
      }
      result = await supabase.from("governance_proposals").insert({
        strata_id: strataId,
        created_by: context.userId,
        title: body.title.trim(),
        description: typeof body.description === "string" ? body.description.trim() : "",
        options,
        closes_at: body.closes_at,
      });
    }
  } else if (feature === "forms") {
    if (!councilRoles.has(role)) {
      return fail("Only council members can prepare Form B or Form F records.", 403);
    }
    if (
      !["form_b", "form_f"].includes(String(body.form_type)) ||
      (body.unit_number !== undefined &&
        body.unit_number !== null &&
        body.unit_number !== "" &&
        !text(body.unit_number, 1, 40))
    ) {
      return fail("Choose Form B or Form F and enter a valid unit number if needed.");
    }
    result = await supabase.from("strata_forms").insert({
      strata_id: strataId,
      created_by: context.userId,
      form_type: body.form_type,
      unit_number:
        typeof body.unit_number === "string" ? body.unit_number.trim() || null : null,
    });
  } else {
    if (!councilRoles.has(role)) {
      return fail("Only council members can add compliance and warranty records.", 403);
    }
    if (
      !text(body.title, 1, 200) ||
      !["compliance", "insurance", "warranty", "maintenance", "other"].includes(String(body.category)) ||
      typeof body.due_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date) ||
      (body.notes !== undefined && !text(body.notes, 0, 2000))
    ) {
      return fail("Add a title, category, due date, and optional notes.");
    }
    result = await supabase.from("strata_compliance_items").insert({
      strata_id: strataId,
      created_by: context.userId,
      title: body.title.trim(),
      category: body.category,
      due_date: body.due_date,
      notes: typeof body.notes === "string" ? body.notes.trim() : "",
    });
  }

  if (result.error) {
    return fail("The record could not be saved. Check your strata access and try again.", 400);
  }
  return NextResponse.json({ saved: true }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ feature: string }> },
) {
  const { feature: featureName } = await params;
  const access = await getFeatureContext(featureName);
  if ("response" in access) {
    return access.response;
  }
  const parsedBody: unknown = await request.json().catch(() => null);
  if (!isRecord(parsedBody)) {
    return fail("Submit valid form data.");
  }
  const body = parsedBody;
  if (!text(body.id, 36, 36) || !councilRoles.has(access.activeMembership.role)) {
    return fail("Only council members can update these records.", 403);
  }
  const supabase = await createSupabaseServerClient();
  const strataId = access.activeMembership.id;
  let result;
  if (access.feature === "maintenance" && ["triaged", "in_progress", "completed", "closed"].includes(String(body.status))) {
    result = await supabase.from("maintenance_requests")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", body.id).eq("strata_id", strataId).select("id").maybeSingle();
  } else if (access.feature === "amenities" && ["approved", "declined"].includes(String(body.status))) {
    result = await supabase.from("amenity_reservations")
      .update({ status: body.status, reviewed_by: access.context.userId })
      .eq("id", body.id).eq("strata_id", strataId).select("id").maybeSingle();
  } else if (access.feature === "compliance" && ["completed", "dismissed", "upcoming"].includes(String(body.status))) {
    result = await supabase.from("strata_compliance_items")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", body.id).eq("strata_id", strataId).select("id").maybeSingle();
  } else if (access.feature === "voting" && body.status === "closed") {
    result = await supabase.from("governance_proposals")
      .update({ status: "closed" })
      .eq("id", body.id).eq("strata_id", strataId).select("id").maybeSingle();
  } else {
    return fail("This update is not supported.");
  }
  if (result.error || !result.data) {
    return fail("The record could not be updated. Check your council access and try again.", 400);
  }
  return NextResponse.json({ saved: true });
}
