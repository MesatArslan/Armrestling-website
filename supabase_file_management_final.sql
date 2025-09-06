-- ============================================
-- ARM RESTLING WEBSITE - FILE MANAGEMENT SYSTEM
-- ============================================
-- Temiz ve optimize edilmiş dosya yönetimi sistemi
-- Kurum bazında dosya saklama ve yönetim

-- ============================================
-- 1. MEVCUT SİSTEMİ TEMİZLE (EĞER VARSA)
-- ============================================

-- Trigger'ları sil
DROP TRIGGER IF EXISTS check_file_size_limit_trigger ON saved_files CASCADE;
DROP TRIGGER IF EXISTS update_saved_files_updated_at ON saved_files CASCADE;

-- Fonksiyonları sil
DROP FUNCTION IF EXISTS check_file_size_limit() CASCADE;
DROP FUNCTION IF EXISTS check_institution_file_size_limit() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS log_file_download(UUID, UUID, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_file_download(UUID, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_file_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_institution_file_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS search_files(TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS search_institution_files(UUID, TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_files() CASCADE;
DROP FUNCTION IF EXISTS update_institution_storage_limit(UUID, INTEGER) CASCADE;

-- View'ları sil
DROP VIEW IF EXISTS file_stats CASCADE;
DROP VIEW IF EXISTS file_type_stats CASCADE;
DROP VIEW IF EXISTS institution_storage_stats CASCADE;
DROP VIEW IF EXISTS institution_file_type_stats CASCADE;
DROP VIEW IF EXISTS institution_user_file_stats CASCADE;

-- Tabloları sil (CASCADE ile ilişkili index'ler de silinir)
DROP TABLE IF EXISTS file_download_logs CASCADE;
DROP TABLE IF EXISTS saved_files CASCADE;

-- ============================================
-- 2. YENİ DOSYA YÖNETİMİ SİSTEMİ
-- ============================================

-- Institutions tablosuna storage_limit kolonu ekle (eğer yoksa)
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS storage_limit INTEGER DEFAULT 104857600; -- 100MB default

-- Mevcut kurumlar için default değer ata
UPDATE institutions 
SET storage_limit = 104857600 
WHERE storage_limit IS NULL;

-- Profiles tablosuna storage_limit kolonu ekle (kurumu olmayan kullanıcılar için)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS storage_limit INTEGER DEFAULT 10485760; -- 10MB default (bireysel kullanıcılar için daha az)

-- Mevcut profiller için default değer ata
UPDATE profiles 
SET storage_limit = 10485760 
WHERE storage_limit IS NULL;

-- Ana dosyalar tablosu
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

-- Dosya indirme logları tablosu (opsiyonel - analytics için)
CREATE TABLE file_download_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES saved_files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- ============================================
-- 3. PERFORMANS İÇİN İNDEXLER
-- ============================================

-- Ana tablo indexleri
CREATE INDEX idx_saved_files_institution_id ON saved_files(institution_id);
CREATE INDEX idx_saved_files_user_id ON saved_files(user_id);
CREATE INDEX idx_saved_files_type ON saved_files(type);
CREATE INDEX idx_saved_files_created_at ON saved_files(created_at DESC);
CREATE INDEX idx_saved_files_institution_user ON saved_files(institution_id, user_id);

-- Log tablosu indexleri
CREATE INDEX idx_file_download_logs_file_id ON file_download_logs(file_id);
CREATE INDEX idx_file_download_logs_user_id ON file_download_logs(user_id);
CREATE INDEX idx_file_download_logs_downloaded_at ON file_download_logs(downloaded_at DESC);

-- ============================================
-- 4. TRIGGER'LAR VE FONKSİYONLAR
-- ============================================

-- Updated_at otomatik güncelleme fonksiyonu
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER update_saved_files_updated_at
    BEFORE UPDATE ON saved_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Dosya boyutu kontrolü fonksiyonu (kurum ve bireysel kullanıcılar için - dinamik limit)
CREATE FUNCTION check_institution_file_size_limit()
RETURNS TRIGGER AS $$
DECLARE
    max_file_size INTEGER := 10485760; -- 10MB tek dosya limiti
    total_size INTEGER;
    user_limit INTEGER;
    institution_limit INTEGER;
BEGIN
    -- Tek dosya boyutu kontrolü
    IF NEW.file_size > max_file_size THEN
        RAISE EXCEPTION 'Dosya boyutu çok büyük. Maksimum % MB olabilir.', max_file_size / 1048576;
    END IF;
    
    -- Kurumlu kullanıcılar için kurum limitini kontrol et
    IF NEW.institution_id IS NOT NULL THEN
        -- Kurumun storage limitini al
        SELECT storage_limit INTO institution_limit
        FROM institutions 
        WHERE id = NEW.institution_id;
        
        -- Kurumun toplam dosya boyutu kontrolü
        SELECT COALESCE(SUM(file_size), 0) INTO total_size
        FROM saved_files 
        WHERE institution_id = NEW.institution_id;
        
        -- Dinamik limit kontrolü
        IF total_size + NEW.file_size > institution_limit THEN
            RAISE EXCEPTION 'Kurumun toplam dosya boyutu limitini aştınız. Maksimum % MB olabilir.', institution_limit / 1048576;
        END IF;
    ELSE
        -- Kurumu olmayan kullanıcılar için bireysel limit kontrolü
        SELECT storage_limit INTO user_limit
        FROM profiles 
        WHERE id = NEW.user_id;
        
        -- Kullanıcının toplam dosya boyutu kontrolü
        SELECT COALESCE(SUM(file_size), 0) INTO total_size
        FROM saved_files 
        WHERE user_id = NEW.user_id AND institution_id IS NULL;
        
        -- Dinamik limit kontrolü
        IF total_size + NEW.file_size > user_limit THEN
            RAISE EXCEPTION 'Kişisel dosya boyutu limitini aştınız. Maksimum % MB olabilir.', user_limit / 1048576;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dosya boyutu kontrolü trigger
CREATE TRIGGER check_file_size_limit_trigger
    BEFORE INSERT OR UPDATE ON saved_files
    FOR EACH ROW
    EXECUTE FUNCTION check_institution_file_size_limit();

-- ============================================
-- 5. YARDIMCI FONKSİYONLAR
-- ============================================

-- Dosya indirme loglama fonksiyonu
CREATE FUNCTION log_file_download(
    file_uuid UUID,
    user_uuid UUID,
    ip_addr INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO file_download_logs (file_id, user_id, ip_address, user_agent)
    VALUES (file_uuid, user_uuid, ip_addr, user_agent);
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

-- Dosya temizleme fonksiyonu (eski dosyaları temizlemek için)
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

-- Storage limit güncelleme fonksiyonu (SuperAdmin için - Kurumlar)
CREATE FUNCTION update_institution_storage_limit(
    institution_uuid UUID,
    new_limit_mb INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Limit kontrolü (1MB - 10GB arası)
    IF new_limit_mb < 1 OR new_limit_mb > 10240 THEN
        RAISE EXCEPTION 'Storage limiti 1 MB ile 10 GB arasında olmalıdır.';
    END IF;
    
    -- Kurumun storage limitini güncelle
    UPDATE institutions 
    SET storage_limit = new_limit_mb * 1048576 -- MB'yi byte'a çevir
    WHERE id = institution_uuid;
    
    -- Kurum bulunamadıysa hata ver
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kurum bulunamadı.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Storage limit güncelleme fonksiyonu (SuperAdmin için - Bireysel Kullanıcılar)
CREATE FUNCTION update_user_storage_limit(
    user_uuid UUID,
    new_limit_mb INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Limit kontrolü (1MB - 1GB arası - bireysel kullanıcılar için daha az)
    IF new_limit_mb < 1 OR new_limit_mb > 1024 THEN
        RAISE EXCEPTION 'Bireysel storage limiti 1 MB ile 1 GB arasında olmalıdır.';
    END IF;
    
    -- Kullanıcının storage limitini güncelle
    UPDATE profiles 
    SET storage_limit = new_limit_mb * 1048576 -- MB'yi byte'a çevir
    WHERE id = user_uuid;
    
    -- Kullanıcı bulunamadıysa hata ver
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kullanıcı bulunamadı.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. İSTATİSTİK VIEW'LARI
-- ============================================

-- Kurum bazında dosya istatistikleri
CREATE VIEW file_stats AS
SELECT 
    sf.institution_id,
    COUNT(*) as total_files,
    SUM(sf.file_size) as total_size,
    COUNT(DISTINCT sf.user_id) as unique_users,
    MAX(sf.created_at) as last_upload
FROM saved_files sf
GROUP BY sf.institution_id;

-- Dosya türü bazında istatistikler
CREATE VIEW file_type_stats AS
SELECT 
    sf.institution_id,
    sf.type,
    COUNT(*) as file_count,
    SUM(sf.file_size) as total_size
FROM saved_files sf
GROUP BY sf.institution_id, sf.type;

-- Kurum storage istatistikleri (SuperAdmin için)
CREATE VIEW institution_storage_stats AS
SELECT 
    i.id,
    i.name,
    i.email,
    i.storage_limit,
    COALESCE(COUNT(sf.id), 0) as file_count,
    COALESCE(SUM(sf.file_size), 0) as used_space,
    COUNT(DISTINCT sf.user_id) as unique_users,
    MAX(sf.created_at) as last_upload,
    CASE 
        WHEN COUNT(sf.id) = 0 THEN 0
        ELSE ROUND((COALESCE(SUM(sf.file_size), 0) / GREATEST(i.storage_limit, 1)) * 100)
    END as usage_percentage
FROM institutions i
LEFT JOIN saved_files sf ON i.id = sf.institution_id
GROUP BY i.id, i.name, i.email, i.storage_limit
ORDER BY used_space DESC;

-- Bireysel kullanıcı storage istatistikleri (SuperAdmin için)
CREATE VIEW user_storage_stats AS
SELECT 
    p.id,
    p.email,
    p.storage_limit,
    COALESCE(COUNT(sf.id), 0) as file_count,
    COALESCE(SUM(sf.file_size), 0) as used_space,
    MAX(sf.created_at) as last_upload,
    CASE 
        WHEN COUNT(sf.id) = 0 THEN 0
        ELSE ROUND((COALESCE(SUM(sf.file_size), 0) / GREATEST(p.storage_limit, 1)) * 100)
    END as usage_percentage
FROM profiles p
LEFT JOIN saved_files sf ON p.id = sf.user_id AND sf.institution_id IS NULL
WHERE p.institution_id IS NULL -- Sadece kurumu olmayan kullanıcılar
GROUP BY p.id, p.email, p.storage_limit
ORDER BY used_space DESC;

-- ============================================
-- 7. İZİNLER VE GÜVENLİK
-- ============================================

-- Tablo izinleri
GRANT ALL ON saved_files TO authenticated;
GRANT ALL ON file_download_logs TO authenticated;
GRANT ALL ON file_stats TO authenticated;
GRANT ALL ON file_type_stats TO authenticated;
GRANT ALL ON institution_storage_stats TO authenticated;
GRANT ALL ON user_storage_stats TO authenticated;

-- Fonksiyon izinleri
GRANT EXECUTE ON FUNCTION check_institution_file_size_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION log_file_download(UUID, UUID, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_institution_file_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_institution_files(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_files() TO authenticated;
GRANT EXECUTE ON FUNCTION update_institution_storage_limit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_storage_limit(UUID, INTEGER) TO authenticated;

-- RLS (Row Level Security) - KAPALI
-- Sadece authentication kontrolü yapılır, RLS politikaları yok
-- Bu daha basit ve performanslı bir yaklaşım

-- ============================================
-- 8. OPTIMIZED FILE SAVE FUNCTION
-- ============================================

-- Tek çağrıda dosya kaydetme fonksiyonu (3 isteği tek isteğe indirger)
CREATE OR REPLACE FUNCTION save_file_optimized(
  p_name TEXT,
  p_type TEXT,
  p_file_data JSONB,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_institution_id UUID;
  v_file_size INTEGER;
  v_file_id UUID;
  v_result JSONB;
BEGIN
  -- Kullanıcı oturumu kontrolü
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kullanıcı oturumu bulunamadı'
    );
  END IF;

  -- Kullanıcının kurum bilgisini al
  SELECT institution_id INTO v_institution_id
  FROM profiles
  WHERE id = v_user_id;

  -- Dosya boyutunu hesapla
  v_file_size := octet_length(p_file_data::text);

  -- Dosya limitlerini kontrol et
  IF v_file_size > 10485760 THEN -- 10MB
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Dosya boyutu 10MB limitini aşıyor'
    );
  END IF;

  -- Kurum toplam limitini kontrol et
  IF v_institution_id IS NOT NULL THEN
    -- Kurum limiti kontrolü
    IF EXISTS (
      SELECT 1 FROM institution_storage_stats 
      WHERE id = v_institution_id 
      AND used_space + v_file_size > storage_limit
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Kurum storage limiti aşıldı'
      );
    END IF;
  ELSE
    -- Bireysel kullanıcı limiti kontrolü
    IF EXISTS (
      SELECT 1 FROM user_storage_stats 
      WHERE id = v_user_id 
      AND used_space + v_file_size > storage_limit
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Storage limiti aşıldı'
      );
    END IF;
  END IF;

  -- Dosyayı kaydet
  INSERT INTO saved_files (
    user_id,
    institution_id,
    name,
    type,
    description,
    file_data,
    file_size
  ) VALUES (
    v_user_id,
    v_institution_id,
    p_name,
    p_type,
    p_description,
    p_file_data,
    v_file_size
  ) RETURNING id INTO v_file_id;

  -- Başarılı sonuç döndür
  RETURN jsonb_build_object(
    'success', true,
    'fileId', v_file_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Dosya kaydedilemedi: ' || SQLERRM
    );
END;
$$;

-- ============================================
-- 9. KURULUM TAMAMLANDI!
-- ============================================

-- Bu SQL dosyasını Supabase SQL Editor'da çalıştırarak
-- temiz ve optimize edilmiş dosya yönetimi sistemini kurabilirsiniz.

-- Özellikler:
-- ✅ Kurum bazında dosya saklama
-- ✅ 10MB tek dosya limiti
-- ✅ 100MB kurum toplam limiti
-- ✅ Dosya türü kontrolü (players, tournaments, fixtures)
-- ✅ Otomatik updated_at güncelleme
-- ✅ Dosya indirme logları
-- ✅ Performanslı indexler
-- ✅ İstatistik view'ları
-- ✅ Temizleme fonksiyonları
