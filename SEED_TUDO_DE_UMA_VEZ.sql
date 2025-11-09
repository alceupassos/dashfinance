-- =====================================================
-- 🚀 SEED COMPLETO - RODA TUDO DE UMA VEZ!
-- Popular banco com dados reais para testes
-- =====================================================

-- =====================================================
-- 1. LIMPAR TUDO (CUIDADO EM PRODUÇÃO!)
-- =====================================================

truncate table dre_entries cascade;
truncate table cashflow_entries cascade;
truncate table financial_alerts cascade;
truncate table whatsapp_sessions cascade;
truncate table whatsapp_messages cascade;
truncate table alert_actions cascade;
truncate table alert_notifications cascade;
truncate table user_companies cascade;
truncate table users cascade;
truncate table integration_f360 cascade;
truncate table integration_omie cascade;
truncate table onboarding_tokens cascade;

-- =====================================================
-- 2. POPULAR INTEGRAÇÕES F360 (17 empresas)
-- =====================================================

insert into integration_f360 (cnpj, cliente_nome, grupo_empresarial, is_principal, token_plain) values
-- GRUPO VOLPE (5)
('00026888098000', 'VOLPE DIADEMA', 'Grupo Volpe', true, '223b065a-1873-4cfe-a36b-f092c602a03e'),
('00026888098001', 'VOLPE GRAJAU', 'Grupo Volpe', false, '223b065a-1873-4cfe-a36b-f092c602a03e'),
('00026888098002', 'VOLPE POA', 'Grupo Volpe', false, '223b065a-1873-4cfe-a36b-f092c602a03e'),
('00026888098003', 'VOLPE SANTO ANDRE', 'Grupo Volpe', false, '223b065a-1873-4cfe-a36b-f092c602a03e'),
('00026888098004', 'VOLPE SAO MATEUS', 'Grupo Volpe', false, '223b065a-1873-4cfe-a36b-f092c602a03e'),
-- DEX (2)
('00052912647000', 'DEX INVEST 392', 'Grupo Dex', true, '174d090d-50f4-4e82-bf7b-1831b74680bf'),
('00052912647001', 'DEX INVEST 393', 'Grupo Dex', false, '174d090d-50f4-4e82-bf7b-1831b74680bf'),
-- AAS/AGS (2)
('00033542553000', 'AAS GONCALVES', 'Grupo AAS', true, '258a60f7-12bb-44c1-825e-7e9160c41c0d'),
('00050716882000', 'AGS PARACAMBI', 'Grupo AAS', false, '258a60f7-12bb-44c1-825e-7e9160c41c0d'),
-- ACQUA (2)
('00017100902000', 'ACQUA MATRIZ', 'Grupo Acqua', true, '5440d062-b2e9-4554-b33f-f1f783a85472'),
('00017100902001', 'ACQUA FILIAL', 'Grupo Acqua', false, '5440d062-b2e9-4554-b33f-f1f783a85472'),
-- INDIVIDUAIS (6)
('00019822798000', 'DERMOPLASTIK', null, true, '61b9bc06-1ada-485c-963b-69a4d7d91866'),
('00005792580000', 'CORPORE', null, true, '7c006009-c8d4-4e15-99b5-8956148c710e'),
('00022702726000', 'A3 SOLUTION', null, true, '9cab76ea-8476-4dc6-aec7-0d7247a13bae'),
('00041794911000', 'CLUBE CACA', null, true, '9f00c3fa-3dfe-4d7d-ac4d-dfc3f06ca982'),
('00057220844000', 'SANTA LOLLA', null, true, 'c021af1d-a524-4170-8270-c44da14f7be1'),
('00043212220000', 'ALL IN SP', null, true, 'd4077081-e407-4126-bf50-875aa63177a2');

-- =====================================================
-- 3. POPULAR INTEGRAÇÕES OMIE (7 empresas)
-- =====================================================

