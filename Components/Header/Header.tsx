// TODO:deprecate (Phase 5.2 end): Legacy Components retained during hybrid migration
// import { AlignJustify } from 'lucide-react';
// import { useRouter } from 'next/router';
// import { useEffect, useRef, useState } from 'react';
//
// import { MenuDropdown } from '../MenuDropdown/MenuDropdown';
// import styles from './Header.module.scss';
//
// /**
//  * Header Component for all pages
//  * @constructor
//  */
// export function Header() {
//   const router = useRouter();
//   const [showDropdown, setShowDropdown] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const aboutRef = useRef<HTMLDivElement>(null);
//
//   const handleClick = (page: string) => {
//     try {
//       router.push(`/${page}`).then(() => {
//       });
//     } catch (error) {
//       console.error(`Error fetching ${page} page. ${error}`);
//     }
//   };
//
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
//         aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
//         setShowDropdown(false);
//       }
//     };
//
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, [showDropdown]);
//
//   // TODO: Update Header:
//   //  1. Move menuItems into dropdown(pull out) menu
//   //  2. Verify that
//   return (
//     <header className={styles.header}>
//       <div className={styles.navBarWrapper}>
//         <div className={styles.navBarLeftWrapper}>
//
//           <div className={styles.title} onClick={() => handleClick('')}>
//             <h2>Zac Edens</h2>
//           </div>
//         </div>
//         {showDropdown ? (
//           <MenuDropdown dropdownRef={dropdownRef} showDropdown={showDropdown}
//             setShowDropdown={setShowDropdown} />
//         ) : (
//           <AlignJustify
//             className={styles.menu}
//             onClick={() => setShowDropdown(!showDropdown)} />
//         )}
//       </div>
//     </header>
//   );
// }

// Keep module non-empty to satisfy linting without providing legacy Components.
export {};
