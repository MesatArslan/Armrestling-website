-- RLS Politikalarını Kaldır
-- Bu dosya user_sessions tablosundaki RLS politikalarını kaldırır

-- 1. RLS politikalarını kaldır
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;

-- 2. RLS'yi devre dışı bırak
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- 3. Kontrol sorguları
SELECT 'RLS politikaları kaldırıldı!' as status;

-- user_sessions tablosunun RLS durumunu kontrol et
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_sessions';
