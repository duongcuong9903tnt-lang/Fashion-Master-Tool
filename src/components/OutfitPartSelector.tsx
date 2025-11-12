import React from 'react';

export type ExtractionType = 'top' | 'bottom' | 'full';

interface OutfitPartSelectorProps {
  selectedType: ExtractionType;
  onTypeChange: (type: ExtractionType) => void;
  isLoading: boolean;
}

const SelectorButton: React.FC<{
  label: string;
  type: ExtractionType;
  selectedType: ExtractionType;
  onClick: (type: ExtractionType) => void;
  disabled: boolean;
}> = ({ label, type, selectedType, onClick, disabled }) => {
  const isSelected = type === selectedType;
  return (
    <button
      onClick={() => onClick(type)}
      disabled={disabled}
      className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
};

export const OutfitPartSelector: React.FC<OutfitPartSelectorProps> = ({ selectedType, onTypeChange, isLoading }) => {
  return (
    <div className="mt-6">
      <p className="text-center text-sm font-medium text-gray-400 mb-2">Chọn phần cần tách:</p>
      <div className="flex items-center justify-center gap-2 bg-gray-900/50 p-1 rounded-lg">
        <SelectorButton
          label="Cả Bộ"
          type="full"
          selectedType={selectedType}
          onClick={onTypeChange}
          disabled={isLoading}
        />
        <SelectorButton
          label="Áo"
          type="top"
          selectedType={selectedType}
          onClick={onTypeChange}
          disabled={isLoading}
        />
        <SelectorButton
          label="Quần"
          type="bottom"
          selectedType={selectedType}
          onClick={onTypeChange}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
