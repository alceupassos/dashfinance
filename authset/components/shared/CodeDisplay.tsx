import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Account } from '../../types.ts';
import { CopyIcon, CheckIcon } from '../../constants.tsx';

interface CodeDisplayProps {
  account: Account;
}

// Base32 decoding function
const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32Decode = (encoded: string): ArrayBuffer => {
  encoded = encoded.replace(/ /g, '').toUpperCase();
  const bits = encoded.split('').map(char => {
    const val = base32Chars.indexOf(char);
    if (val < 0) throw new Error('Invalid base32 character');
    return val.toString(2).padStart(5, '0');
  }).join('');
  
  const chunks = bits.match(/.{1,8}/g)?.map(chunk => parseInt(chunk.padEnd(8, '0'), 2)) || [];
  return new Uint8Array(chunks).buffer;
};

// TOTP generation function using Web Crypto API
async function generateTOTP(secret: string): Promise<string> {
  try {
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const counter = Math.floor(epoch / timeStep);
    
    const counterBuffer = new ArrayBuffer(8);
    const dataView = new DataView(counterBuffer);
    // JS bitwise operations are 32-bit, so we handle the 64-bit counter manually
    const high = Math.floor(counter / 0x100000000);
    const low = counter % 0x100000000;
    dataView.setUint32(0, high, false);
    dataView.setUint32(4, low, false);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    
    const offset = new DataView(signature).getUint8(19) & 0xf;
    const truncatedHash = new DataView(signature).getInt32(offset, false) & 0x7fffffff;
    const otp = truncatedHash % 1000000;
    
    return otp.toString().padStart(6, '0');
  } catch (error) {
    console.error("Error generating TOTP:", error);
    return "Error";
  }
}

const tagColors: { [key: string]: string } = {
  'Trabalho': 'bg-blue-500/20 text-blue-300',
  'Pessoal': 'bg-purple-500/20 text-purple-300',
  'Dev': 'bg-green-500/20 text-green-300',
};

const getTagColor = (tag: string) => tagColors[tag] || 'bg-gray-500/20 text-gray-300';


const CodeDisplay: React.FC<CodeDisplayProps> = ({ account }) => {
  const [code, setCode] = useState('------');
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);

  const updateCode = useCallback(async () => {
    const seconds = new Date().getSeconds();
    const newTimeLeft = 30 - (seconds % 30);
    setTimeLeft(newTimeLeft);
    if (newTimeLeft === 30 || code === '------') {
      const newCode = await generateTOTP(account.secret);
      setCode(newCode);
    }
  }, [account.secret, code]);

  useEffect(() => {
    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [updateCode]);
  
  const handleCopy = () => {
    if (code !== '------' && code !== 'Error') {
      navigator.clipboard.writeText(code.replace(/\s/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const progress = (timeLeft / 30) * 100;
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3, 6)}`;

  return (
    <div className="glass-card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-lg font-semibold">{account.issuer}</p>
          <p className="text-sm text-white/60">{account.user}</p>
        </div>
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" className="text-white/10" strokeWidth="3"></circle>
            <motion.circle
              cx="18" cy="18" r="16" fill="none"
              className="text-orange-400"
              strokeWidth="3"
              strokeDasharray="100, 100"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 100 - progress }}
              animate={{ strokeDashoffset: 100 - progress }}
              transition={{ duration: 1, ease: "linear" }}
            ></motion.circle>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">{timeLeft}</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
           {account.tags.map(tag => (
             <span key={tag} className={`text-xs font-semibold px-2 py-1 rounded-full ${getTagColor(tag)}`}>{tag}</span>
           ))}
        </div>
        <div className="flex items-center">
            <p className="text-4xl font-mono text-orange-400 tracking-[0.35em]">{formattedCode}</p>
            <button onClick={handleCopy} className="p-2 ml-2 text-gray-400 hover:text-white transition-colors">
            {copied ? <CheckIcon className="w-6 h-6 text-green-400" /> : <CopyIcon className="w-6 h-6" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CodeDisplay;
