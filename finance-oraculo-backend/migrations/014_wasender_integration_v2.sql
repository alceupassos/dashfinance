-- Migration 014 v2: WaSender Integration (Simplified)
-- Works with existing schema
-- Date: 2025-11-07

-- ========================================
-- 1. Create wasender_credentials table
-- ========================================

CREATE TABLE IF NOT EXISTS wasender_credentials (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(255) NOT NULL,
  api_secret VARCHAR(255),
  session_id VARCHAR(100),
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE wasender_credentials IS 'WaSender API credentials and configuration';

-- Insert WaSender credentials
INSERT INTO wasender_credentials (api_key, api_secret, webhook_url, is_active)
VALUES (
  '31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06',
  '352e43ecd33e0c2bb2cd40927218e91f',
  'https://www.ifin.app.br/webhook/wasender',
  true
) ON CONFLICT DO NOTHING;

-- ========================================
-- 2. Add provider to existing tables
-- ========================================

-- Add provider to whatsapp_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_conversations'
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE whatsapp_conversations ADD COLUMN provider VARCHAR(50) DEFAULT 'wasender';
  END IF;
END $$;

COMMENT ON COLUMN whatsapp_conversations.provider IS 'Message provider: evolution or wasender';

-- Add provider to whatsapp_chat_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_chat_sessions'
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE whatsapp_chat_sessions ADD COLUMN provider VARCHAR(50) DEFAULT 'wasender';
  END IF;
END $$;

COMMENT ON COLUMN whatsapp_chat_sessions.provider IS 'Session provider: evolution or wasender';

-- Add provider to whatsapp_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_templates'
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE whatsapp_templates ADD COLUMN provider VARCHAR(50) DEFAULT 'universal';
  END IF;
END $$;

COMMENT ON COLUMN whatsapp_templates.provider IS 'Template compatible providers: universal, evolution, wasender';

-- ========================================
-- 3. Create view for active WaSender config
-- ========================================

CREATE OR REPLACE VIEW v_wasender_active_config AS
SELECT
  wc.api_key,
  wc.api_secret,
  wc.session_id,
  wc.webhook_url,
  wc.created_at,
  wc.updated_at
FROM wasender_credentials wc
WHERE wc.is_active = true
ORDER BY wc.id DESC
LIMIT 1;

COMMENT ON VIEW v_wasender_active_config IS 'Currently active WaSender configuration';

-- ========================================
-- 4. Create function to get WaSender credentials
-- ========================================

CREATE OR REPLACE FUNCTION get_wasender_credentials()
RETURNS TABLE (
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  webhook_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wc.api_key,
    wc.api_secret,
    wc.webhook_url
  FROM wasender_credentials wc
  WHERE wc.is_active = true
  ORDER BY wc.id DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_wasender_credentials() IS 'Get active WaSender API credentials';

-- ========================================
-- 5. Create validation codes table (for /vincular)
-- ========================================

CREATE TABLE IF NOT EXISTS whatsapp_validation_codes (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_codes_phone ON whatsapp_validation_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_validation_codes_code ON whatsapp_validation_codes(code);
CREATE INDEX IF NOT EXISTS idx_validation_codes_expires ON whatsapp_validation_codes(expires_at);

COMMENT ON TABLE whatsapp_validation_codes IS 'Temporary validation codes for WhatsApp linking';

-- ========================================
-- 6. Grant necessary permissions
-- ========================================

GRANT SELECT ON v_wasender_active_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_wasender_credentials() TO authenticated;
GRANT ALL ON wasender_credentials TO authenticated;
GRANT ALL ON whatsapp_validation_codes TO authenticated;

-- ========================================
-- Migration Complete
-- ========================================

SELECT 'Migration 014 v2: WaSender Integration completed successfully' AS status;
