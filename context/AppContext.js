import React, { createContext, useState, useContext } from 'react';

// Creating the context object and exporting so that other components can use it.
export const AppContext = createContext();

export const useAppContext = () => useContext( AppContext );

export const AppProvider = ( { children } ) => {
    const [isPhotographyPage, setIsPhotographyPage] = useState( true );
    const [photoDataList, setPhotoDataList] = useState( [] );
    const [currentCatalog, setCurrentCatalog] = useState( '' );

    // You can add more state and functions as needed here

    return (
        <AppContext.Provider value={{
            isPhotographyPage,
            setIsPhotographyPage,
            photoDataList,
            setPhotoDataList,
            currentCatalog,
            setCurrentCatalog
        }}>
            {children}
        </AppContext.Provider>
    );
};