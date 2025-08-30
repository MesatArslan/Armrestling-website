# Supabase Authentication Kurulum Rehberi

## Hata: "TypeError: Failed to fetch"

Bu hata genellikle şu sebeplerden kaynaklanır:

### 1. Environment Variables Kontrolü

Terminalden kontrol edin:

```bash
cat .env
```

Doğru format:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Supabase Proje Ayarları

#### A. Authentication Ayarları

1. Supabase dashboard → Authentication → Settings
2. "Enable email confirmations" seçeneğini **KAPATIN** (test için)
3. "Site URL" kısmına `http://localhost:5173` ekleyin

#### B. URL Konfigürasyonu

1. Project Settings → API
2. Project URL'yi kopyalayın: `https://yourproject.supabase.co`
3. Anon key'i kopyalayın

### 3. Test Adımları

1. `.env` dosyasını güncelleyin
2. Dev server'ı yeniden başlatın: `npm run dev`
3. Browser console'u açın (F12)
4. "Giriş Yap" butonuna tıklayın
5. Console'da debug mesajlarını kontrol edin

### 4. Debug Console Mesajları

Şunları görmelisiniz:

```
Supabase URL: https://yourproject.supabase.co
Supabase Key exists: true
Attempting sign in with: test@example.com
```

### 5. Yaygın Sorunlar

- **URL yanlış**: `.com` yerine `.co` kullanın
- **Key yanlış**: Anon key'i public key ile karıştırmayın
- **CORS**: Site URL'lerini doğru ayarlayın
- **Email confirmation**: Test için kapatın

### 6. Test Kullanıcısı Oluşturma

Manuel test için:

1. Supabase dashboard → Authentication → Users
2. "Add user" → Email/password girin
3. "Auto confirm" seçeneğini işaretleyin

## Sorun Devam Ederse

1. Browser cache'i temizleyin (Ctrl+Shift+R)
2. Network tabından Supabase request'lerini kontrol edin
3. Supabase projekt status'unu kontrol edin
