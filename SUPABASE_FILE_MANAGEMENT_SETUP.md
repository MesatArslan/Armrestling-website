# Supabase Dosya Yönetimi Kurulumu

Bu doküman, armrestling uygulamasına Supabase tabanlı dosya yönetimi sisteminin nasıl kurulacağını açıklar.

## 🗄️ Supabase Kurulumu

### 1. SQL Dosyasını Çalıştırın

`supabase_file_management.sql` dosyasını Supabase SQL Editor'da çalıştırın. Bu dosya şunları oluşturur:

- `saved_files` tablosu
- RLS (Row Level Security) policy'leri
- Index'ler
- Trigger'lar
- Fonksiyonlar
- View'lar

### 2. Tablo Yapısı

```sql
saved_files (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  institution_id UUID REFERENCES institutions(id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('players', 'tournaments', 'fixtures')),
  description TEXT,
  file_data JSONB NOT NULL,
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 3. Policy'ler

- **RLS Devre Dışı**: Şu anda policy yok, tüm authenticated kullanıcılar tüm dosyalara erişebilir

## 🔧 Uygulama Entegrasyonu

### 1. Servis Değişikliği

`FileManagement.tsx` bileşeni artık `SupabaseFileManagerService` kullanıyor:

```typescript
import { SupabaseFileManagerService } from "../../services/supabaseFileManagerService";

const fileManager = new SupabaseFileManagerService();
```

### 2. Özellikler

- ✅ **Dosya Kaydetme**: JSON formatında Supabase'e kaydetme
- ✅ **Dosya Listeleme**: Kullanıcının dosyalarını listeleme
- ✅ **Dosya İndirme**: JSON dosyası olarak indirme
- ✅ **Dosya Silme**: Güvenli silme işlemi
- ✅ **Dosya Arama**: Ad ve açıklamaya göre arama
- ✅ **İstatistikler**: Dosya sayısı ve boyut bilgileri
- ✅ **Download Log**: İndirme geçmişi

### 3. Güvenlik

- **RLS Devre Dışı**: Şu anda policy yok, tüm authenticated kullanıcılar tüm dosyalara erişebilir
- **Dosya Boyutu Limiti**: 10MB tek dosya, 100MB toplam limit
- **Authentication**: Sadece giriş yapmış kullanıcılar erişebilir

## 📊 İstatistikler ve Raporlama

### Kullanıcı İstatistikleri

```typescript
const stats = await fileManager.getUserFileStats();
// {
//   total_files: 15,
//   total_size: 2048576,
//   files_by_type: { "players": 8, "tournaments": 5, "fixtures": 2 },
//   last_upload: "2024-01-15T10:30:00Z"
// }
```

### Kurum İstatistikleri

```typescript
const institutionStats = await fileManager.getInstitutionFileStats(
  institutionId
);
// {
//   total_files: 150,
//   total_size: 15728640,
//   files_by_type: { "players": 80, "tournaments": 50, "fixtures": 20 },
//   users_count: 25
// }
```

## 🔍 Arama ve Filtreleme

### Dosya Arama

```typescript
// Tüm dosyalarda arama
const results = await fileManager.searchFiles("turnuva");

// Belirli türde arama
const playerFiles = await fileManager.searchFiles("", "players");
```

### Tür Bazlı Listeleme

```typescript
const playerFiles = await fileManager.getFilesByType("players");
const tournamentFiles = await fileManager.getFilesByType("tournaments");
const fixtureFiles = await fileManager.getFilesByType("fixtures");
```

## 📁 Dosya Türleri

### 1. Oyuncular (Players)

- Mevcut oyuncu verilerini JSON olarak saklar
- Oyuncu bilgileri, ağırlık, kategori bilgileri

### 2. Turnuvalar (Tournaments)

- Turnuva yapılandırmalarını saklar
- Kategori tanımları, kurallar, ayarlar

### 3. Fixtürler (Fixtures)

- Maç fixtürlerini saklar
- Maç listesi, program, sonuçlar

## 🚀 Kullanım

### Dosya Kaydetme

1. Admin panelinde "Dosya Yönetimi"ne git
2. "Yeni Dosya Ekle" butonuna tıkla
3. Dosya türünü seç (Oyuncular/Turnuvalar/Fixtürler)
4. Mevcut verilerden birini seç
5. Dosya adı ve açıklama gir
6. "Dosyayı Kaydet" butonuna tıkla

### Dosya İndirme

1. Dosya listesinde "İndir" butonuna tıkla
2. JSON dosyası otomatik olarak indirilir
3. İndirme işlemi log'a kaydedilir

### Dosya Silme

1. Dosya listesinde "Sil" butonuna tıkla
2. Onay mesajını kabul et
3. Dosya kalıcı olarak silinir

## 🔧 Bakım

### Eski Dosyaları Temizleme

```sql
SELECT cleanup_old_files(); -- 1 yıldan eski dosyaları siler
```

### İstatistik Görüntüleme

```sql
-- Dosya türü istatistikleri
SELECT * FROM file_type_stats;

-- Kullanıcı dosya istatistikleri
SELECT * FROM file_stats WHERE user_id = 'user-uuid';
```

## 🛡️ Güvenlik Notları

1. **RLS Devre Dışı**: Şu anda policy yok, tüm authenticated kullanıcılar tüm dosyalara erişebilir
2. **Authentication**: Sadece giriş yapmış kullanıcılar erişebilir
3. **File Size Limits**: Dosya boyutu limitleri uygulanıyor
4. **Download Logging**: Tüm indirme işlemleri loglanıyor

## 📝 Notlar

- Dosyalar JSONB formatında saklanıyor (PostgreSQL'in native JSON desteği)
- Index'ler performans için optimize edilmiş
- Trigger'lar otomatik timestamp güncellemeleri sağlıyor
- View'lar istatistikler için optimize edilmiş sorgular sağlıyor

Bu sistem, uygulamanızda oluşturulan verileri güvenli bir şekilde saklamanızı ve yönetmenizi sağlar.
