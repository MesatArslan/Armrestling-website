-- RLS Politikalarını Düzeltme - Sonsuz Döngü Sorunu
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- Önce mevcut politikaları sil
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view their institution users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert users for their institution" ON profiles;

DROP POLICY IF EXISTS "Super admins can view all institutions" ON institutions;
DROP POLICY IF EXISTS "Admins can view own institution" ON institutions;
DROP POLICY IF EXISTS "Super admins can insert institutions" ON institutions;
DROP POLICY IF EXISTS "Super admins can update institutions" ON institutions;

-- Profiles tablosu için yeni politikalar (döngü olmadan)
-- Super Admin tüm profilleri görebilir (auth.uid() kullanarak)
CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Admin'ler kendi kurumlarının kullanıcılarını görebilir
CREATE POLICY "Admins can view their institution users" ON profiles
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
        AND 
        institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    );

-- Kullanıcılar sadece kendi profillerini görebilir
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Super Admin profil oluşturabilir
CREATE POLICY "Super admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Admin'ler kendi kurumları için kullanıcı oluşturabilir
CREATE POLICY "Admins can insert users for their institution" ON profiles
    FOR INSERT WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        AND 
        institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
        AND 
        role = 'user'
        AND
        (SELECT i.users_created < i.user_quota 
         FROM institutions i 
         WHERE i.id = (SELECT institution_id FROM profiles WHERE id = auth.uid()))
    );

-- Super Admin profilleri güncelleyebilir
CREATE POLICY "Super admins can update profiles" ON profiles
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Admin'ler kendi kurumlarının kullanıcılarını güncelleyebilir
CREATE POLICY "Admins can update their users" ON profiles
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
        AND 
        institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
        AND
        role = 'user'
    );

-- Institutions tablosu için yeni politikalar
-- Super Admin tüm kurumları görebilir
CREATE POLICY "Super admins can view all institutions" ON institutions
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Admin'ler sadece kendi kurumlarını görebilir
CREATE POLICY "Admins can view own institution" ON institutions
    FOR SELECT USING (
        id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
        AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- Super Admin kurum oluşturabilir
CREATE POLICY "Super admins can insert institutions" ON institutions
    FOR INSERT WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Super Admin kurumları güncelleyebilir
CREATE POLICY "Super admins can update institutions" ON institutions
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Önemli: Service role bypass için (backend işlemler için)
-- Bu politikalar sadece anon/authenticated key ile yapılan işlemler için geçerli
-- Service role key ile yapılan işlemler RLS'i bypass eder

-- Test için basit bir query
-- SELECT * FROM profiles WHERE id = auth.uid();
