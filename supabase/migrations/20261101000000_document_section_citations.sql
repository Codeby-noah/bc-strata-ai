alter table public.document_chunks
  add column if not exists section text
  check (section is null or char_length(section) <= 160);

drop function if exists public.match_document_chunks(
  extensions.vector,
  uuid,
  real,
  integer
);

create function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  target_strata_id uuid,
  minimum_similarity real default 0.15,
  result_limit integer default 6
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  category text,
  page_number integer,
  section text,
  content text,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    chunk.id,
    document.id,
    document.title,
    document.category,
    chunk.page_number,
    chunk.section,
    chunk.content,
    (1 - (chunk.embedding operator(extensions.<=>) query_embedding))::real
  from public.document_chunks chunk
  join public.documents document
    on document.id = chunk.document_id
    and document.strata_id = chunk.strata_id
  where chunk.strata_id = target_strata_id
    and chunk.embedding is not null
    and public.is_strata_member(target_strata_id)
    and (1 - (chunk.embedding operator(extensions.<=>) query_embedding))
      >= greatest(0, least(minimum_similarity, 1))
  order by chunk.embedding operator(extensions.<=>) query_embedding
  limit greatest(1, least(result_limit, 12));
$$;

revoke all on function public.match_document_chunks(
  extensions.vector,
  uuid,
  real,
  integer
) from public;
grant execute on function public.match_document_chunks(
  extensions.vector,
  uuid,
  real,
  integer
) to authenticated;
