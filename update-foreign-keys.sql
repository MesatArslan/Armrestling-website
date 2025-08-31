-- Foreign Key Cascade Delete Güncellemesi
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Mevcut foreign key constraint'i kaldır
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_institution_id_fkey;

-- 2. Cascade delete ile yeni constraint ekle
ALTER TABLE profiles 
ADD CONSTRAINT profiles_institution_id_fkey 
FOREIGN KEY (institution_id) 
REFERENCES institutions(id) 
ON DELETE CASCADE;

-- 3. Test - constraint'leri kontrol et
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'profiles';
