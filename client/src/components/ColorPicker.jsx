import React, { useState } from 'react';
import { FaEyeDropper, FaTimes } from 'react-icons/fa';

const ColorPicker = ({ color, onChange, title, showTransparent = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      {/* Color preview button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded border-2 border-gray-600 hover:border-white transition"
        style={{ backgroundColor: color === 'transparent' ? 'rgba(0,0,0,0.1)' : color }}
        title={title}
      >
        {color === 'transparent' && (
          <FaTimes className="text-gray-500" size={12} />
        )}
      </button>

      {/* Color picker dropdown */}
      {isOpen && (
        <div className="absolute top-10 left-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-48 z-50">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-200">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <FaTimes size={12} />
            </button>
          </div>

          {/* Color input */}
          <input
            type="color"
            value={color === 'transparent' ? '#000000' : color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 mb-2 cursor-pointer"
          />

          {/* Recent colors */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
              '#FFFFFF', '#000000', '#FFA500', '#800080', '#A52A2A', '#008080'].map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded border border-gray-600 hover:border-white transition"
                style={{ backgroundColor: c }}
                onClick={() => {
                  onChange(c);
                  setIsOpen(false);
                }}
                title={c}
              />
            ))}
          </div>

          {/* Transparent option */}
          {showTransparent && (
            <button
              onClick={() => {
                onChange('transparent');
                setIsOpen(false);
              }}
              className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm flex items-center justify-center gap-1"
            >
              <div className="w-4 h-4 border border-gray-500 bg-transparent" />
              <span>Transparent</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;