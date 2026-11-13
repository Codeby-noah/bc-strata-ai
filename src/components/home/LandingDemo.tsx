"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type DemoId = "documents" | "ledgers" | "maintenance" | "parking" | "governance";
type Audience = "council" | "resident";

type Demo = {
  id: DemoId;
  label: string;
  area: string;
  job: string;
  detail: string;
  href: string;
};

const demos: Demo[] = [
  {
    id: "documents",
    label: "Bylaw question answered with the source page",
    area: "Documents",
    job: "Bylaws and minutes",
    href: "/documents",
    detail:
      "Ask the bylaws in plain language and get the page beside the answer. Council stops scrolling the PDF and forwarding the same clause by email.",
  },
  {
    id: "ledgers",
    label: "Invoice waiting for treasurer review",
    area: "Ledgers",
    job: "The strata’s money",
    href: "/ledgers",
    detail:
      "The operating fund and the contingency reserve fund stay in separate ledgers. An invoice is read for you, then a person posts it. The treasurer checks the numbers instead of typing them in.",
  },
  {
    id: "maintenance",
    label: "Roof leak moved to quoting",
    area: "Maintenance",
    job: "Repairs",
    href: "/maintenance",
    detail:
      "Residents file the repair themselves, with a photo if they have one. Council moves it from new, to quoting, to done, and keeps the contractor’s price on that same request.",
  },
  {
    id: "parking",
    label: "Visitor pass until Friday at 6 p.m.",
    area: "Parking",
    job: "Shared spaces and visitor parking",
    href: "/parking",
    detail:
      "Room requests and visitor passes sit on a list you can approve and print. Council is not rewriting plates and stall numbers into a new email each time.",
  },
  {
    id: "governance",
    label: "Insurance renewal on the compliance list",
    area: "Governance",
    job: "Council decisions",
    href: "/governance/compliance",
    detail:
      "A vote, an insurance date, and a resident notice live on one list. Publish the minutes once. Owners read them in the portal instead of asking for another copy.",
  },
];

const pressable =
  "cursor-pointer transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

const DemoContext = createContext<{
  active: Demo;
  audience: Audience;
  choose: (id: DemoId) => void;
  setAudience: (audience: Audience) => void;
} | null>(null);

function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("Landing demo is missing its provider.");
  return value;
}

export function LandingDemoProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<DemoId>("documents");
  const [audience, setAudience] = useState<Audience>("council");
  const active = demos.find((demo) => demo.id === activeId) ?? demos[0];

  function choose(id: DemoId) {
    setActiveId(id);
  }

  return (
    <DemoContext.Provider value={{ active, audience, choose, setAudience }}>
      {children}
    </DemoContext.Provider>
  );
}

export function HeroActions() {
  const { audience, setAudience } = useDemo();
  const council = audience === "council";

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={council ? "/signup" : "/login?mode=resident"}
          className={`${pressable} inline-flex h-12 items-center justify-center rounded-lg bg-slate-900 px-6 text-base font-semibold text-white hover:bg-slate-800`}
        >
          {council ? "Start 1-month free trial" : "Email me a resident sign-in link"}
        </a>
        <a
          href="#work"
          className={`${pressable} inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50`}
        >
          Try the example hub
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Who is visiting">
        <button
          type="button"
          aria-pressed={council}
          onClick={() => setAudience("council")}
          className={`${pressable} rounded-full px-3 py-1.5 text-sm font-semibold ${
            council ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          }`}
        >
          I am on council
        </button>
        <button
          type="button"
          aria-pressed={!council}
          onClick={() => setAudience("resident")}
          className={`${pressable} rounded-full px-3 py-1.5 text-sm font-semibold ${
            council ? "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50" : "bg-slate-900 text-white"
          }`}
        >
          I live in the building
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {council
          ? "The button starts a council account. The first month is free. Log in is in the corner if you already have one."
          : "Residents do not buy a subscription. Use Log in, then choose the email sign-in link."}
      </p>
    </>
  );
}

