import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { DocumentVault } from "@/components/DocumentVault";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Document Vault",
};
export const instant = false;

type DocumentRecord = {
  id: string;
  title: string;
  category: string;
  file_name: string;
  storage_path: string;
  byte_size: number;
  indexed_at: string | null;
  created_at: string;
};

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  await connection();
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) {
    return null;
  }

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const supabase = await createSupabaseServerClient();
  let documentsQuery = supabase
    .from("documents")
    .select("id, title, category, file_name, storage_path, byte_size, indexed_at, created_at")
    .eq("strata_id", strata.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (query) {
    documentsQuery = documentsQuery.ilike("title", `%${query}%`);
  }

  const { data, error } = await documentsQuery;
  if (error) {
    throw new Error("Unable to load the document vault.");
  }

  const documents = (data ?? []) as unknown as DocumentRecord[];

  return (
    <div>
      <PageHeader
        eyebrow="Records"
        title="Document Vault"
        description="Search bylaws, minutes, and council-approved exemptions or resolutions. AI answers cite the source document and page when available."
      />

      <form method="get" className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="vault-search" className="sr-only">
          Search document titles
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="vault-search"
            name="q"
            defaultValue={query}
            placeholder="Search document titles"
            className="h-12 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-4 text-sm text-ink-900 outline-none ring-pine-700/30 placeholder:text-ink-500 focus:border-pine-700 focus:ring-2"
          />
          <button className="h-12 rounded-lg bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">
            Search
          </button>
        </div>
      </form>

      <DocumentVault
        documents={documents}
        strataId={strata.id}
        canManageExemptions={["admin", "council"].includes(strata.role)}
      />
    </div>
  );
}
