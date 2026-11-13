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
          "Save a visitor pass, print it for the visitor, and keep stall and locker assignments with each unit.",
        metrics: [
          { label: "Passes issued", value: "—", note: "Saved in this workspace" },
          { label: "Expiring today", value: "—", note: "End time is today" },
          { label: "Active now", value: "—", note: "Still before the end time" },
          { label: "Issued this month", value: "—", note: "Created this calendar month" },
        ],
        sections: [
          {
            title: "Active visitor passes",
            description: "Review current passes and their expiry times.",
            emptyTitle: "No active passes",
            emptyDescription:
              "Use the form on this page to issue a pass. It stays on this list until the end time.",
          },
          {
            title: "Expired passes",
            description: "Passes whose end time has already passed.",
            emptyTitle: "No expired passes",
            emptyDescription:
              "Issued passes move here after their end time so council can keep a record without mixing them into the active list.",
          },
        ],
      }}
    />
  );
}
