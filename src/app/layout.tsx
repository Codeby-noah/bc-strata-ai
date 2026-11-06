import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StrataOS | The Automated Co-Manager for BC Stratas",
    template: "%s | StrataOS",
  },
  description:
    "A modern operating system for self-managed BC stratas—designed to simplify compliance, ledgers, documents, and maintenance, with the potential to save communities up to $18,000 a year.",
  openGraph: {
    type: "website",
    siteName: "StrataOS",
    title: "StrataOS | The Automated Co-Manager for BC Stratas",
    description:
      "Simplify compliance, ledgers, documents, and maintenance for self-managed BC stratas—with the potential to save communities up to $18,000 a year.",
  },
  twitter: {
    card: "summary",
    title: "StrataOS | The Automated Co-Manager for BC Stratas",
    description:
      "A modern operating system for self-managed BC stratas. Simplify operations and explore potential savings of up to $18,000 a year.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full scroll-smooth antialiased"
    >
      <body className="min-h-full bg-zinc-50 text-slate-900">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
