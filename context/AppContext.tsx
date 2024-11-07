import React, {createContext, useState, useContext, useEffect} from 'react';
import {Image} from "@/types/Image";

// Creating the context object and exporting so that other components can use it.
// export const AppContext = createContext();

interface AppContextState {
    homePageType: string;
    setHomePageType: (value: string) => void;
    photoDataList: Image[]; // TODO: Verify that this DataList is an Image(metadata) List. CONFIRM
    setPhotoDataList: (data: Image[]) => void;
    currentCatalog: string;
    setCurrentCatalog: (value: string) => void;
    isMobile: boolean;
    setIsMobile: (value: boolean) => void;
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;
}

const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
};

interface AppProviderProps {
    children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({children}) => {
    const [homePageType, setHomePageType] = useState<string>('photography');
    const [photoDataList, setPhotoDataList] = useState<Image[]>([]);
    const [currentCatalog, setCurrentCatalog] = useState<string>('');
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);


    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768); // You can adjust this threshold
        };

        // Check initially
        checkIsMobile();

        // Add event listener for window resize
        window.addEventListener('resize', checkIsMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const value: AppContextState = {
        homePageType,
        setHomePageType,
        photoDataList,
        setPhotoDataList,
        currentCatalog,
        setCurrentCatalog,
        isMobile,
        setIsMobile,
        isLoading,
        setIsLoading
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};