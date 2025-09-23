"use client";

import React, { useEffect, useState } from 'react';

import ContentBlockComponent from '@/app/components/ContentBlockComponent';
import { type AnyContentBlock } from '@/types/ContentBlock';

type Props = {
  blocks: AnyContentBlock[];
};

export default function ContentBlocksClient({ blocks }: Props) {
  const [width, setWidth] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const measure = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
      const mobile = vw < 768;
      setIsMobile(mobile);

      if (mobile) {
        // Legacy mobile rule: full-bleed minus 40px
        setWidth(Math.max(0, vw - 40));
      } else {
        // App Router desktop: subtract .contentPadding’s 2rem + 2rem (64px) and cap at 1200
        const desktopPadding = 64; // 2rem each side at ≥768px; see app/page.module.scss .contentPadding
        setWidth(Math.max(0, Math.min(vw - desktopPadding, 1200)));
      }
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {width > 0 && (
        <ContentBlockComponent
          blocks={blocks}
          componentWidth={width}
          isMobile={isMobile}
          chunkSize={2}
        />
      )}
    </div>
  );
}
