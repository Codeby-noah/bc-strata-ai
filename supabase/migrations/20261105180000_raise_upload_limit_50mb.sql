-- Align upload limits with product spec (50 MB PDFs and invoices).

alter table public.documents
  drop constraint if exists documents_byte_size_check;

alter table public.documents
  add constraint documents_byte_size_check
  check (byte_size between 1 and 52428800);

alter table public.invoices
  drop constraint if exists invoices_byte_size_check;

alter table public.invoices
  add constraint invoices_byte_size_check
  check (byte_size between 1 and 52428800);

update storage.buckets
set file_size_limit = 52428800
where id in ('strata-documents', 'strata-invoices');
