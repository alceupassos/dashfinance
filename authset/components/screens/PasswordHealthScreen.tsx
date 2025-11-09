import React from 'react';
import { motion } from 'framer-motion';

interface PasswordHealthScreenProps {
  onBack: () => void;
}

const CircleProgress = ({ percentage }: { percentage: number }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        <circle
          className="text-white/10"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
        />
        <motion.circle
          className="text-green-400"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0}}
          animate={{ opacity: 1}}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-4xl font-bold text-white">
          {percentage}%
        </motion.span>
        <span className="text-sm text-gray-400">Seguro</span>
      </div>
    </div>
  );
};

const PasswordHealthScreen: React.FC<PasswordHealthScreenProps> = ({ onBack }) => {
  const healthScore = 95; // Example score
  return (
    <div className="p-4 pt-12">
      <header className="mb-8 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-3xl font-bold text-white tracking-tighter">Saúde da Senha</h1>
      </header>

      <div className="flex flex-col items-center mb-8">
        <CircleProgress percentage={healthScore} />
        <p className="mt-4 text-lg text-gray-300">Sua pontuação de segurança é ótima!</p>
      </div>

      <div className="space-y-4">
        <div className="bg-black/20 p-4 rounded-xl border border-white/10">
          <h3 className="font-bold text-white">Senhas Fracas</h3>
          <p className="text-sm text-gray-400">Nenhuma encontrada. Bom trabalho!</p>
        </div>
        <div className="bg-black/20 p-4 rounded-xl border border-white/10">
          <h3 className="font-bold text-white">Senhas Reutilizadas</h3>
          <p className="text-sm text-gray-400">Nenhuma encontrada. Continue assim!</p>
        </div>
         <div className="bg-black/20 p-4 rounded-xl border border-white/10">
          <h3 className="font-bold text-white">Senhas Expostas</h3>
          <p className="text-sm text-gray-400">Nenhuma violação de dados encontrada para suas contas.</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordHealthScreen;
