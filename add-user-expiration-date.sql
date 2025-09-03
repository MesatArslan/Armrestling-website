-- Add expiration date field to profiles table for non-institution users
-- Bu dosyayı Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Profiles tablosuna expiration_date alanı ekle
ALTER TABLE profiles 
ADD COLUMN expiration_date TIMESTAMP WITH TIME ZONE;

-- 2. Mevcut kurumu olmayan kullanıcılar için varsayılan son kullanma tarihi (1 yıl sonra)
UPDATE profiles 
SET expiration_date = NOW() + INTERVAL '1 year'
WHERE institution_id IS NULL AND role = 'user';

-- 3. Admin ve Super Admin kullanıcıları için son kullanma tarihi yok (NULL)
UPDATE profiles 
SET expiration_date = NULL
WHERE role IN ('admin', 'super_admin');

-- 4. Kurumu olmayan kullanıcılar için son kullanma tarihi kontrolü
-- Bu constraint sadece kurumu olmayan kullanıcılar için geçerli
ALTER TABLE profiles 
ADD CONSTRAINT check_non_institution_user_expiration 
CHECK (
    (institution_id IS NULL AND role = 'user' AND expiration_date IS NOT NULL) OR
    (institution_id IS NOT NULL OR role IN ('admin', 'super_admin'))
);

-- 5. Son kullanma tarihi için index (performans için)
CREATE INDEX idx_profiles_expiration_date ON profiles(expiration_date);

-- 6. Son kullanma tarihi kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION check_user_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Kurumu olmayan kullanıcılar için son kullanma tarihi zorunlu
    IF NEW.institution_id IS NULL AND NEW.role = 'user' AND NEW.expiration_date IS NULL THEN
        RAISE EXCEPTION 'Kurumu olmayan kullanıcılar için son kullanma tarihi zorunludur';
    END IF;
    
    -- Admin ve Super Admin kullanıcıları için son kullanma tarihi olmamalı
    IF NEW.role IN ('admin', 'super_admin') AND NEW.expiration_date IS NOT NULL THEN
        RAISE EXCEPTION 'Admin ve Super Admin kullanıcıları için son kullanma tarihi olamaz';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger'ı etkinleştir
CREATE OR REPLACE TRIGGER check_user_expiration_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION check_user_expiration();

-- 8. RLS politikalarını güncelle (son kullanma tarihi kontrolü için)
-- Kurumu olmayan kullanıcılar sadece kendi profillerini görebilir
CREATE POLICY "Non-institution users can view own profile" ON profiles
    FOR SELECT USING (
        id = auth.uid() AND institution_id IS NULL
    );

-- Kurumu olmayan kullanıcılar kendi profillerini güncelleyebilir
CREATE POLICY "Non-institution users can update own profile" ON profiles
    FOR UPDATE USING (
        id = auth.uid() AND institution_id IS NULL
    );

-- 9. Test verisi ekle (isteğe bağlı)
-- INSERT INTO profiles (id, email, username, role, expiration_date) 
-- VALUES (
--     gen_random_uuid(), 
--     'test@example.com', 
--     'Test User', 
--     'user', 
--     NOW() + INTERVAL '6 months'
-- );
