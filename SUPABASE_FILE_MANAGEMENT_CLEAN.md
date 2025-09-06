# Supabase File Management - Temiz Kurulum

Bu dosyalar Supabase'deki dosya yönetimi sistemini temizlemek ve yeniden kurmak için hazırlanmıştır.

## 📁 Dosyalar

### 1. `supabase_cleanup.sql`

**Amaç:** Mevcut gereksiz tabloları ve fonksiyonları temizler

- Tüm dosya yönetimi tablolarını siler
- Gereksiz fonksiyonları ve view'ları temizler
- Sadece `institutions` ve `profiles` tablolarını korur

### 2. `supabase_file_management_final.sql`

**Amaç:** Temiz ve optimize edilmiş dosya yönetimi sistemini kurar

- Kurum bazında dosya saklama
- 10MB tek dosya limiti
- 100MB kurum toplam limiti
- Performanslı indexler
- İstatistik view'ları

## 🚀 Kurulum Adımları

### Adım 1: Temizlik

```sql
-- Supabase SQL Editor'da çalıştır:
-- supabase_cleanup.sql dosyasının içeriğini kopyala-yapıştır
```

### Adım 2: Yeni Sistem Kurulumu

```sql
-- Supabase SQL Editor'da çalıştır:
-- supabase_file_management_final.sql dosyasının içeriğini kopyala-yapıştır
```

## ✅ Sistem Özellikleri

### Tablolar

- **`saved_files`**: Ana dosya tablosu
- **`file_download_logs`**: İndirme logları (opsiyonel)

### Fonksiyonlar

- **`check_institution_file_size_limit()`**: Dosya boyutu kontrolü (dinamik limit)
- **`update_updated_at_column()`**: Otomatik tarih güncelleme
- **`log_file_download()`**: İndirme loglama
- **`get_institution_file_stats()`**: Kurum istatistikleri
- **`search_institution_files()`**: Dosya arama
- **`cleanup_old_files()`**: Eski dosya temizleme
- **`update_institution_storage_limit()`**: Storage limit güncelleme (SuperAdmin için)

### View'lar

- **`file_stats`**: Kurum bazında istatistikler
- **`file_type_stats`**: Dosya türü bazında istatistikler
- **`institution_storage_stats`**: SuperAdmin için storage istatistikleri

## 🔧 Kullanım

### Dosya Kaydetme

```sql
INSERT INTO saved_files (user_id, institution_id, name, type, description, file_data, file_size)
VALUES (
    'user-uuid',
    'institution-uuid',
    'Turnuva Dosyası',
    'tournaments',
    '2024 turnuva verileri',
    '{"tournaments": [...]}',
    1024
);
```

### Dosya Arama

```sql
SELECT * FROM search_institution_files(
    'institution-uuid',
    'turnuva',  -- arama terimi
    'tournaments',  -- dosya türü
    50,  -- limit
    0    -- offset
);
```

### İstatistik Alma

```sql
SELECT * FROM get_institution_file_stats('institution-uuid');
```

### SuperAdmin - Storage Limit Güncelleme

```sql
-- Kurumun storage limitini güncelle (MB cinsinden)
SELECT update_institution_storage_limit('institution-uuid', 500); -- 500MB
```

### SuperAdmin - Storage İstatistikleri

```sql
-- Tüm kurumların storage istatistiklerini görüntüle
SELECT * FROM institution_storage_stats;
```

## 🛡️ Güvenlik

- RLS (Row Level Security) kapalı
- Sadece authentication kontrolü
- Kurum bazında izolasyon
- Dosya boyutu limitleri

## 📊 Limitler

- **Tek dosya**: 10MB (sabit)
- **Kurum toplam**: Dinamik (SuperAdmin tarafından ayarlanabilir)
  - Default: 100MB
  - Min: 1MB
  - Max: 10GB
- **Desteklenen türler**: `players`, `tournaments`, `fixtures`

## 👑 SuperAdmin Özellikleri

### Storage Yönetimi

- ✅ Tüm kurumların storage kullanımını görüntüleme
- ✅ Kurum bazında storage limiti güncelleme
- ✅ Kullanım yüzdesi takibi
- ✅ Dosya sayısı ve kullanıcı sayısı istatistikleri
- ✅ Son yükleme tarihi takibi

### Kullanım

1. SuperAdmin paneline giriş yapın
2. "Storage Yönetimi" sekmesine tıklayın
3. Kurum listesinde "Limit Güncelle" butonuna tıklayın
4. Yeni limit değerini girin (MB cinsinden)
5. "Güncelle" butonuna tıklayın

## 🧹 Bakım

### Eski Dosyaları Temizleme

```sql
SELECT cleanup_old_files(); -- 1 yıldan eski dosyaları siler
```

### İstatistik Kontrolü

```sql
SELECT * FROM file_stats;
SELECT * FROM file_type_stats;
```

## ⚠️ Önemli Notlar

1. **Backup alın**: Temizlik öncesi verilerinizi yedekleyin
2. **Test edin**: Önce test ortamında deneyin
3. **Sıralı çalıştırın**: Önce cleanup, sonra kurulum
4. **İzinleri kontrol edin**: Kurulum sonrası izinleri doğrulayın

## 🔄 Güncelleme

Sistem güncellemesi için:

1. `supabase_cleanup.sql` çalıştır
2. `supabase_file_management_final.sql` çalıştır
3. İzinleri kontrol et

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2024  
**Versiyon:** 1.0 (Final)
