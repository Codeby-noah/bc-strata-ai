import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
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
  const subscription = await paidWorkspaceResponse(context.activeMembership.id);
  if (subscription) return { response: subscription } as const;
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
    case "maintenance": {
      const [requests, quotes] = await Promise.all([
        supabase
          .from("maintenance_requests")
          .select("*")
          .eq("strata_id", activeMembership.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("maintenance_quotes")
          .select("id, request_id, vendor, amount, notes, created_at")
          .eq("strata_id", activeMembership.id)
          .order("amount", { ascending: true })
          .limit(200),
      ]);
      if (requests.error) {
        return fail("This section needs its database setup before it can load or save records.", 503);
      }
      const quoteRows = quotes.error ? [] : quotes.data ?? [];
      const items = (requests.data ?? []).map((request) => ({
        ...request,
        quotes: quoteRows.filter((quote) => quote.request_id === request.id),
      }));
      return NextResponse.json({
        items,
        role: activeMembership.role,
        userId: access.context.userId,
      });
    }
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
    case "parking": {
      const [passes, assets] = await Promise.all([
        supabase
          .from("visitor_parking_passes")
          .select("*")
          .eq("strata_id", activeMembership.id)
          .order("starts_at", { ascending: false })
          .limit(100),
        supabase
          .from("parking_assets")
          .select("id, unit_number, stall_number, license_plate, asset_type, assigned_to, created_at")
          .eq("strata_id", activeMembership.id)
          .order("unit_number", { ascending: true })
          .limit(200),
      ]);
      if (passes.error) {
        return fail("Visitor parking setup is not ready. Ask the workspace owner to complete database setup.", 503);
      }
      return NextResponse.json({
        items: passes.data ?? [],
        assets: assets.error ? [] : assets.data ?? [],
        role: activeMembership.role,
        userId: access.context.userId,
      });
    }
    case "voting":
      query = supabase
        .from("governance_proposals")
        .select("*, governance_votes(id, user_id, choice, created_at)")
        .eq("strata_id", activeMembership.id)
        .order("created_at", { ascending: false })
        .limit(100);
      break;
    case "compliance": {
      const [items, notices] = await Promise.all([
        supabase
          .from("strata_compliance_items")
          .select("*")
          .eq("strata_id", activeMembership.id)
          .order("due_date", { ascending: true })
          .limit(100),
        supabase
          .from("strata_notices")
          .select("id, title, body, severity, published, created_at")
          .eq("strata_id", activeMembership.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (items.error) {
        return fail("This section needs its database setup before it can load or save records.", 503);
      }
      return NextResponse.json({
        items: items.data ?? [],
        notices: notices.error ? [] : notices.data ?? [],
        role: activeMembership.role,
        userId: access.context.userId,
      });
    }
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
    if (body.operation === "add_quote") {
      if (!councilRoles.has(role)) {
        return fail("Only council members can record contractor quotes.", 403);
      }
      const amount = Number(body.amount);
      if (
        !text(body.request_id, 36, 36) ||
        !text(body.vendor, 1, 160) ||
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > 100_000_000 ||
        (body.notes !== undefined && !text(body.notes, 0, 2000))
      ) {
        return fail("Add the request, vendor, and a valid quote amount.");
      }
      result = await supabase.from("maintenance_quotes").insert({
        strata_id: strataId,
        request_id: body.request_id,
        vendor: body.vendor.trim(),
        amount: Math.round(amount * 100) / 100,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
        created_by: context.userId,
      });
    } else if (
      !text(body.title, 1, 160) ||
      !text(body.location, 1, 160) ||
      !text(body.description, 1, 5000) ||
      !["low", "normal", "high", "emergency"].includes(String(body.priority))
    ) {
      return fail("Add a title, location, description, and valid priority.");
    } else {
      result = await supabase.from("maintenance_requests").insert({
        strata_id: strataId,
        reported_by: context.userId,
        title: body.title.trim(),
        location: body.location.trim(),
        description: body.description.trim(),
        priority: body.priority,
      });
    }
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
    if (body.operation === "assign_asset") {
      if (!councilRoles.has(role)) {
        return fail("Only council members can assign stalls and lockers.", 403);
      }
      const plate = typeof body.license_plate === "string" ? body.license_plate.trim() : "";
      const email = typeof body.resident_email === "string" ? body.resident_email.trim() : "";
      if (
        !text(body.unit_number, 1, 40) ||
        !text(body.stall_number, 1, 80) ||
        !["visitor_pass", "resident_stall", "locker"].includes(String(body.asset_type)) ||
        plate.length > 24 ||
        (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      ) {
        return fail("Add a unit, stall or locker number, and a valid asset type.");
      }
      let assignedTo: string | null = null;
      if (email) {
        if (role !== "admin") {
          return fail("Only an administrator can link a stall to a resident account. Save the unit and stall without an email, or ask an administrator.");
        }
        const members = await supabase.rpc("list_strata_members", {
          target_strata_id: strataId,
        });
        if (members.error || !Array.isArray(members.data)) {
          return fail("The resident account could not be looked up.");
        }
        const match = members.data.find((member) => {
          if (!isRecord(member)) return false;
          return typeof member.email === "string" &&
            member.email.toLowerCase() === email.toLowerCase() &&
            typeof member.user_id === "string";
        });
        if (!match || !isRecord(match) || typeof match.user_id !== "string") {
          return fail("No member in this strata uses that email.");
        }
        assignedTo = match.user_id;
      }
      result = await supabase.from("parking_assets").insert({
        strata_id: strataId,
        unit_number: body.unit_number.trim(),
        stall_number: body.stall_number.trim(),
        asset_type: body.asset_type,
        license_plate: plate || null,
        assigned_to: assignedTo,
      });
    } else if (body.operation === "remove_asset") {
      if (!councilRoles.has(role)) {
        return fail("Only council members can remove stall assignments.", 403);
      }
      if (!text(body.id, 36, 36)) {
        return fail("Choose an assignment to remove.");
      }
      result = await supabase
        .from("parking_assets")
        .delete()
        .eq("id", body.id)
        .eq("strata_id", strataId)
        .select("id");
      if (!result.error && !result.data?.length) {
        return fail("The assignment could not be removed.");
      }
    } else if (
      !text(body.visitor_name, 1, 120) ||
      !text(body.vehicle_plate, 1, 24) ||
      !text(body.stall, 1, 80) ||
      !validDate(body.starts_at) ||
      !validDate(body.ends_at) ||
      Date.parse(String(body.starts_at)) <= Date.now() ||
      Date.parse(String(body.ends_at)) <= Date.parse(String(body.starts_at))
    ) {
      return fail("Add visitor and vehicle details with a valid pass time range.");
    } else {
      result = await supabase.from("visitor_parking_passes").insert({
        strata_id: strataId,
        issued_by: context.userId,
        visitor_name: body.visitor_name.trim(),
        vehicle_plate: body.vehicle_plate.trim(),
        stall: body.stall.trim(),
        starts_at: body.starts_at,
        ends_at: body.ends_at,
      });
    }
  } else if (feature === "voting") {
    if (body.operation === "vote") {
      if (!councilRoles.has(role)) {
        return fail("Only active council members can vote on council decisions.", 403);
      }
      if (!text(body.proposal_id, 36, 36) || !text(body.choice, 1, 80)) {
        return fail("Choose an option for an open council vote.");
      }
      const proposal = await supabase
        .from("governance_proposals")
        .select("status, options, closes_at")
        .eq("id", body.proposal_id)
        .eq("strata_id", strataId)
        .maybeSingle();
      const options = Array.isArray(proposal.data?.options) ? proposal.data.options : [];
      if (
        proposal.error ||
        !proposal.data ||
        proposal.data.status !== "open" ||
        !validDate(proposal.data.closes_at) ||
        Date.parse(String(proposal.data.closes_at)) <= Date.now() ||
        !options.some((option) => option === body.choice)
      ) {
        return fail("Choose one of the options on an open council vote.");
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
    if (body.operation === "publish_notice") {
      if (!councilRoles.has(role)) {
        return fail("Only council members can publish resident notices.", 403);
      }
      if (
        !text(body.title, 1, 160) ||
        !text(body.body, 1, 2000) ||
        !["info", "warning", "emergency"].includes(String(body.severity))
      ) {
        return fail("Add a notice title, message, and severity.");
      }
      result = await supabase.from("strata_notices").insert({
        strata_id: strataId,
        created_by: context.userId,
        title: body.title.trim(),
        body: body.body.trim(),
        severity: body.severity,
        published: true,
      });
    } else if (!councilRoles.has(role)) {
      return fail("Only council members can add compliance and warranty records.", 403);
    } else if (
      !text(body.title, 1, 200) ||
      !["compliance", "insurance", "warranty", "maintenance", "other"].includes(String(body.category)) ||
      typeof body.due_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date) ||
      (body.notes !== undefined && !text(body.notes, 0, 2000))
    ) {
      return fail("Add a title, category, due date, and optional notes.");
    } else {
      result = await supabase.from("strata_compliance_items").insert({
        strata_id: strataId,
        created_by: context.userId,
        title: body.title.trim(),
        category: body.category,
        due_date: body.due_date,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      });
    }
  }

  if (!result) {
    return fail("The record could not be saved. Check your strata access and try again.", 400);
  }
  if (result.error) {
    const detail = result.error.message ?? "";
    if (detail.includes("no_overlap")) {
      return fail("That space is already booked for part of this time.");
    }
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
  if (!text(body.id, 36, 36)) {
    return fail("Submit valid form data.");
  }
  const supabase = await createSupabaseServerClient();
  const strataId = access.activeMembership.id;
  const role = access.activeMembership.role;
  let result;
  if (access.feature === "amenities" && body.status === "cancelled") {
    const update: { status: "cancelled"; reviewed_by?: string } = { status: "cancelled" };
    if (councilRoles.has(role)) {
      update.reviewed_by = access.context.userId;
    }
    result = await supabase.from("amenity_reservations")
      .update(update)
      .eq("id", body.id).eq("strata_id", strataId).select("id").maybeSingle();
  } else if (!councilRoles.has(role)) {
    return fail("Only council members can update these records.", 403);
  } else if (access.feature === "maintenance" && ["triaged", "in_progress", "completed", "closed"].includes(String(body.status))) {
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
    return fail("The record could not be updated. Check your access and try again.", 400);
  }
  return NextResponse.json({ saved: true });
}
