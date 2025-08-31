-- Auth Users Otomatik Silme Trigger'ı
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Auth kullanıcılarını silen fonksiyon
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Profil silindiğinde auth.users'dan da sil
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_profile_deleted ON profiles;
CREATE TRIGGER on_profile_deleted
    AFTER DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();

-- 3. Test - trigger'ı kontrol et
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_profile_deleted';
