-- Migration 021: Oracle Chat History
-- Date: 2025-11-10

create table if not exists oracle_chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  model text not null,
  company_cnpj text,
  created_at timestamptz not null default now()
);

comment on table oracle_chat_history is 'Registro completo de perguntas e respostas do Oráculo';

create index if not exists idx_oracle_chat_history_user on oracle_chat_history(user_id);
create index if not exists idx_oracle_chat_history_company on oracle_chat_history(company_cnpj);

grant select, insert on oracle_chat_history to authenticated;
