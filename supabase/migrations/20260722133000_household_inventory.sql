create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 80),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 200),
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 80),
  quantity numeric(10, 2) not null check (quantity >= 0 and quantity <= 100000),
  unit text not null check (char_length(unit) between 1 and 40),
  frozen_on date,
  eat_before date,
  date_source text not null default 'none' check (date_source in ('manual', 'label', 'estimated', 'none')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'active' check (status in ('active', 'consumed', 'discarded')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create index items_household_status_idx on public.items (household_id, status, updated_at desc);
create index items_household_name_idx on public.items (household_id, lower(name));

create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'quantityChanged', 'moved', 'consumed', 'restored')),
  actor_id uuid not null references auth.users(id),
  occurred_at timestamptz not null default now()
);

create index inventory_events_household_time_idx
  on public.inventory_events (household_id, occurred_at desc);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token_hash bytea not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.extraction_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.inventory_events enable row level security;
alter table public.household_invitations enable row level security;
alter table public.extraction_quotas enable row level security;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

create policy households_select_member on public.households
  for select to authenticated
  using (public.is_household_member(id));

create policy household_members_select_member on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

create policy locations_select_member on public.locations
  for select to authenticated
  using (public.is_household_member(household_id));

create policy locations_insert_member on public.locations
  for insert to authenticated
  with check (public.is_household_member(household_id));

create policy locations_update_member on public.locations
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy items_select_member on public.items
  for select to authenticated
  using (public.is_household_member(household_id));

create policy items_insert_member on public.items
  for insert to authenticated
  with check (
    public.is_household_member(household_id)
    and created_by = auth.uid()
    and updated_by = auth.uid()
    and exists (
      select 1 from public.locations
      where id = location_id and household_id = items.household_id and archived_at is null
    )
  );

create policy items_update_member on public.items
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (
    public.is_household_member(household_id)
    and updated_by = auth.uid()
    and exists (
      select 1 from public.locations
      where id = location_id and household_id = items.household_id and archived_at is null
    )
  );

create policy inventory_events_select_member on public.inventory_events
  for select to authenticated
  using (public.is_household_member(household_id));

create or replace function public.bootstrap_household(household_name text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(household_name)) not between 1 and 80 then
    raise exception 'invalid household name';
  end if;
  if char_length(trim(member_name)) not between 1 and 80 then
    raise exception 'invalid member name';
  end if;

  insert into public.households (name, created_by)
  values (trim(household_name), auth.uid())
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (new_household_id, auth.uid(), 'owner', trim(member_name));

  insert into public.locations (household_id, name, description, position)
  values
    (new_household_id, 'Frysen uppe', 'Köket', 0),
    (new_household_id, 'Frysboxen nere', 'Källaren', 1);

  return new_household_id;
end;
$$;

revoke all on function public.bootstrap_household(text, text) from public;
grant execute on function public.bootstrap_household(text, text) to authenticated;

create or replace function public.create_household_invite(target_household_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_token text := gen_random_uuid()::text;
begin
  if not exists (
    select 1 from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'owner access required';
  end if;

  insert into public.household_invitations (household_id, token_hash, invited_by, expires_at)
  values (target_household_id, digest(invite_token, 'sha256'), auth.uid(), now() + interval '7 days');
  return invite_token;
end;
$$;

revoke all on function public.create_household_invite(uuid) from public;
grant execute on function public.create_household_invite(uuid) to authenticated;

create or replace function public.accept_household_invite(invite_token text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.household_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(member_name)) not between 1 and 80 then
    raise exception 'invalid member name';
  end if;

  select * into invitation
  from public.household_invitations
  where token_hash = digest(invite_token, 'sha256')
    and accepted_at is null
    and expires_at > now()
  for update;

  if invitation.id is null then
    raise exception 'invite is invalid or expired';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (invitation.household_id, auth.uid(), 'member', trim(member_name))
  on conflict (household_id, user_id) do nothing;

  update public.household_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;

  return invitation.household_id;
end;
$$;

revoke all on function public.accept_household_invite(text, text) from public;
grant execute on function public.accept_household_invite(text, text) to authenticated;

create or replace function public.touch_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.household_id <> old.household_id then
    raise exception 'an item cannot change household';
  end if;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger items_touch_before_update
before update on public.items
for each row execute function public.touch_item();

create or replace function public.consume_extraction_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.extraction_quotas (user_id, window_started_at, request_count)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update set
    window_started_at = case
      when public.extraction_quotas.window_started_at < now() - interval '1 hour' then now()
      else public.extraction_quotas.window_started_at
    end,
    request_count = case
      when public.extraction_quotas.window_started_at < now() - interval '1 hour' then 1
      else public.extraction_quotas.request_count + 1
    end
  returning request_count <= 60 into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_extraction_quota() from public;
grant execute on function public.consume_extraction_quota() to authenticated;

create or replace function public.record_item_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_event_type text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'created';
  elsif old.status <> new.status and new.status = 'consumed' then
    next_event_type := 'consumed';
  elsif old.status <> new.status and new.status = 'active' then
    next_event_type := 'restored';
  elsif old.location_id <> new.location_id then
    next_event_type := 'moved';
  elsif old.quantity <> new.quantity then
    next_event_type := 'quantityChanged';
  else
    return new;
  end if;

  insert into public.inventory_events (household_id, item_id, event_type, actor_id)
  values (new.household_id, new.id, next_event_type, coalesce(auth.uid(), new.updated_by));
  return new;
end;
$$;

create trigger items_record_event_after_change
after insert or update on public.items
for each row execute function public.record_item_event();

alter publication supabase_realtime add table public.locations;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.inventory_events;
