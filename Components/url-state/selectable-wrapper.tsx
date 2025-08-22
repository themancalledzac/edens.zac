"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type PropsWithChildren, useMemo } from 'react';

/**
 * SelectableWrapper — client wrapper to sync selected image to URL (?image=ID)
 *
 * - Keeps selection in the URL for shareability and SSR friendliness.
 * - Adds an outline when the wrapped block is selected.
 */
export type SelectableWrapperProps = PropsWithChildren<{
  blockId: number | string;
  className?: string;
}>;

export default function SelectableWrapper({ blockId, className, children }: SelectableWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams?.get('image');
  const isSelected = selectedId === String(blockId);

  const nextHref = useMemo(() => {
    const sp = new URLSearchParams(searchParams?.toString());
    if (isSelected) {
      sp.delete('image');
    } else {
      sp.set('image', String(blockId));
    }
    return `${pathname}?${sp.toString()}`;
  }, [blockId, isSelected, pathname, searchParams]);

  const handleClick = (e: React.MouseEvent) => {
    // Allow modifier keys to open in new tab, etc.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push(nextHref, { scroll: false });
  };

  return (
    <a
      href={nextHref}
      onClick={handleClick}
      aria-current={isSelected ? 'true' : undefined}
      className={className}
      style={{
        display: 'block',
        outline: isSelected ? '2px solid #1976d2' : 'none',
        borderRadius: 8,
      }}
    >
      {children}
    </a>
  );
}
