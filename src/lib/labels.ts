import type { Language, Region } from '../types'

export const regionSi: Record<Region, string> = {
  Western: 'බස්නාහිර',
  Central: 'මධ්‍යම',
  Southern: 'දකුණු',
  Northern: 'උතුරු',
  Eastern: 'නැගෙනහිර',
  'North Western': 'වයඹ',
  'North Central': 'උතුරු මැද',
  Uva: 'ඌව',
  Sabaragamuwa: 'සබරගමුව',
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
