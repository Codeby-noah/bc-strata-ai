import type { Metadata } from "next";
import { CrtRiskChecker } from "@/components/governance/CrtRiskChecker";
import { FeatureWorkspace } from "@/components/FeatureWorkspace";

export const metadata: Metadata = { title: "Compliance & warranties" };
export const instant = false;

export default function CompliancePage() {
  return (
    <div>
      <CrtRiskChecker />
      <FeatureWorkspace
      feature="compliance"
      content={{
        eyebrow: "Governance",
        title: "Compliance & warranties",
        description:
          "Keep key filing dates, insurance renewals, warranty periods, and council follow-ups visible in one place.",
        metrics: [
          { label: "Upcoming deadlines", value: "—", note: "Next 90 days" },
          { label: "Overdue items", value: "—", note: "Requires workspace setup" },
          { label: "Warranty records", value: "—", note: "Building assets" },
          { label: "Last reviewed", value: "—", note: "Council review date" },
        ],
        sections: [
          {
            title: "Upcoming dates",
            description: "Plan ahead for renewals and required follow-ups.",
            emptyTitle: "No deadlines entered",
            emptyDescription:
              "Add renewal and compliance dates to build a council calendar with advance reminders.",
          },
          {
            title: "Warranty register",
            description: "Track coverage periods by building component.",
            emptyTitle: "No warranty records",
            emptyDescription:
              "Record the covered asset, provider, start date, expiry, and supporting documents to help avoid missed claims.",
          },
        ],
      }}
    />
    </div>
  );
}
