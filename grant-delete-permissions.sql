-- DELETE İzinlerini Verme
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. DELETE izinlerini ver
GRANT DELETE ON institutions TO authenticated;
GRANT DELETE ON profiles TO authenticated;

-- 2. Test - izinleri kontrol et
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name IN ('profiles', 'institutions')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- 3. Test - kurumları listele
SELECT * FROM institutions ORDER BY created_at DESC;
