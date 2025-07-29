# Types Klasörü

Bu klasör, projenin tamamında kullanılan ortak type tanımlarını içerir.

## Dosyalar

### `index.ts`

Ana types dosyasıdır ve aşağıdaki interface'leri içerir:

#### Player

Sporcu bilgilerini tutan temel interface:

```typescript
interface Player {
  id: string;
  name: string;
  surname: string;
  weight: number;
  gender: "male" | "female";
  handPreference: "left" | "right" | "both";
  birthday?: string;
  city?: string;
}
```

#### Tournament

Turnuva bilgilerini tutan interface:

```typescript
interface Tournament {
  id: string;
  name: string;
  date: string;
  players: Player[];
  type: "single" | "double";
}
```

#### Match

Maç bilgilerini tutan interface:

```typescript
interface Match {
  id: string;
  player1?: Player;
  player2?: Player;
  winner?: Player;
  round: number;
  bracket: "winner" | "loser";
}
```

#### DoubleEliminationProps

Double elimination bileşenleri için props interface:

```typescript
interface DoubleEliminationProps {
  players: Player[];
  onMatchResult: (type: string, winnerId: string, loserId?: string) => void;
}
```

#### Diğer Yardımcı Interface'ler

- `PlayerFilters` - Oyuncu filtreleme için
- `EditingCell` - Hücre düzenleme için
- `Column` - Tablo sütunları için

## Kullanım

Bu types'ları kullanmak için:

```typescript
import type { Player, Tournament, Match } from "../types";
```

## Faydaları

1. **Kod Tekrarını Önler**: Player interface artık 15+ dosyada tekrarlanmıyor
2. **Tip Güvenliği**: Merkezi tanım ile tutarlılık sağlanıyor
3. **Bakım Kolaylığı**: Bir değişiklik tüm projeye yansıyor
4. **Okunabilirlik**: Types merkezi bir yerde toplandı
