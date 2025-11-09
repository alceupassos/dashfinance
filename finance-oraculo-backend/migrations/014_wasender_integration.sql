-- Migration 014: WaSender Integration
-- Adds support for WaSender API as WhatsApp provider
-- Date: 2025-11-07

-- ========================================
-- 1. Add provider field to whatsapp_config
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_config'
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE whatsapp_config ADD COLUMN provider VARCHAR(50) DEFAULT 'evolution';
  END IF;
END $$;

COMMENT ON COLUMN whatsapp_config.provider IS 'WhatsApp provider: evolution or wasender';

-- ========================================
-- 2. Create wasender_credentials table
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
-- 3. Add provider to secrets table
-- ========================================

INSERT INTO secrets (key, value, category, description)
VALUES
  ('WASENDER_API_KEY', '31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06', 'whatsapp', 'WaSender API Key'),
  ('WASENDER_API_SECRET', '352e43ecd33e0c2bb2cd40927218e91f', 'whatsapp', 'WaSender API Secret'),
  ('WASENDER_WEBHOOK_URL', 'https://www.ifin.app.br/webhook/wasender', 'whatsapp', 'WaSender Webhook URL')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- ========================================
-- 4. Add provider tracking to conversations
-- ========================================

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

-- ========================================
-- 5. Update whatsapp_chat_sessions
-- ========================================

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

-- ========================================
-- 6. Create view for active WaSender config
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
-- 7. Create function to get WaSender credentials
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
-- 8. Update whatsapp_templates with provider
-- ========================================

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
-- 9. Grant necessary permissions
-- ========================================

GRANT SELECT ON v_wasender_active_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_wasender_credentials() TO authenticated;

-- ========================================
-- 10. Insert integration log
-- ========================================

INSERT INTO admin_security_events (event_type, severity, description, metadata)
VALUES (
  'integration',
  'info',
  'WaSender API integration configured',
  jsonb_build_object(
    'provider', 'wasender',
    'webhook_url', 'https://www.ifin.app.br/webhook/wasender',
    'migration', '014'
  )
);

-- ========================================
-- Migration Complete
-- ========================================

SELECT 'Migration 014: WaSender Integration completed successfully' AS status;
