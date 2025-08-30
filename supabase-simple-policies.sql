-- Basit RLS Politikaları - Sonsuz Döngü Sorunu Çözümü
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Önce RLS'i tamamen kapat
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

-- 3. Basit politikalar oluştur (döngü olmadan)

-- Profiles tablosu için basit politikalar
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update profiles" ON profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Institutions tablosu için basit politikalar  
CREATE POLICY "Allow authenticated users to read institutions" ON institutions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert institutions" ON institutions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update institutions" ON institutions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. RLS'i yeniden aç
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- 5. Test query'si
-- SELECT * FROM profiles WHERE id = auth.uid();
