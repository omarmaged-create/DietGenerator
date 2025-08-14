import React from 'react';
import { FileText } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  language: Language;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onNotesChange,
  language
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <FileText className="text-yellow-600" size={20} />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t.notes}</h2>
      </div>

      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t.notesPlaceholder}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
      />
    </div>
  );
};