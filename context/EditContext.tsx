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
  setIsEditMode: (value: boolean) => void;
  isCreateMode: boolean;
  setIsCreateMode: (value: boolean) => void;
  imageSelected: Image | null;
  setImageSelected: (value: Image | null) => void;
  currentEditType: string | null;
  setCurrentEditType: (value: string | null) => void;
  selectedForSwap: Image | null;
  setSelectedForSwap: (value: Image | null) => void;
  editCatalog: Catalog | null;
  setEditCatalog: (value: object) => void;
  isEditCoverImage: boolean;
  setIsEditCoverImage: (value: boolean) => void;
  isImageReorderMode: boolean;
  setIsImageReorderMode: (value: boolean) => void;
  handleCancelChanges: () => void;
  selectedFiles: File[] | [];
  setSelectedFiles: (selectedFiles: File[] | null) => void;
  previewData: PreviewImage[] | [];
  setPreviewData: (previewData: PreviewImage[] | null) => void;
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
  const [imageSelected, setImageSelected] = useState(null);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<Image | null>(null);
  const [editCatalog, setEditCatalog] = useState<Catalog | null>();
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

  return (
    <EditContext.Provider value={value}>
      {children}
    </EditContext.Provider>
  );
};