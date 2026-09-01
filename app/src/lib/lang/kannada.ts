/**
 * Kannada language pack. Kannada shares the Dravidian kinship system
 * with Telugu — the same distinctions (elder/younger, paternal/maternal,
 * cross/parallel) hold; only the words change. Where Kannada usage
 * varies by region or community, the most widely understood term is
 * used. A native speaker's review before launch is always worthwhile —
 * see docs/LANGUAGES.md.
 */
import type { LanguagePack } from './types';

export const kannada: LanguagePack = {
  id: 'kannada',
  langTag: 'kn',
  languageName: 'Kannada',

  kinship: {
    you: 'ನೀವು',

    father: 'ಅಪ್ಪ',
    mother: 'ಅಮ್ಮ',
    son: 'ಮಗ',
    daughter: 'ಮಗಳು',
    childGeneric: 'ಮಗು',
    husband: 'ಗಂಡ',
    wife: 'ಹೆಂಡತಿ',
    stepFather: 'ಮಲತಂದೆ',
    stepMother: 'ಮಲತಾಯಿ',

    brotherElder: 'ಅಣ್ಣ',
    brotherYounger: 'ತಮ್ಮ',
    brotherGeneric: 'ಸಹೋದರ',
    sisterElder: 'ಅಕ್ಕ',
    sisterYounger: 'ತಂಗಿ',
    sisterGeneric: 'ಸಹೋದರಿ',
    siblingGeneric: 'ಒಡಹುಟ್ಟಿದವರು',

    // Genitive forms: composed as "ಅಣ್ಣನ ಮಗ" (elder brother's son).
    ofBrotherElder: 'ಅಣ್ಣನ',
    ofBrotherYounger: 'ತಮ್ಮನ',
    ofBrotherGeneric: 'ಸಹೋದರನ',
    ofSisterElder: 'ಅಕ್ಕನ',
    ofSisterYounger: 'ತಂಗಿಯ',
    ofSisterGeneric: 'ಸಹೋದರಿಯ',

    // Kannada splits male cross cousins by seniority, unlike Telugu.
    crossCousinMaleElder: 'ಭಾವ',
    crossCousinMaleYounger: 'ಮೈದುನ',
    crossCousinFemaleElder: 'ಅತ್ತಿಗೆ',
    crossCousinFemaleYounger: 'ನಾದಿನಿ',

    fatherElderBrother: 'ದೊಡ್ಡಪ್ಪ',
    fatherYoungerBrother: 'ಚಿಕ್ಕಪ್ಪ',
    fatherSister: 'ಸೋದರತ್ತೆ',
    motherBrother: 'ಸೋದರಮಾವ',
    motherElderSister: 'ದೊಡ್ಡಮ್ಮ',
    motherYoungerSister: 'ಚಿಕ್ಕಮ್ಮ',

    grandfather: 'ಅಜ್ಜ',
    // Kannada uses ಅಜ್ಜಿ for both sides; the gloss says which.
    grandmotherPaternal: 'ಅಜ್ಜಿ',
    grandmotherMaternal: 'ಅಜ್ಜಿ',
    greatGrandfather: 'ಮುತ್ತಜ್ಜ',
    greatGrandmother: 'ಮುತ್ತಜ್ಜಿ',
    grandparentGeneric: 'ಅಜ್ಜ-ಅಜ್ಜಿ',

    grandson: 'ಮೊಮ್ಮಗ',
    granddaughter: 'ಮೊಮ್ಮಗಳು',
    greatGrandson: 'ಮರಿಮಗ',
    greatGranddaughter: 'ಮರಿಮಗಳು',
    grandchildGeneric: 'ಮೊಮ್ಮಕ್ಕಳು',

    crossNephew: 'ಸೋದರಳಿಯ',
    crossNiece: 'ಸೋದರಸೊಸೆ',

    sonInLaw: 'ಅಳಿಯ',
    daughterInLaw: 'ಸೊಸೆ',

    siblingWifeElder: 'ಅತ್ತಿಗೆ',
    siblingWifeYounger: 'ನಾದಿನಿ',
    sisterHusbandElder: 'ಭಾವ',
    sisterHusbandYounger: 'ಮೈದುನ',

    nieceHusband: 'ಸೋದರಸೊಸೆಯ ಗಂಡ',
    nephewWife: 'ಸೋದರಳಿಯನ ಹೆಂಡತಿ',
    granddaughterHusband: 'ಮೊಮ್ಮಗಳ ಗಂಡ',
    grandsonWife: 'ಮೊಮ್ಮಗನ ಹೆಂಡತಿ',

    spouseFather: 'ಮಾವ',
    spouseMother: 'ಅತ್ತೆ',
    spouseBrotherElder: 'ಭಾವ',
    spouseBrotherYounger: 'ಮೈದುನ',
    spouseBrotherGeneric: 'ಭಾವಮೈದುನ',
    spouseSisterElder: 'ಅತ್ತಿಗೆ',
    spouseSisterYounger: 'ನಾದಿನಿ',
    spouseSisterGeneric: 'ನಾದಿನಿ',

    ancestor: 'ಪೂರ್ವಜರು',
    descendant: 'ವಂಶಸ್ಥರು',
    relative: 'ಬಂಧು',
    // ನೆಂಟ specifically connotes a relative by alliance/marriage.
    relativeByMarriage: 'ನೆಂಟ',
  },

  calendar: {
    months: {
      chaitra: { en: 'Chaitra', native: 'ಚೈತ್ರ' },
      vaishakha: { en: 'Vaishakha', native: 'ವೈಶಾಖ' },
      jyeshtha: { en: 'Jyeshtha', native: 'ಜ್ಯೇಷ್ಠ' },
      ashadha: { en: 'Ashadha', native: 'ಆಷಾಢ' },
      shravana: { en: 'Shravana', native: 'ಶ್ರಾವಣ' },
      bhadrapada: { en: 'Bhadrapada', native: 'ಭಾದ್ರಪದ' },
      ashwayuja: { en: 'Ashwayuja', native: 'ಆಶ್ವಯುಜ' },
      kartika: { en: 'Kartika', native: 'ಕಾರ್ತಿಕ' },
      margashira: { en: 'Margashira', native: 'ಮಾರ್ಗಶಿರ' },
      pushya: { en: 'Pushya', native: 'ಪುಷ್ಯ' },
      magha: { en: 'Magha', native: 'ಮಾಘ' },
      phalguna: { en: 'Phalguna', native: 'ಫಾಲ್ಗುಣ' },
    },
    // Kannada-style tithi names (Padya, Bidige, …).
    tithis: {
      pratipada: 'Padya',
      dwitiya: 'Bidige',
      tritiya: 'Tadige',
      chaturthi: 'Chauti',
      panchami: 'Panchami',
      shashthi: 'Shashti',
      saptami: 'Saptami',
      ashtami: 'Ashtami',
      navami: 'Navami',
      dashami: 'Dashami',
      ekadashi: 'Ekadashi',
      dwadashi: 'Dwadashi',
      trayodashi: 'Trayodashi',
      chaturdashi: 'Chaturdashi',
      purnima: 'Hunnime',
      amavasya: 'Amavasye',
    },
    // Kannada panchangas share the Suddha/Bahula convention with Telugu
    // ("ಚೈತ್ರ ಶುದ್ಧ ಪಾಡ್ಯ" is Ugadi day).
    paksha: { shukla: 'Shuddha', krishna: 'Bahula' },
    labels: { masa: 'Māsa', paksha: 'Paksha', tithi: 'Tithi' },
  },

  tradition: {
    gotraLabel: 'Gotra',
    nakshatraLabel: 'Nakshatra',
    nakshatras: [
      { en: 'Ashwini', native: 'ಅಶ್ವಿನಿ' },
      { en: 'Bharani', native: 'ಭರಣಿ' },
      { en: 'Krittika', native: 'ಕೃತ್ತಿಕಾ' },
      { en: 'Rohini', native: 'ರೋಹಿಣಿ' },
      { en: 'Mrigashira', native: 'ಮೃಗಶಿರ' },
      { en: 'Aridra', native: 'ಆರಿದ್ರಾ' },
      { en: 'Punarvasu', native: 'ಪುನರ್ವಸು' },
      { en: 'Pushya', native: 'ಪುಷ್ಯ' },
      { en: 'Ashlesha', native: 'ಆಶ್ಲೇಷಾ' },
      { en: 'Magha', native: 'ಮಘಾ' },
      { en: 'Pubba', native: 'ಪುಬ್ಬಾ' },
      { en: 'Uttara', native: 'ಉತ್ತರೆ' },
      { en: 'Hasta', native: 'ಹಸ್ತ' },
      { en: 'Chitta', native: 'ಚಿತ್ತಾ' },
      { en: 'Swati', native: 'ಸ್ವಾತಿ' },
      { en: 'Vishakha', native: 'ವಿಶಾಖಾ' },
      { en: 'Anuradha', native: 'ಅನುರಾಧಾ' },
      { en: 'Jyeshtha', native: 'ಜ್ಯೇಷ್ಠಾ' },
      { en: 'Moola', native: 'ಮೂಲಾ' },
      { en: 'Purvashadha', native: 'ಪೂರ್ವಾಷಾಢಾ' },
      { en: 'Uttarashadha', native: 'ಉತ್ತರಾಷಾಢಾ' },
      { en: 'Shravana', native: 'ಶ್ರವಣ' },
      { en: 'Dhanishta', native: 'ಧನಿಷ್ಠಾ' },
      { en: 'Shatabhisha', native: 'ಶತಭಿಷಾ' },
      { en: 'Purvabhadra', native: 'ಪೂರ್ವಾಭಾದ್ರ' },
      { en: 'Uttarabhadra', native: 'ಉತ್ತರಾಭಾದ್ರ' },
      { en: 'Revati', native: 'ರೇವತಿ' },
    ],
    gotras: [
      { en: 'Agastya', native: 'ಅಗಸ್ತ್ಯ' },
      { en: 'Angirasa', native: 'ಆಂಗೀರಸ' },
      { en: 'Atreya', native: 'ಆತ್ರೇಯ' },
      { en: 'Bharadwaja', native: 'ಭಾರದ್ವಾಜ' },
      { en: 'Gautama', native: 'ಗೌತಮ' },
      { en: 'Harita', native: 'ಹರೀತ' },
      { en: 'Jamadagni', native: 'ಜಮದಗ್ನಿ' },
      { en: 'Kashyapa', native: 'ಕಶ್ಯಪ' },
      { en: 'Kaushika', native: 'ಕೌಶಿಕ' },
      { en: 'Kaundinya', native: 'ಕೌಂಡಿನ್ಯ' },
      { en: 'Krishnatreya', native: 'ಕೃಷ್ಣಾತ್ರೇಯ' },
      { en: 'Kutsa', native: 'ಕುತ್ಸ' },
      { en: 'Maudgalya', native: 'ಮೌದ್ಗಲ್ಯ' },
      { en: 'Parashara', native: 'ಪರಾಶರ' },
      { en: 'Shalankayana', native: 'ಶಾಲಂಕಾಯನ' },
      { en: 'Sankriti', native: 'ಸಂಕೃತಿ' },
      { en: 'Shandilya', native: 'ಶಾಂಡಿಲ್ಯ' },
      { en: 'Srivatsa', native: 'ಶ್ರೀವತ್ಸ' },
      { en: 'Upamanyu', native: 'ಉಪಮನ್ಯು' },
      { en: 'Vadhula', native: 'ವಾಧೂಲ' },
      { en: 'Vasishtha', native: 'ವಸಿಷ್ಠ' },
      { en: 'Vishnuvriddha', native: 'ವಿಷ್ಣುವೃದ್ಧ' },
      { en: 'Vishwamitra', native: 'ವಿಶ್ವಾಮಿತ್ರ' },
    ],
  },

  ui: {
    maidenHint:
      'The family, or house, they were born into — ತವರು ಮನೆ — if it changed at marriage.',
  },
};
