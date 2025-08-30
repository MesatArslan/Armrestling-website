-- Supabase Database Schema for Role-Based System
-- Bu dosyayı Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Institutions (Kurumlar) Tablosu
CREATE TABLE institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    user_quota INTEGER NOT NULL DEFAULT 0,
    users_created INTEGER NOT NULL DEFAULT 0,
    subscription_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_user_quota_positive CHECK (user_quota >= 0),
    CONSTRAINT check_users_created_positive CHECK (users_created >= 0),
    CONSTRAINT check_users_created_not_exceed_quota CHECK (users_created <= user_quota)
);

-- 2. Profiles Tablosu (Auth kullanıcıları için genişletilmiş bilgiler)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger Functions
-- Profil oluşturma trigger'ı (auth.users'a yeni kullanıcı eklendiğinde otomatik profil oluştur)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auth kullanıcı oluşturulduğunda profil oluştur
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Kurum users_created sayacını güncelleyen trigger
CREATE OR REPLACE FUNCTION public.update_institution_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.institution_id IS NOT NULL THEN
        UPDATE institutions 
        SET users_created = users_created + 1,
            updated_at = NOW()
        WHERE id = NEW.institution_id;
    ELSIF TG_OP = 'DELETE' AND OLD.institution_id IS NOT NULL THEN
        UPDATE institutions 
        SET users_created = users_created - 1,
            updated_at = NOW()
        WHERE id = OLD.institution_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profil eklendiğinde/silindiğinde kurum sayacını güncelle
CREATE OR REPLACE TRIGGER on_profile_institution_change
    AFTER INSERT OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_institution_user_count();

-- 4. Row Level Security (RLS) Politikaları

-- Profiles tablosu için RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Super Admin tüm profilleri görebilir
CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Admin'ler kendi kurumlarının kullanıcılarını görebilir
CREATE POLICY "Admins can view their institution users" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND institution_id = profiles.institution_id
        )
    );

-- Kullanıcılar sadece kendi profillerini görebilir
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Super Admin profil oluşturabilir
CREATE POLICY "Super admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Admin'ler kendi kurumları için kullanıcı oluşturabilir
CREATE POLICY "Admins can insert users for their institution" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN institutions i ON p.institution_id = i.id
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
            AND i.users_created < i.user_quota
            AND profiles.institution_id = p.institution_id
            AND profiles.role = 'user'
        )
    );

-- Institutions tablosu için RLS
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Super Admin tüm kurumları görebilir
CREATE POLICY "Super admins can view all institutions" ON institutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Admin'ler sadece kendi kurumlarını görebilir
CREATE POLICY "Admins can view own institution" ON institutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND institution_id = institutions.id
        )
    );

-- Super Admin kurum oluşturabilir
CREATE POLICY "Super admins can insert institutions" ON institutions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Super Admin kurumları güncelleyebilir
CREATE POLICY "Super admins can update institutions" ON institutions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 5. İlk Super Admin Kullanıcısı Oluşturma
-- Bu kısmı manuel olarak çalıştırmanız gerekiyor
-- Önce Supabase Auth'ta bir kullanıcı oluşturun, sonra bu SQL'i çalıştırın

-- INSERT INTO profiles (id, email, role) 
-- VALUES ('YOUR_SUPER_ADMIN_USER_ID', 'superadmin@example.com', 'super_admin');

-- 6. İndeksler (Performans için)
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_institution_id ON profiles(institution_id);
CREATE INDEX idx_institutions_created_by ON institutions(created_by);
CREATE INDEX idx_institutions_subscription_end_date ON institutions(subscription_end_date);

-- 7. Updated_at trigger'ları
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
