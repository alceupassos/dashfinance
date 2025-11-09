import React from 'react';

interface ToggleProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  icon?: React.ReactNode;
}

const Toggle: React.FC<ToggleProps> = ({ label, enabled, setEnabled, icon }) => {
  return (
    <div onClick={() => setEnabled(!enabled)} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg cursor-pointer ring-1 ring-white/5 hover:ring-white/10 transition-all">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-white select-none">{label}</span>
      </div>
      <div className={`relative w-10 h-5 flex items-center rounded-full transition-colors ${enabled ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gray-600'}`}>
        <div className={`absolute w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
      </div>
    </div>
  );
};

export default Toggle;
