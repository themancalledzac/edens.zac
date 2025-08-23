'use client';

import { AlignJustify, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './AppHeader.module.scss';

interface MenuItem {
  label: string;
  href: string;
  external?: boolean;
}

const menuItems: MenuItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Instagram', href: 'https://instagram.com/zacedens', external: true },
];

export function AppHeader() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Close dropdown on route change
  useEffect(() => {
    setShowDropdown(false);
  }, [pathname]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <header className={styles.header}>
      <div className={styles.navBarWrapper}>
        <div className={styles.navBarLeftWrapper}>
          <Link href="/" className={styles.title}>
            <h2>Zac Edens</h2>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <div className={styles.mobileMenuWrapper}>
          <button
            className={styles.menuToggle}
            onClick={toggleDropdown}
            aria-label="Toggle menu"
            aria-expanded={showDropdown}
          >
            {showDropdown ? <X size={24} /> : <AlignJustify size={24} />}
          </button>

          {/* Mobile Dropdown */}
          {showDropdown && (
            <div ref={dropdownRef} className={styles.dropdown}>
              <nav className={styles.dropdownNav}>
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.dropdownLink} ${pathname === item.href ? styles.active : ''}`}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={() => setShowDropdown(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}