"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/#savings", label: "Time & savings" },
  { href: "/#what", label: "Less work" },
  { href: "/#work", label: "Core tools" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#start", label: "How to start" },
  { href: "/#questions", label: "Questions" },
];

const sectionIds = links.map((link) => link.href.replace("/#", ""));

const pressable =
  "cursor-pointer transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

function useLandingSectionSpy(pathname: string) {
  const isHome = pathname === "/";
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visibleRatios = new Map<string, number>();

    const pickActive = () => {
      let bestId: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of visibleRatios) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId && bestRatio > 0) {
        setActiveId(bestId);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatios.set(entry.target.id, entry.intersectionRatio);
        }
        pickActive();
      },
      {
        rootMargin: "-72px 0px -42% 0px",
        threshold: [0, 0.08, 0.2, 0.35, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));

    const onHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (sectionIds.includes(hash)) {
        setActiveId(hash);
      }
    };
    window.addEventListener("hashchange", onHash);
    onHash();

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, [isHome]);

  return isHome ? activeId : null;
}

function sectionNavClass(isActive: boolean, block = false) {
  const base = `${pressable} rounded-md font-semibold transition-[color,box-shadow,text-shadow] duration-200`;
  const spacing = block ? "block px-3 py-3" : "px-2 py-1";
  if (isActive) {
    return `${base} ${spacing} text-slate-900 [text-shadow:0_0_8px_rgba(59,130,246,0.65),0_0_16px_rgba(59,130,246,0.35)]`;
  }
  return `${base} ${spacing} text-slate-600 hover:text-slate-800`;
}

