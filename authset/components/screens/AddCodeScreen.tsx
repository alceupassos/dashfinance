import React, { useState } from 'react';
// FIX: Added file extension to type import
import { Account } from '../../types.ts';
// FIX: Added file extension to component imports
import Button from '../shared/Button.tsx';
import Input from '../shared/Input.tsx';

interface AddCodeScreenProps {
  onBack: () => void;
  onAdd: (account: Omit<Account, 'id'>) => void;
}

const AddCodeScreen: React.FC<AddCodeScreenProps> = ({ onBack, onAdd }) => {
  const [issuer, setIssuer] = useState('');
  const [user, setUser] = useState('');
  const [secret, setSecret] = useState('');
  const [tags, setTags] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (issuer && user && secret) {
      onAdd({
        issuer,
        user,
        secret,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    }
  };

  return (
    <div>
      <header className="mb-6 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-3xl font-bold text-white tracking-tighter">Adicionar Código</h1>
      </header>

      <div className="text-center bg-gray-800/50 p-4 rounded-xl mb-6 ring-1 ring-white/10">
        <p className="text-gray-300">Escaneie o QR Code do serviço</p>
        {/* Placeholder for QR Scanner */}
        <div className="w-full aspect-square bg-gray-700 my-4 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <p className="sr-only">QR Scanner Area</p>
        </div>
        <p className="text-sm text-gray-500">ou insira os detalhes manualmente abaixo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Serviço (ex: Google)" id="issuer" value={issuer} onChange={e => setIssuer(e.target.value)} required />
        <Input label="Nome de usuário (ex: user@gmail.com)" id="user" value={user} onChange={e => setUser(e.target.value)} required />
        <Input label="Chave secreta" id="secret" value={secret} onChange={e => setSecret(e.target.value)} required />
        <Input label="Tags (separadas por vírgula)" id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="Trabalho, Pessoal..." />

        <div className="pt-4">
            <Button type="submit" variant="primary">Adicionar Conta</Button>
        </div>
      </form>
    </div>
  );
};

export default AddCodeScreen;
