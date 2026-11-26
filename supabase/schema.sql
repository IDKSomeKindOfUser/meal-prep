-- Run once in the Supabase SQL editor. Safe to run again.

-- One row per synchronised piece of data: the form, the menu, a price, an own product or recipe.
create table if not exists public.entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key ~ '^(form|plan|(price|product|recipe):[A-Za-z0-9_-]{1,80})$'),
  -- `json`, not `jsonb`: the app relies on the order of fields. Null means deleted.
  value json check (value is null or octet_length(value::text) <= 200000),
  -- Milliseconds since 1970.
  changed_at bigint not null check (changed_at > 0),
  -- When the server last saved the row, so that polls fetch only what is new.
  synced_at bigint not null default 0,
  primary key (user_id, key)
);
-- Tables made by the first version of this file.
alter table public.entries add column if not exists synced_at bigint not null default 0;

alter table public.entries enable row level security;

revoke all on public.entries from anon, authenticated;
grant select, insert, update on public.entries to authenticated;

drop policy if exists "own rows: read" on public.entries;
create policy "own rows: read" on public.entries for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "own rows: insert" on public.entries;
create policy "own rows: insert" on public.entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "own rows: update" on public.entries;
create policy "own rows: update" on public.entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The first version took only the changes.
drop function if exists public.sync_entries(json);

-- Saves the changes that are newer than the stored ones. Returns the rows saved after `since`
-- and the stored rows of everything sent, together with the `since` for the next call.
-- Runs with the rights of the caller, so row level security applies.
create or replace function public.sync_entries(changes json, since bigint default 0) returns json
language plpgsql security invoker set search_path = '' as $$
declare
  -- A device with a fast clock must not win over later edits.
  server_now bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  insert into public.entries as stored (user_id, key, value, changed_at, synced_at)
  select auth.uid(), e ->> 'key',
    case when json_typeof(e -> 'value') = 'null' then null else e -> 'value' end,
    least((e ->> 'changed_at')::bigint, server_now), server_now
  from json_array_elements(changes) e
  -- The same order everywhere, so that two devices cannot lock each other.
  order by 2
  on conflict (user_id, key) do update set value = excluded.value, changed_at = excluded.changed_at, synced_at = excluded.synced_at
    where excluded.changed_at > stored.changed_at;

  return json_build_object(
    'rows', (
      select coalesce(json_agg(json_build_object('key', key, 'value', value, 'changed_at', changed_at)), '[]'::json)
      from public.entries
      where user_id = auth.uid()
        and (synced_at > since or key in (select e ->> 'key' from json_array_elements(changes) e))
    ),
    -- A call still running elsewhere may save rows stamped a little earlier, so the next call asks for the last minute again.
    'seen', server_now - 60000
  );
end $$;

revoke all on function public.sync_entries(json, bigint) from public, anon;
grant execute on function public.sync_entries(json, bigint) to authenticated;
