# Abonelik Güvenlik Sistemi Kurulumu

Bu doküman, kullanıcıların süreleri bittiğinde sistemi kullanmaya devam edememesi için gerekli güvenlik önlemlerinin kurulumunu açıklar.

## 🚨 Sorun

Kullanıcılar abonelik süreleri bittiğinde de sistemi kullanmaya devam edebiliyorlardı. Bu güvenlik açığı şu nedenlerden kaynaklanıyordu:

1. **Session doğrulama yetersizliği**: Sadece token geçerliliği kontrol ediliyordu
2. **Abonelik kontrolü eksikliği**: API endpoint'lerinde abonelik durumu kontrol edilmiyordu
3. **Frontend koruması yetersizliği**: RouteGuard'da abonelik kontrolü yoktu

## 🛠️ Çözüm

### 1. Veritabanı Fonksiyonları

#### A. Enhanced Session Validation

```sql
-- enhanced_session_validation.sql dosyasını çalıştırın
```

Bu dosya şu fonksiyonları oluşturur:

- `validate_user_session_with_subscription()`: Session doğrulama + abonelik kontrolü
- `check_user_subscription_status()`: Kullanıcı abonelik durumu kontrolü
- `cleanup_expired_sessions()`: Süresi dolmuş session'ları temizleme

#### B. Otomatik Temizlik

```sql
-- automatic_session_cleanup.sql dosyasını çalıştırın
```

Bu dosya süresi dolmuş session'ları otomatik olarak temizler.

### 2. Frontend Güncellemeleri

#### A. AuthService Güncellemesi

- `validateSession()` fonksiyonu abonelik kontrolü ile güçlendirildi
- `checkUserSubscriptionStatus()` fonksiyonu eklendi

#### B. AuthContext Güncellemesi

- Session kontrolünde abonelik durumu kontrol ediliyor
- Süresi dolmuş kullanıcılar otomatik olarak çıkış yapılıyor

#### C. RouteGuard Güncellemesi

- Her sayfa yüklemesinde abonelik durumu kontrol ediliyor
- Süresi dolmuş kullanıcılara özel uyarı sayfası gösteriliyor

#### D. Dosya İşlemleri Güvenliği

- `SupabaseFileManagerService`'e abonelik kontrolü eklendi
- Süresi dolmuş kullanıcılar dosya kaydedemiyor

## 📋 Kurulum Adımları

### 1. Veritabanı Güncellemeleri

```bash
# Supabase SQL Editor'da sırasıyla çalıştırın:

# 1. Enhanced session validation
enhanced_session_validation.sql

# 2. Otomatik temizlik
automatic_session_cleanup.sql
```

### 2. Frontend Güncellemeleri

Frontend dosyaları zaten güncellenmiştir:

- ✅ `src/services/authService.ts`
- ✅ `src/contexts/AuthContext.tsx`
- ✅ `src/components/auth/RouteGuard.tsx`
- ✅ `src/services/supabaseFileManagerService.ts`

### 3. Test Etme

#### A. Session Süresi Testi

```sql
-- Test için session süresini 20 saniyeye ayarlayın
UPDATE user_sessions
SET expires_at = NOW() + INTERVAL '20 seconds'
WHERE is_active = true;
```

#### B. Abonelik Süresi Testi

```sql
-- Test için kurum abonelik süresini geçmişe ayarlayın
UPDATE institutions
SET subscription_end_date = NOW() - INTERVAL '1 day'
WHERE id = 'your-institution-id';
```

## 🔒 Güvenlik Özellikleri

### 1. Çok Katmanlı Koruma

- **Session Seviyesi**: Her session kontrolünde abonelik durumu kontrol edilir (Super Admin hariç)
- **Route Seviyesi**: Her sayfa yüklemesinde abonelik kontrol edilir (Super Admin hariç)
- **API Seviyesi**: Her kritik işlemde abonelik kontrol edilir (Super Admin hariç)

### 2. Super Admin İstisnası

- **Super Admin**: Abonelik süresi kontrolünden muaf tutulur
- **Her Zaman Erişim**: Super admin her zaman sisteme erişebilir
- **Tüm İşlemler**: Dosya kaydetme, sayfa erişimi gibi tüm işlemlerde muaf

### 3. Otomatik Temizlik

- Süresi dolmuş session'lar otomatik olarak geçersiz kılınır (Super Admin hariç)
- Süresi dolmuş kullanıcıların session'ları temizlenir (Super Admin hariç)
- Süresi dolmuş kurumların kullanıcılarının session'ları temizlenir (Super Admin hariç)

### 4. Kullanıcı Deneyimi

- Süresi dolmuş kullanıcılara açık uyarı mesajları (Super Admin hariç)
- Otomatik çıkış yapma (Super Admin hariç)
- Ana sayfaya yönlendirme (Super Admin hariç)

## 📊 İzleme ve Raporlama

### Aktif Session'ları Kontrol Etme

```sql
SELECT
    us.user_id,
    p.username,
    p.role,
    i.name as institution_name,
    us.created_at,
    us.expires_at,
    EXTRACT(EPOCH FROM (us.expires_at - NOW()))/3600 as hours_remaining
FROM user_sessions us
JOIN profiles p ON us.user_id = p.id
LEFT JOIN institutions i ON p.institution_id = i.id
WHERE us.is_active = true
ORDER BY us.expires_at ASC;
```

### Süresi Dolmuş Kullanıcıları Kontrol Etme

```sql
SELECT
    p.username,
    p.email,
    p.role,
    i.name as institution_name,
    p.expiration_date,
    i.subscription_end_date
FROM profiles p
LEFT JOIN institutions i ON p.institution_id = i.id
WHERE
    (p.expiration_date IS NOT NULL AND p.expiration_date < NOW()) OR
    (i.subscription_end_date IS NOT NULL AND i.subscription_end_date < NOW())
ORDER BY p.expiration_date ASC, i.subscription_end_date ASC;
```

## ⚠️ Önemli Notlar

1. **Session Süresi**: Şu anda 5 saat olarak ayarlanmış, ihtiyaca göre değiştirilebilir
2. **Temizlik Sıklığı**: Otomatik temizlik fonksiyonu manuel olarak çalıştırılmalı veya cron job ile otomatikleştirilmeli
3. **Performans**: Abonelik kontrolü her session doğrulamasında yapıldığı için performans etkisi olabilir
4. **Test**: Üretim ortamına geçmeden önce test ortamında kapsamlı test yapın

## 🚀 Gelecek Geliştirmeler

1. **Otomatik Temizlik**: Cron job ile otomatik temizlik sistemi
2. **Cache**: Abonelik durumu için cache mekanizması
3. **Uyarı Sistemi**: Abonelik süresi dolmadan önce uyarı sistemi
4. **Analytics**: Abonelik durumu raporlama sistemi
