import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthBrLogo } from '../../constants.tsx';
import Button from '../shared/Button.tsx';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    icon: "🛡️",
    title: "Proteja suas contas com 2FA.",
    description: "Adicione uma camada extra de segurança que só você pode acessar."
  },
  {
    icon: "📱",
    title: "Escaneie QR ou cole a chave secreta.",
    description: "Adicionar novas contas é rápido, fácil e seguro."
  },
  {
    icon: "🔐",
    title: "Ative o Vault para guardar e gerar senhas.",
    description: "Mantenha todas as suas senhas seguras em um só lugar."
  }
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < onboardingSteps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between items-center text-center gap-10">
      <div className="w-full">
        <div className="inline-flex items-center gap-3 px-4 py-2 surface-panel mx-auto">
          <AuthBrLogo className="w-14 h-14" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Bem-vindo</p>
            <p className="text-lg font-semibold">Auth.br</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="chip mb-4">{onboardingSteps[step].icon}</div>
            <h1 className="text-2xl font-semibold tracking-tight mb-3">{onboardingSteps[step].title}</h1>
            <p className="text-base text-white/60 max-w-sm">{onboardingSteps[step].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-xs mb-6">
        <div className="flex justify-center gap-2 mb-6">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-1 rounded-full transition ${index === step ? 'bg-gradient-to-r from-[#A23FFF] to-[#FF7A00]' : 'bg-white/15'}`}
            />
          ))}
        </div>
        <Button onClick={handleNext}>
          {step < onboardingSteps.length - 1 ? 'Continuar' : 'Começar'}
        </Button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
