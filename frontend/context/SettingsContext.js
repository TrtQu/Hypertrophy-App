import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [unitSystem, setUnitSystem] = useState('metric');
  const [restTimer, setRestTimer] = useState(90);
  const [weightIncrement, setWeightIncrement] = useState(2.5);

  const switchUnitSystem = (system) => {
    setUnitSystem(system);
    setWeightIncrement(system === 'metric' ? 2.5 : 5);
  };

  return (
    <SettingsContext.Provider value={{
      unitSystem,
      switchUnitSystem,
      restTimer,
      setRestTimer,
      weightIncrement,
      setWeightIncrement,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
