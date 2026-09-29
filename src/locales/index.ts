import { en } from './en';
import { ha } from './ha';
import { yo } from './yo';
import { ig } from './ig';

export type Language = 'en' | 'ha' | 'yo' | 'ig';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'yo', name: 'Yorùbá', nativeName: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
];

export const translations: Record<Language, typeof en> = {
  en,
  ha: ha as unknown as typeof en,
  yo: yo as unknown as typeof en,
  ig: ig as unknown as typeof en,
};
