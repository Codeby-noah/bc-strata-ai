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
          { label: "Open requests", value: "—", note: "Not finished yet" },
          { label: "In progress", value: "—", note: "Work underway" },
          { label: "Quotes to review", value: "—", note: "Contractor prices on file" },
          { label: "Completed this year", value: "—", note: "Finished this calendar year" },
        ],
        sections: [
          {
            title: "Repair requests",
            description: "Track reports from first notice through resolution.",
            emptyTitle: "No requests to display",
            emptyDescription:
              "Submit a request with the form on this page. Residents can also report one from their portal.",
          },
          {
            title: "Contractors & work history",
            description: "Keep quotes, decisions, and completed work together.",
            emptyTitle: "No maintenance history yet",
            emptyDescription:
              "Record a contractor quote on a request. Finished jobs stay in this list.",
          },
        ],
      }}
    />
  );
}
