-- Normalize integration_f360 to avoid duplicated CNPJs

begin;

-- Drop previous unique constraint combining cnpj and cliente_nome
alter table public.integration_f360
  drop constraint if exists integration_f360_cnpj_cliente_nome_key;

-- Create aliases table to retain alternate display names per empresa/token
create table if not exists public.integration_f360_aliases (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integration_f360(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists integration_f360_aliases_unique_idx
  on public.integration_f360_aliases (integration_id, lower(alias));

-- Prepare to deduplicate entries keeping the oldest record per CNPJ
with ranked as (
  select
    id,
    cliente_nome,
    cnpj,
    token_enc,
    created_at,
    row_number() over (partition by cnpj order by created_at) as rn
  from public.integration_f360
  where cnpj is not null
)
insert into public.integration_f360_aliases (integration_id, alias)
select keeper.id, dup.cliente_nome
from ranked dup
join ranked keeper
  on keeper.cnpj = dup.cnpj
 and keeper.rn = 1
where dup.rn > 1
  and dup.cliente_nome is not null
  and dup.cliente_nome <> ''
  and lower(dup.cliente_nome) <> lower(keeper.cliente_nome);

with ranked as (
  select
    id,
    row_number() over (partition by cnpj order by created_at) as rn
  from public.integration_f360
  where cnpj is not null
)
delete from public.integration_f360
where id in (select id from ranked where rn > 1);

-- Ensure each CNPJ is unique going forward
alter table public.integration_f360
  add constraint integration_f360_cnpj_key unique (cnpj);

-- Update canonical nome when empty
update public.integration_f360
set cliente_nome = 'Empresa ' || cnpj
where (cliente_nome is null or trim(cliente_nome) = '');

-- Redefine helper function with alias support
create or replace function public.upsert_integration_f360_company(
  _cliente_nome text,
  _cnpj text,
  _token text,
  _kms text default null
)
returns uuid
as $$
declare
  sanitized_cnpj text;
  encrypted_token bytea;
  integration_id uuid;
  trimmed_nome text := trim(coalesce(_cliente_nome, ''));
  current_nome text;
begin
  sanitized_cnpj := regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g');

  if sanitized_cnpj = '' then
    raise exception 'CNPJ inválido para %', trimmed_nome;
  end if;

  if _token is null or length(trim(_token)) = 0 then
    raise exception 'Token vazio para %', trimmed_nome;
  end if;

  encrypted_token := pgp_sym_encrypt(
    trim(_token),
    coalesce(_kms, current_setting('app.kms'))
  );

  insert into public.integration_f360 (id, cliente_nome, cnpj, token_enc, created_at)
  values (
    gen_random_uuid(),
    case when trimmed_nome = '' then null else trimmed_nome end,
    sanitized_cnpj,
    encrypted_token,
    now()
  )
  on conflict (cnpj) do update
    set token_enc = excluded.token_enc,
        created_at = now()
  returning id into integration_id;

  select cliente_nome into current_nome
  from public.integration_f360
  where id = integration_id;

  if current_nome is null or trim(current_nome) = '' then
    update public.integration_f360
      set cliente_nome = trimmed_nome
    where id = integration_id;
  elsif trimmed_nome <> '' and lower(trimmed_nome) <> lower(current_nome) then
    insert into public.integration_f360_aliases (integration_id, alias)
    values (integration_id, trimmed_nome)
    on conflict (integration_id, lower(alias)) do nothing;
  end if;

  return integration_id;
end;
$$ language plpgsql security definer;

commit;

