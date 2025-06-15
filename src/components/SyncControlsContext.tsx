import React, { createContext, useState, useContext } from 'react';

interface SyncControlsContextType {
  isSyncEnabled: boolean;
  setIsSyncEnabled: (enabled: boolean) => void;
  // Add any other synchronized states here
}

export const SyncControlsContext = createContext<SyncControlsContextType>({
  isSyncEnabled: true,
  setIsSyncEnabled: () => {}
});

export const useSyncControls = () => useContext(SyncControlsContext);

export const SyncControlsProvider: React.FC<{
  children: React.ReactNode;
  initialSyncEnabled?: boolean;
}> = ({ children, initialSyncEnabled = true }) => {
  const [isSyncEnabled, setIsSyncEnabled] = useState(initialSyncEnabled);
  
  return (
    <SyncControlsContext.Provider
      value={{
        isSyncEnabled,
        setIsSyncEnabled
      }}
    >
      {children}
    </SyncControlsContext.Provider>
  );
};
