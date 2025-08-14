import React from 'react';
import { Globe } from 'lucide-react';
import { Language } from '../utils/translations';

interface LanguageToggleProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  currentLanguage,
  onLanguageChange
}) => {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm border">
      <Globe size={18} className="text-gray-600" />
      <button
        onClick={() => onLanguageChange('en')}
        className={`px-3 py-1 rounded transition-colors ${
          currentLanguage === 'en'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onLanguageChange('ar')}
        className={`px-3 py-1 rounded transition-colors ${
          currentLanguage === 'ar'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        العربية
      </button>
    </div>
  );
};