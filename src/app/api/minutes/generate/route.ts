import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
import { canManageExemptions } from "@/lib/strata/roles";

type MinutesSection = {
  title: string;
  pattern: RegExp;
  placeholder: string;
};

const sections: MinutesSection[] = [
  {
    title: "Call to Order",
    pattern: /\b(call to order|opened|opening|start time|called the meeting)\b/i,
    placeholder: "Confirm the meeting start time and presiding chair.",
  },
  {
    title: "Roll Call / Attendance",
    pattern: /\b(attendance|attendees|present|absent|quorum|roll call)\b/i,
    placeholder: "Confirm attendees, guests, regrets, and quorum.",
  },
  {
    title: "Approval of Previous Minutes",
    pattern: /\b(previous minutes|prior minutes|minutes approved|minutes adopted|approve minutes)\b/i,
    placeholder: "Record the motion and outcome for approval of previous minutes.",
  },
  {
    title: "Financial Report",
    pattern: /\b(financial|finance|budget|bank|crf|reserve fund|invoice|arrears|levy)\b/i,
    placeholder: "Record the treasurer’s verified report and any motions.",
  },
  {
    title: "Maintenance & Property Reports",
    pattern: /\b(maintenance|repair|roof|plumbing|landscap|contractor|inspection|property report)\b/i,
    placeholder: "Record maintenance updates, decisions, and assigned follow-up.",
  },
  {
    title: "New Business",
    pattern: /\b(new business|bylaw|policy|parking|amenity|motion|vote|discuss)\b/i,
    placeholder: "Record discussion, motions, outcomes, and action owners.",
  },
  {
    title: "Adjournment",
    pattern: /\b(adjourn|adjourned|close of meeting|meeting ended|end time)\b/i,
    placeholder: "Confirm the adjournment time.",
  },
];

function formatDraft(
  meetingType: string,
  meetingDate: string,
  rawNotes: string,
) {
  const categorized = new Map<string, string[]>();
  const unclassified: string[] = [];
  const notes = rawNotes
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((note) => note.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);

  for (const note of notes) {
    const section = sections.find((candidate) => candidate.pattern.test(note));
    if (!section) {
      unclassified.push(note);
      continue;
    }
    const items = categorized.get(section.title) ?? [];
    items.push(note);
    categorized.set(section.title, items);
  }

  const lines = [
    `# ${meetingType} Minutes`,
    `Date: ${meetingDate}`,
    "",
    "> Draft formatter only. Verify names, motions, votes, facts, and times before publication. No facts have been added beyond the supplied notes.",
    "",
  ];

  for (const [index, section] of sections.entries()) {
    lines.push(`## ${index + 1}. ${section.title}`);
    const items = categorized.get(section.title) ?? [];
    if (items.length) {
      lines.push(...items.map((item) => `- ${item}`));
    } else {
      lines.push(`- [${section.placeholder}]`);
    }
    if (section.title === "New Business" && unclassified.length) {
      lines.push("- Items requiring secretary review:");
      lines.push(...unclassified.map((item) => `  - ${item}`));
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!context.activeMembership || !canManageExemptions(context.activeMembership.role)) {
    return NextResponse.json({ error: "Council access is required." }, { status: 403 });
  }
  const subscription = await paidWorkspaceResponse(context.activeMembership.id);
  if (subscription) return subscription;

  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== "object" ||
    body === null ||
    !("rawNotes" in body) ||
    typeof body.rawNotes !== "string" ||
    body.rawNotes.trim().length < 1 ||
    body.rawNotes.length > 20000 ||
    !("meetingType" in body) ||
    typeof body.meetingType !== "string" ||
    !["Council Meeting", "AGM", "SGM"].includes(body.meetingType) ||
    !("meetingDate" in body) ||
    typeof body.meetingDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.meetingDate)
  ) {
    return NextResponse.json(
      { error: "Enter meeting notes, a valid meeting type, and date." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    formattedContent: formatDraft(body.meetingType, body.meetingDate, body.rawNotes),
    mode: "local-template",
  });
}
