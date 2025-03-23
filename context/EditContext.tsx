import React, {createContext, useContext, useState} from "react";
import {Image} from "@/types/Image";
import {Catalog} from "@/types/Catalog";

interface EditContextState {
    isEditMode: boolean;
    setIsEditMode: (value: boolean) => void;
    imageSelected: Image | null;
    setImageSelected: (value: Image | null) => void;
    currentEditType: string | null;
    setCurrentEditType: (value: string | null) => void;
    selectedForSwap: Image | null;
    setSelectedForSwap: (value: Image | null) => void;
    editCatalog: Catalog | null;
    setEditCatalog: (value: Catalog | null) => void;
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
    const [imageSelected, setImageSelected] = useState(null);
    const [currentEditType, setCurrentEditType] = useState<string | null>(null);
    const [selectedForSwap, setSelectedForSwap] = useState<Image | null>(null);
    const [editCatalog, setEditCatalog] = useState<Catalog | null>(null);

    const value = {
        isEditMode,
        setIsEditMode,
        imageSelected,
        setImageSelected,
        currentEditType,
        setCurrentEditType,
        selectedForSwap,
        setSelectedForSwap,
        editCatalog,
        setEditCatalog
    };

    return (
        <EditContext.Provider value={value}>
            {children}
        </EditContext.Provider>
    )
}