insert into integration_omie (cnpj, cliente_nome, grupo_empresarial, is_principal, app_key_plain, app_secret_plain) values
('12345678000101', 'MANA POKE', null, true, '2077005256326', '42910292e952b4b9da3f29b12c23b336'),
('12345678000102', 'MED SOLUTIONS', null, true, '4293229373433', 'ed057dc43bd8915371af75cbb55098b'),
('12345678000103', 'BRX', null, true, '6626684373309', '476dcc4526ea8548af3123e9d5ef5769'),
('12345678000104', 'BEAUTY', null, true, '2000530332801', '77f3477d3d80942106f21ee9b6cccc1a'),
('12345678000105', 'KDPLAST', 'Health Plast', true, 'd323eab9-1cc0-4542-9802-39c7df4fb4f5', 'd323eab9-1cc0-4542-9802-39c7df4fb4f5'),
('12345678000106', 'HEALTH PLAST', 'Health Plast', false, 'd323eab9-1cc0-4542-9802-39c7df4fb4f5', 'd323eab9-1cc0-4542-9802-39c7df4fb4f5'),
('12345678000107', 'ORAL UNIC', null, true, 'e53bfceb-0ece-4752-a247-a022b8c85bca', 'e53bfceb-0ece-4752-a247-a022b8c85bca');

-- =====================================================
-- 4. POPULAR TOKENS ONBOARDING (17)
-- =====================================================

insert into onboarding_tokens (token, company_cnpj, company_name, grupo_empresarial, whatsapp_link, status) values
('VOL01', '00026888098000', 'Volpe Diadema', 'Grupo Volpe', 'https://wa.me/5511999998888?text=VOL01', 'pending'),
('VOL02', '00026888098001', 'Volpe Grajau', 'Grupo Volpe', 'https://wa.me/5511999998888?text=VOL02', 'pending'),
('VOL03', '00026888098002', 'Volpe POA', 'Grupo Volpe', 'https://wa.me/5511999998888?text=VOL03', 'pending'),
('VOL04', '00026888098003', 'Volpe Santo André', 'Grupo Volpe', 'https://wa.me/5511999998888?text=VOL04', 'pending'),
('VOL05', '00026888098004', 'Volpe São Mateus', 'Grupo Volpe', 'https://wa.me/5511999998888?text=VOL05', 'pending'),
('DEX01', '00052912647000', 'Dex Invest 392', 'Grupo Dex', 'https://wa.me/5511999998888?text=DEX01', 'pending'),
('DEX02', '00052912647001', 'Dex Invest 393', 'Grupo Dex', 'https://wa.me/5511999998888?text=DEX02', 'pending'),
('AAS01', '00033542553000', 'AAS Gonçalves', 'Grupo AAS', 'https://wa.me/5511999998888?text=AAS01', 'pending'),
('AGS01', '00050716882000', 'AGS Paracambi', 'Grupo AAS', 'https://wa.me/5511999998888?text=AGS01', 'pending'),
('ACQ01', '00017100902000', 'Acqua Matriz', 'Grupo Acqua', 'https://wa.me/5511999998888?text=ACQ01', 'pending'),
('ACQ02', '00017100902001', 'Acqua Filial', 'Grupo Acqua', 'https://wa.me/5511999998888?text=ACQ02', 'pending'),
('DER01', '00019822798000', 'Dermoplastik', null, 'https://wa.me/5511999998888?text=DER01', 'pending'),
('COR01', '00005792580000', 'Corpore', null, 'https://wa.me/5511999998888?text=COR01', 'pending'),
('A3S01', '00022702726000', 'A3 Solution', null, 'https://wa.me/5511999998888?text=A3S01', 'pending'),
('CCA01', '00041794911000', 'Clube Caça', null, 'https://wa.me/5511999998888?text=CCA01', 'pending'),
('SAN01', '00057220844000', 'Santa Lolla', null, 'https://wa.me/5511999998888?text=SAN01', 'pending'),
('ALL01', '00043212220000', 'All In SP', null, 'https://wa.me/5511999998888?text=ALL01', 'pending');

-- =====================================================
-- 5. POPULAR DADOS DRE/CASHFLOW BÁSICOS
-- (Apenas alguns registros para teste - use Edge Function para popular completo)
-- =====================================================

-- Volpe Diadema - últimos 3 meses
do $$
declare
  v_cnpj text := '00026888098000';
  v_mes date;
  v_dia date;
  v_saldo numeric := 25000;
  i int;
