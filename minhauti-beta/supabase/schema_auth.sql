-- MinhaUTI — autenticação / perfis (idempotente)
-- 1 login = 1 UTI. auth.users.id é o identificador da conta nesta fase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  terms_accepted_at timestamptz
);

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

create unique index if not exists profiles_email_lower_uidx
  on public.profiles (lower(email));

alter table public.profiles enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

revoke insert, update, delete on public.profiles from anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u text;
begin
  u := lower(trim(coalesce(new.raw_user_meta_data->>'username','')));
  if u !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username';
  end if;

  insert into public.profiles (id,email,username,terms_accepted_at)
  values (
    new.id,
    lower(new.email),
    u,
    nullif(new.raw_user_meta_data->>'terms_accepted_at','')::timestamptz
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();
