import type { Language } from './settings';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
}

export type LegalSlug = 'privacy' | 'terms' | 'responsible-use';

/**
 * Long-form legal copy lives here rather than inside components so it stays
 * translatable alongside the rest of the UI.
 */
const DOCUMENTS: Record<Language, Record<LegalSlug, LegalDocument>> = {
  en: {
    privacy: {
      title: 'Privacy',
      lead: 'ClipFlow is built to hold as little of your data as possible.',
      updated: '2026-01-01',
      sections: [
        {
          heading: 'What we store',
          paragraphs: [
            'ClipFlow has no accounts, so there is no name, email address, or password to store. Two things exist while you use it:',
          ],
          bullets: [
            'An anonymous session id in a cookie, so the server hands your downloads only to you.',
            'The temporary media file produced for a download, which is deleted automatically when its expiry timer runs out.',
          ],
        },
        {
          heading: 'What stays in your browser',
          paragraphs: [
            'Your download history, theme, language, and format preferences are stored in this browser using localStorage. They are never sent to the server, and clearing your history or your browser data removes them.',
          ],
        },
        {
          heading: 'URLs you submit',
          paragraphs: [
            'A URL you analyze is sent to the ClipFlow server so it can ask the source platform what formats exist. It is held briefly in an in-memory cache to avoid asking the platform twice, and that cache expires within minutes.',
            'The source platform sees a request from the ClipFlow server, not from you.',
          ],
        },
        {
          heading: 'Logs',
          paragraphs: [
            'The server writes operational logs (timestamps, error codes, job outcomes) needed to run the service. They are not used to build a profile of you.',
          ],
        },
        {
          heading: 'Third parties',
          paragraphs: [
            'There is no analytics script, no advertising network, and no tracking pixel on this site. Video thumbnails are loaded directly from the source platform CDN with no referrer attached.',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms',
      lead: 'Plain terms for a small utility.',
      updated: '2026-01-01',
      sections: [
        {
          heading: 'What ClipFlow does',
          paragraphs: [
            'ClipFlow retrieves publicly accessible media from supported platforms where those platforms permit the operation, and hands you the resulting file. It is provided as-is, with no guarantee of availability, completeness, or fitness for a particular purpose.',
          ],
        },
        {
          heading: 'Acceptable use',
          paragraphs: ['You agree not to use ClipFlow to:'],
          bullets: [
            'Download content you do not have permission to save.',
            'Attempt to reach private, restricted, paywalled, or DRM-protected content.',
            'Automate abusive request volumes or otherwise degrade the service for others.',
            'Infringe copyright, privacy rights, or a platform’s terms of service.',
          ],
        },
        {
          heading: 'Availability',
          paragraphs: [
            'Platforms change their technical restrictions frequently. A link that worked yesterday may fail today, and ClipFlow will report that instead of finding another route in. Temporary files expire; download links stop working after that.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            'You are responsible for what you download and what you do with it. ClipFlow is not liable for how you use the files it produces.',
          ],
        },
      ],
    },
    'responsible-use': {
      title: 'Responsible Use',
      lead: 'ClipFlow is a media utility, not a way around anyone’s rules.',
      updated: '2026-01-01',
      sections: [
        {
          heading: 'What the app will not do',
          paragraphs: ['These are deliberate limits, not missing features:'],
          bullets: [
            'It does not sign in to any platform or use your cookies or credentials.',
            'It does not bypass DRM or decrypt protected streams.',
            'It does not reach private, unlisted-by-restriction, or paywalled content.',
            'It does not work around rate limits, bot checks, or other platform security.',
            'It does not fetch anything on the server’s own private network.',
          ],
        },
        {
          heading: 'When a platform says no',
          paragraphs: [
            'If the source refuses a request, ClipFlow shows a clear message explaining that the platform does not permit the operation. It does not retry through a different route, and the feature is disabled for that link rather than degraded into a workaround.',
          ],
        },
        {
          heading: 'Your responsibility',
          paragraphs: [
            'Copyright, privacy law, and each platform’s terms apply to you regardless of the tool you use. Download your own content, content you have permission to save, or content whose licence allows it. Respect the people who made what you are saving.',
          ],
        },
      ],
    },
  },

  km: {
    privacy: {
      title: 'ឯកជនភាព',
      lead: 'ClipFlow ត្រូវបានបង្កើតឡើងដើម្បីរក្សាទុកទិន្នន័យរបស់អ្នកឱ្យតិចបំផុតតាមដែលអាចធ្វើបាន។',
      updated: '2026-01-01',
      sections: [
        {
          heading: 'អ្វីដែលយើងរក្សាទុក',
          paragraphs: [
            'ClipFlow គ្មានគណនីទេ ដូច្នេះគ្មានឈ្មោះ អ៊ីមែល ឬពាក្យសម្ងាត់ត្រូវរក្សាទុកឡើយ។ មានតែពីរយ៉ាងប៉ុណ្ណោះនៅពេលអ្នកប្រើវា៖',
          ],
          bullets: [
            'លេខសម្គាល់វគ្គអនាមិកក្នុងខូគី ដើម្បីឱ្យម៉ាស៊ីនមេប្រគល់ការទាញយកតែឱ្យអ្នកប៉ុណ្ណោះ។',
            'ឯកសារមេឌៀបណ្ដោះអាសន្នដែលបង្កើតសម្រាប់ការទាញយក ដែលនឹងលុបដោយស្វ័យប្រវត្តិនៅពេលផុតកំណត់។',
          ],
        },
        {
          heading: 'អ្វីដែលនៅក្នុងកម្មវិធីរុករករបស់អ្នក',
          paragraphs: [
            'ប្រវត្តិទាញយក រចនាបទ ភាសា និងចំណូលចិត្តទម្រង់របស់អ្នកត្រូវបានរក្សាទុកក្នុងកម្មវិធីរុករកនេះតាមរយៈ localStorage។ ពួកវាមិនត្រូវបានផ្ញើទៅម៉ាស៊ីនមេឡើយ ហើយការសម្អាតប្រវត្តិ ឬទិន្នន័យកម្មវិធីរុករកនឹងលុបពួកវាចេញ។',
          ],
        },
        {
          heading: 'តំណដែលអ្នកបញ្ជូន',
          paragraphs: [
            'តំណដែលអ្នកវិភាគត្រូវបានផ្ញើទៅម៉ាស៊ីនមេ ClipFlow ដើម្បីសួរវេទិកាដើមថាមានទម្រង់អ្វីខ្លះ។ វាត្រូវរក្សាទុកបណ្ដោះអាសន្នក្នុងឃ្លាំងសម្ងាត់ដើម្បីកុំឱ្យសួរវេទិកាពីរដង ហើយឃ្លាំងនោះផុតកំណត់ក្នុងរយៈពេលប៉ុន្មាននាទី។',
            'វេទិកាដើមឃើញសំណើពីម៉ាស៊ីនមេ ClipFlow មិនមែនពីអ្នកទេ។',
          ],
        },
        {
          heading: 'កំណត់ហេតុ',
          paragraphs: [
            'ម៉ាស៊ីនមេសរសេរកំណត់ហេតុប្រតិបត្តិការ (ពេលវេលា លេខកូដកំហុស លទ្ធផលការងារ) ដែលចាំបាច់សម្រាប់ដំណើរការសេវា។ ពួកវាមិនត្រូវបានប្រើដើម្បីបង្កើតប្រវត្តិរូបរបស់អ្នកឡើយ។',
          ],
        },
        {
          heading: 'ភាគីទីបី',
          paragraphs: [
            'គ្មានស្គ្រីបវិភាគ គ្មានបណ្ដាញផ្សាយពាណិជ្ជកម្ម និងគ្មានភីកសែលតាមដាននៅលើគេហទំព័រនេះទេ។ រូបភាពតូចៗត្រូវបានផ្ទុកដោយផ្ទាល់ពី CDN របស់វេទិកាដើម ដោយគ្មានការភ្ជាប់ referrer។',
          ],
        },
      ],
    },
    terms: {
      title: 'លក្ខខណ្ឌ',
      lead: 'លក្ខខណ្ឌសាមញ្ញសម្រាប់ឧបករណ៍តូចមួយ។',
      updated: '2026-01-01',
      sections: [
        {
          heading: 'អ្វីដែល ClipFlow ធ្វើ',
          paragraphs: [
            'ClipFlow ទាញយកមេឌៀសាធារណៈពីវេទិកាដែលគាំទ្រ នៅកន្លែងដែលវេទិកាទាំងនោះអនុញ្ញាត ហើយប្រគល់ឯកសារលទ្ធផលឱ្យអ្នក។ វាត្រូវបានផ្ដល់ជូនតាមសភាពដើម ដោយគ្មានការធានាអំពីភាពអាចប្រើបាន ភាពពេញលេញ ឬភាពសាកសមសម្រាប់គោលបំណងជាក់លាក់ណាមួយឡើយ។',
          ],
        },
        {
          heading: 'ការប្រើប្រាស់ដែលអាចទទួលយកបាន',
          paragraphs: ['អ្នកយល់ព្រមមិនប្រើ ClipFlow ដើម្បី៖'],
          bullets: [
            'ទាញយកមាតិកាដែលអ្នកគ្មានការអនុញ្ញាតរក្សាទុក។',
            'ព្យាយាមចូលដល់មាតិកាឯកជន មាតិកាមានកំហិត មាតិកាបង់ប្រាក់ ឬមាតិកាការពារដោយ DRM។',
            'បង្កើតសំណើច្រើនហួសហេតុ ឬធ្វើឱ្យសេវាធ្លាក់ចុះសម្រាប់អ្នកដទៃ។',
            'រំលោភសិទ្ធិអ្នកនិពន្ធ សិទ្ធិឯកជនភាព ឬលក្ខខណ្ឌសេវារបស់វេទិកា។',
          ],
        },
        {
          heading: 'ភាពអាចប្រើបាន',
          paragraphs: [
            'វេទិកាផ្លាស់ប្ដូរការរឹតត្បិតបច្ចេកទេសជាញឹកញាប់។ តំណដែលដំណើរការម្សិលមិញអាចបរាជ័យថ្ងៃនេះ ហើយ ClipFlow នឹងរាយការណ៍ជំនួសឱ្យការស្វែងរកផ្លូវផ្សេង។ ឯកសារបណ្ដោះអាសន្នផុតកំណត់ ហើយតំណទាញយកនឹងលែងដំណើរការបន្ទាប់ពីនោះ។',
          ],
        },
        {
          heading: 'ការទទួលខុសត្រូវ',
          paragraphs: [
            'អ្នកទទួលខុសត្រូវលើអ្វីដែលអ្នកទាញយក និងអ្វីដែលអ្នកធ្វើជាមួយវា។ ClipFlow មិនទទួលខុសត្រូវចំពោះរបៀបដែលអ្នកប្រើឯកសារដែលវាបង្កើតឡើងឡើយ។',
          ],
        },
      ],
    },
    'responsible-use': {
      title: 'ការប្រើប្រាស់ដោយទំនួលខុសត្រូវ',
      lead: 'ClipFlow ជាឧបករណ៍មេឌៀ មិនមែនជាមធ្យោបាយគេចវេសពីច្បាប់អ្នកណាម្នាក់ឡើយ។',
      updated: '2026-01-01',
      sections: [
        {
          heading: 'អ្វីដែលកម្មវិធីនេះមិនធ្វើ',
          paragraphs: ['ទាំងនេះជាដែនកំណត់ដោយចេតនា មិនមែនជាមុខងារដែលខ្វះឡើយ៖'],
          bullets: [
            'វាមិនចូលគណនីវេទិកាណាមួយ និងមិនប្រើខូគី ឬព័ត៌មានសម្គាល់របស់អ្នកឡើយ។',
            'វាមិនបំបែក DRM ឬឌិគ្រីបស្ទ្រីមដែលការពារឡើយ។',
            'វាមិនចូលដល់មាតិកាឯកជន មាតិកាមានកំហិត ឬមាតិកាបង់ប្រាក់ឡើយ។',
            'វាមិនគេចវេសពីដែនកំណត់អត្រា ការត្រួតពិនិត្យរូបយន្ត ឬសុវត្ថិភាពវេទិកាផ្សេងទៀតឡើយ។',
            'វាមិនទាញយកអ្វីនៅលើបណ្ដាញឯកជនរបស់ម៉ាស៊ីនមេឡើយ។',
          ],
        },
        {
          heading: 'ពេលវេទិកាបដិសេធ',
          paragraphs: [
            'បើប្រភពបដិសេធសំណើ ClipFlow បង្ហាញសារច្បាស់លាស់ថាវេទិកាមិនអនុញ្ញាតប្រតិបត្តិការនេះ។ វាមិនព្យាយាមឡើងវិញតាមផ្លូវផ្សេងទេ ហើយមុខងារនោះត្រូវបានបិទសម្រាប់តំណនោះ ជាជាងបំប្លែងទៅជាការគេចវេស។',
          ],
        },
        {
          heading: 'ការទទួលខុសត្រូវរបស់អ្នក',
          paragraphs: [
            'សិទ្ធិអ្នកនិពន្ធ ច្បាប់ឯកជនភាព និងលក្ខខណ្ឌរបស់វេទិកានីមួយៗអនុវត្តចំពោះអ្នក ដោយមិនគិតពីឧបករណ៍ដែលអ្នកប្រើឡើយ។ សូមទាញយកមាតិការបស់អ្នកផ្ទាល់ មាតិកាដែលអ្នកមានការអនុញ្ញាត ឬមាតិកាដែលអាជ្ញាបណ្ណអនុញ្ញាត។ សូមគោរពអ្នកបង្កើតមាតិកាដែលអ្នករក្សាទុក។',
          ],
        },
      ],
    },
  },
};

export const getLegalDocument = (slug: LegalSlug, language: Language): LegalDocument =>
  DOCUMENTS[language][slug];
