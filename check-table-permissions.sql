-- Tablo İzinlerini ve RLS Durumunu Kontrol Etme
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. RLS durumunu kontrol et
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'institutions');

-- 2. Mevcut politikaları listele
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'institutions');

-- 3. Tablo izinlerini kontrol et
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name IN ('profiles', 'institutions')
AND grantee = 'authenticated';

-- 4. Kullanıcı rolünü kontrol et
SELECT 
    id,
    email,
    role,
    institution_id,
    created_at
FROM profiles 
WHERE id = auth.uid();

-- 5. Test query'leri
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as institutions_count FROM institutions;
