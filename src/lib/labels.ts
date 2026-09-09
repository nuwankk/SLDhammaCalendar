import type { District, Language } from '../types'

export const districtSi: Record<District, string> = {
  Ampara: 'අම්පාර',
  Anuradhapura: 'අනුරාධපුරය',
  Badulla: 'බදුල්ල',
  Batticaloa: 'මඩකලපුව',
  Colombo: 'කොළඹ',
  Galle: 'ගාල්ල',
  Gampaha: 'ගම්පහ',
  Hambantota: 'හම්බන්තොට',
  Jaffna: 'යාපනය',
  Kalutara: 'කළුතර',
  Kandy: 'මහනුවර',
  Kegalle: 'කෑගල්ල',
  Kilinochchi: 'කිලිනොච්චි',
  Kurunegala: 'කුරුණෑගල',
  Mannar: 'මන්නාරම',
  Matale: 'මාතලේ',
  Matara: 'මාතර',
  Monaragala: 'මොණරාගල',
  Mullaitivu: 'මුලතිව්',
  'Nuwara Eliya': 'නුවරඑළිය',
  Polonnaruwa: 'පොළොන්නරුව',
  Puttalam: 'පුත්තලම',
  Ratnapura: 'රත්නපුර',
  Trincomalee: 'ත්‍රිකුණාමලය',
  Vavuniya: 'වවුනියාව',
}

export const languageSi: Record<Language, string> = {
  Sinhala: 'සිංහල',
  English: 'ඉංග්‍රීසි',
  Tamil: 'දෙමළ',
  Pali: 'පාලි',
  Mixed: 'මිශ්‍ර',
}

const citySi: Record<string, string> = {
  Colombo: 'කොළඹ',
  Kadawatha: 'කඩවත',
  Negombo: 'මීගමුව',
  Kalutara: 'කළුතර',
  Kelaniya: 'කැළණිය',
  Kandy: 'මහනුවර',
  Matale: 'මාතලේ',
  'Nuwara Eliya': 'නුවරඑළිය',
  Galle: 'ගාල්ල',
  Matara: 'මාතර',
  Hambantota: 'හම්බන්තොට',
  Jaffna: 'යාපනය',
  Anuradhapura: 'අනුරාධපුරය',
  Polonnaruwa: 'පොළොන්නරුව',
  Trincomalee: 'ත්‍රිකුණාමලය',
  Batticaloa: 'මඩකලපුව',
  Kurunegala: 'කුරුණෑගල',
  Ratnapura: 'රත්නපුර',
  Kegalle: 'කෑගල්ල',
  Badulla: 'බදුල්ල',
  Dambulla: 'දඹුල්ල',
  Meetirigala: 'මීතිරිගල',
  Mihintale: 'මිහින්තලේ',
  Unawatuna: 'උණවටුන',
  Tissamaharama: 'තිස්සමහාරාමය',
  Kataragama: 'කතරගම',
  Nainativu: 'නයිනතීවු',
  Serunuwara: 'සේරුනුවර',
  Mahiyanganaya: 'මහියංගනය',
  Ridigama: 'රිදීගම',
  Dodanduwa: 'දොඩන්දූව',
}

export function cityNameSi(city: string) {
  return citySi[city] ?? city
}

export function speakerNameSi(speaker: string) {
  if (speaker === 'Resident Sangha') return 'ආවාසික සංඝයා'
  if (speaker === 'Guest sermon') return 'ආගන්තුක දේශනාව'
  return speaker
}
