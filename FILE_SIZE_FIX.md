# Dosya Boyutu Hesaplama Düzeltmesi

## Problem

Dosya yükleme sırasında gösterilen boyut ile indirilen dosyanın gerçek boyutu arasında fark vardı.

## Kök Neden

1. **Veritabanı RPC fonksiyonu**: PostgreSQL'in `octet_length(p_file_data::text)` fonksiyonu kullanıyordu
2. **JavaScript istemci**: `JSON.stringify(data, null, 2)` ile pretty-printed JSON kullanıyordu
3. **İndirme işlemi**: `JSON.stringify(file.file_data, null, 2)` ile pretty-printed JSON kullanıyordu

PostgreSQL'in JSONB'yi text'e çevirirken pretty-printing kullanmaması, JavaScript'in ise kullanması nedeniyle farklı boyutlar hesaplanıyordu.

## Çözüm

1. **Tutarlı hesaplama**: Tüm boyut hesaplamaları JavaScript tarafında yapılıyor
2. **Aynı formatlama**: Hem kaydetme hem indirme işlemleri aynı `JSON.stringify(data, null, 2)` formatını kullanıyor
3. **İstemci tarafı kontrol**: Dosya boyutu limiti istemci tarafında kontrol ediliyor

## Değişiklikler

### 1. SupabaseFileManagerService.ts

- `formatFileSize()` metodu güncellendi
- `saveFile()` metoduna istemci tarafı boyut hesaplama eklendi
- `updateFile()` metoduna tutarlı boyut hesaplama eklendi

### 2. update_file_size_calculation.sql

- `save_file_optimized` RPC fonksiyonu güncellendi
- Artık önceden hesaplanmış dosya boyutunu kabul ediyor

## Kurulum

1. `update_file_size_calculation.sql` dosyasını Supabase SQL Editor'da çalıştırın
2. Uygulamayı yeniden başlatın

## Sonuç

Artık dosya yükleme sırasında gösterilen boyut ile indirilen dosyanın boyutu tamamen aynı olacak.
