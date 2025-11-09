
import React from 'react';
// FIX: Added file extension to type import
import { PasswordStrength } from '../../types.ts';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  score: number;
}

// FIX: Add empty string property to satisfy PasswordStrength type
const strengthConfig: Record<PasswordStrength, { color: string; text: string }> = {
  'Fraca': { color: 'bg-red-500', text: 'text-red-400' },
  'Média': { color: 'bg-yellow-500', text: 'text-yellow-400' },
  'Forte': { color: 'bg-green-500', text: 'text-green-400' },
  'Muito Forte': { color: 'bg-blue-500', text: 'text-blue-400' },
  '': { color: 'bg-gray-700', text: 'text-gray-400' },
};


const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength, score }) => {
  const config = strengthConfig[strength];

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-medium text-gray-300">Força</p>
        <p className={`text-sm font-bold ${config.text}`}>{strength}</p>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div 
          className={`${config.color} h-1.5 rounded-full transition-all duration-300`} 
          style={{ width: `${score}%` }}>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;