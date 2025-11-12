-- Funções auxiliares para importar/atualizar integrações F360 a partir de CSV

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
  new_integration_id uuid;
begin
  sanitized_cnpj := regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g');

  if sanitized_cnpj = '' then
    raise exception 'CNPJ inválido para %', coalesce(_cliente_nome, '<desconhecido>');
  end if;

  if _token is null or length(trim(_token)) = 0 then
    raise exception 'Token vazio para %', coalesce(_cliente_nome, '<desconhecido>');
  end if;

  if _kms is null or length(trim(_kms)) = 0 then
    raise exception 'KMS key não fornecida para %', coalesce(_cliente_nome, '<desconhecido>');
  end if;

  encrypted_token := pgp_sym_encrypt(
    trim(_token),
    trim(_kms)
  );

  insert into public.integration_f360 (id, cliente_nome, cnpj, token_enc, created_at)
  values (
    gen_random_uuid(),
    trim(_cliente_nome),
    sanitized_cnpj,
    encrypted_token,
    now()
  )
  on conflict (cnpj, cliente_nome) do update
    set token_enc = excluded.token_enc,
        created_at = now()
  returning id into new_integration_id;

  if new_integration_id is null then
    select id
      into new_integration_id
      from public.integration_f360
     where cnpj = sanitized_cnpj
       and cliente_nome = trim(_cliente_nome);
  end if;

  return new_integration_id;
end;
$$ language plpgsql security definer;

grant execute on function public.upsert_integration_f360_company(text, text, text, text)
  to service_role;

-- Atualiza ou cria registros na tabela clientes com dados do CSV

create or replace function public.sync_cliente_identifiers_from_csv(
  _cliente_nome text,
  _cnpj text,
  _token text,
  _token_status text default 'ativo'
)
returns uuid
as $$
declare
  sanitized_cnpj text;
  normalized_nome text;
  target_id uuid;
begin
  normalized_nome := trim(coalesce(_cliente_nome, ''));
  sanitized_cnpj := regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g');

  if sanitized_cnpj = '' then
    raise exception 'CNPJ inválido para %', normalized_nome;
  end if;

  update public.clientes
     set cnpj = sanitized_cnpj,
         token_f360 = trim(_token),
         token_status = coalesce(nullif(trim(_token_status), ''), 'ativo'),
         sistema = coalesce(nullif(sistema, ''), 'F360'),
         updated_at = now()
   where upper(coalesce(razao_social, '')) = upper(normalized_nome)
      or upper(coalesce(nome_interno_cliente, '')) = upper(normalized_nome)
   returning id into target_id;

  if target_id is null then
    insert into public.clientes (
      id,
      razao_social,
      nome_interno_cliente,
      cnpj,
      sistema,
      status,
      token_f360,
      token_status,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      normalized_nome,
      normalized_nome,
      sanitized_cnpj,
      'F360',
      'Ativo',
      trim(_token),
      coalesce(nullif(trim(_token_status), ''), 'ativo'),
      now(),
      now()
    )
    returning id into target_id;
  end if;

  return target_id;
end;
$$ language plpgsql security definer;

grant execute on function public.sync_cliente_identifiers_from_csv(text, text, text, text)
  to service_role;