export function PublicHeader({
  cornerHref,
  cornerLabel,
}: {
  cornerHref: string;
  cornerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeId = useLandingSectionSpy(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-8">
        <Link href="/" className={`${pressable} shrink-0 whitespace-nowrap text-sm font-bold tracking-tight text-slate-950 sm:text-base`}>
          StrataDock
        </Link>
        <nav aria-label="On this page" className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => {
            const id = link.href.replace("/#", "");
            const isActive = activeId === id;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "location" : undefined}
                className={sectionNavClass(isActive)}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
            className={`${pressable} rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 md:hidden`}
          >
            {open ? "Close" : "Menu"}
          </button>
          {cornerHref === "/login" ? (
            <a
              href="/signup"
              className={`${pressable} hidden items-center justify-center whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 sm:inline-flex sm:px-4`}
            >
              Start 1-month free trial
            </a>
          ) : null}
          <a
            href={cornerHref}
            className={`${pressable} whitespace-nowrap rounded-lg px-2 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 sm:px-3 ${
              cornerHref === "/login" ? "" : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {cornerLabel}
          </a>
        </div>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <nav id="site-menu" aria-label="Mobile" className="overflow-hidden">
          <ul className="space-y-1 border-t border-slate-200 px-5 py-3">
            {links.map((link) => {
              const id = link.href.replace("/#", "");
              const isActive = activeId === id;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "location" : undefined}
                    className={`${sectionNavClass(isActive, true)} text-sm`}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
            <li>
              <a href="/signup" onClick={() => setOpen(false)} className={`${pressable} block rounded-lg bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800`}>
                Start 1-month free trial
              </a>
            </li>
            <li>
              <a href="/login?mode=resident" onClick={() => setOpen(false)} className={`${pressable} block rounded-lg px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50`}>
                Resident sign-in
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

const included = [
  "Council hub for bylaws, ledgers, repairs, bookings, parking, votes, and notices",
  "Resident portal for repair requests, building notices, and assigned parking",
  "Document answers that stay next to the source page",
  "Separate operating fund and contingency reserve fund ledgers",
  "Invoice review before anything is posted",
  "Form B and Form F draft records, plus meeting minutes in the portal",
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Pricing</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            One flat price for the whole strata — not per unit. Council members and invited residents share the same workspace. For many BC buildings, that is often a fraction of what licensed management companies charge (commonly about $1,500–$2,500+ per month vs $139 at launch).
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <p className="text-sm font-semibold text-slate-500">Council workspace</p>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              <span className="line-through">$179</span> regular price
            </p>
            <p className="mt-1 text-5xl font-bold tracking-tight text-slate-950">
              $139
              <span className="ml-2 text-lg font-semibold text-slate-600">CAD / month</span>
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
              Discounted for the first 12 months. After that, the price goes up to $179 CAD a month.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The discount starts after the 1-month free trial. An administrator can cancel from billing before the trial ends. Invited residents stay included.
            </p>
            <ul className="mt-6 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              className={`${pressable} mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800`}
            >
              Start 1-month free trial
            </a>
          </article>
          <article className="flex flex-col justify-between rounded-2xl border border-slate-200 p-6 sm:p-8">
            <div>
              <p className="text-sm font-semibold text-slate-500">Residents</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Included</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                People invited by the council do not buy a second subscription. They sign in with an email link and use the resident portal.
              </p>
            </div>
            <a
              href="/login?mode=resident"
              className={`${pressable} mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50`}
            >
              Resident sign-in
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-semibold text-white">StrataDock</p>
          <p className="mt-2 max-w-md text-sm leading-6">
            An online workspace for self-managed strata corporations in British Columbia.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/#pricing" className={`${pressable} hover:text-white`}>Pricing</Link>
          <a href="/login" className={`${pressable} hover:text-white`}>Log in</a>
          <a href="/signup" className={`${pressable} hover:text-white`}>Create account</a>
          <a href="/login?mode=resident" className={`${pressable} hover:text-white`}>Resident sign-in</a>
          <a href="/privacy" className={`${pressable} hover:text-white`}>Privacy</a>
          <a href="/terms" className={`${pressable} hover:text-white`}>Terms</a>
        </nav>
      </div>
    </footer>
  );
}

const questions = [
  {
    q: "How much time and money does a council usually save?",
    a: "It varies by building size and how much runs through email today. Councils that move bylaws, invoices, repairs, passes, and minutes into one workspace often reclaim roughly 5–12 volunteer hours a month on those repeat jobs. On money: BC licensed strata management is commonly quoted around $30–$60 per unit per month, and many firms set a roughly $1,500–$2,000+ monthly minimum — so a typical building might pay $1,500–$2,500+ per month for full-service management. StrataDock’s council workspace is one flat subscription ($139 CAD a month at launch, then $179) — often about 5–12× less, and roughly 10× less when you compare $139 to a $1,500 management minimum. That is software for a self-managed council, not a replacement for licensed managers, caretaking, or lawyers.",
  },
  {
    q: "How does this cut council time?",
    a: "Owners look up a bylaw answer, file a repair, and read minutes on their own. The treasurer reviews an invoice instead of retyping it. Visitor passes and room bookings are saved and printed from the same list, so those requests stop arriving as separate texts.",
  },
  {
    q: "Who is this for?",
    a: "Self-managed strata councils in British Columbia. Residents use a smaller portal for repairs, notices, and their own parking, which means fewer of those questions come back to council.",
  },
  {
    q: "What does the council hub include?",
    a: "Bylaws you can ask questions about, ledgers for the operating fund and the contingency reserve fund, repair requests and quotes, amenity bookings, visitor parking, council votes, compliance dates, and notices.",
  },
  {
    q: "How much does it cost?",
    a: "One council workspace is discounted to $139 CAD a month for the first 12 months, after a 1-month free trial. The price then goes up to $179 CAD a month until the strata cancels. Invited residents are included and do not pay separately.",
  },
  {
    q: "Does it replace a lawyer or a property manager?",
    a: "No. Search answers and the risk check quote the strata’s own documents. A person still decides what to do.",
  },
];

export function Questions() {
  const [open, setOpen] = useState(0);

  return (
    <section id="questions" className="scroll-mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Questions</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {questions.map((item, index) => {
            const selected = open === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={selected}
                  onClick={() => setOpen(selected ? -1 : index)}
                  className={`${pressable} flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-slate-950 hover:bg-slate-50`}
                >
                  {item.q}
                  <span aria-hidden className="text-slate-400">{selected ? "–" : "+"}</span>
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-6 text-slate-600">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
