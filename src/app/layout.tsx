import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StrataDock | Software for self-managed strata councils",
    template: "%s | StrataDock",
  },
  description:
    "An online workspace for self-managed strata corporations in British Columbia. Council tools, a resident portal, and records for documents, money, repairs, and meetings.",
  openGraph: {
    type: "website",
    siteName: "StrataDock",
    title: "StrataDock | Software for self-managed strata councils",
    description:
      "Council tools and a resident portal for self-managed strata corporations in British Columbia.",
  },
  twitter: {
    card: "summary",
    title: "StrataDock | Software for self-managed strata councils",
    description:
      "Council tools and a resident portal for self-managed strata corporations in British Columbia.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full scroll-smooth scroll-pt-20 antialiased"
    >
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
