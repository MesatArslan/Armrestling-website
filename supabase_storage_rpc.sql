-- Storage bilgilerini ve dosya listesini tek çağrıda getiren RPC fonksiyonu
CREATE OR REPLACE FUNCTION get_user_storage_info()
RETURNS TABLE (
  institution_id UUID,
  storage_limit BIGINT,
  institution_storage_limit BIGINT,
  used_space BIGINT,
  file_count INTEGER,
  files JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Mevcut kullanıcı ID'sini al
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı';
  END IF;

  RETURN QUERY
  WITH user_profile AS (
    SELECT 
      p.institution_id as user_institution_id,
      p.storage_limit::BIGINT,
      COALESCE(i.storage_limit, 104857600)::BIGINT as institution_storage_limit
    FROM profiles p
    LEFT JOIN institutions i ON p.institution_id = i.id
    WHERE p.id = current_user_id
  ),
  file_stats AS (
    SELECT 
      COALESCE(SUM(sf.file_size), 0)::BIGINT as total_size,
      COUNT(*)::INTEGER as total_count,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', sf.id,
            'name', sf.name,
            'type', sf.type,
            'description', sf.description,
            'file_size', sf.file_size,
            'created_at', sf.created_at,
            'updated_at', sf.updated_at,
            'user_id', sf.user_id,
            'institution_id', sf.institution_id
          ) ORDER BY sf.created_at DESC
        ) FILTER (WHERE sf.id IS NOT NULL),
        '[]'::jsonb
      ) as files_json
    FROM saved_files sf
    WHERE (
      CASE 
        WHEN (SELECT user_institution_id FROM user_profile) IS NOT NULL 
        THEN sf.institution_id = (SELECT user_institution_id FROM user_profile)
        ELSE sf.user_id = current_user_id AND sf.institution_id IS NULL
      END
    )
  )
  SELECT 
    up.user_institution_id as institution_id,
    up.storage_limit,
    up.institution_storage_limit,
    fs.total_size as used_space,
    fs.total_count as file_count,
    fs.files_json as files
  FROM user_profile up
  CROSS JOIN file_stats fs;
END;
$$;

-- Fonksiyon için gerekli izinleri ver
GRANT EXECUTE ON FUNCTION get_user_storage_info() TO authenticated;
