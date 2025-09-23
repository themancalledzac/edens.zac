import React, { createContext, useContext, useEffect, useState } from 'react';

import { type Catalog } from '@/types/Catalog';
import { type Image } from '@/types/Image';
import { useDebounce } from '@/app/utils/debounce';

/**
 * Global app state, device info, current view data
 *
 * Creating the context object and exporting so that other components can use it.
 * export const AppContext = createContext();
 */

interface AppContextState {
  photoDataList: Image[]; // TODO: Verify that this DataList is an Image(metadata) List. CONFIRM
  setPhotoDataList: (data: Image[]) => void;
  currentCatalog: Catalog | null;
  setCurrentCatalog: (value: Catalog | null) => void;
  isMobile: boolean;
  setIsMobile: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
}

const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [photoDataList, setPhotoDataList] = useState<Image[]>([]);
  const [currentCatalog, setCurrentCatalog] = useState<Catalog | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);


  useEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
      setIsMobile(width <= 768); // You can adjust this threshold
    };

    // Debounced resize handler for better performance
    const debouncedCheckIsMobile = useDebounce(checkIsMobile, 100);

    // Check initially
    checkIsMobile();

    // Set up debounced event listener for window resize
    window.addEventListener('resize', debouncedCheckIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', debouncedCheckIsMobile);
  }, []);

  const value: AppContextState = {
    photoDataList,
    setPhotoDataList,
    currentCatalog,
    setCurrentCatalog,
    isMobile,
    setIsMobile,
    isLoading,
    setIsLoading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};