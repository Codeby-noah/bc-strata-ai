drop policy if exists "Members can read maintenance requests"
  on public.maintenance_requests;
create policy "Members can read maintenance requests"
  on public.maintenance_requests for select to authenticated
  using (
    (
      reported_by = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );

drop policy if exists "Members can read their amenity reservations and council can review all"
  on public.amenity_reservations;
create policy "Members can read their amenity reservations and council can review all"
  on public.amenity_reservations for select to authenticated
  using (
    (
      requested_by = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );

drop policy if exists "Members can read their parking passes"
  on public.visitor_parking_passes;
create policy "Members can read their parking passes"
  on public.visitor_parking_passes for select to authenticated
  using (
    (
      issued_by = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );

drop policy if exists "Members can read their votes and council can review all"
  on public.governance_votes;
create policy "Members can read their votes and council can review all"
  on public.governance_votes for select to authenticated
  using (
    (
      user_id = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );
