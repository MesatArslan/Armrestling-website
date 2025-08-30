# Rol Sistemi Kurulum Rehberi

Bu dokümanda, Super Admin, Kurum (Admin) ve Kullanıcı (User) rol sisteminin nasıl kurulacağı adım adım açıklanmaktadır.

## 1. Supabase Database Kurulumu

### 1.1 Database Schema Oluşturma

1. Supabase Dashboard'a gidin
2. SQL Editor'ı açın
3. `supabase-schema.sql` dosyasının içeriğini kopyalayıp çalıştırın

Bu işlem şunları oluşturacak:

- `institutions` tablosu (Kurumlar)
- `profiles` tablosu (Kullanıcı profilleri)
- Gerekli trigger'lar ve RLS politikaları

### 1.2 İlk Super Admin Kullanıcısını Oluşturma

1. Supabase Dashboard > Authentication > Users'a gidin
2. "Add user" butonuna tıklayın
3. Super Admin'in email ve şifresini girin
4. Kullanıcı oluşturulduktan sonra, kullanıcının ID'sini kopyalayın
5. SQL Editor'da şu komutu çalıştırın:

```sql
-- YOUR_SUPER_ADMIN_USER_ID kısmını gerçek ID ile değiştirin
UPDATE profiles
SET role = 'super_admin'
WHERE id = 'YOUR_SUPER_ADMIN_USER_ID';
```

## 2. Environment Variables

`.env` dosyanızda şu değişkenlerin tanımlı olduğundan emin olun:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Uygulama Kullanımı

### 3.1 Super Admin Girişi

- URL: `http://localhost:5173/login?super=true`
- Super Admin email ve şifresi ile giriş yapın
- `/superadmin` paneline yönlendirileceksiniz

### 3.2 Kurum (Admin) Oluşturma

Super Admin panelinde:

1. "Yeni Kurum Ekle" butonuna tıklayın
2. Formu doldurun:
   - Kurum Adı
   - Email (Admin'in giriş email'i)
   - Şifre
   - Kullanıcı Kotası
   - Üyelik Bitiş Tarihi
3. "Kurum Oluştur" butonuna tıklayın

### 3.3 Kurum (Admin) Girişi

- URL: `http://localhost:5173/login`
- "Kurum Girişi" butonunu seçin
- Kurum email ve şifresi ile giriş yapın
- `/admin` paneline yönlendirileceksiniz

### 3.4 Kullanıcı Oluşturma

Admin panelinde:

1. "Yeni Kullanıcı Ekle" butonuna tıklayın
2. Formu doldurun:
   - Kullanıcı Adı
   - Email
   - Şifre
3. "Kullanıcı Oluştur" butonuna tıklayın

### 3.5 Kullanıcı Girişi

- URL: `http://localhost:5173/login`
- "Kullanıcı Girişi" butonunu seçin
- Kullanıcı email ve şifresi ile giriş yapın
- Ana uygulamaya (`/`) yönlendirileceksiniz

## 4. Route Yapısı

```
/login                  - Login sayfası (rol seçimi)
/login?super=true       - Super Admin girişi (gizli)
/superadmin            - Super Admin paneli
/admin                 - Kurum Admin paneli
/                      - Ana uygulama (sadece user'lar)
/players               - Oyuncular sayfası (sadece user'lar)
/tournaments           - Turnuvalar sayfası (sadece user'lar)
/matches               - Maçlar sayfası (sadece user'lar)
/scoring               - Skorlama sayfası (sadece user'lar)
```

## 5. Rol Yetkileri

### Super Admin

- Tüm kurumları görüntüleme
- Yeni kurum oluşturma
- Kurum kullanıcılarını görüntüleme
- Sistem istatistiklerini görüntüleme

### Admin (Kurum)

- Kendi kurumu için kullanıcı oluşturma
- Kota limitine kadar kullanıcı ekleme
- Oluşturduğu kullanıcıları görüntüleme
- Kurum istatistiklerini görüntüleme

### User (Kullanıcı)

- Ana uygulamayı kullanma
- Sadece kendi verilerine erişim

## 6. Önemli Notlar

### Güvenlik

- Signup (kayıt) işlevi tamamen kapatılmıştır
- Tüm kullanıcılar yukarıdan aşağıya oluşturulur
- RLS politikaları ile veri erişimi kısıtlanmıştır

### Kota Sistemi

- Her kurumun belirlenen kullanıcı kotası vardır
- Kota dolduğunda yeni kullanıcı oluşturulamaz
- Kullanıcı sayacı otomatik güncellenir

### Abonelik Sistemi

- Her kurumun üyelik bitiş tarihi vardır
- Süre dolduğunda yeni kullanıcı oluşturulamaz
- Sistem otomatik uyarı verir

## 7. Hata Giderme

### Profil bulunamadı hatası

- Kullanıcının `profiles` tablosunda kaydı var mı kontrol edin
- Trigger'ların çalışıp çalışmadığını kontrol edin

### RLS hatası

- Politikaların doğru tanımlandığından emin olun
- Kullanıcının doğru role sahip olduğunu kontrol edin

### Kota aşımı

- Institution tablosundaki `user_quota` ve `users_created` değerlerini kontrol edin
- Trigger'ların doğru çalıştığından emin olun

## 8. Geliştirme Notları

### Yeni Özellik Ekleme

- Yeni route eklerken `RouteGuard` kullanmayı unutmayın
- API işlemleri için `AuthService` sınıfını kullanın
- Type safety için TypeScript tiplerini güncelleyin

### Database Değişiklikleri

- Schema değişiklikleri için migration'lar oluşturun
- RLS politikalarını güncelleyin
- Trigger'ları test edin

Bu kurulum rehberi ile rol sisteminiz hazır hale gelecektir. Herhangi bir sorunla karşılaştığınızda, loglara bakın ve Supabase Dashboard'daki verileri kontrol edin.
