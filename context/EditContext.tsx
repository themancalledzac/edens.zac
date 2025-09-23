import React, { createContext, useContext, useState } from 'react';

import { type PreviewImage } from '@/Components/Catalog/ImageUploadList';
import { type Catalog } from '@/types/Catalog';
import { type Image } from '@/types/Image';

/**
 * Editing state for any content type
 *
 * Currently works with Catalogs and Blogs
 */

interface EditContextState {
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isCreateMode: boolean;
  setIsCreateMode: React.Dispatch<React.SetStateAction<boolean>>;
  imageSelected: Image | null;
  setImageSelected: React.Dispatch<React.SetStateAction<Image | null>>;
  currentEditType: string | null;
  setCurrentEditType: React.Dispatch<React.SetStateAction<string | null>>;
  selectedForSwap: Image | null;
  setSelectedForSwap: React.Dispatch<React.SetStateAction<Image | null>>;
  editCatalog: Catalog | null;
  setEditCatalog: React.Dispatch<React.SetStateAction<Catalog | null>>;
  isEditCoverImage: boolean;
  setIsEditCoverImage: React.Dispatch<React.SetStateAction<boolean>>;
  isImageReorderMode: boolean;
  setIsImageReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleCancelChanges: () => void;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  previewData: PreviewImage[];
  setPreviewData: React.Dispatch<React.SetStateAction<PreviewImage[]>>;
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

export const EditProvider: React.FC<EditProviderProps> = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [imageSelected, setImageSelected] = useState<Image | null>(null);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<Image | null>(null);
  const [editCatalog, setEditCatalog] = useState<Catalog | null>(null);
  const [isEditCoverImage, setIsEditCoverImage] = useState<boolean>(false);
  const [isImageReorderMode, setIsImageReorderMode] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<PreviewImage[]>([]);

  const handleCancelChanges = () => {
    if (isCreateMode) {
      setIsEditMode(false);
      setIsCreateMode(false);
      setIsEditCoverImage(false);
      // Navigate back to home page
      window.location.href = '/';
    } else {
      setIsEditMode(false);
      setEditCatalog(null);
    }
  };

  const value = {
    isEditMode,
    setIsEditMode,
    isCreateMode,
    setIsCreateMode,
    imageSelected,
    setImageSelected,
    currentEditType,
    setCurrentEditType,
    selectedForSwap,
    setSelectedForSwap,
    editCatalog,
    setEditCatalog,
    isEditCoverImage,
    setIsEditCoverImage,
    isImageReorderMode,
    setIsImageReorderMode,
    handleCancelChanges,
    selectedFiles,
    setSelectedFiles,
    previewData,
    setPreviewData,
  };

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
};
