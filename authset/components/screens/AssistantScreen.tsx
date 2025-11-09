import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { ChatMessage } from '../../types.ts';
import { SendIcon, MicIcon } from '../../constants.tsx';
import { encode, decode, decodeAudioData } from '../../utils/audio.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const AssistantScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const sessionRef = useRef<LiveSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const processAudio = useCallback(async (message: LiveServerMessage) => {
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio) {
      if (!outputAudioContextRef.current) {
        // FIX: Cast window to any to support webkitAudioContext for cross-browser compatibility.
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = outputAudioContextRef.current;
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    }
    
    const transcription = message.serverContent?.outputTranscription?.text;
    if (transcription) {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
          lastMessage.text += transcription;
        } else {
          newMessages.push({ role: 'model', text: transcription });
        }
        return newMessages;
      });
    }

    if (message.serverContent?.turnComplete) {
      setIsLoading(false);
    }
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setIsLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      // FIX: Cast window to any to support webkitAudioContext for cross-browser compatibility.
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // FIX: Use a session promise to prevent stale closures in callbacks.
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => console.log('Session opened'),
          onmessage: processAudio,
          onerror: (e) => {
            console.error('Session error:', e);
            setIsLoading(false);
            setIsRecording(false);
          },
          onclose: () => console.log('Session closed'),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: 'Você é um assistente de IA especialista em cibersegurança do app auth.br. Responda exclusivamente a perguntas sobre segurança de senhas, autenticação de dois fatores (2FA), e dicas de segurança digital. Seja conciso, claro e amigável. Suas respostas de áudio devem ser calmas e seguras.',
        },
      });
      
      sessionPromise.then(session => {
        sessionRef.current = session;
      });
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob: Blob = {
          // FIX: Correctly create Uint8Array from ArrayBuffer instead of using an incorrect type cast.
          data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32767)).buffer)),
          mimeType: 'audio/pcm;rate=16000',
        };
        // FIX: Use the session promise to send data, ensuring the active session is used.
        sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;
    } catch (err) {
      console.error('Error starting recording:', err);
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    sessionRef.current?.close();

    // The turn might not be complete, but we stop loading for the user
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const handleSendText = async () => {
     if (!input.trim()) return;
     setIsLoading(true);
     const userMessage: ChatMessage = { role: 'user', text: input };
     setMessages(prev => [...prev, userMessage]);
     const textToSend = input;
     setInput('');
     
     try {
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: textToSend,
         config: {
            systemInstruction: 'Você é um assistente de IA especialista em cibersegurança do app auth.br. Responda exclusivamente a perguntas sobre segurança de senhas, autenticação de dois fatores (2FA), e dicas de segurança digital. Seja conciso, claro e amigável.',
         }
       });
       setMessages(prev => [...prev, {role: 'model', text: response.text}]);
     } catch (err) {
       console.error(err);
       setMessages(prev => [...prev, {role: 'model', text: 'Desculpe, ocorreu um erro.'}]);
     } finally {
       setIsLoading(false);
     }
  };


  return (
    <div className="flex flex-col h-full p-4 pt-12">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-white tracking-tighter">Assistente de IA</h1>
        <p className="text-gray-400">Pergunte sobre segurança e senhas</p>
      </header>
      
      <div className="flex-grow overflow-y-auto pr-2 space-y-4 no-scrollbar pb-28">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div 
              key={index} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-gray-800 text-white rounded-bl-none'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              className="flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
               <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-800 text-white rounded-bl-none flex items-center gap-2">
                 <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-0"></span>
                 <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-150"></span>
                 <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-300"></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      <div className="absolute bottom-20 left-0 right-0 max-w-md mx-auto p-4">
        <div className="bg-black/20 border border-white/10 rounded-2xl p-2 flex items-end gap-2 backdrop-blur-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendText())}
            placeholder="Digite ou use o microfone..."
            className="flex-grow bg-transparent resize-none text-white placeholder-gray-500 focus:outline-none max-h-24 no-scrollbar p-2"
            rows={1}
            disabled={isRecording}
          />
          <button
            onClick={input ? handleSendText : handleToggleRecord}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
              ${input ? 'bg-orange-500 text-white' : ''}
              ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-700 text-orange-400'}
            `}
          >
            {input ? <SendIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantScreen;