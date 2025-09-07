-- Session süresini 20 saniyeye değiştir (test için)
-- Bu kod sadece mevcut session süresini günceller

-- 1. Mevcut session'ların süresini güncelle (20 saniye)
UPDATE user_sessions 
SET expires_at = NOW() + INTERVAL '20 seconds'
WHERE is_active = true;

-- 2. create_single_user_session fonksiyonunu güncelle
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
    v_expires_at := NOW() + INTERVAL '20 seconds';  -- 20 saniye
    
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

-- 3. Tablo varsayılan değerini güncelle (yeni session'lar için)
ALTER TABLE user_sessions 
ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '20 seconds');

-- 4. Kontrol sorguları
SELECT 'Session süresi 20 saniyeye güncellendi!' as status;

-- Aktif session'ları kontrol et
SELECT 
    user_id,
    created_at,
    expires_at,
    EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_remaining
FROM user_sessions 
WHERE is_active = true;
