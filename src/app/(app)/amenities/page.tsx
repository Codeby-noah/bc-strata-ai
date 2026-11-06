import type { Metadata } from "next";
import { FeatureWorkspace } from "@/components/FeatureWorkspace";

export const metadata: Metadata = { title: "Amenity bookings" };
export const instant = false;

export default function AmenitiesPage() {
  return (
    <FeatureWorkspace
      feature="amenities"
      content={{
        eyebrow: "Resident services",
        title: "Amenity bookings",
        description:
          "Give residents a clear view of shared-space availability and a simple way to request a reservation.",
        metrics: [
          { label: "Shared spaces", value: "—", note: "Add spaces after setup" },
          { label: "Booking requests", value: "—", note: "Requested or confirmed" },
          { label: "Confirmed bookings", value: "—", note: "Approved reservations" },
          { label: "Awaiting review", value: "—", note: "Council or manager action" },
        ],
        sections: [
          {
            title: "Availability",
            description: "Review shared spaces and open time slots.",
            emptyTitle: "No shared spaces configured",
            emptyDescription:
              "Set up spaces such as a clubhouse, guest suite, or common room and publish their booking rules.",
          },
          {
            title: "Reservations",
            description: "See requested and confirmed bookings in one place.",
            emptyTitle: "No reservations yet",
            emptyDescription:
              "After the booking workflow is connected, residents can request a time and see reservation updates here.",
          },
        ],
      }}
    />
  );
}
