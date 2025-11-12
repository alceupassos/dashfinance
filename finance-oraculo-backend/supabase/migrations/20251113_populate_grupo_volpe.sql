-- Migration: Populate Grupo Volpe group with its member companies
-- This creates the group structure for Grupo Volpe (CNPJ: 00026888098000)
-- and links all companies that share the same F360 token

begin;

-- Create Grupo Volpe group
insert into public.company_groups (group_cnpj, group_name, description, is_active)
values ('00026888098000', 'Grupo Volpe', 'Grupo econômico Volpe - empresas consolidadas', true)
on conflict (group_cnpj) do update
set group_name = excluded.group_name,
    description = excluded.description,
    is_active = excluded.is_active,
    updated_at = now();

-- Get the group ID
do $$
declare
  _group_id uuid;
  _member_cnpj text;
  _member_name text;
begin
  select id into _group_id
  from public.company_groups
  where group_cnpj = '00026888098000';

  if _group_id is null then
    raise exception 'Failed to create Grupo Volpe group';
  end if;

  -- Add all companies from integration_f360 that share the Grupo Volpe token
  -- We'll identify them by CNPJs that start with 00026888098 (pattern for Grupo Volpe)
  for _member_cnpj, _member_name in
    select distinct
      i.cnpj,
      coalesce(i.cliente_nome, 'Empresa ' || i.cnpj)
    from public.integration_f360 i
    where i.cnpj like '00026888098%'
      and i.cnpj is not null
  loop
    insert into public.company_group_members (group_id, member_cnpj, member_name, is_active)
    values (_group_id, _member_cnpj, _member_name, true)
    on conflict (group_id, member_cnpj) do update
    set member_name = excluded.member_name,
        is_active = true;
  end loop;

  raise notice 'Grupo Volpe populated with % members', (
    select count(*) from public.company_group_members where group_id = _group_id
  );
end $$;

commit;

