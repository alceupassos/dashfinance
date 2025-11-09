import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Screen } from './types.ts';
import BottomNav from './components/shared/BottomNav.tsx';
import HomeScreen from './components/screens/HomeScreen.tsx';
import VaultScreen from './components/screens/VaultScreen.tsx';
import AssistantScreen from './components/screens/AssistantScreen.tsx';
import SettingsScreen from './components/screens/SettingsScreen.tsx';
import AddCodeScreen from './components/screens/AddCodeScreen.tsx';
import SuggestPasswordScreen from './components/screens/SuggestPasswordScreen.tsx';
import PasswordHealthScreen from './components/screens/PasswordHealthScreen.tsx';
import OnboardingScreen from './components/screens/OnboardingScreen.tsx';
import BiometricLockScreen from './components/screens/BiometricLockScreen.tsx';
import SplashScreen from './components/screens/SplashScreen.tsx';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');

  useEffect(() => {
    const timer = setTimeout(() => {
      const hasOnboarded = localStorage.getItem('onboarded') === 'true';
      if (!hasOnboarded) {
        setCurrentScreen('onboarding');
      } else {
        setCurrentScreen('biometric-lock');
      }
    }, 2500); // Splash screen duration
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarded', 'true');
    setCurrentScreen('biometric-lock');
  };

  const handleUnlock = () => {
    setCurrentScreen('home');
  };

  const navigateTo = (screen: Screen) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    setCurrentScreen(previousScreen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      case 'biometric-lock':
        return <BiometricLockScreen onUnlock={handleUnlock} />;
      case 'home':
        return <HomeScreen onAddCode={() => navigateTo('add-code')} />;
      case 'vault':
        return <VaultScreen onSuggestPassword={() => navigateTo('suggest-password')} onPasswordHealth={() => navigateTo('password-health')} />;
      case 'assistant':
        return <AssistantScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'add-code':
        return <AddCodeScreen onBack={goBack} />;
      case 'suggest-password':
        return <SuggestPasswordScreen onBack={goBack} />;
      case 'password-health':
        return <PasswordHealthScreen onBack={goBack} />;
      default:
        return <SplashScreen />;
    }
  };

  const showNav = ['home', 'vault', 'assistant', 'settings'].includes(currentScreen);

  return (
    <div className="app-shell">
      <div className="app-device">
        <div className="app-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 overflow-y-auto no-scrollbar p-6 pt-10"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
          {showNav && <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />}
        </div>
      </div>
    </div>
  );
};

export default App;
