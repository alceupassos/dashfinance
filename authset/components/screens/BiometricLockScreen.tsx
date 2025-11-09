import React from 'react';
import { motion } from 'framer-motion';
import { AuthBrLogo, FaceIdIcon, FingerprintIcon } from '../../constants.tsx';
import Button from '../shared/Button.tsx';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlock }) => {
  return (
    <div className="flex flex-col h-full justify-center items-center text-center gap-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <AuthBrLogo className="w-20 h-20" />
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-3xl font-bold text-white tracking-tighter mb-2">
        auth.br Bloqueado
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-white/60">
        Proximidade BLE detectada. Valide rosto + 2 digitais aleatórias.
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6, type: 'spring' }}
        className="flex items-center gap-8 text-orange-400"
      >
        <FaceIdIcon className="w-20 h-20" />
        <FingerprintIcon className="w-20 h-20" />
      </motion.div>

      <div className="w-full max-w-xs mt-auto pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Button onClick={onUnlock}>Desbloquear Agora</Button>
        </motion.div>
        <p className="text-xs text-white/40 mt-3">BLE Trust Circle ativo: Ana, Bruno</p>
      </div>
    </div>
  );
};

export default BiometricLockScreen;
