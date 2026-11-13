"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { printPlainDocument } from "@/lib/print-document";

type Space = { id: string; name: string };
type Reservation = {
  id: string;
  purpose: string;
  status: string;
  starts_at: string;
  ends_at: string;
  requested_by?: string;
  amenity_spaces: { name?: string } | null;
};
type Pass = {
  id: string;
  visitor_name: string;
  vehicle_plate: string;
  stall: string;
  starts_at: string;
  ends_at: string;
};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function ResidentSelfService({ strataName }: { strataName: string }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [amenitiesResponse, parkingResponse] = await Promise.all([
      fetch("/api/workspace/amenities", { cache: "no-store" }),
      fetch("/api/workspace/parking", { cache: "no-store" }),
    ]);
    const amenities = await amenitiesResponse.json() as {
      spaces?: Space[];
      reservations?: Reservation[];
      userId?: string;
    };
    const parking = await parkingResponse.json() as { items?: Pass[]; userId?: string };
    if (amenitiesResponse.ok) {
      setSpaces(amenities.spaces ?? []);
      setReservations(amenities.reservations ?? []);
      setUserId(amenities.userId ?? "");
    }
    if (parkingResponse.ok) {
      setPasses(parking.items ?? []);
      setUserId((current) => current || parking.userId || "");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (active) await load();
      } catch {
        if (active) setMessage("Bookings and visitor passes could not be loaded.");
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/amenities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          space_id: values.get("space_id"),
          starts_at: toIso(values.get("starts_at")),
          ends_at: toIso(values.get("ends_at")),
          purpose: values.get("purpose"),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The booking could not be requested.");
        return;
      }
      form.reset();
      setMessage("Booking requested. Council still needs to approve it.");
      await load();
    } catch {
      setMessage("The booking could not be requested. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/amenities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The request could not be cancelled.");
        return;
      }
      setMessage("Booking request cancelled.");
      await load();
    } catch {
      setMessage("The request could not be cancelled. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function issuePass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const pass = {
      visitor_name: String(values.get("visitor_name") ?? ""),
      vehicle_plate: String(values.get("vehicle_plate") ?? ""),
      stall: String(values.get("stall") ?? ""),
      starts_at: toIso(values.get("starts_at")),
      ends_at: toIso(values.get("ends_at")),
    };
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/parking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pass),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The visitor pass could not be saved.");
        return;
      }
      form.reset();
      setMessage("Visitor pass saved. Print it for the visitor. It is not emailed.");
      printPass(strataName, pass);
      await load();
    } catch {
      setMessage("The visitor pass could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const mine = reservations.filter((item) => !userId || item.requested_by === userId);

  return (
    <div className="space-y-8">
      {message ? (
        <p role="status" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      <section id="bookings" className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">Book a shared space</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Request a time. Council approves or declines it. You can cancel a request before it is reviewed.
        </p>
        {spaces.length ? (
          <form onSubmit={(event) => void book(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Shared space
              <select name="space_id" required className={fieldClass}>
                <option value="">Choose a space</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Start
              <input name="starts_at" type="datetime-local" required className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              End
              <input name="ends_at" type="datetime-local" required className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Purpose
              <input name="purpose" required maxLength={500} className={fieldClass} />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
            >
              {busy ? "Saving…" : "Request booking"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Council has not added a shared space yet.</p>
        )}
        {mine.length ? (
          <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
            {mine.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium text-slate-900">{item.amenity_spaces?.name ?? "Shared space"}</span>
                  <span className="mt-1 block text-slate-500">
                    {new Date(item.starts_at).toLocaleString("en-CA")} · {item.status.replaceAll("_", " ")}
                  </span>
                </span>
                {item.status === "requested" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancelBooking(item.id)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Cancel request
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="visitor-pass" className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">Visitor parking pass</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Save a pass and print it. The app does not email the visitor.
        </p>
        <form onSubmit={(event) => void issuePass(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Visitor name
            <input name="visitor_name" required maxLength={120} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Plate
            <input name="vehicle_plate" required maxLength={24} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Stall
            <input name="stall" required maxLength={80} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Valid from
            <input name="starts_at" type="datetime-local" required className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Valid until
            <input name="ends_at" type="datetime-local" required className={fieldClass} />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="self-end rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save and print"}
          </button>
        </form>
        {passes.length ? (
          <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
            {passes.map((pass) => (
              <li key={pass.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium text-slate-900">{pass.visitor_name}</span>
                  <span className="mt-1 block text-slate-500">
                    {pass.vehicle_plate} · Stall {pass.stall} · until {new Date(pass.ends_at).toLocaleString("en-CA")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => printPass(strataName, pass)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Print
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function toIso(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? new Date(value).toISOString() : "";
}

function printPass(
  strataName: string,
  pass: { visitor_name: string; vehicle_plate: string; stall: string; starts_at: string; ends_at: string },
) {
  printPlainDocument(
    `${strataName} visitor parking pass`,
    [
      strataName,
      "Visitor parking pass",
      "",
      `Visitor: ${pass.visitor_name}`,
      `Plate: ${pass.vehicle_plate}`,
      `Stall: ${pass.stall}`,
      `Valid from: ${new Date(pass.starts_at).toLocaleString("en-CA")}`,
      `Valid until: ${new Date(pass.ends_at).toLocaleString("en-CA")}`,
      "",
      "Show this pass while the vehicle is parked. It is not emailed.",
    ].join("\n"),
  );
}
