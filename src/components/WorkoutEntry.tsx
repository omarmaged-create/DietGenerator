import React, { useState } from 'react';
import { X, Plus, Clock, RotateCcw, Target, GripVertical } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface Exercise {
  id: string;
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
}

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
  videoUrl?: string;
}

interface WorkoutEntryProps {
  exercise: WorkoutExercise;
  selectedExercise?: Exercise;
  onUpdate: (exercise: WorkoutExercise) => void;
  onDelete: () => void;
  onExerciseSelect: (exercise: Exercise) => void;
  language: Language;
  dragHandleProps?: any;
}

export const WorkoutEntry: React.FC<WorkoutEntryProps> = ({
  exercise,
  selectedExercise,
  onUpdate,
  onDelete,
  onExerciseSelect,
  language,
  dragHandleProps
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  const [exerciseName, setExerciseName] = useState('');

  const handleExerciseNameChange = (name: string) => {
    setExerciseName(name);
    // Create a simple exercise object with the entered name
    const simpleExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: name,
      type: 'custom',
      muscle: 'various',
      equipment: 'various',
      difficulty: 'intermediate',
      instructions: ''
    };
    onExerciseSelect(simpleExercise);
    onUpdate({ ...exercise, exerciseId: simpleExercise.id });
  };

  const updateField = (field: keyof WorkoutExercise, value: any) => {
    onUpdate({ ...exercise, [field]: value });
  };

  return (
    <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${isRTL ? 'rtl' : ''}`}>
      <div className="flex items-start gap-2">
        <div 
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded mt-2"
        >
          <GripVertical size={16} className="text-gray-400" />
        </div>
        
        <div className="flex-1">
      <div className="space-y-4">
        {/* Exercise Selection */}
        <div className="w-full">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.selectExercise}
            </label>
            <input
              type="text"
              value={selectedExercise?.name || exerciseName}
              onChange={(e) => handleExerciseNameChange(e.target.value)}
              placeholder={t.selectExercise}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Exercise Parameters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Target size={12} className="inline mr-1" />
              {t.sets}
            </label>
            <input
              type="number"
              value={exercise.sets || ''}
              onChange={(e) => updateField('sets', Number(e.target.value))}
              placeholder="3"
              min="1"
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <RotateCcw size={12} className="inline mr-1" />
              {t.reps}
            </label>
            <input
              type="text"
              value={exercise.reps || ''}
              onChange={(e) => updateField('reps', e.target.value)}
              placeholder="12 or 8-12"
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t.weight} (kg)
            </label>
            <input
              type="number"
              value={exercise.weight || ''}
              onChange={(e) => updateField('weight', Number(e.target.value))}
              placeholder="20"
              min="0"
              step="0.5"
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Clock size={12} className="inline mr-1" />
              {t.restTime} (min)
            </label>
            <input
              type="number"
              value={exercise.restTime || ''}
              onChange={(e) => updateField('restTime', Number(e.target.value))}
              placeholder="2"
              min="0"
              step="0.5"
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t.notes}
          </label>
          <input
            type="text"
            value={exercise.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder={t.exerciseNotesPlaceholder}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Video Demo URL (optional)
          </label>
          <input
            type="url"
            value={exercise.videoUrl || ''}
            onChange={(e) => updateField('videoUrl', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

          {/* Delete Button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title={t.delete}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};