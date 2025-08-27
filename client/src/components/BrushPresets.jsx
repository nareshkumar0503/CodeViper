import React from 'react';

const BrushPresets = ({ presets, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {presets.map((preset, index) => (
        <button
          key={index}
          className={`w-8 h-8 rounded-full border-2 border-gray-600 hover:border-white transition`}
          style={{
            backgroundColor: '#000',
            width: `${preset.size}px`,
            height: `${preset.size}px`
          }}
          onClick={() => onSelect(preset)}
          title={`Size: ${preset.size}px, Type: ${preset.type}`}
        />
      ))}
    </div>
  );
};

export default BrushPresets;