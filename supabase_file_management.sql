-- Dosya Yönetimi Tablosu
-- Bu tablo kullanıcıların kaydettiği dosyaları saklar

CREATE TABLE IF NOT EXISTS saved_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('players', 'tournaments', 'fixtures')),
  description TEXT,
  file_data JSONB NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_saved_files_user_id ON saved_files(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_files_institution_id ON saved_files(institution_id);
CREATE INDEX IF NOT EXISTS idx_saved_files_type ON saved_files(type);
CREATE INDEX IF NOT EXISTS idx_saved_files_created_at ON saved_files(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_files_updated_at 
    BEFORE UPDATE ON saved_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) devre dışı - Policy yok
-- ALTER TABLE saved_files ENABLE ROW LEVEL SECURITY;

-- Dosya istatistikleri için view
CREATE OR REPLACE VIEW file_stats AS
SELECT 
    user_id,
    institution_id,
    type,
    COUNT(*) as file_count,
    SUM(file_size) as total_size,
    MAX(created_at) as last_file_created
FROM saved_files
GROUP BY user_id, institution_id, type;

-- View için policy yok - RLS devre dışı

-- Dosya türüne göre istatistikler için view
CREATE OR REPLACE VIEW file_type_stats AS
SELECT 
    type,
    COUNT(*) as total_files,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(file_size) as total_size,
    AVG(file_size) as avg_size,
    MAX(created_at) as last_created
FROM saved_files
GROUP BY type;

-- Bu view için policy yok - RLS devre dışı

-- Dosya boyutu limitleri için fonksiyon
CREATE OR REPLACE FUNCTION check_file_size_limit()
RETURNS TRIGGER AS $$
DECLARE
    max_size INTEGER := 10485760; -- 10MB limit
    user_total_size INTEGER;
BEGIN
    -- Dosya boyutu kontrolü
    IF NEW.file_size > max_size THEN
        RAISE EXCEPTION 'Dosya boyutu çok büyük. Maksimum % MB olabilir.', max_size / 1048576;
    END IF;
    
    -- Kullanıcının toplam dosya boyutu kontrolü
    SELECT COALESCE(SUM(file_size), 0) INTO user_total_size
    FROM saved_files 
    WHERE user_id = NEW.user_id;
    
    IF user_total_size + NEW.file_size > 104857600 THEN -- 100MB toplam limit
        RAISE EXCEPTION 'Toplam dosya boyutu limitini aştınız. Maksimum 100 MB olabilir.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı ekle
CREATE TRIGGER check_file_size_trigger
    BEFORE INSERT OR UPDATE ON saved_files
    FOR EACH ROW
    EXECUTE FUNCTION check_file_size_limit();

-- Dosya temizleme fonksiyonu (eski dosyaları temizlemek için)
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 1 yıldan eski dosyaları sil
    DELETE FROM saved_files 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Dosya arama fonksiyonu
CREATE OR REPLACE FUNCTION search_files(
    search_term TEXT DEFAULT '',
    file_type TEXT DEFAULT NULL,
    user_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    description TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sf.id,
        sf.name,
        sf.type,
        sf.description,
        sf.file_size,
        sf.created_at,
        sf.user_id
    FROM saved_files sf
    WHERE 
        (search_term = '' OR sf.name ILIKE '%' || search_term || '%' OR sf.description ILIKE '%' || search_term || '%')
        AND (file_type IS NULL OR sf.type = file_type)
        AND (user_uuid IS NULL OR sf.user_id = user_uuid)
        -- Policy yok - tüm dosyalar görülebilir
    ORDER BY sf.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dosya indirme logları için tablo (opsiyonel)
CREATE TABLE IF NOT EXISTS file_download_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES saved_files(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Download log için index
CREATE INDEX IF NOT EXISTS idx_file_download_logs_file_id ON file_download_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_download_logs_user_id ON file_download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_download_logs_downloaded_at ON file_download_logs(downloaded_at DESC);

-- Download log için RLS devre dışı - Policy yok
-- ALTER TABLE file_download_logs ENABLE ROW LEVEL SECURITY;

-- Download log fonksiyonu
CREATE OR REPLACE FUNCTION log_file_download(
    file_uuid UUID,
    client_ip INET DEFAULT NULL,
    agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO file_download_logs (file_id, user_id, ip_address, user_agent)
    VALUES (file_uuid, auth.uid(), client_ip, agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dosya istatistikleri için fonksiyon
CREATE OR REPLACE FUNCTION get_user_file_stats(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    total_files BIGINT,
    total_size BIGINT,
    files_by_type JSONB,
    last_upload TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    target_user UUID := COALESCE(user_uuid, auth.uid());
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size,
        jsonb_object_agg(type, type_count) as files_by_type,
        MAX(created_at) as last_upload
    FROM (
        SELECT 
            type,
            COUNT(*) as type_count,
            MAX(created_at) as created_at
        FROM saved_files 
        WHERE user_id = target_user
        GROUP BY type
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kurum dosya istatistikleri için fonksiyon
CREATE OR REPLACE FUNCTION get_institution_file_stats(institution_uuid UUID)
RETURNS TABLE (
    total_files BIGINT,
    total_size BIGINT,
    files_by_type JSONB,
    users_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size,
        jsonb_object_agg(type, type_count) as files_by_type,
        COUNT(DISTINCT user_id) as users_count
    FROM (
        SELECT 
            type,
            COUNT(*) as type_count,
            user_id
        FROM saved_files 
        WHERE institution_id = institution_uuid
        GROUP BY type, user_id
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Örnek veri ekleme (test için)
-- INSERT INTO saved_files (user_id, institution_id, name, type, description, file_data, file_size)
-- VALUES (
--     auth.uid(),
--     (SELECT institution_id FROM profiles WHERE id = auth.uid()),
--     'Test Oyuncular',
--     'players',
--     'Test amaçlı oyuncu dosyası',
--     '{"players": [{"name": "Test Oyuncu", "weight": 70}]}',
--     100
-- );

-- Dosya yönetimi için gerekli tüm tablolar ve policy'ler oluşturuldu
-- Bu SQL dosyasını Supabase SQL Editor'da çalıştırabilirsiniz
