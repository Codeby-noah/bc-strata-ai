import type { Metadata } from "next";
import { FeatureWorkspace } from "@/components/FeatureWorkspace";

export const metadata: Metadata = { title: "Visitor parking" };
export const instant = false;

export default function ParkingPage() {
  return (
    <FeatureWorkspace
      feature="parking"
      content={{
        eyebrow: "Resident services",
        title: "Visitor parking",
        description:
          "Create temporary visitor pass records with clear expiry times. Email delivery is not configured yet.",
        metrics: [
          { label: "Passes issued", value: "—", note: "Visible to you and council" },
          { label: "Expiring today", value: "—", note: "Time-sensitive passes" },
          { label: "Spaces available", value: "—", note: "Configure parking first" },
          { label: "Issued this month", value: "—", note: "Pass history" },
        ],
        sections: [
          {
            title: "Active visitor passes",
            description: "Review current passes and their expiry times.",
            emptyTitle: "No active passes",
            emptyDescription:
              "The pass register will show visitor details, assigned parking, expiry, and issuing resident when this workflow is connected.",
          },
          {
            title: "Parking setup",
            description: "Define visitor stalls and pass rules for the property.",
            emptyTitle: "Parking rules are not configured",
            emptyDescription:
              "Add visitor stalls, permitted durations, and council-approved conditions before issuing digital passes.",
          },
        ],
      }}
    />
  );
}
