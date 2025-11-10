-- Migration 020: Oracle User Preferences
-- Date: 2025-11-10

create table if not exists oracle_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  web_model text not null default 'chatgpt-5-thinking',
  whatsapp_model text not null default 'gpt-4o-mini',
  updated_at timestamptz not null default now()
);

comment on table oracle_user_settings is 'Preferências do Oráculo por usuário (modelos web/WhatsApp)';

create index if not exists idx_oracle_user_settings_web on oracle_user_settings(web_model);
create index if not exists idx_oracle_user_settings_whatsapp on oracle_user_settings(whatsapp_model);

grant select, insert, update on oracle_user_settings to authenticated;
