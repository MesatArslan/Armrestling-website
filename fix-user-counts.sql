-- Mevcut kurumların kullanıcı sayılarını düzelt (sadece 'user' rolündeki kullanıcıları say)
-- Bu scripti Supabase Dashboard > SQL Editor'da çalıştırın

-- Önce mevcut durumu kontrol et
SELECT 
    i.name,
    i.users_created as current_count,
    COUNT(p.id) as actual_user_count
FROM institutions i
LEFT JOIN profiles p ON i.id = p.institution_id AND p.role = 'user'
GROUP BY i.id, i.name, i.users_created;

-- Kullanıcı sayılarını düzelt
UPDATE institutions 
SET users_created = (
    SELECT COUNT(*) 
    FROM profiles 
    WHERE institution_id = institutions.id 
    AND role = 'user'
),
updated_at = NOW();

-- Düzeltme sonrası durumu kontrol et
SELECT 
    i.name,
    i.users_created as corrected_count,
    COUNT(p.id) as actual_user_count
FROM institutions i
LEFT JOIN profiles p ON i.id = p.institution_id AND p.role = 'user'
GROUP BY i.id, i.name, i.users_created;
