import type { Metadata } from "next";
import { FeatureWorkspace } from "@/components/FeatureWorkspace";

export const metadata: Metadata = { title: "Maintenance requests" };
export const instant = false;

export default function MaintenancePage() {
  return (
    <FeatureWorkspace
      feature="maintenance"
      content={{
        eyebrow: "Property care",
        title: "Maintenance requests",
        description:
          "Receive repair requests, coordinate contractor quotes, and keep a location-based record of work across the property.",
        metrics: [
          { label: "Open requests", value: "—", note: "Requires workspace setup" },
          { label: "In progress", value: "—", note: "Requires workspace setup" },
          { label: "Quotes to review", value: "—", note: "Council review queue" },
          { label: "Completed this year", value: "—", note: "Property work history" },
        ],
        sections: [
          {
            title: "Repair requests",
            description: "Track reports from first notice through resolution.",
            emptyTitle: "No requests to display",
            emptyDescription:
              "Once request intake is connected, residents can describe an issue, add a location and photos, and follow its status here.",
          },
          {
            title: "Contractors & work history",
            description: "Keep quotes, decisions, and completed work together.",
            emptyTitle: "No maintenance history yet",
            emptyDescription:
              "Council will be able to compare quotes and keep a searchable history by building, unit, or shared area.",
          },
        ],
      }}
    />
  );
}
