-- ============================================
-- SUPABASE CLEANUP SCRIPT
-- ============================================
-- Bu script Supabase'deki gereksiz tabloları ve fonksiyonları temizler
-- SADECE institutions ve profiles tablolarını korur

-- ============================================
-- 1. TÜM DOSYA YÖNETİMİ TABLOLARINI TEMİZLE
-- ============================================

-- Trigger'ları sil
DROP TRIGGER IF EXISTS check_file_size_limit_trigger ON saved_files CASCADE;
DROP TRIGGER IF EXISTS check_file_size_trigger ON saved_files CASCADE;
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
-- 2. DİĞER GEREKSİZ TABLOLARI TEMİZLE
-- ============================================

-- Eğer başka gereksiz tablolar varsa buraya ekleyebilirsiniz
-- Örnek:
-- DROP TABLE IF EXISTS unnecessary_table CASCADE;

-- ============================================
-- 3. TEMİZLİK TAMAMLANDI!
-- ============================================

-- Artık sadece şu tablolar kalmalı:
-- ✅ auth.users (Supabase'in kendi tablosu)
-- ✅ institutions (bizim ana tablomuz)
-- ✅ profiles (kullanıcı profilleri)

-- Sonraki adım: supabase_file_management_final.sql dosyasını çalıştırarak
-- yeni temiz dosya yönetimi sistemini kurmak
