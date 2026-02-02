import {
  FaCar, FaHome, FaIdCard, FaMagic, FaHeartbeat, FaBriefcase, FaShieldAlt, FaPaw
} from 'react-icons/fa';

export const CATEGORIES = [
  {
    id: 'auto',
    label: 'Auto & Moto',
    icon: FaCar,
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🚗',
    subcategories: [
      { id: 'rca', label: 'RCA (Asigurare)', defaultDays: 365, icon: '🛡️' },
      { id: 'itp', label: 'ITP (Inspecție Tehnică)', defaultDays: 730, icon: '🔧' },
      { id: 'rovinieta', label: 'Rovinietă', defaultDays: 365, icon: '🛣️' },
      { id: 'casco', label: 'CASCO', defaultDays: 365, icon: '🚗' },
      { id: 'permis', label: 'Permis de Conducere', defaultDays: 3650, icon: '🪪' },
      { id: 'taxa_drum', label: 'Taxă de Drum', defaultDays: 365, icon: '💳' },
      { id: 'schimb_ulei', label: 'Schimb Ulei', defaultDays: 180, icon: '🛢️' },
    ]
  },
  {
    id: 'personal',
    label: 'Acte Personale',
    icon: FaIdCard,
    gradient: 'from-violet-500 to-purple-500',
    emoji: '🪪',
    subcategories: [
      { id: 'ci', label: 'Carte de Identitate', defaultDays: 3650, icon: '🪪' },
      { id: 'passport', label: 'Pașaport', defaultDays: 1825, icon: '✈️' },
      { id: 'cazier', label: 'Cazier Judiciar', defaultDays: 180, icon: '📋' },
      { id: 'certificat_casatorie', label: 'Certificat Căsătorie', defaultDays: 0, icon: '💍' },
    ]
  },
  {
    id: 'home',
    label: 'Casă & Utilități',
    icon: FaHome,
    gradient: 'from-emerald-500 to-teal-500',
    emoji: '🏠',
    subcategories: [
      { id: 'iscir', label: 'Revizie Centrală (ISCIR)', defaultDays: 730, icon: '🔥' },
      { id: 'rate', label: 'Rată Bancară / Credit', defaultDays: 30, icon: '🏦' },
      { id: 'asig_locuinta', label: 'Asigurare Locuință (PAD)', defaultDays: 365, icon: '🏠' },
      { id: 'contract_chirie', label: 'Contract Chirie', defaultDays: 365, icon: '📝' },
      { id: 'gaze', label: 'Revizie Gaze', defaultDays: 730, icon: '🔧' },
      { id: 'impozit', label: 'Impozit Proprietate', defaultDays: 365, icon: '💰' },
    ]
  },
  {
    id: 'health',
    label: 'Sănătate',
    icon: FaHeartbeat,
    gradient: 'from-rose-500 to-pink-500',
    emoji: '🩺',
    subcategories: [
      { id: 'asig_sanatate', label: 'Asigurare de Sănătate', defaultDays: 365, icon: '💊' },
      { id: 'control_medical', label: 'Control Medical Periodic', defaultDays: 365, icon: '🩺' },
      { id: 'vaccin', label: 'Vaccin / Rapel', defaultDays: 365, icon: '💉' },
      { id: 'dentist', label: 'Control Stomatologic', defaultDays: 180, icon: '🦷' },
      { id: 'oftalmolog', label: 'Control Oftalmologic', defaultDays: 365, icon: '👁️' },
    ]
  },
  {
    id: 'work',
    label: 'Muncă & Business',
    icon: FaBriefcase,
    gradient: 'from-amber-500 to-orange-500',
    emoji: '💼',
    subcategories: [
      { id: 'contract_munca', label: 'Contract de Muncă', defaultDays: 365, icon: '📄' },
      { id: 'licenta', label: 'Licență Software', defaultDays: 365, icon: '💻' },
      { id: 'certificari', label: 'Certificări Profesionale', defaultDays: 365, icon: '🏅' },
      { id: 'domeniu_web', label: 'Domeniu Web / Hosting', defaultDays: 365, icon: '🌐' },
    ]
  },
  {
    id: 'insurance',
    label: 'Asigurări',
    icon: FaShieldAlt,
    gradient: 'from-indigo-500 to-blue-500',
    emoji: '🛡️',
    subcategories: [
      { id: 'asig_viata', label: 'Asigurare de Viață', defaultDays: 365, icon: '❤️' },
      { id: 'asig_calatorie', label: 'Asigurare Călătorie', defaultDays: 365, icon: '✈️' },
      { id: 'asig_accidente', label: 'Asigurare Accidente', defaultDays: 365, icon: '🛡️' },
    ]
  },
  {
    id: 'pets',
    label: 'Animale de Companie',
    icon: FaPaw,
    gradient: 'from-lime-500 to-green-500',
    emoji: '🐾',
    subcategories: [
      { id: 'vaccin_animal', label: 'Vaccin Animal', defaultDays: 365, icon: '💉' },
      { id: 'deparazitare', label: 'Deparazitare', defaultDays: 90, icon: '🐛' },
      { id: 'microcip', label: 'Verificare Microcip', defaultDays: 365, icon: '📡' },
    ]
  },
  {
    id: 'custom',
    label: 'Custom / Altele',
    icon: FaMagic,
    gradient: 'from-gray-500 to-gray-600',
    emoji: '✨',
    subcategories: []
  }
];

