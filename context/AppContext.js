import React, { createContext, useState, useContext, useEffect } from 'react';

// Creating the context object and exporting so that other components can use it.
export const AppContext = createContext();

export const useAppContext = () => useContext( AppContext );

export const AppProvider = ( { children } ) => {
    const [isPhotographyPage, setIsPhotographyPage] = useState( true );
    const [photoDataList, setPhotoDataList] = useState( [] );
    const [currentCatalog, setCurrentCatalog] = useState( '' );
    const [isMobile, setIsMobile] = useState( false );


    useEffect( () => {
        const checkIsMobile = () => {
            setIsMobile( window.innerWidth <= 768 ); // You can adjust this threshold
        };

        // Check initially
        checkIsMobile();

        // Add event listener for window resize
        window.addEventListener( 'resize', checkIsMobile );

        // Cleanup
        return () => window.removeEventListener( 'resize', checkIsMobile );
    }, [] );

    return (
        <AppContext.Provider value={{
            isPhotographyPage,
            setIsPhotographyPage,
            photoDataList,
            setPhotoDataList,
            currentCatalog,
            setCurrentCatalog,
            isMobile
        }}>
            {children}
        </AppContext.Provider>
    );
};