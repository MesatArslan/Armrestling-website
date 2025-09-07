-- Single Session Management System
-- Aynı hesaptan sadece 1 aktif session'a izin verir

-- 1. User Sessions tablosu oluştur
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- 2. Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- 3. RLS politikaları
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi session'larını görebilir
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Session yönetimi fonksiyonları

-- Yeni session oluştur (eski session'ları geçersiz kıl)
CREATE OR REPLACE FUNCTION create_single_user_session(
    p_user_id UUID,
    p_device_info JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Kullanıcının TÜM aktif session'larını geçersiz kıl
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Yeni session token oluştur
    v_session_token := encode(gen_random_bytes(32), 'base64');
    v_expires_at := NOW() + INTERVAL '30 days';
    
    -- Yeni session kaydı oluştur
    INSERT INTO user_sessions (
        user_id,
        session_token,
        device_info,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        p_user_id,
        v_session_token,
        p_device_info,
        p_ip_address,
        p_user_agent,
        v_expires_at
    );
    
    RETURN v_session_token;
END;
$$;

-- Session token doğrula
CREATE OR REPLACE FUNCTION validate_user_session(p_session_token TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    user_id UUID,
    session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Session'ı bul
    SELECT us.id, us.user_id, us.is_active, us.expires_at
    INTO v_session
    FROM user_sessions us
    WHERE us.session_token = p_session_token;
    
    -- Session bulunamadı veya geçersiz
    IF NOT FOUND OR NOT v_session.is_active OR v_session.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
    -- Session geçerli
    RETURN QUERY SELECT true, v_session.user_id, v_session.id;
END;
$$;

-- Session'ı geçersiz kıl
CREATE OR REPLACE FUNCTION invalidate_user_session(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_rows INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE session_token = p_session_token AND is_active = true;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    RETURN v_updated_rows > 0;
END;
$$;

-- Kullanıcının aktif session sayısını kontrol et
CREATE OR REPLACE FUNCTION get_active_session_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_sessions
    WHERE user_id = p_user_id AND is_active = true AND expires_at > NOW();
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- Süresi dolmuş session'ları temizle
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_rows INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
    
    RETURN v_deleted_rows;
END;
$$;

-- 5. Trigger'lar
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Test fonksiyonu
CREATE OR REPLACE FUNCTION test_single_session_system()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_test_user_id UUID;
    v_session_token_1 TEXT;
    v_session_token_2 TEXT;
    v_active_count INTEGER;
BEGIN
    -- Test kullanıcısı oluştur
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'test@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW())
    RETURNING id INTO v_test_user_id;
    
    -- İlk session oluştur
    SELECT create_single_user_session(v_test_user_id, '{"device": "Chrome"}'::jsonb, '127.0.0.1'::inet, 'Browser 1')
    INTO v_session_token_1;
    
    -- Aktif session sayısını kontrol et (1 olmalı)
    SELECT get_active_session_count(v_test_user_id) INTO v_active_count;
    
    IF v_active_count != 1 THEN
        -- Temizlik
        DELETE FROM user_sessions WHERE user_id = v_test_user_id;
        DELETE FROM auth.users WHERE id = v_test_user_id;
        RETURN 'Test FAILED: Expected 1 active session, got ' || v_active_count;
    END IF;
    
    -- İkinci session oluştur (ilk session geçersiz olmalı)
    SELECT create_single_user_session(v_test_user_id, '{"device": "Firefox"}'::jsonb, '127.0.0.2'::inet, 'Browser 2')
    INTO v_session_token_2;
    
    -- Aktif session sayısını kontrol et (hala 1 olmalı)
    SELECT get_active_session_count(v_test_user_id) INTO v_active_count;
    
    -- Temizlik
    DELETE FROM user_sessions WHERE user_id = v_test_user_id;
    DELETE FROM auth.users WHERE id = v_test_user_id;
    
    IF v_active_count = 1 THEN
        RETURN 'Single session system test PASSED';
    ELSE
        RETURN 'Test FAILED: Expected 1 active session after second login, got ' || v_active_count;
    END IF;
END;
$$;

-- Kullanım örnekleri:
-- 
-- 1. Yeni session oluştur (eski session'ları geçersiz kıl):
-- SELECT create_single_user_session('user-uuid', '{"device": "Chrome"}'::jsonb, '192.168.1.1'::inet, 'Mozilla/5.0...');
--
-- 2. Session doğrula:
-- SELECT * FROM validate_user_session('session-token-string');
--
-- 3. Session geçersiz kıl:
-- SELECT invalidate_user_session('session-token-string');
--
-- 4. Aktif session sayısını kontrol et:
-- SELECT get_active_session_count('user-uuid');
--
-- 5. Test çalıştır:
-- SELECT test_single_session_system();

