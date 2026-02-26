import { createContext, useContext, useState, ReactNode, useMemo } from "react";

type Language = "km" | "en";

// Static translations for UI elements
export const translations = {
  km: {
    // Navigation
    programs: "កម្មវិធី",
    games: "ល្បែង",
    extensions: "ផ្នែកបន្ថែម",
    os: "ប្រព័ន្ធប្រតិបត្តិការ",
    articles: "អត្ថបទ",
    goods: "ទំនិញ",
    all: "ទាំងអស់",
    
    // Common actions
    viewAll: "មើលទាំងអស់",
    search: "ស្វែងរកនៅលើគេហទំព័រ",
    login: "ចូល",
    chat: "ជជែក",
    download: "ទាញយក",
    downloadForFree: "ទាញយកដោយឥតគិតថ្លៃ",
    
    // Status
    loading: "កំពុងផ្ទុក...",
    noApps: "មិនមានកម្មវិធី",
    featured: "ពិសេស",
    popular: "ពេញនិយម",
    free: "ឥតគិតថ្លៃ",
    
    // Navigation
    home: "ទំព័រដើម",
    backToHome: "ត្រឡប់ទៅទំព័រដើម",
    
    // App details
    versions: "កំណែ",
    noVersions: "មិនមានកំណែ",
    screenshots: "រូបថតអេក្រង់",
    appNotFound: "រកមិនឃើញកម្មវិធី",
    previousVersions: "កំណែមុន",
    description: "ការពិពណ៌នា",
    
    // Metadata labels
    version: "កំណែ",
    developer: "អ្នកអភិវឌ្ឍន៍",
    compatibility: "ភាពឆបគ្នា",
    size: "ទំហំ",
    releaseDate: "កាលបរិច្ឆេទចេញផ្សាយ",
    website: "គេហទំព័រ",
    visit: "ចូលមើល",
    latest: "ចុងក្រោយបំផុត",
    
    // Security
    noThreatsFound: "រកមិនឃើញការគំរាមកំហែង។",
    readMore: "អានបន្ថែម...",
    
    // Download progress
    downloading: "កំពុងទាញយក...",
    downloadComplete: "ទាញយកបានជោគជ័យ!",
    downloadFailed: "ការទាញយកបរាជ័យ",
    done: "រួចរាល់",
    close: "បិទ",
    
    // Profile
    profileSettings: "ការកំណត់គណនី",
    personalInfo: "ព័ត៌មានផ្ទាល់ខ្លួន",
    email: "អ៊ីមែល",
    fullName: "ឈ្មោះពេញ",
    phone: "ទូរស័ព្ទ",
    saveChanges: "រក្សាទុកការផ្លាស់ប្តូរ",
    changePassword: "ផ្លាស់ប្តូរពាក្យសម្ងាត់",
    cropImage: "កាត់រូបភាព",
    cancel: "បោះបង់",
    save: "រក្សាទុក",
    profile: "គណនី",
    
    // Errors
    invalidApp: "កម្មវិធីមិនត្រឹមត្រូវ",
    goBackHome: "ត្រឡប់ទៅទំព័រដើម",
  },
  en: {
    // Navigation
    programs: "Programs",
    games: "Games",
    extensions: "Extensions",
    os: "Operating Systems",
    articles: "Articles",
    goods: "Goods",
    all: "All",
    
    // Common actions
    viewAll: "View all",
    search: "Search the site",
    login: "Login",
    chat: "Chat",
    download: "Download",
    downloadForFree: "Download for free",
    
    // Status
    loading: "Loading...",
    noApps: "No apps found",
    featured: "Featured",
    popular: "Popular",
    free: "Free",
    
    // Navigation
    home: "Home",
    backToHome: "Back to Home",
    
    // App details
    versions: "Versions",
    noVersions: "No versions available",
    screenshots: "Screenshots",
    appNotFound: "App not found",
    previousVersions: "Previous versions",
    description: "Description",
    
    // Metadata labels
    version: "Version",
    developer: "Developer",
    compatibility: "Compatibility",
    size: "Size",
    releaseDate: "Release Date",
    website: "Website",
    visit: "Visit",
    latest: "Latest",
    
    // Security
    noThreatsFound: "No threats found.",
    readMore: "Read more...",
    
    // Download progress
    downloading: "Downloading...",
    downloadComplete: "Download complete!",
    downloadFailed: "Download failed",
    done: "Done",
    close: "Close",
    
    // Profile
    profileSettings: "Profile Settings",
    personalInfo: "Personal Information",
    email: "Email",
    fullName: "Full Name",
    phone: "Phone",
    saveChanges: "Save Changes",
    changePassword: "Change Password",
    cropImage: "Crop Image",
    cancel: "Cancel",
    save: "Save",
    profile: "Profile",
    
    // Errors
    invalidApp: "Invalid App",
    goBackHome: "Go back home",
  },
};

type TranslationType = typeof translations.km;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (km: string | undefined, en: string | undefined) => string;
  translations: TranslationType;
}

const defaultContextValue: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  t: (km, en) => en || km || "",
  translations: translations.en,
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const value = useMemo((): LanguageContextType => {
    // Translation helper - returns text based on current language
    const t = (km: string | undefined, en: string | undefined): string => {
      if (language === "km") {
        return km || en || "";
      }
      return en || km || "";
    };

    return {
      language,
      setLanguage,
      t,
      translations: translations[language] as TranslationType,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const useTranslations = () => {
  const { translations: t } = useContext(LanguageContext);
  return t;
};
