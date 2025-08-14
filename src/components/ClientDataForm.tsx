import React from 'react';
import { User, Calculator } from 'lucide-react';
import { ClientData } from '../utils/calculations';
import { translations, Language } from '../utils/translations';

interface ClientDataFormProps {
  data: Partial<ClientData>;
  onChange: (data: Partial<ClientData>) => void;
  targetCalories: number;
  language: Language;
}

export const ClientDataForm: React.FC<ClientDataFormProps> = ({
  data,
  onChange,
  targetCalories,
  language
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';

  return (

    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="text-blue-600" size={20} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t.clientData}</h2>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${isRTL ? 'rtl' : ''}`}>
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.clientName}
              </label>
              <input
                type="text"
                value={data.nameEn || ''}
                onChange={(e) => onChange({ ...data, nameEn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.clientNameAr}
              </label>
              <input
                type="text"
                value={data.nameAr || ''}
                onChange={(e) => onChange({ ...data, nameAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="جون دو"
                dir="rtl"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.height}
          </label>
          <input
            type="number"
            value={data.height || ''}
            onChange={(e) => onChange({ ...data, height: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="170"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.weight}
          </label>
          <input
            type="number"
            value={data.weight || ''}
            onChange={(e) => onChange({ ...data, weight: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="70"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.age}
          </label>
          <input
            type="number"
            value={data.age || ''}
            onChange={(e) => onChange({ ...data, age: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="30"
          />
          <p className="text-xs text-gray-500 mt-1">{t.years}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.gender}
          </label>
          <select
            value={data.gender || ''}
            onChange={(e) => onChange({ ...data, gender: e.target.value as 'male' | 'female' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">{t.gender}</option>
            <option value="male">{t.male}</option>
            <option value="female">{t.female}</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.activityMultiplier}
          </label>
          <input
            type="number"
            step="0.1"
            value={data.activityMultiplier || ''}
            onChange={(e) => onChange({ ...data, activityMultiplier: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="1.55"
          />
          <p className="text-xs text-gray-500 mt-1">{t.activityHelper}</p>
        </div>
      </div>

        {targetCalories > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <Calculator className="text-green-600" size={20} />
              <span className="font-semibold text-gray-800">{t.targetCalories}:</span>
              <span className="text-xl font-bold text-green-600">{Math.round(targetCalories)} {t.kcal}</span>
            </div>
          </div>
        )}
      </div>
  );
};