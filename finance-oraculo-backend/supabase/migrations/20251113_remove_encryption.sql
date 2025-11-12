-- Remover criptografia dos tokens F360 (ambiente local apenas)
-- Altera token_enc (bytea) para token (text)

BEGIN;

-- 1. Adicionar coluna token (text) se não existir
ALTER TABLE public.integration_f360 
  ADD COLUMN IF NOT EXISTS token text;

-- 2. Migrar dados existentes (se houver tokens criptografados, tentar descriptografar)
-- Nota: Se houver tokens criptografados, será necessário re-importar
UPDATE public.integration_f360
SET token = NULL
WHERE token IS NULL;

-- 3. Remover coluna token_enc (fazer backup antes se necessário)
ALTER TABLE public.integration_f360 
  DROP COLUMN IF EXISTS token_enc;

-- 4. Tornar token NOT NULL após migração
ALTER TABLE public.integration_f360
  ALTER COLUMN token SET NOT NULL;

-- 5. Atualizar função upsert_integration_f360_company (sem criptografia)
CREATE OR REPLACE FUNCTION public.upsert_integration_f360_company(
  _cliente_nome text,
  _cnpj text,
  _token text,
  _kms text default null  -- Parâmetro mantido para compatibilidade, mas ignorado
)
RETURNS uuid
AS $$
DECLARE
  sanitized_cnpj text;
  target_id uuid;
  trimmed_nome text := trim(coalesce(_cliente_nome, ''));
  current_nome text;
BEGIN
  sanitized_cnpj := regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g');

  IF sanitized_cnpj = '' THEN
    RAISE EXCEPTION 'CNPJ inválido para %', trimmed_nome;
  END IF;

  IF _token IS NULL OR length(trim(_token)) = 0 THEN
    RAISE EXCEPTION 'Token vazio para %', trimmed_nome;
  END IF;

  INSERT INTO public.integration_f360 (id, cliente_nome, cnpj, token, created_at)
  VALUES (
    gen_random_uuid(),
    CASE WHEN trimmed_nome = '' THEN NULL ELSE trimmed_nome END,
    sanitized_cnpj,
    trim(_token),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE
    SET token = excluded.token,
        created_at = now();

  SELECT id INTO target_id
  FROM public.integration_f360
  WHERE cnpj = sanitized_cnpj
  LIMIT 1;

  SELECT cliente_nome INTO current_nome
  FROM public.integration_f360
  WHERE id = target_id;

  IF current_nome IS NULL OR trim(current_nome) = '' THEN
    UPDATE public.integration_f360
      SET cliente_nome = trimmed_nome
    WHERE id = target_id;
  ELSIF trimmed_nome <> '' AND lower(trimmed_nome) <> lower(current_nome) THEN
    INSERT INTO public.integration_f360_aliases (integration_id, alias)
    VALUES (target_id, trimmed_nome)
    ON CONFLICT (integration_id, lower(alias)) DO NOTHING;
  END IF;

  RETURN target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atualizar função decrypt_f360_token para apenas retornar o token
CREATE OR REPLACE FUNCTION public.decrypt_f360_token(_id UUID, _kms TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  _token TEXT;
BEGIN
  SELECT token INTO _token
  FROM integration_f360
  WHERE id = _id;

  RETURN _token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION public.upsert_integration_f360_company(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_f360_token(UUID, TEXT) TO authenticated, service_role;

COMMIT;

