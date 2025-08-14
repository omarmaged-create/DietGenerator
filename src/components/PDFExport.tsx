import React from 'react';
import { Download, FileText } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface PDFExportProps {
  onExport: () => void;
  language: Language;
  disabled?: boolean;
}

export const PDFExport: React.FC<PDFExportProps> = ({
  onExport,
  language,
  disabled = false
}) => {
  const t = translations[language];

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <FileText className="text-green-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Export Diet Plan</h2>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Generate a professional PDF for your client</p>
          </div>
        </div>

        <button
          onClick={onExport}
          disabled={disabled}
          className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Download size={16} className="sm:w-5 sm:h-5" />
          {t.exportToPdf}
        </button>
      </div>
    </div>
  );
};