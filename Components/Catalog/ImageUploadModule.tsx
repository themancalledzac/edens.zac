import React from 'react';

import styles from '@/styles/Upload.module.scss';

interface ImageUploadModuleProps {
  onImagesSelected: (files: File[]) => void;
}

const ImageUploadModule: React.FC<ImageUploadModuleProps> = ({ onImagesSelected }) => {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    console.log('zac inside imageUploadModule');

    const files = Array.from(e.target.files);
    onImagesSelected(files);
  };

  return (
    <div className={styles.uploadZone}>
      <div className={styles.container}>
        <h1 className={styles.icon}>UPLOAD</h1>
        <p className={styles.title}>Select images</p>
        <p className={styles.subtitle}>Support for multiple files</p>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className={styles.input}
          id="file-upload"
        />

        <button
          onClick={() => document.getElementById('file-upload')?.click()}
          className={styles.button}
        >
          Select Images
        </button>
      </div>
    </div>
  );
};

export default ImageUploadModule;