begin
  for v_mes in select generate_series(current_date - interval '3 months', current_date, '1 month')::date loop
    for i in 1..10 loop
      v_dia := v_mes + (random() * 28)::int;
      
      -- Receita
      insert into dre_entries (cnpj, data, tipo, categoria, descricao, valor, origem)
      values (v_cnpj, v_dia, 'receita', 'Vendas', 'Venda de produtos', 5000 + random() * 10000, 'F360');
      
      v_saldo := v_saldo + 5000 + random() * 10000;
      
      insert into cashflow_entries (cnpj, data, tipo, valor, saldo_atual, saldo_projetado, origem)
      values (v_cnpj, v_dia, 'entrada', 5000 + random() * 10000, v_saldo, v_saldo + random() * 5000, 'F360');
      
      -- Despesa
      insert into dre_entries (cnpj, data, tipo, categoria, descricao, valor, origem)
      values (v_cnpj, v_dia + 1, 'despesa', 'Folha', 'Pagamento funcionários', 3000 + random() * 5000, 'F360');
      
      v_saldo := v_saldo - (3000 + random() * 5000);
      
      insert into cashflow_entries (cnpj, data, tipo, valor, saldo_atual, saldo_projetado, origem)
      values (v_cnpj, v_dia + 1, 'saida', 3000 + random() * 5000, v_saldo, v_saldo - random() * 2000, 'F360');
    end loop;
  end loop;
end $$;

-- =====================================================
-- 6. GERAR ALGUNS ALERTAS DE EXEMPLO
-- =====================================================

insert into financial_alerts (company_cnpj, tipo_alerta, prioridade, titulo, mensagem, status, dados_contexto) values
('00026888098000', 'saldo_baixo', 'alta', 'Saldo Baixo', 'Saldo de R$ 3.500 abaixo do mínimo', 'open', '{"saldo_atual": 3500}'::jsonb),
('00026888098001', 'inadimplencia_alta', 'critica', 'Inadimplência 18%', 'Taxa acima de 10%', 'open', '{"taxa": 18}'::jsonb),
('00052912647000', 'contas_vencendo', 'media', '5 Contas Vencendo', 'Vencendo em 2 dias', 'open', '{"quantidade": 5}'::jsonb);

-- =====================================================
-- RESUMO FINAL
-- =====================================================

do $$
declare
  v_f360 int;
  v_omie int;
  v_tokens int;
  v_dre int;
  v_cash int;
  v_alerts int;
begin
  select count(*) into v_f360 from integration_f360;
  select count(*) into v_omie from integration_omie;
  select count(*) into v_tokens from onboarding_tokens;
  select count(*) into v_dre from dre_entries;
  select count(*) into v_cash from cashflow_entries;
  select count(*) into v_alerts from financial_alerts;
  
  raise notice '';
  raise notice '╔════════════════════════════════════════╗';
  raise notice '║  🎉 SEED COMPLETO EXECUTADO!          ║';
  raise notice '╚════════════════════════════════════════╝';
  raise notice '';
  raise notice '📊 DADOS POPULADOS:';
  raise notice '   • F360: % empresas', v_f360;
  raise notice '   • OMIE: % empresas', v_omie;
  raise notice '   • Tokens: %', v_tokens;
  raise notice '   • DRE: % lançamentos', v_dre;
  raise notice '   • Cashflow: % lançamentos', v_cash;
  raise notice '   • Alertas: %', v_alerts;
  raise notice '';
  raise notice '🚀 PRÓXIMOS PASSOS:';
  raise notice '   1. Rodar Edge Function seed-realistic-data';
  raise notice '   2. Rodar Edge Function whatsapp-simulator';
  raise notice '   3. Começar testes!';
  raise notice '';
end $$;

-- Ver resumo
select '✅ F360: ' || count(*) || ' empresas' as status from integration_f360
union all
select '✅ OMIE: ' || count(*) || ' empresas' from integration_omie
union all
select '✅ Tokens: ' || count(*) from onboarding_tokens
union all
select '✅ DRE: ' || count(*) || ' lançamentos' from dre_entries
union all
select '✅ Cashflow: ' || count(*) || ' lançamentos' from cashflow_entries
union all
select '✅ Alertas: ' || count(*) from financial_alerts;

