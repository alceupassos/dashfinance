-- Migration: Ensure unique indexes exist for DRE and Cashflow entries
-- These indexes are required for the upsert operations to work correctly

begin;

-- Create unique index for dre_entries if it doesn't exist
create unique index if not exists dre_entries_company_cnpj_date_account_key
  on public.dre_entries (company_cnpj, date, account);

-- Create unique index for cashflow_entries if it doesn't exist
create unique index if not exists cashflow_entries_company_cnpj_date_category_kind_key
  on public.cashflow_entries (company_cnpj, date, category, kind);

commit;

