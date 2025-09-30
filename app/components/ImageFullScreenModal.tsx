'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './ImageFullScreenModal.module.scss';

interface ImageFullScreenModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

interface ScreenSize {
  width: number;
  height: number;
}

export function ImageFullScreenModal({ src, alt, onClose }: ImageFullScreenModalProps) {
  const [mounted, setMounted] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const handleResize = useCallback(() => {
    setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  // Calculate image container dimensions and position
  const imageContainerStyle = useCallback((): React.CSSProperties => {
    const containerWidth = screenSize.width * 0.9;
    const containerHeight = screenSize.height * 0.9;

    return {
      width: `${containerWidth}px`,
      height: `${containerHeight}px`,
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }, [screenSize]);

  useEffect(() => {
    setMounted(true);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('resize', handleResize);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('resize', handleResize);
      document.body.style.overflow = 'unset';
      setMounted(false);
    };
  }, [onClose, handleResize]);

  if (!mounted) {
    return null;
  }

  const modalContent = (
    <div
      className={styles.modalWrapper}
      onClick={onClose}
    >
      <div
        style={imageContainerStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          style={{objectFit: "contain"}}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}