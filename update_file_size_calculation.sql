-- ============================================
-- FILE SIZE CALCULATION FIX
-- ============================================
-- This updates the save_file_optimized function to accept pre-calculated file size
-- to ensure consistency between displayed size and downloaded file size

CREATE OR REPLACE FUNCTION save_file_optimized(
  p_name TEXT,
  p_type TEXT,
  p_file_data JSONB,
  p_description TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_institution_id UUID;
  v_file_id UUID;
  v_file_size INTEGER;
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

  -- Dosya boyutunu kullan (eğer verilmişse) veya hesapla
  IF p_file_size IS NOT NULL THEN
    v_file_size := p_file_size;
  ELSE
    v_file_size := octet_length(p_file_data::text);
  END IF;

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
