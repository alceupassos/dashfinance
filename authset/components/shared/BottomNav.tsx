import React from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../../types.ts';
import { HomeIcon, LockIcon, BotIcon, SettingsIcon } from '../../constants.tsx';

interface BottomNavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-full h-16 transition-colors duration-300 focus:outline-none ${
        isActive ? 'text-orange-400' : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-xs mt-1 font-medium">{label}</span>
      {isActive && (
        <motion.div
          className="absolute bottom-0 w-8 h-1 bg-orange-400 rounded-full"
          layoutId="active-nav-indicator"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, setScreen }) => {
  const navItems = [
    { id: 'home', label: 'Códigos', icon: <HomeIcon />, screen: 'home' as Screen },
    { id: 'vault', label: 'Cofre', icon: <LockIcon />, screen: 'vault' as Screen },
    { id: 'assistant', label: 'Assistente', icon: <BotIcon />, screen: 'assistant' as Screen },
    { id: 'settings', label: 'Ajustes', icon: <SettingsIcon />, screen: 'settings' as Screen },
  ];

  return (
    <nav className="nav-dock absolute bottom-0 left-0 right-0 max-w-md mx-auto h-20">
      <div className="relative flex justify-around h-full">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={currentScreen === item.screen}
            onClick={() => setScreen(item.screen)}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
