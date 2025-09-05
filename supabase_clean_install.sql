-- TEMİZ KURULUM: Kurum Bazında Dosya Yönetimi
-- Önce mevcut sistemi tamamen temizle, sonra yeni sistemi kur

-- ============================================
-- 1. MEVCUT SİSTEMİ TEMİZLE
-- ============================================

-- Trigger'ları sil
DROP TRIGGER IF EXISTS check_file_size_limit_trigger ON saved_files CASCADE;
DROP TRIGGER IF EXISTS update_saved_files_updated_at ON saved_files CASCADE;

-- Fonksiyonları sil
DROP FUNCTION IF EXISTS check_file_size_limit() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS log_file_download(UUID, UUID, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_file_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_institution_file_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS search_files(TEXT, TEXT, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_files() CASCADE;

-- View'ları sil
DROP VIEW IF EXISTS file_stats CASCADE;
DROP VIEW IF EXISTS file_type_stats CASCADE;

-- Tabloları sil (CASCADE ile ilişkili index'ler de silinir)
DROP TABLE IF EXISTS file_download_logs CASCADE;
DROP TABLE IF EXISTS saved_files CASCADE;

-- ============================================
-- 2. YENİ KURUM BAZINDA SİSTEMİ KUR
-- ============================================

-- Dosyalar tablosu
CREATE TABLE saved_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('players', 'tournaments', 'fixtures')),
    description TEXT,
    file_data JSONB NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dosya indirme logları tablosu
CREATE TABLE file_download_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES saved_files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Kurum bazında dosya istatistikleri view
CREATE VIEW file_stats AS
SELECT 
    sf.institution_id,
    COUNT(*) as total_files,
    SUM(sf.file_size) as total_size,
    COUNT(DISTINCT sf.user_id) as unique_users,
    MAX(sf.created_at) as last_upload
FROM saved_files sf
GROUP BY sf.institution_id;

-- Dosya türü bazında istatistikler view
CREATE VIEW file_type_stats AS
SELECT 
    sf.institution_id,
    sf.type,
    COUNT(*) as file_count,
    SUM(sf.file_size) as total_size
FROM saved_files sf
GROUP BY sf.institution_id, sf.type;

-- Kurum bazında dosya boyutu kontrolü fonksiyonu
CREATE FUNCTION check_institution_file_size_limit()
RETURNS TRIGGER AS $$
DECLARE
    max_size INTEGER := 10485760; -- 10MB limit
    institution_total_size INTEGER;
BEGIN
    -- Dosya boyutu kontrolü
    IF NEW.file_size > max_size THEN
        RAISE EXCEPTION 'Dosya boyutu çok büyük. Maksimum % MB olabilir.', max_size / 1048576;
    END IF;
    
    -- Kurumun toplam dosya boyutu kontrolü
    SELECT COALESCE(SUM(file_size), 0) INTO institution_total_size
    FROM saved_files 
    WHERE institution_id = NEW.institution_id;
    
    IF institution_total_size + NEW.file_size > 104857600 THEN -- 100MB toplam limit
        RAISE EXCEPTION 'Kurumun toplam dosya boyutu limitini aştınız. Maksimum 100 MB olabilir.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Dosya boyutu kontrolü
CREATE TRIGGER check_file_size_limit_trigger
    BEFORE INSERT OR UPDATE ON saved_files
    FOR EACH ROW
    EXECUTE FUNCTION check_institution_file_size_limit();

-- Trigger: updated_at otomatik güncelleme
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_files_updated_at
    BEFORE UPDATE ON saved_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Dosya indirme loglama fonksiyonu
CREATE FUNCTION log_file_download(
    file_uuid UUID,
    user_uuid UUID,
    ip_addr INET DEFAULT NULL,
    ua TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO file_download_logs (file_id, user_id, ip_address, user_agent)
    VALUES (file_uuid, user_uuid, ip_addr, ua);
END;
$$ LANGUAGE plpgsql;

-- Kurum dosya istatistikleri fonksiyonu
CREATE FUNCTION get_institution_file_stats(institution_uuid UUID)
RETURNS TABLE (
    total_files BIGINT,
    total_size BIGINT,
    unique_users BIGINT,
    last_upload TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_upload
    FROM saved_files 
    WHERE institution_id = institution_uuid;
END;
$$ LANGUAGE plpgsql;

-- Dosya arama fonksiyonu (kurum bazında)
CREATE FUNCTION search_institution_files(
    institution_uuid UUID,
    search_term TEXT DEFAULT '',
    file_type TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    type VARCHAR(50),
    description TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    user_email TEXT
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
        au.email as user_email
    FROM saved_files sf
    JOIN auth.users au ON sf.user_id = au.id
    WHERE sf.institution_id = institution_uuid
    AND (search_term = '' OR sf.name ILIKE '%' || search_term || '%' OR sf.description ILIKE '%' || search_term || '%')
    AND (file_type IS NULL OR sf.type = file_type)
    ORDER BY sf.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Dosya temizleme fonksiyonu
CREATE FUNCTION cleanup_old_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM saved_files 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Indexler (performans için)
CREATE INDEX idx_saved_files_institution_id ON saved_files(institution_id);
CREATE INDEX idx_saved_files_user_id ON saved_files(user_id);
CREATE INDEX idx_saved_files_type ON saved_files(type);
CREATE INDEX idx_saved_files_created_at ON saved_files(created_at);
CREATE INDEX idx_file_download_logs_file_id ON file_download_logs(file_id);
CREATE INDEX idx_file_download_logs_user_id ON file_download_logs(user_id);

-- Permissions (sadece authentication gerekli)
GRANT ALL ON saved_files TO authenticated;
GRANT ALL ON file_download_logs TO authenticated;
GRANT ALL ON file_stats TO authenticated;
GRANT ALL ON file_type_stats TO authenticated;
GRANT EXECUTE ON FUNCTION check_institution_file_size_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION log_file_download(UUID, UUID, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_institution_file_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_institution_files(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_files() TO authenticated;

-- RLS (Row Level Security) - KAPALI
-- Sadece authentication kontrolü yapılır, RLS politikaları yok

-- ============================================
-- KURULUM TAMAMLANDI!
-- ============================================
