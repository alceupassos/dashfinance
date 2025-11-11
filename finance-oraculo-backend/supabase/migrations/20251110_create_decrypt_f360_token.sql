-- Criar função para descriptografar token F360
CREATE OR REPLACE FUNCTION public.decrypt_f360_token(_id UUID, _kms TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  _token_enc BYTEA;
  _token_dec TEXT;
BEGIN
  SELECT token_f360_enc INTO _token_enc
  FROM integration_f360
  WHERE id = _id;

  IF _token_enc IS NULL THEN
    RETURN NULL;
  END IF;

  -- Usar a chave KMS passada ou pegar do ambiente
  _token_dec := pgp_sym_decrypt(_token_enc, COALESCE(_kms, current_setting('app.kms')));

  RETURN _token_dec;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao descriptografar token: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para funções
GRANT EXECUTE ON FUNCTION public.decrypt_f360_token(_id UUID, _kms TEXT) TO authenticated, service_role;
