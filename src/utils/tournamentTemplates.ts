import { v4 as uuidv4 } from 'uuid';
import type { WeightRange } from '../storage/schemas';

export interface TournamentTemplate {
  id: string;
  nameKey: string; // Çeviri anahtarı
  descriptionKey: string; // Çeviri anahtarı
  ageCategory: string;
  weightRanges: WeightRange[];
  genderFilter?: 'male' | 'female' | null;
  handPreferenceFilter?: 'left' | 'right' | null;
  birthYearMin?: number | null;
  birthYearMax?: number | null;
}

// Mevcut yılı dinamik olarak al
const getCurrentYear = () => new Date().getFullYear();

// Yaş kategorilerine göre doğum yıllarını hesapla
const calculateBirthYears = (ageCategory: string) => {
  const currentYear = getCurrentYear();
  
  switch (ageCategory) {
    case '15': // Yıldızlar (13-15 yaş)
      return {
        birthYearMin: currentYear - 15, // 15 yaş
        birthYearMax: currentYear - 13  // 13 yaş
      };
    case '18': // Gençler (16-18 yaş)
      return {
        birthYearMin: currentYear - 18, // 18 yaş
        birthYearMax: currentYear - 16  // 16 yaş
      };
    case '23': // Ümitler (19-23 yaş)
      return {
        birthYearMin: currentYear - 23, // 23 yaş
        birthYearMax: currentYear - 19  // 19 yaş
      };
    case 'senior': // Büyükler (24+ yaş)
      return {
        birthYearMin: null,
        birthYearMax: currentYear - 24  // 24 yaş ve üzeri
      };
    case 'master': // Master (40+ yaş)
      return {
        birthYearMin: null,
        birthYearMax: currentYear - 40  // 40 yaş ve üzeri
      };
    default:
      return { birthYearMin: null, birthYearMax: null };
  }
};

