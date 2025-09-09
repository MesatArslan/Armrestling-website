-- Enhanced Session Validation with Subscription Check
-- Bu dosya session doğrulama fonksiyonunu abonelik kontrolü ile güçlendirir

-- Session token doğrula (abonelik kontrolü ile - Super Admin hariç)
CREATE OR REPLACE FUNCTION validate_user_session_with_subscription(p_session_token TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    user_id UUID,
    session_id UUID,
    subscription_expired BOOLEAN,
    user_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_profile RECORD;
    v_institution RECORD;
BEGIN
    -- Session'ı bul
    SELECT us.id, us.user_id, us.is_active, us.expires_at
    INTO v_session
    FROM user_sessions us
    WHERE us.session_token = p_session_token;
    
    -- Session bulunamadı veya geçersiz
    IF NOT FOUND OR NOT v_session.is_active OR v_session.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, false, false;
        RETURN;
    END IF;
    
    -- Kullanıcı profilini al
    SELECT p.institution_id, p.expiration_date, p.role
    INTO v_profile
    FROM profiles p
    WHERE p.id = v_session.user_id;
    
    -- Kullanıcı bulunamadı
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, false, false;
        RETURN;
    END IF;
    
    -- Super Admin için abonelik kontrolü yapma
    IF v_profile.role = 'super_admin' THEN
        RETURN QUERY SELECT true, v_session.user_id, v_session.id, false, false;
        RETURN;
    END IF;
    
    -- Kullanıcı süresi kontrolü (bireysel kullanıcılar için)
    IF v_profile.expiration_date IS NOT NULL THEN
        IF v_profile.expiration_date < NOW() THEN
            RETURN QUERY SELECT false, v_session.user_id, v_session.id, false, true;
            RETURN;
        END IF;
    END IF;
    
    -- Kurum abonelik süresi kontrolü
    IF v_profile.institution_id IS NOT NULL THEN
        SELECT i.subscription_end_date
        INTO v_institution
        FROM institutions i
        WHERE i.id = v_profile.institution_id;
        
        IF FOUND AND v_institution.subscription_end_date < NOW() THEN
            RETURN QUERY SELECT false, v_session.user_id, v_session.id, true, false;
            RETURN;
        END IF;
    END IF;
    
    -- Session geçerli ve abonelik aktif
    RETURN QUERY SELECT true, v_session.user_id, v_session.id, false, false;
END;
$$;

-- Kullanıcı abonelik durumunu kontrol eden fonksiyon (Super Admin hariç)
CREATE OR REPLACE FUNCTION check_user_subscription_status(p_user_id UUID)
RETURNS TABLE(
    is_active BOOLEAN,
    subscription_expired BOOLEAN,
    user_expired BOOLEAN,
    institution_id UUID,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    user_expiration_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_institution RECORD;
BEGIN
    -- Kullanıcı profilini al
    SELECT p.institution_id, p.expiration_date, p.role
    INTO v_profile
    FROM profiles p
    WHERE p.id = p_user_id;
    
    -- Kullanıcı bulunamadı
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, false, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Super Admin için her zaman aktif
    IF v_profile.role = 'super_admin' THEN
        RETURN QUERY SELECT true, false, false, v_profile.institution_id, NULL::TIMESTAMP WITH TIME ZONE, v_profile.expiration_date;
        RETURN;
    END IF;
    
    -- Kullanıcı süresi kontrolü (bireysel kullanıcılar için)
    IF v_profile.expiration_date IS NOT NULL AND v_profile.expiration_date < NOW() THEN
        RETURN QUERY SELECT false, false, true, v_profile.institution_id, NULL::TIMESTAMP WITH TIME ZONE, v_profile.expiration_date;
        RETURN;
    END IF;
    
    -- Kurum abonelik süresi kontrolü
    IF v_profile.institution_id IS NOT NULL THEN
        SELECT i.subscription_end_date
        INTO v_institution
        FROM institutions i
        WHERE i.id = v_profile.institution_id;
        
        IF FOUND AND v_institution.subscription_end_date < NOW() THEN
            RETURN QUERY SELECT false, true, false, v_profile.institution_id, v_institution.subscription_end_date, v_profile.expiration_date;
            RETURN;
        END IF;
    END IF;
    
    -- Abonelik aktif
    RETURN QUERY SELECT true, false, false, v_profile.institution_id, 
        COALESCE(v_institution.subscription_end_date, NULL::TIMESTAMP WITH TIME ZONE), 
        v_profile.expiration_date;
END;
$$;

SELECT 'Enhanced session validation functions created successfully!' as status;
