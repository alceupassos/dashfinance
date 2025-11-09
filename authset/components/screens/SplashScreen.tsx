import React from 'react';
import { motion } from 'framer-motion';
import { AngraIoLogo } from '../../constants.tsx';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col h-full w-full items-center justify-center text-center gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="p-8 rounded-3xl glass-card"
      >
        <AngraIoLogo className="w-24 h-24" />
      </motion.div>
      <div>
        <p className="chip">Angra.IO</p>
        <h1 className="text-2xl font-semibold mt-3">Segurança que te acompanha</h1>
        <p className="text-white/60 text-sm">BLE + biometria + IA para desbloqueios instantâneos.</p>
      </div>
    </div>
  );
};

export default SplashScreen;
