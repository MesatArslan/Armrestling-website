# Manuel Kullanıcı Oluşturma Rehberi

Bu rehber, Supabase Dashboard üzerinden manuel olarak kullanıcı oluşturma adımlarını açıklar.

## 🔧 1. Super Admin Oluşturma (Zaten yapıldı)

Super Admin zaten var, sadece giriş yapabildiğinizden emin olun.

## 🏢 2. Kurum (Admin) Oluşturma

### Adım 1: Auth Kullanıcısı Oluşturma

1. Supabase Dashboard > **Authentication** > **Users**'a gidin
2. **"Add user"** butonuna tıklayın
3. Formu doldurun:
   - **Email**: `admin@example.com`
   - **Password**: `123456` (güçlü bir şifre)
   - **Auto Confirm User**: ✅ İşaretleyin
4. **"Create user"** butonuna tıklayın
5. Oluşturulan kullanıcının **User UID**'sini kopyalayın

### Adım 2: Institution Kaydı Oluşturma

1. **SQL Editor**'a gidin
2. Şu SQL'i çalıştırın (USER_ID'yi değiştirin):

```sql
-- Institution oluştur
INSERT INTO institutions (email, name, user_quota, users_created, subscription_end_date, created_by)
VALUES (
  'admin@example.com',
  'Örnek Kurum',
  50,
  0,
  '2025-12-31 23:59:59',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
);

-- Profile'ı güncelle
UPDATE profiles
SET
  role = 'admin',
  institution_id = (SELECT id FROM institutions WHERE email = 'admin@example.com')
WHERE id = 'USER_ID_BURAYA_YAZILIN';
```

## 👤 3. Kullanıcı (User) Oluşturma

### Adım 1: Auth Kullanıcısı Oluşturma

1. Supabase Dashboard > **Authentication** > **Users**'a gidin
2. **"Add user"** butonuna tıklayın
3. Formu doldurun:
   - **Email**: `user@example.com`
   - **Password**: `123456`
   - **Auto Confirm User**: ✅ İşaretleyin
4. **"Create user"** butonuna tıklayın
5. Oluşturulan kullanıcının **User UID**'sini kopyalayın

### Adım 2: Profile Güncelleme

1. **SQL Editor**'a gidin
2. Şu SQL'i çalıştırın:

```sql
-- User profile'ını güncelle
UPDATE profiles
SET
  username = 'Test Kullanıcı',
  role = 'user',
  institution_id = (SELECT id FROM institutions WHERE email = 'admin@example.com')
WHERE id = 'USER_ID_BURAYA_YAZILIN';

-- Institution'daki kullanıcı sayısını güncelle
UPDATE institutions
SET users_created = users_created + 1
WHERE email = 'admin@example.com';
```

## 🧪 4. Test Etme

### Super Admin Testi

- URL: `http://localhost:5173/login?super=true`
- Email: Super admin email'iniz
- Şifre: Super admin şifreniz

### Admin Testi

- URL: `http://localhost:5173/login`
- "Kurum Girişi" seçin
- Email: `admin@example.com`
- Şifre: `123456`

### User Testi

- URL: `http://localhost:5173/login`
- "Kullanıcı Girişi" seçin
- Email: `user@example.com`
- Şifre: `123456`

## 🔍 5. Sorun Giderme

### Profil Bulunamadı Hatası

```sql
-- Tüm profilleri kontrol edin
SELECT * FROM profiles;

-- Eksik profil varsa oluşturun
INSERT INTO profiles (id, email, role)
VALUES ('USER_ID', 'email@example.com', 'user');
```

### Institution Bulunamadı Hatası

```sql
-- Tüm kurumları kontrol edin
SELECT * FROM institutions;
```

### RLS Hatası

```sql
-- Politikaları kontrol edin
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

Bu adımları takip ederek manuel olarak kullanıcı oluşturabilirsiniz. Daha sonra programatik kullanıcı oluşturma için Supabase Edge Functions veya backend API kullanabilirsiniz.
