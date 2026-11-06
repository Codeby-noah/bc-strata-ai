create table public.strata_billing (
  strata_id uuid primary key
    references public.strata_corporations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text not null default 'pending'
    check (
      subscription_status in (
        'pending',
        'active',
        'trialing',
        'past_due',
        'unpaid',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'paused'
      )
    ),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.strata_billing enable row level security;

create policy "Strata administrators can view billing status"
  on public.strata_billing for select to authenticated
  using (public.has_strata_role(strata_id, array['admin']));

revoke all on public.strata_billing from anon, authenticated;
grant select on public.strata_billing to authenticated;
grant all on public.strata_billing to service_role;
