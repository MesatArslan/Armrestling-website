-- Kullanıcı Rolünü Kontrol Etme ve Düzeltme
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Mevcut kullanıcının rolünü kontrol et
SELECT 
    id,
    email,
    role,
    institution_id,
    created_at
FROM profiles 
WHERE id = auth.uid();

-- 2. Eğer rol 'super_admin' değilse, güncelle
-- (Bu kısmı sadece gerekirse çalıştırın)
-- UPDATE profiles 
-- SET role = 'super_admin' 
-- WHERE id = auth.uid() AND role != 'super_admin';

-- 3. Tüm profilleri listele (sadece super_admin için)
SELECT 
    id,
    email,
    role,
    institution_id,
    created_at
FROM profiles 
ORDER BY created_at DESC;

-- 4. Institutions tablosunu kontrol et
SELECT 
    id,
    name,
    email,
    user_quota,
    users_created,
    subscription_end_date,
    created_at
FROM institutions 
ORDER BY created_at DESC;
