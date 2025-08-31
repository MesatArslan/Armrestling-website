-- Tablo İzinlerini Verme
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Önce RLS'i kapat
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;

-- 2. Tüm politikaları sil
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view their institution users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert users for their institution" ON profiles;
DROP POLICY IF EXISTS "Super admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update their users" ON profiles;

DROP POLICY IF EXISTS "Super admins can view all institutions" ON institutions;
DROP POLICY IF EXISTS "Admins can view own institution" ON institutions;
DROP POLICY IF EXISTS "Super admins can insert institutions" ON institutions;
DROP POLICY IF EXISTS "Super admins can update institutions" ON institutions;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON profiles;

DROP POLICY IF EXISTS "Allow authenticated users to read institutions" ON institutions;
DROP POLICY IF EXISTS "Allow authenticated users to insert institutions" ON institutions;
DROP POLICY IF EXISTS "Allow authenticated users to update institutions" ON institutions;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

DROP POLICY IF EXISTS "institutions_select_policy" ON institutions;
DROP POLICY IF EXISTS "institutions_insert_policy" ON institutions;
DROP POLICY IF EXISTS "institutions_update_policy" ON institutions;

DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

DROP POLICY IF EXISTS "institutions_read_policy" ON institutions;
DROP POLICY IF EXISTS "institutions_insert_policy" ON institutions;
DROP POLICY IF EXISTS "institutions_update_policy" ON institutions;

-- 3. Tablo izinlerini ver
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON institutions TO authenticated;

-- 4. Sequence izinlerini ver (eğer varsa)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Test
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as institutions_count FROM institutions;

-- 6. RLS durumunu kontrol et
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'institutions');
