import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VaultItem } from '../../types.ts';
import Button from '../shared/Button.tsx';

interface VaultScreenProps {
  onSuggestPassword: () => void;
  onPasswordHealth: () => void;
}

const sampleVaultItems: VaultItem[] = [
    { id: '1', service: 'Facebook', username: 'ana.souza', strength: 'Fraca' },
    { id: '2', service: 'Netflix', username: 'joao_lima@email.com', strength: 'Forte' },
    { id: '3', service: 'Steam', username: 'pedro_gamer', strength: 'Média' },
];

const strengthColors: Record<string, string> = {
    'Fraca': '#FF5F5F',
    'Média': '#FFB347',
    'Forte': '#7DF11C',
    'Muito Forte': '#4DD0E1',
};

const VaultScreen: React.FC<VaultScreenProps> = ({ onSuggestPassword, onPasswordHealth }) => {
    const [items, setItems] = useState<VaultItem[]>(sampleVaultItems);

    return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <p className="chip mb-3">Vault</p>
          <h1 className="text-3xl font-semibold tracking-tight">Senhas protegidas</h1>
          <p className="text-white/60 text-sm">Gerador, auditoria e BLE Trust em um único cofre.</p>
        </div>
        <button className="p-3 bg-white/10 rounded-2xl border border-white/15 hover:bg-white/15 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </header>

      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.2}} className="space-y-3">
        <Button onClick={onSuggestPassword} variant="primary">Gerar senha forte</Button>
        <Button onClick={onPasswordHealth} variant="secondary">Saúde das Senhas</Button>
      </motion.div>

      <div className="space-y-3">
          {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="glass-card flex justify-between items-center"
              >
                  <div>
                      <p className="font-semibold">{item.service}</p>
                      <p className="text-sm text-white/60">{item.username}</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: strengthColors[item.strength] || '#b0b0b0' }}>{item.strength}</p>
              </motion.div>
          ))}
      </div>

       {items.length === 0 && (
            <div className="text-center text-white/40 py-16">
                <p>Seu cofre está vazio.</p>
                <p className="text-sm">Comece adicionando suas senhas.</p>
            </div>
        )}
    </div>
  );
};

export default VaultScreen;
