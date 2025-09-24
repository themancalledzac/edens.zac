// TODO:deprecate (Phase 5.2 end): Legacy Components retained during hybrid migration
// 'use client';
//
// import Link from 'next/link';
// import { useEffect, useRef, useState } from 'react';
//
// import { type HomeCardModel } from '@/types/HomeCardModel';
//
// import styles from './GridSection.module.scss';
//
// interface GridSectionProps {
//   card: HomeCardModel;
//   enableParallax?: boolean;
// }
//
// export function GridSection({ card, enableParallax = false }: GridSectionProps) {
//   const { title, coverImageUrl, text, slug, cardType } = card;
//   const linkRef = useRef<HTMLAnchorElement>(null);
//   const [offset, setOffset] = useState(0);
//
//   // Optional parallax effect (can be enabled for desktop)
//   useEffect(() => {
//     if (!enableParallax) return;
//
//     const handleScroll = () => {
//       if (linkRef.current) {
//         const rect = linkRef.current.getBoundingClientRect();
//         const scrollPercentage = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
//         const parallaxMultiplier = 0.3; // Reduced for subtlety
//         const newOffset = scrollPercentage * rect.height * parallaxMultiplier;
//         setOffset(Math.min(Math.max(newOffset, -rect.height / 4), rect.height / 4));
//       }
//     };
//
//     const throttledHandleScroll = throttle(handleScroll, 16);
//     window.addEventListener('scroll', throttledHandleScroll);
//     throttledHandleScroll();
//
//     return () => window.removeEventListener('scroll', throttledHandleScroll);
//   }, [enableParallax]);
//
//   const getHref = () => {
//     if (cardType === 'catalog') {
//       return `/catalog/${slug}`;
//     } else if (cardType === 'blog') {
//       return `/blog/${slug}`;
//     } else if (cardType === 'collection') {
//       return `/collection/${slug}`;
//     } else {
//       return `/${cardType}/${slug}`;
//     }
//   };
//
//   return (
//     <Link href={getHref()} className={styles.gridSection} ref={linkRef}>
//       <div
//         className={styles.gridBackground}
//         style={{
//           backgroundImage: `url(${coverImageUrl})`,
//           transform: enableParallax ? `translateY(${offset}px)` : undefined
//         }}
//       />
//       <div className={styles.gridOverlay} />
//       <div className={styles.gridContent}>
//         <div className={styles.contentTop}>
//           <div className={styles.cardTypeBadge}>
//             {cardType}
//           </div>
//         </div>
//         <div className={styles.contentBottom}>
//           <h1 className={styles.gridTitle}>{title}</h1>
//           {text && <div className={styles.gridTextWrapper}>
//             <p className={styles.gridText}>{text}</p>
//           </div>}
//         </div>
//       </div>
//     </Link>
//   );
// }
//
// // Simple throttle implementation
// function throttle<T extends (...args: unknown[]) => unknown>(func: T, delay: number): (...args: Parameters<T>) => void {
//   let timeoutId: NodeJS.Timeout | null = null;
//   let lastExecTime = 0;
//
//   return (...args: Parameters<T>) => {
//     const currentTime = Date.now();
//
//     if (currentTime - lastExecTime > delay) {
//       func(...args);
//       lastExecTime = currentTime;
//     } else {
//       if (timeoutId) clearTimeout(timeoutId);
//       timeoutId = setTimeout(() => {
//         func(...args);
//         lastExecTime = Date.now();
//       }, delay - (currentTime - lastExecTime));
//     }
//   };
// }

// Keep module non-empty to satisfy linting without providing legacy Components.
export {};