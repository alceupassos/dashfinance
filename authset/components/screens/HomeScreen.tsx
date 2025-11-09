import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Account } from '../../types.ts';
import CodeDisplay from '../shared/CodeDisplay.tsx';
import { AuthBrLogo } from '../../constants.tsx';

interface HomeScreenProps {
  onAddCode: () => void;
}

const sampleAccounts: Account[] = [
  { id: '1', issuer: 'Google', user: 'ana.souza@email.com', secret: 'JBSWY3DPEHPK3PXP', tags: ['Trabalho'] },
  { id: '2', issuer: 'GitHub', user: 'pedro_santos', secret: 'KRSV2Y3PNF5GC4T4', tags: ['Dev'] },
  { id: '3', issuer: 'Discord', user: 'gamer_pedro', secret: 'L4SSV5DFNV6GC5T5', tags: ['Pessoal'] },
];

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};


const HomeScreen: React.FC<HomeScreenProps> = ({ onAddCode }) => {
  const [accounts, setAccounts] = useState<Account[]>(sampleAccounts);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAccounts = accounts.filter(acc => 
    acc.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="chip mb-3">Auth.Br</p>
          <h1 className="text-3xl font-semibold tracking-tight">Códigos inteligentes</h1>
          <p className="text-sm text-white/60">Tokens sincronizados com BLE + biometria.</p>
        </div>
        <AuthBrLogo className="w-14 h-14" />
      </header>

      <div className="relative">
        <input
          type="text"
          placeholder="Pesquisar serviços ou usuários"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <motion.div 
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 pb-28"
      >
        <AnimatePresence>
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map(account => (
            <motion.div key={account.id} variants={itemVariants} layout>
              <CodeDisplay account={account} />
            </motion.div>
          ))
        ) : (
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-gray-500 mt-16"
          >
            Nenhum código encontrado.
          </motion.p>
        )}
        </AnimatePresence>
      </motion.div>

      <motion.button
        onClick={onAddCode}
        className="btn-gradient fixed bottom-24 right-6 rounded-full p-4 shadow-lg shadow-orange-500/30"
        aria-label="Adicionar novo código"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
      </motion.button>
    </div>
  );
};

export default HomeScreen;