export const getCategoryById = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// Quick-add predefined templates shown on the homepage
export const QUICK_TEMPLATES = [
  { id: 'rca', title: 'RCA Auto', icon: '🛡️', category: 'auto', defaultDays: 365, desc: 'Asigurare obligatorie auto', popular: true },
  { id: 'itp', title: 'ITP', icon: '🔧', category: 'auto', defaultDays: 730, desc: 'Inspecție tehnică periodică', popular: true },
  { id: 'ci', title: 'Carte de Identitate', icon: '🪪', category: 'personal', defaultDays: 3650, desc: 'Buletin / CI', popular: true },
  { id: 'passport', title: 'Pașaport', icon: '✈️', category: 'personal', defaultDays: 1825, desc: 'Pașaport internațional', popular: true },
  { id: 'rovinieta', title: 'Rovinietă', icon: '🛣️', category: 'auto', defaultDays: 365, desc: 'Taxă drumuri naționale', popular: true },
  { id: 'asig_casa', title: 'Asigurare Locuință', icon: '🏠', category: 'home', defaultDays: 365, desc: 'PAD obligatoriu', popular: true },
  { id: 'revizie', title: 'Revizie Centrală', icon: '🔥', category: 'home', defaultDays: 730, desc: 'ISCIR revizie termică' },
  { id: 'control', title: 'Control Medical', icon: '🩺', category: 'health', defaultDays: 365, desc: 'Analize + consultație' },
  { id: 'permis', title: 'Permis Conducere', icon: '🪪', category: 'auto', defaultDays: 3650, desc: 'Reînnoire permis auto' },
  { id: 'casco', title: 'CASCO', icon: '🚗', category: 'auto', defaultDays: 365, desc: 'Asigurare voluntară auto' },
  { id: 'dentist', title: 'Control Stomatologic', icon: '🦷', category: 'health', defaultDays: 180, desc: 'Verificare + detartraj' },
  { id: 'vaccin', title: 'Vaccin Gripal', icon: '💉', category: 'health', defaultDays: 365, desc: 'Vaccin antigripal anual' },
  { id: 'rata', title: 'Rată Bancară', icon: '🏦', category: 'home', defaultDays: 30, desc: 'Plată rată lunară' },
  { id: 'domeniu', title: 'Domeniu Web', icon: '🌐', category: 'work', defaultDays: 365, desc: 'Reînnoire domeniu internet' },
  { id: 'schimb_ulei', title: 'Schimb Ulei Auto', icon: '🛢️', category: 'auto', defaultDays: 180, desc: 'Schimb ulei + filtre' },
  { id: 'deparazitare', title: 'Deparazitare Animal', icon: '🐾', category: 'pets', defaultDays: 90, desc: 'Deparazitare internă/externă' },
];

// Couple-aware templates
export const COUPLE_SUGGESTIONS = [
  { id: 'ci_partner', title: 'Buletin Partener/ă', icon: '🪪', category: 'personal', defaultDays: 3650, desc: 'CI partener/ă', forWhom: 'partner' },
  { id: 'passport_partner', title: 'Pașaport Partener/ă', icon: '✈️', category: 'personal', defaultDays: 1825, desc: 'Pașaport partener/ă', forWhom: 'partner' },
  { id: 'permis_partner', title: 'Permis Partener/ă', icon: '🪪', category: 'auto', defaultDays: 3650, desc: 'Permis conducere partener/ă', forWhom: 'partner' },
  { id: 'control_partner', title: 'Control Medical Partener/ă', icon: '🩺', category: 'health', defaultDays: 365, desc: 'Control medical partener/ă', forWhom: 'partner' },
];
