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
          "Organize decisions with defined voting periods and a timestamped record for council review.",
        metrics: [
          { label: "Open votes", value: "—", note: "Requires workspace setup" },
          { label: "Awaiting your vote", value: "—", note: "Private to your account" },
          { label: "Recently closed", value: "—", note: "Decision history" },
          { label: "Council members", value: "—", note: "Active membership list" },
        ],
        sections: [
          {
            title: "Active decisions",
            description: "Review the question, deadline, and current status.",
            emptyTitle: "No active votes",
            emptyDescription:
              "When voting is enabled, eligible council members can review open decisions and submit a recorded response.",
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
