import type { Metadata } from "next";
import { FeatureWorkspace } from "@/components/FeatureWorkspace";

export const metadata: Metadata = { title: "Council voting" };
export const instant = false;

export default function VotingPage() {
  return (
    <FeatureWorkspace
      feature="voting"
      content={{
        eyebrow: "Governance",
        title: "Council voting",
        description:
          "Open a council decision, record one vote per council member, and keep the totals with the decision.",
        metrics: [
          { label: "Open votes", value: "—", note: "Decisions still open" },
          { label: "Awaiting your vote", value: "—", note: "Open, with no vote from you" },
          { label: "Recently closed", value: "—", note: "Closed or cancelled" },
          { label: "Recorded votes", value: "—", note: "Responses saved so far" },
        ],
        sections: [
          {
            title: "Active decisions",
            description: "Review the question, deadline, and current status.",
            emptyTitle: "No active votes",
            emptyDescription:
              "Open a vote with the form on this page. Each council member can record one response.",
          },
          {
            title: "Decision record",
            description: "Keep completed outcomes and meeting references.",
            emptyTitle: "No decisions recorded",
            emptyDescription:
              "Completed votes will be retained with timestamps and results so the council can refer back to its decision history.",
          },
        ],
      }}
    />
  );
}