export function HubPreview() {
  const { active, choose } = useDemo();

  return (
    <aside
      aria-label="Example of the council workspace"
      className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_28px_70px_-30px_rgba(15,23,42,0.55)]"
    >
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-3 rounded-full bg-rose-400" />
          <span className="size-3 rounded-full bg-amber-300" />
          <span className="size-3 rounded-full bg-emerald-400" />
        </span>
        <p className="min-w-0 text-base font-bold tracking-tight text-slate-950 sm:text-lg">Example council hub</p>
        <span className="ml-auto hidden shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white sm:inline-flex">
          Click a row
        </span>
      </div>
      <ul className="space-y-2.5 p-4 sm:p-6">
        {demos.map((demo) => {
          const selected = demo.id === active.id;
          return (
            <li key={demo.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => choose(demo.id)}
                className={`${pressable} flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-4 text-left sm:px-5 sm:py-[1.15rem] ${
                  selected
                    ? "bg-slate-950 text-white shadow-md"
                    : "bg-slate-50 text-slate-950 hover:bg-slate-100"
                }`}
              >
                <span className="text-base font-bold leading-6 tracking-tight sm:text-lg">
                  {demo.label}
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    selected ? "bg-white/15 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  {demo.area}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mx-4 mb-4 rounded-2xl bg-blue-50 px-5 py-5 sm:mx-6 sm:mb-6 sm:px-6 sm:py-6" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">{active.area}</p>
        <p className="mt-2 text-base font-semibold leading-7 text-slate-950 sm:text-lg sm:leading-8">
          {active.detail}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={active.href}
            className={`${pressable} inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800`}
          >
            Open {active.area}
          </a>
          {active.id === "parking" ? (
            <a
              href="/amenities"
              className={`${pressable} inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50`}
            >
              Open bookings
            </a>
          ) : null}
          {active.id === "governance" ? (
            <a
              href="/governance/voting"
              className={`${pressable} inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50`}
            >
              Open voting
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function JobGrid() {
  const { active, audience, choose } = useDemo();
  const council = audience === "council";

  return (
    <div id="work" className="scroll-mt-20">
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">The tools that take the busywork</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
        These are the jobs that usually eat a weeknight. Click a card to see how that tool shortens it. The example hub above follows along.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => {
          const selected = demo.id === active.id;
          return (
            <button
              key={demo.id}
              id={`job-${demo.id}`}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(demo.id)}
              className={`${pressable} rounded-2xl border bg-white p-6 text-left ${
                selected ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <h3 className="text-lg font-semibold text-slate-950">{demo.job}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selected ? demo.detail : demo.label}</p>
            </button>
          );
        })}
        <a
          href={council ? "/signup" : "/login?mode=resident"}
          className={`${pressable} flex flex-col justify-between rounded-2xl border border-slate-900 bg-slate-900 p-6 text-left text-white hover:bg-slate-800`}
        >
          <h3 className="text-lg font-semibold">
            {council ? "Start 1-month free trial" : "Get a resident sign-in link"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {council
              ? "Discounted to $139 CAD a month for the first 12 months, then $179 a month."
              : "Use the email link your council invited you with."}
          </p>
        </a>
      </div>
    </div>
  );
}

const timeSavers: Array<{ id: DemoId; title: string; save: string }> = [
  {
    id: "documents",
    title: "Bylaw answers, with the page",
    save: "Ask in plain language. The answer stays next to the source page, so nobody is scrolling the bylaws PDF to copy one clause into an email.",
  },
  {
    id: "ledgers",
    title: "Invoices the treasurer only has to check",
    save: "Upload the bill. The fields are read for review, and nothing hits the operating fund or the contingency reserve until a person posts it.",
  },
  {
    id: "maintenance",
    title: "Repairs the resident starts",
    save: "Owners file the leak, the location, and a photo. Council moves the card and records the quote. The status is already there when someone asks.",
  },
  {
    id: "parking",
    title: "Passes and room bookings on one list",
    save: "Save the plate, stall, and end time, then print the pass. Shared-room requests wait in the same workspace for a yes or a no.",
  },
  {
    id: "governance",
    title: "Votes, dates, and notices in one place",
    save: "Record one council vote per member, keep insurance and warranty dates on a list, and publish minutes once so owners can read them.",
  },
];

export function AboutPicker() {
  const { active, choose } = useDemo();

  return (
    <section id="what" className="scroll-mt-20">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Where the hours go</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Self-managed councils lose evenings to the same five jobs: finding a bylaw, entering a bill, chasing a repair, writing a visitor pass, and resending minutes. Each tool below takes one of those jobs out of the inbox. Click one and the example hub follows.
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2" role="group" aria-label="Work the workspace takes on">
        {timeSavers.map((entry) => {
          const selected = active.id === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(entry.id)}
              className={`${pressable} rounded-2xl border p-5 text-left ${
                selected ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <h3 className="text-base font-semibold text-slate-950">{entry.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{entry.save}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Create a council account",
    text: "The first person signs up, creates the strata workspace, and becomes the administrator.",
    href: "/signup",
    action: "Create account",
  },
  {
    title: "Invite the people who belong there",
    text: "Council members get the full workspace. Residents get a simpler portal for requests, notices, and their own records.",
    href: "/login",
    action: "Log in to invite people",
  },
  {
    title: "Start the 1-month free trial",
    text: "The council workspace is discounted to $139 CAD a month for the first 12 months after a 1-month free trial. The price then goes up to $179 CAD a month until the strata cancels. An administrator can cancel from billing before the trial ends.",
    href: "/signup",
    action: "Start 1-month free trial",
  },
];

export function StartPath() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected] ?? steps[0];

  return (
    <section id="start" className="scroll-mt-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">How a new council starts</h2>
          <ol className="mt-8 space-y-3">
            {steps.map((entry, index) => (
              <li key={entry.title}>
                <button
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  className={`${pressable} flex w-full gap-4 rounded-2xl border p-4 text-left ${
                    selected === index ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-950">{entry.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{entry.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <a
            href={step.href}
            className={`${pressable} mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800`}
          >
            {step.action}
          </a>
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold text-slate-500">Council workspace</p>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            <span className="line-through">$179</span> regular price
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-slate-950">$139</p>
          <p className="text-sm font-semibold text-slate-800">Discounted for the first 12 months, then $179 a month.</p>
          <a
            href="/signup"
            className={`${pressable} mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800`}
          >
            Start 1-month free trial
          </a>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            A resident who was invited does not buy a subscription.{" "}
            <a href="#pricing" className="font-semibold text-slate-900 underline underline-offset-2">
              See the full pricing
            </a>
            .
          </p>
        </aside>
      </div>
    </section>
  );
}