export const TOURNAMENT_TEMPLATES: TournamentTemplate[] = [
  // 15 yaş aralığı
  {
    id: '15-male',
    nameKey: 'tournaments.yildizlarErkekler',
    descriptionKey: 'tournaments.yildizlarDescription',
    ageCategory: '15',
    genderFilter: 'male',
    weightRanges: [
      { id: '15-male-45', name: '45 kg', min: 0, max: 45 },
      { id: '15-male-50', name: '50 kg', min: 45.01, max: 50 },
      { id: '15-male-55', name: '55 kg', min: 50.01, max: 55 },
      { id: '15-male-60', name: '60 kg', min: 55.01, max: 60 },
      { id: '15-male-65', name: '65 kg', min: 60.01, max: 65 },
      { id: '15-male-70', name: '70 kg', min: 65.01, max: 70 },
      { id: '15-male-70plus', name: '70+ kg', min: 70.01, max: 999 },
    ],
    ...calculateBirthYears('15'),
  },
  {
    id: '15-female',
    nameKey: 'tournaments.yildizlarKizlar',
    descriptionKey: 'tournaments.yildizlarKizlarDescription',
    ageCategory: '15',
    genderFilter: 'female',
    weightRanges: [
      { id: '15-female-40', name: '40 kg', min: 0, max: 40 },
      { id: '15-female-45', name: '45 kg', min: 40.01, max: 45 },
      { id: '15-female-50', name: '50 kg', min: 45.01, max: 50 },
      { id: '15-female-55', name: '55 kg', min: 50.01, max: 55 },
      { id: '15-female-60', name: '60 kg', min: 55.01, max: 60 },
      { id: '15-female-70', name: '70 kg', min: 60.01, max: 70 },
      { id: '15-female-70plus', name: '70+ kg', min: 70.01, max: 999 },
    ],
    ...calculateBirthYears('15'),
  },

  // 18 yaş aralığı
  {
    id: '18-male',
    nameKey: 'tournaments.genclerErkekler',
    descriptionKey: 'tournaments.genclerDescription',
    ageCategory: '18',
    genderFilter: 'male',
    weightRanges: [
      { id: '18-male-50', name: '50 kg', min: 0, max: 50 },
      { id: '18-male-55', name: '55 kg', min: 50.01, max: 55 },
      { id: '18-male-60', name: '60 kg', min: 55.01, max: 60 },
      { id: '18-male-65', name: '65 kg', min: 60.01, max: 65 },
      { id: '18-male-70', name: '70 kg', min: 65.01, max: 70 },
      { id: '18-male-75', name: '75 kg', min: 70.01, max: 75 },
      { id: '18-male-80', name: '80 kg', min: 75.01, max: 80 },
      { id: '18-male-90', name: '90 kg', min: 80.01, max: 90 },
      { id: '18-male-90plus', name: '90+ kg', min: 90.01, max: 999 },
    ],
    ...calculateBirthYears('18'),
  },
  {
    id: '18-female',
    nameKey: 'tournaments.genclerKizlar',
    descriptionKey: 'tournaments.genclerKizlarDescription',
    ageCategory: '18',
    genderFilter: 'female',
    weightRanges: [
      { id: '18-female-45', name: '45 kg', min: 0, max: 45 },
      { id: '18-female-50', name: '50 kg', min: 45.01, max: 50 },
      { id: '18-female-55', name: '55 kg', min: 50.01, max: 55 },
      { id: '18-female-60', name: '60 kg', min: 55.01, max: 60 },
      { id: '18-female-65', name: '65 kg', min: 60.01, max: 65 },
      { id: '18-female-70', name: '70 kg', min: 65.01, max: 70 },
      { id: '18-female-70plus', name: '70+ kg', min: 70.01, max: 999 },
    ],
    ...calculateBirthYears('18'),
  },

  // 23 yaş aralığı
  {
    id: '23-male',
    nameKey: 'tournaments.gencBuyuklerErkekler',
    descriptionKey: 'tournaments.gencBuyuklerDescription',
    ageCategory: '23',
    genderFilter: 'male',
    weightRanges: [
      { id: '23-male-55', name: '55 kg', min: 0, max: 55 },
      { id: '23-male-60', name: '60 kg', min: 55.01, max: 60 },
      { id: '23-male-65', name: '65 kg', min: 60.01, max: 65 },
      { id: '23-male-70', name: '70 kg', min: 65.01, max: 70 },
      { id: '23-male-75', name: '75 kg', min: 70.01, max: 75 },
      { id: '23-male-80', name: '80 kg', min: 75.01, max: 80 },
      { id: '23-male-85', name: '85 kg', min: 80.01, max: 85 },
      { id: '23-male-90', name: '90 kg', min: 85.01, max: 90 },
      { id: '23-male-100', name: '100 kg', min: 90.01, max: 100 },
      { id: '23-male-110', name: '110 kg', min: 100.01, max: 110 },
      { id: '23-male-110plus', name: '110+ kg', min: 110.01, max: 999 },
    ],
    ...calculateBirthYears('23'),
  },
  {
    id: '23-female',
    nameKey: 'tournaments.gencBuyuklerKizlar',
    descriptionKey: 'tournaments.gencBuyuklerKizlarDescription',
    ageCategory: '23',
    genderFilter: 'female',
    weightRanges: [
      { id: '23-female-50', name: '50 kg', min: 0, max: 50 },
      { id: '23-female-55', name: '55 kg', min: 50.01, max: 55 },
      { id: '23-female-60', name: '60 kg', min: 55.01, max: 60 },
      { id: '23-female-65', name: '65 kg', min: 60.01, max: 65 },
      { id: '23-female-70', name: '70 kg', min: 65.01, max: 70 },
      { id: '23-female-80', name: '80 kg', min: 70.01, max: 80 },
      { id: '23-female-90', name: '90 kg', min: 80.01, max: 90 },
      { id: '23-female-90plus', name: '90+ kg', min: 90.01, max: 999 },
    ],
    ...calculateBirthYears('23'),
  },

  // Büyükler
  {
    id: 'senior-male',
    nameKey: 'tournaments.buyuklerErkekler',
    descriptionKey: 'tournaments.buyuklerDescription',
    ageCategory: 'senior',
    genderFilter: 'male',
    weightRanges: [
      { id: 'senior-male-55', name: '55 kg', min: 0, max: 55 },
      { id: 'senior-male-60', name: '60 kg', min: 55.01, max: 60 },
      { id: 'senior-male-65', name: '65 kg', min: 60.01, max: 65 },
      { id: 'senior-male-70', name: '70 kg', min: 65.01, max: 70 },
      { id: 'senior-male-75', name: '75 kg', min: 70.01, max: 75 },
      { id: 'senior-male-80', name: '80 kg', min: 75.01, max: 80 },
      { id: 'senior-male-85', name: '85 kg', min: 80.01, max: 85 },
      { id: 'senior-male-90', name: '90 kg', min: 85.01, max: 90 },
      { id: 'senior-male-100', name: '100 kg', min: 90.01, max: 100 },
      { id: 'senior-male-110', name: '110 kg', min: 100.01, max: 110 },
      { id: 'senior-male-110plus', name: '110+ kg', min: 110.01, max: 999 },
    ],
    ...calculateBirthYears('senior'),
  },
  {
    id: 'senior-female',
    nameKey: 'tournaments.buyuklerKizlar',
    descriptionKey: 'tournaments.buyuklerKizlarDescription',
    ageCategory: 'senior',
    genderFilter: 'female',
    weightRanges: [
      { id: 'senior-female-50', name: '50 kg', min: 0, max: 50 },
      { id: 'senior-female-55', name: '55 kg', min: 50.01, max: 55 },
      { id: 'senior-female-60', name: '60 kg', min: 55.01, max: 60 },
      { id: 'senior-female-65', name: '65 kg', min: 60.01, max: 65 },
      { id: 'senior-female-70', name: '70 kg', min: 65.01, max: 70 },
      { id: 'senior-female-80', name: '80 kg', min: 70.01, max: 80 },
      { id: 'senior-female-90', name: '90 kg', min: 80.01, max: 90 },
      { id: 'senior-female-90plus', name: '90+ kg', min: 90.01, max: 999 },
    ],
    ...calculateBirthYears('senior'),
  },

  // Master
  {
    id: 'master-male',
    nameKey: 'tournaments.masterErkekler',
    descriptionKey: 'tournaments.masterDescription',
    ageCategory: 'master',
    genderFilter: 'male',
    weightRanges: [
      { id: 'master-male-60', name: '60 kg', min: 0, max: 60 },
      { id: 'master-male-70', name: '70 kg', min: 60.01, max: 70 },
      { id: 'master-male-80', name: '80 kg', min: 70.01, max: 80 },
      { id: 'master-male-90', name: '90 kg', min: 80.01, max: 90 },
      { id: 'master-male-100', name: '100 kg', min: 90.01, max: 100 },
      { id: 'master-male-100plus', name: '100+ kg', min: 100.01, max: 999 },
    ],
    ...calculateBirthYears('master'),
  },
  {
    id: 'master-female',
    nameKey: 'tournaments.masterKizlar',
    descriptionKey: 'tournaments.masterKizlarDescription',
    ageCategory: 'master',
    genderFilter: 'female',
    weightRanges: [
      { id: 'master-female-60', name: '60 kg', min: 0, max: 60 },
      { id: 'master-female-70', name: '70 kg', min: 60.01, max: 70 },
      { id: 'master-female-80', name: '80 kg', min: 70.01, max: 80 },
      { id: 'master-female-80plus', name: '80+ kg', min: 80.01, max: 999 },
    ],
    ...calculateBirthYears('master'),
  },
];

export const getTemplatesByCategory = () => {
  const categories = {
    '15': TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === '15'),
    '18': TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === '18'),
    '23': TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === '23'),
    'senior': TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === 'senior'),
    'master': TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === 'master'),
  };
  return categories;
};

export const getTemplateById = (id: string): TournamentTemplate | undefined => {
  return TOURNAMENT_TEMPLATES.find(template => template.id === id);
};

export const createTournamentFromTemplate = (template: TournamentTemplate, customName?: string) => {
  return {
    id: uuidv4(),
    name: customName || template.nameKey, // nameKey kullanıyoruz
    weightRanges: template.weightRanges.map(range => ({
      ...range,
      id: uuidv4(), // Her turnuva için yeni ID'ler
      excludedPlayerIds: [],
    })),
    isExpanded: false,
    genderFilter: template.genderFilter,
    handPreferenceFilter: template.handPreferenceFilter,
    birthYearMin: template.birthYearMin,
    birthYearMax: template.birthYearMax,
  };
};
