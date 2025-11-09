import React, { useState, useEffect } from 'react';
import { generatePassword, PasswordOptions } from '../../utils/passwordGenerator.ts';
// FIX: Added file extension to type import
import { PasswordStrength } from '../../types.ts';
import Button from '../shared/Button.tsx';
import Toggle from '../shared/Toggle.tsx';
import PasswordStrengthMeter from '../shared/PasswordStrengthMeter.tsx';
// FIX: Added file extension to constants import
import { CopyIcon, CheckIcon } from '../../constants.tsx';

interface SuggestPasswordScreenProps {
  onBack: () => void;
}

const checkPasswordStrength = (password: string): { strength: PasswordStrength, score: number } => {
    let score = 0;
    if (!password) return { strength: 'Fraca', score: 0 };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    // FIX: Corrected regex from `/\d]/` to `/\d/`
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const scorePercentage = (score / 6) * 100;

    if (score < 3) return { strength: 'Fraca', score: scorePercentage };
    if (score < 4) return { strength: 'Média', score: scorePercentage };
    if (score < 6) return { strength: 'Forte', score: scorePercentage };
    return { strength: 'Muito Forte', score: 100 };
};


const SuggestPasswordScreen: React.FC<SuggestPasswordScreenProps> = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });
  const [strength, setStrength] = useState<PasswordStrength>('Fraca');
  const [score, setScore] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const newPassword = generatePassword(options);
    setPassword(newPassword);
  }, [options]);

  useEffect(() => {
    const { strength, score } = checkPasswordStrength(password);
    setStrength(strength);
    setScore(score);
  }, [password]);
  
  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const regenerate = () => {
    const newPassword = generatePassword(options);
    setPassword(newPassword);
  }

  return (
    <div>
      <header className="mb-6 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-3xl font-bold text-white tracking-tighter">Gerador de Senha</h1>
      </header>
      
      <div className="bg-gray-800/50 p-4 rounded-xl mb-6 ring-1 ring-white/10 flex items-center justify-between">
        <p className="text-2xl font-mono text-orange-400 tracking-wider break-all">{password}</p>
        <button onClick={handleCopy} className="p-2 text-gray-400 hover:text-white transition-colors">
          {copied ? <CheckIcon className="w-6 h-6 text-green-400" /> : <CopyIcon className="w-6 h-6" />}
        </button>
      </div>

      <PasswordStrengthMeter strength={strength} score={score} />

      <div className="space-y-4 my-6">
        <div>
          <label htmlFor="length" className="block text-sm font-medium text-gray-300 mb-1">Tamanho: {options.length}</label>
          <input
            id="length"
            type="range"
            min="8"
            max="32"
            value={options.length}
            onChange={(e) => setOptions(prev => ({ ...prev, length: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <Toggle label="Letras Maiúsculas (A-Z)" enabled={options.includeUppercase} setEnabled={(val) => setOptions(p => ({...p, includeUppercase: val}))} />
        <Toggle label="Letras Minúsculas (a-z)" enabled={options.includeLowercase} setEnabled={(val) => setOptions(p => ({...p, includeLowercase: val}))} />
        <Toggle label="Números (0-9)" enabled={options.includeNumbers} setEnabled={(val) => setOptions(p => ({...p, includeNumbers: val}))} />
        <Toggle label="Símbolos (!@#$)" enabled={options.includeSymbols} setEnabled={(val) => setOptions(p => ({...p, includeSymbols: val}))} />
      </div>

      <Button onClick={regenerate}>Gerar Nova Senha</Button>
    </div>
  );
};

export default SuggestPasswordScreen;
