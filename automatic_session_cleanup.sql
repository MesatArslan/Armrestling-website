-- Otomatik Session Temizleme Sistemi
-- Bu dosya süresi dolmuş session'ları otomatik olarak temizler

-- Süresi dolmuş session'ları temizleyen fonksiyon
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TABLE(
    cleaned_sessions INTEGER,
    cleaned_user_sessions INTEGER,
    cleaned_institution_sessions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_sessions INTEGER := 0;
    v_user_expired_sessions INTEGER := 0;
    v_institution_expired_sessions INTEGER := 0;
BEGIN
    -- 1. Süresi dolmuş session'ları geçersiz kıl
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_sessions = ROW_COUNT;
    
    -- 2. Süresi dolmuş kullanıcıların session'larını geçersiz kıl (Super Admin hariç)
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND user_id IN (
        SELECT p.id 
        FROM profiles p 
        WHERE p.expiration_date IS NOT NULL 
        AND p.expiration_date < NOW()
        AND p.role != 'super_admin'
    );
    
    GET DIAGNOSTICS v_user_expired_sessions = ROW_COUNT;
    
    -- 3. Süresi dolmuş kurumların kullanıcılarının session'larını geçersiz kıl (Super Admin hariç)
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND user_id IN (
        SELECT p.id 
        FROM profiles p 
        JOIN institutions i ON p.institution_id = i.id
        WHERE i.subscription_end_date < NOW()
        AND p.role != 'super_admin'
    );
    
    GET DIAGNOSTICS v_institution_expired_sessions = ROW_COUNT;
    
    -- Sonuçları döndür
    RETURN QUERY SELECT v_expired_sessions, v_user_expired_sessions, v_institution_expired_sessions;
END;
$$;

-- Session temizleme işlemini manuel olarak çalıştır
SELECT cleanup_expired_sessions();

-- Temizlik sonuçlarını göster
SELECT 
    'Session temizleme tamamlandı!' as status,
    COUNT(*) as total_active_sessions
FROM user_sessions 
WHERE is_active = true;

-- Süresi dolmuş session'ları göster
SELECT 
    'Süresi dolmuş session\'lar:' as info,
    COUNT(*) as expired_sessions
FROM user_sessions 
WHERE is_active = false AND expires_at < NOW();

-- Süresi dolmuş kullanıcıları göster
SELECT 
    'Süresi dolmuş kullanıcılar:' as info,
    COUNT(*) as expired_users
FROM profiles 
WHERE expiration_date IS NOT NULL AND expiration_date < NOW();

-- Süresi dolmuş kurumları göster
SELECT 
    'Süresi dolmuş kurumlar:' as info,
    COUNT(*) as expired_institutions
FROM institutions 
WHERE subscription_end_date < NOW();
