import React, {createContext, useContext, useState} from "react";

interface EditContextState {
    isEditMode: boolean;
    setIsEditMode: (value: boolean) => void;
    currentEditType: string | null;
    setCurrentEditType: (value: string | null) => void;
}

const EditContext = createContext<EditContextState | undefined>(undefined);

export const useEditContext = () => {
    const context = useContext(EditContext);
    if (context === undefined) {
        throw new Error('useEditContext must be used within an EditProvider');
    }
    return context;
};

interface EditProviderProps {
    children: React.ReactNode;
}

export const EditProvider: React.FC<EditProviderProps> = ({children}) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentEditType, setCurrentEditType] = useState<string | null>(null);

    const value = {
        isEditMode,
        setIsEditMode,
        currentEditType,
        setCurrentEditType
    };

    return (
        <EditContext.Provider value={value}>
            {children}
        </EditContext.Provider>
    )
}