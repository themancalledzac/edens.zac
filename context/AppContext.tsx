import React, { createContext, useContext, useEffect,useState } from 'react';

import { Catalog } from '@/types/Catalog';
import { Image } from '@/types/Image';

// Creating the context object and exporting so that other components can use it.
// export const AppContext = createContext();

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

    // Check initially
    checkIsMobile();

    // Set up event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
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