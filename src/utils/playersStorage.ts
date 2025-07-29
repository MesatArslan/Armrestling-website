// Players localStorage utility
// Bu dosya players ile ilgili tüm localStorage işlemlerini merkezi olarak yönetir

import type { Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface Column {
  id: string;
  name: string;
  visible: boolean;
}

export interface ExtendedPlayer extends Player {
  [key: string]: any;
}

export const defaultColumns: Column[] = [
  { id: 'name', name: 'Name', visible: true },
  { id: 'surname', name: 'Surname', visible: true },
  { id: 'weight', name: 'Weight', visible: true },
  { id: 'gender', name: 'Gender', visible: true },
  { id: 'handPreference', name: 'Hand Preference', visible: true },
  { id: 'birthday', name: 'Birthday', visible: true },
];

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const PlayersStorage = {
  // Players listesi
  savePlayers: (players: ExtendedPlayer[]) => {
    if (!isLocalStorageAvailable()) {
      console.error('localStorage is not available');
      return;
    }
    
    try {
      const jsonString = JSON.stringify(players);
      localStorage.setItem('arm-wrestling-players', jsonString);
      
      // Verify the save
    } catch (error) {
      console.error('Error saving players to localStorage:', error);
    }
  },

  getPlayers: (): ExtendedPlayer[] => {
    if (!isLocalStorageAvailable()) {
      console.error('localStorage is not available');
      return [];
    }
    
    try {
      const saved = localStorage.getItem('arm-wrestling-players');
      const result = saved ? JSON.parse(saved) : [];
      return result;
    } catch (error) {
      console.error('Error loading players from localStorage:', error);
      return [];
    }
  },

  clearPlayers: () => {
    if (!isLocalStorageAvailable()) {
      console.error('localStorage is not available');
      return;
    }
    localStorage.removeItem('arm-wrestling-players');
  },

  // Columns listesi
  saveColumns: (columns: Column[]) => {
    try {
      localStorage.setItem('arm-wrestling-columns', JSON.stringify(columns));
    } catch (error) {
      console.error('Error saving columns to localStorage:', error);
    }
  },

  getColumns: (): Column[] => {
    try {
      const saved = localStorage.getItem('arm-wrestling-columns');
      return saved ? JSON.parse(saved) : defaultColumns;
    } catch (error) {
      console.error('Error loading columns from localStorage:', error);
      return defaultColumns;
    }
  },

  clearColumns: () => {
    localStorage.removeItem('arm-wrestling-columns');
  },

  // Tüm players verilerini temizle
  clearAllPlayersData: () => {
    localStorage.removeItem('arm-wrestling-players');
    localStorage.removeItem('arm-wrestling-columns');
  },

  // Player ekle
  addPlayer: (players: ExtendedPlayer[], newPlayer: ExtendedPlayer): ExtendedPlayer[] => {
    return [...players, newPlayer];
  },

  // Player güncelle
  updatePlayer: (players: ExtendedPlayer[], updatedPlayer: ExtendedPlayer): ExtendedPlayer[] => {
    return players.map(player => 
      player.id === updatedPlayer.id ? updatedPlayer : player
    );
  },

  // Player sil
  deletePlayer: (players: ExtendedPlayer[], playerId: string): ExtendedPlayer[] => {
    return players.filter(player => player.id !== playerId);
  },

  // Player'ları toplu güncelle
  updatePlayers: (newPlayers: ExtendedPlayer[]): ExtendedPlayer[] => {
    return newPlayers;
  },

  // Column ekle
  addColumn: (columns: Column[], newColumn: Column): Column[] => {
    return [...columns, newColumn];
  },

  // Column güncelle
  updateColumn: (columns: Column[], updatedColumn: Column): Column[] => {
    return columns.map(column => 
      column.id === updatedColumn.id ? updatedColumn : column
    );
  },

  // Column sil
  deleteColumn: (columns: Column[], columnId: string): Column[] => {
    return columns.filter(column => column.id !== columnId);
  },

  // Column'ları toplu güncelle
  updateColumns: (newColumns: Column[]): Column[] => {
    return newColumns;
  },

  // Player'ları JSON olarak export et
  exportPlayersToJSON: (players: ExtendedPlayer[]): void => {
    try {
      const dataStr = JSON.stringify(players, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'players.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting players to JSON:', error);
    }
  },

  // Player'ları JSON'dan import et
  importPlayersFromJSON: (jsonData: string, currentPlayers: ExtendedPlayer[]): ExtendedPlayer[] => {
    try {
      const json = JSON.parse(jsonData);
      if (!Array.isArray(json)) {
        throw new Error('Geçersiz JSON formatı. Lütfen bu uygulamadan dışa aktardığınız dosyayı yükleyin.');
      }
      
      // Basit doğrulama: id, name, surname, weight, gender, handPreference zorunlu
      const valid = json.every((p: any) => p.id && p.name && p.surname && typeof p.weight === 'number' && p.gender && p.handPreference);
      if (!valid) {
        throw new Error('Bazı oyuncu kayıtları eksik veya hatalı. Lütfen orijinal dosyayı yükleyin.');
      }
      
      // Mevcut oyuncularla birleştir: aynı id varsa güncelle, yoksa ekle
      const playerMap = new Map(currentPlayers.map(p => [p.id, p]));
      json.forEach((p: any) => {
        playerMap.set(p.id, { ...playerMap.get(p.id), ...p });
      });
      
      const merged = Array.from(playerMap.values());
      return merged;
    } catch (error) {
      console.error('Error importing players from JSON:', error);
      throw error;
    }
  },

  // Test player'ları oluştur
  createTestPlayers: (): ExtendedPlayer[] => {
    const names = [
      'Ahmet', 'Mehmet', 'Ali', 'Hasan', 'Hüseyin', 'Mustafa', 'İbrahim', 'Ömer', 
      'Yusuf', 'Murat', 'Emre', 'Can', 'Burak', 'Serkan', 'Tolga', 'Deniz', 
      'Kemal', 'Cem', 'Onur', 'Erkan', 'Fatih', 'Serdar', 'Volkan', 'Mert',
      'Kaan', 'Eren', 'Berk', 'Arda', 'Emir', 'Kaan', 'Ege', 'Doruk'
    ];
    const surnames = [
      'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Özkan',
      'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Erdoğan',
      'Koç', 'Kurt', 'Özkan', 'Şen', 'Ergin', 'Güneş', 'Yalçın', 'Tekin',
      'Bilgin', 'Aksoy', 'Korkmaz', 'Özer', 'Yavuz', 'Polat', 'Taş', 'Kara'
    ];
    const cities = [
      'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
      'Kayseri', 'Mersin', 'Diyarbakır', 'Samsun', 'Denizli', 'Eskişehir', 'Trabzon',
      'Erzurum', 'Van', 'Batman', 'Elazığ', 'Sivas', 'Malatya', 'Kırıkkale'
    ];
    
    const generateRandomBirthday = () => {
      const start = new Date(1990, 0, 1);
      const end = new Date(2005, 11, 31);
      const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return randomDate.toISOString().split('T')[0];
    };
    

    
    return [
      {
        id: uuidv4(),
        name: names[Math.floor(Math.random() * names.length)],
        surname: surnames[Math.floor(Math.random() * surnames.length)],
        weight: Math.round((Math.random() * 40 + 60) * 10) / 10,
        gender: 'male',
        handPreference: 'left',
        birthday: generateRandomBirthday(),
        city: cities[Math.floor(Math.random() * cities.length)]
      },
      {
        id: uuidv4(),
        name: names[Math.floor(Math.random() * names.length)],
        surname: surnames[Math.floor(Math.random() * surnames.length)],
        weight: Math.round((Math.random() * 40 + 60) * 10) / 10,
        gender: 'male',
        handPreference: 'right',
        birthday: generateRandomBirthday(),
        city: cities[Math.floor(Math.random() * cities.length)]
      },
      {
        id: uuidv4(),
        name: names[Math.floor(Math.random() * names.length)],
        surname: surnames[Math.floor(Math.random() * surnames.length)],
        weight: Math.round((Math.random() * 40 + 60) * 10) / 10,
        gender: 'male',
        handPreference: 'both',
        birthday: generateRandomBirthday(),
        city: cities[Math.floor(Math.random() * cities.length)]
      },
      {
        id: uuidv4(),
        name: names[Math.floor(Math.random() * names.length)],
        surname: surnames[Math.floor(Math.random() * surnames.length)],
        weight: Math.round((Math.random() * 40 + 60) * 10) / 10,
        gender: 'male',
        handPreference: 'left',
        birthday: generateRandomBirthday(),
        city: cities[Math.floor(Math.random() * cities.length)]
      },
      {
        id: uuidv4(),
        name: names[Math.floor(Math.random() * names.length)],
        surname: surnames[Math.floor(Math.random() * surnames.length)],
        weight: Math.round((Math.random() * 40 + 60) * 10) / 10,
        gender: 'male',
        handPreference: 'right',
        birthday: generateRandomBirthday(),
        city: cities[Math.floor(Math.random() * cities.length)]
      }
    ];
  }
}; 