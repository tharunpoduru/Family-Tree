/**
 * English-only pack. There is no native script, so kinship badges show
 * the engine's precise English gloss alone ("elder brother's son",
 * "mother's brother") — still finer-grained than everyday English.
 * The lunar-calendar and tradition fields stay available (they matter to
 * many families regardless of UI language) with standard Sanskrit
 * transliterations; families who don't use them simply leave the fields
 * empty and they never render.
 */
import type { LanguagePack } from './types';

export const english: LanguagePack = {
  id: 'english',

  calendar: {
    months: {
      chaitra: { en: 'Chaitra' },
      vaishakha: { en: 'Vaishakha' },
      jyeshtha: { en: 'Jyeshtha' },
      ashadha: { en: 'Ashadha' },
      shravana: { en: 'Shravana' },
      bhadrapada: { en: 'Bhadrapada' },
      ashwayuja: { en: 'Ashwayuja' },
      kartika: { en: 'Kartika' },
      margashira: { en: 'Margashira' },
      pushya: { en: 'Pushya' },
      magha: { en: 'Magha' },
      phalguna: { en: 'Phalguna' },
    },
    tithis: {
      pratipada: 'Pratipada',
      dwitiya: 'Dwitiya',
      tritiya: 'Tritiya',
      chaturthi: 'Chaturthi',
      panchami: 'Panchami',
      shashthi: 'Shashthi',
      saptami: 'Saptami',
      ashtami: 'Ashtami',
      navami: 'Navami',
      dashami: 'Dashami',
      ekadashi: 'Ekadashi',
      dwadashi: 'Dwadashi',
      trayodashi: 'Trayodashi',
      chaturdashi: 'Chaturdashi',
      purnima: 'Purnima',
      amavasya: 'Amavasya',
    },
    paksha: { shukla: 'Shukla', krishna: 'Krishna' },
    labels: { masa: 'Māsa', paksha: 'Paksha', tithi: 'Tithi' },
  },

  tradition: {
    gotraLabel: 'Gotra',
    nakshatraLabel: 'Nakshatra',
    nakshatras: [
      { en: 'Ashwini' },
      { en: 'Bharani' },
      { en: 'Krittika' },
      { en: 'Rohini' },
      { en: 'Mrigashira' },
      { en: 'Ardra' },
      { en: 'Punarvasu' },
      { en: 'Pushya' },
      { en: 'Ashlesha' },
      { en: 'Magha' },
      { en: 'Purva Phalguni' },
      { en: 'Uttara Phalguni' },
      { en: 'Hasta' },
      { en: 'Chitra' },
      { en: 'Swati' },
      { en: 'Vishakha' },
      { en: 'Anuradha' },
      { en: 'Jyeshtha' },
      { en: 'Mula' },
      { en: 'Purva Ashadha' },
      { en: 'Uttara Ashadha' },
      { en: 'Shravana' },
      { en: 'Dhanishta' },
      { en: 'Shatabhisha' },
      { en: 'Purva Bhadrapada' },
      { en: 'Uttara Bhadrapada' },
      { en: 'Revati' },
    ],
    gotras: [
      { en: 'Agastya' },
      { en: 'Angirasa' },
      { en: 'Atreya' },
      { en: 'Bharadwaja' },
      { en: 'Gautama' },
      { en: 'Harita' },
      { en: 'Jamadagni' },
      { en: 'Kashyapa' },
      { en: 'Kaushika' },
      { en: 'Kaundinya' },
      { en: 'Krishnatreya' },
      { en: 'Kutsa' },
      { en: 'Maudgalya' },
      { en: 'Parashara' },
      { en: 'Shalankayana' },
      { en: 'Sankriti' },
      { en: 'Shandilya' },
      { en: 'Srivatsa' },
      { en: 'Upamanyu' },
      { en: 'Vadhula' },
      { en: 'Vasishtha' },
      { en: 'Vishnuvriddha' },
      { en: 'Vishwamitra' },
    ],
  },

  ui: {
    maidenHint:
      'The family, or house, they were born into — if it changed at marriage.',
  },
};
