-- Lets any active strata member read subscription access state (not Stripe IDs).

create or replace function public.get_strata_subscription_state(p_strata_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  billing_status text;
  period_end timestamptz;
begin
  if auth.uid() is null or not public.is_strata_member(p_strata_id) then
    raise exception 'You do not have access to this strata workspace';
  end if;

  select b.subscription_status, b.current_period_end
  into billing_status, period_end
  from public.strata_billing b
  where b.strata_id = p_strata_id;

  billing_status := coalesce(billing_status, 'pending');

  return jsonb_build_object(
    'subscription_status', billing_status,
    'current_period_end', period_end,
    'workspace_access', billing_status in ('active', 'trialing', 'past_due')
  );
end;
$$;

revoke all on function public.get_strata_subscription_state(uuid) from public;
grant execute on function public.get_strata_subscription_state(uuid) to authenticated;
