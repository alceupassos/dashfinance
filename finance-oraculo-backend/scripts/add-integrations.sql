-- ============================================================
-- SCRIPT PARA ADICIONAR INTEGRAÇÕES F360 E OMIE
-- ============================================================
-- ANTES DE EXECUTAR: Configure a chave KMS
-- select set_config('app.kms', 'B5b0dcf500@#', false);

-- ============================================================
-- CONFIGURAR CHAVE KMS (EXECUTAR PRIMEIRO!)
-- ============================================================
select set_config('app.kms', 'B5b0dcf500@#', false);

-- ============================================================
-- INTEGRAÇÕES F360
-- ============================================================
-- IMPORTANTE: Substitua os valores abaixo pelos dados reais

-- Exemplo de inserção F360
insert into integration_f360 (cliente_nome, cnpj, token_enc)
values (
  'EXEMPLO EMPRESA LTDA',
  only_digits('00.000.000/0000-00'),
  pgp_sym_encrypt('SEU_TOKEN_F360_AQUI', current_setting('app.kms', true))
)
on conflict (cnpj, cliente_nome) do update
set token_enc = excluded.token_enc;

-- Adicione mais integrações F360 aqui seguindo o padrão acima
-- IMPORTANTE: Use os dados do arquivo CLIENTES_F360_com_TOKEN.xlsx

/*
insert into integration_f360 (cliente_nome, cnpj, token_enc)
values 
  ('EMPRESA 1', only_digits('00.000.000/0000-01'), pgp_sym_encrypt('token1', current_setting('app.kms', true))),
  ('EMPRESA 2', only_digits('00.000.000/0000-02'), pgp_sym_encrypt('token2', current_setting('app.kms', true))),
  ('EMPRESA 3', only_digits('00.000.000/0000-03'), pgp_sym_encrypt('token3', current_setting('app.kms', true)))
on conflict (cnpj, cliente_nome) do update
set token_enc = excluded.token_enc;
*/

-- ============================================================
-- INTEGRAÇÕES OMIE
-- ============================================================

-- Exemplo de inserção Omie
insert into integration_omie (cliente_nome, app_key_enc, app_secret_enc)
values (
  'EXEMPLO EMPRESA LTDA',
  pgp_sym_encrypt('APP_KEY_AQUI', current_setting('app.kms', true)),
  pgp_sym_encrypt('APP_SECRET_AQUI', current_setting('app.kms', true))
)
on conflict (cliente_nome) do update
set 
  app_key_enc = excluded.app_key_enc,
  app_secret_enc = excluded.app_secret_enc;

-- Adicione mais integrações Omie aqui seguindo o padrão acima

/*
insert into integration_omie (cliente_nome, app_key_enc, app_secret_enc)
values 
  ('EMPRESA 1', 
   pgp_sym_encrypt('app_key_1', current_setting('app.kms', true)),
   pgp_sym_encrypt('app_secret_1', current_setting('app.kms', true))),
  ('EMPRESA 2',
   pgp_sym_encrypt('app_key_2', current_setting('app.kms', true)),
   pgp_sym_encrypt('app_secret_2', current_setting('app.kms', true)))
on conflict (cliente_nome) do update
set 
  app_key_enc = excluded.app_key_enc,
  app_secret_enc = excluded.app_secret_enc;
*/

-- ============================================================
-- VERIFICAR INTEGRAÇÕES INSERIDAS
-- ============================================================

-- Ver integrações F360
select id, cliente_nome, cnpj, created_at 
from integration_f360 
order by created_at desc;

-- Ver integrações Omie
select id, cliente_nome, created_at 
from integration_omie 
order by created_at desc;

-- ============================================================
-- TESTAR DECRIPTAÇÃO (OPCIONAL)
-- ============================================================

-- Testar decriptação F360 (substitua o ID)
-- select decrypt_f360_token('ID_AQUI');

-- Testar decriptação Omie (substitua o ID)
-- select * from decrypt_omie_keys('ID_AQUI');

