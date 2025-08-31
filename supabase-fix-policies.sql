-- RLS Politikalarını Düzeltme - SuperAdmin Erişim Sorunu
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Önce mevcut politikaları temizle
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

-- 2. RLS'i geçici olarak kapat
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;

-- 3. Yeni, güvenli politikalar oluştur

-- Profiles tablosu için politikalar
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Super admin tüm profilleri görebilir
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        -- Admin kendi kurumunun kullanıcılarını görebilir
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
         AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid()))
        OR
        -- Kullanıcı kendi profilini görebilir
        auth.uid() = id
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (
        -- Super admin profil oluşturabilir
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        -- Admin kendi kurumu için kullanıcı oluşturabilir
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
         AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
         AND role = 'user')
    );

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (
        -- Super admin tüm profilleri güncelleyebilir
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        -- Admin kendi kurumunun kullanıcılarını güncelleyebilir
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
         AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
         AND role = 'user')
        OR
        -- Kullanıcı kendi profilini güncelleyebilir
        auth.uid() = id
    );

-- Institutions tablosu için politikalar
CREATE POLICY "institutions_select_policy" ON institutions
    FOR SELECT USING (
        -- Super admin tüm kurumları görebilir
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        -- Admin kendi kurumunu görebilir
        (id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
         AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    );

CREATE POLICY "institutions_insert_policy" ON institutions
    FOR INSERT WITH CHECK (
        -- Sadece super admin kurum oluşturabilir
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "institutions_update_policy" ON institutions
    FOR UPDATE USING (
        -- Sadece super admin kurumları güncelleyebilir
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- 4. RLS'i yeniden aç
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- 5. Test için basit query'ler
-- SELECT * FROM profiles WHERE id = auth.uid();
-- SELECT * FROM institutions;
-- SELECT role FROM profiles WHERE id = auth.uid();
