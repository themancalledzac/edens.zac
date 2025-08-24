# Mobile-First Design Implementation TODO

## Overview

Transform the portfolio to be mobile-first with optimal mobile accessibility, quality, loading speeds, and layout. Focus on home page and collections pages while maintaining desktop functionality. The create/admin pages can remain desktop-focused.

## Core Mobile-First Principles

### 1. Design Philosophy
- **Mobile First**: Design for mobile screens (320px+) first, then progressively enhance for larger screens
- **Touch-First**: Design for touch interactions with proper touch targets (44px minimum)
- **Performance First**: Prioritize loading speed and Core Web Vitals on mobile connections
- **Accessibility First**: Ensure WCAG 2.1 AA compliance on all screen sizes

### 2. Performance Targets
- **Lighthouse Mobile Score**: 95+ Performance, 100 Accessibility
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Time to Interactive**: < 3.5s on Fast 3G
- **First Contentful Paint**: < 1.8s on mobile

---

## Phase 1: Foundation & Core Web Vitals

### 1.1 Next.js Configuration Optimization
- [ ] **Update next.config.js for mobile optimization**
```javascript
// next.config.js mobile optimizations
const nextConfig = {
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'd2qp8h5pbkohe6.cloudfront.net',
    }],
    formats: ['image/avif', 'image/webp'], // Modern formats first
    deviceSizes: [320, 420, 768, 1024, 1200], // Mobile-first breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Common mobile sizes
    minimumCacheTTL: 31536000, // 1 year cache for optimization
  },
  experimental: {
    optimizeCss: true, // CSS optimization
    optimizePackageImports: ['lucide-react'], // Tree shake icons
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

- [ ] **Configure mobile-optimized headers**
```javascript
// Security and performance headers
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        // Mobile-specific optimizations
        {
          key: 'Vary',
          value: 'Accept-Encoding, User-Agent'
        }
      ]
    }
  ]
}
```

### 1.2 Viewport and Meta Configuration
- [ ] **Update root layout with mobile-optimized meta tags**
```typescript
// app/layout.tsx additions
export const metadata: Metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5, // Allow zoom for accessibility
    userScalable: true,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Edens Portfolio'
  },
  formatDetection: {
    telephone: false, // Prevent auto-linking phone numbers
  }
}
```

- [ ] **Add mobile-specific manifest.json**
```json
{
  "name": "Edens Portfolio",
  "short_name": "Edens",
  "description": "Photography and Art Portfolio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512", 
      "type": "image/png"
    }
  ]
}
```

### 1.3 Critical CSS & Loading Strategy
- [ ] **Implement critical CSS extraction for above-the-fold content**
- [ ] **Create mobile-first CSS custom properties**
```scss
// styles/mobile-first.scss
:root {
  /* Mobile-first spacing scale */
  --space-xs: 0.25rem;    /* 4px */
  --space-sm: 0.5rem;     /* 8px */
  --space-md: 1rem;       /* 16px */
  --space-lg: 1.5rem;     /* 24px */
  --space-xl: 2rem;       /* 32px */
  --space-2xl: 3rem;      /* 48px */
  
  /* Mobile-first typography scale */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  
  /* Mobile-first breakpoints */
  --mobile: 320px;
  --mobile-lg: 475px;
  --tablet: 768px;
  --desktop: 1024px;
  --desktop-lg: 1440px;
}

/* Touch target minimum sizes */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
}
```

---

## Phase 2: Home Page Mobile Optimization

### 2.1 Mobile-First Layout Structure
- [ ] **Create mobile-optimized home page layout**
```typescript
// app/page.tsx mobile structure
export default async function HomePage() {
  const homeCards = await fetchHomePage({ limit: 12 });
  
  return (
    <>
      <SiteHeader />
      <main className="mobile-first-main">
        <Suspense fallback={<HomeHeroSkeleton />}>
          <HomeHero cards={homeCards.slice(0, 2)} />
        </Suspense>
        
        <Suspense fallback={<GridSkeleton />}>
          <MobileGridContainer cards={homeCards} />
        </Suspense>
      </main>
    </>
  );
}
```

- [ ] **Implement mobile-first grid system**
```scss
// app/page.module.scss
.mobile-first-main {
  padding: var(--space-sm);
  
  @media (min-width: 768px) {
    padding: var(--space-md);
  }
  
  @media (min-width: 1024px) {
    padding: var(--space-lg);
  }
}

.mobile-grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: single column */
  gap: var(--space-md);
  
  @media (min-width: 475px) {
    grid-template-columns: repeat(2, 1fr); /* Mobile-lg: 2 columns */
    gap: var(--space-lg);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
    gap: var(--space-xl);
  }
}
```

### 2.2 Mobile-Optimized Image Loading
- [ ] **Implement responsive image component**
```typescript
// components/responsive-image.tsx
interface ResponsiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export default function ResponsiveImage({ 
  src, alt, width, height, priority = false, className 
}: ResponsiveImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 475px) 100vw, (max-width: 768px) 50vw, 33vw"
      priority={priority}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..." // Base64 blur
      className={className}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
```

- [ ] **Create mobile-optimized loading skeletons**
```typescript
// components/skeletons/grid-skeleton.tsx
export default function GridSkeleton() {
  return (
    <div className="mobile-grid" aria-label="Loading content">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image" />
          <div className="skeleton-text" />
          <div className="skeleton-text skeleton-text--short" />
        </div>
      ))}
    </div>
  );
}
```

### 2.3 Touch-Optimized Navigation
- [ ] **Create mobile-first site header**
```typescript
// app/components/site-header.tsx
export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-content">
        <Link href="/" className="logo touch-target">
          <h1>Edens Portfolio</h1>
        </Link>
        
        <MobileMenuButton />
      </div>
    </header>
  );
}
```

- [ ] **Implement mobile menu with proper touch targets**
```typescript
// components/mobile-menu.tsx
export default function MobileMenu() {
  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      <Link href="/" className="nav-link touch-target">
        Home
      </Link>
      <Link href="/portfolio" className="nav-link touch-target">
        Portfolio
      </Link>
      <Link href="/blog" className="nav-link touch-target">
        Blog
      </Link>
      <Link href="/about" className="nav-link touch-target">
        About
      </Link>
    </nav>
  );
}
```

---

## Phase 3: Collections Page Mobile Optimization

### 3.1 Mobile-First Collection Layout
- [ ] **Optimize collection page for mobile**
```typescript
// app/[cardType]/[slug]/page.tsx
export default async function CollectionPage({ params }: Props) {
  const { cardType, slug } = await params;
  const collection = await fetchCollectionBySlug(slug);
  
  return (
    <>
      <SiteHeader />
      <main className="collection-main">
        <CollectionHeader collection={collection} />
        
        <Suspense fallback={<ContentBlocksSkeleton />}>
          <MobileContentBlocks collection={collection} />
        </Suspense>
      </main>
    </>
  );
}
```

- [ ] **Create mobile-optimized content block renderer**
```typescript
// components/content-blocks/mobile-content-renderer.tsx
export default function MobileContentRenderer({ blocks }: Props) {
  return (
    <div className="mobile-content-stack">
      {blocks.map((block, index) => (
        <Suspense 
          key={block.id} 
          fallback={<ContentBlockSkeleton type={block.type} />}
        >
          <ContentBlock 
            block={block} 
            priority={index < 2} // Prioritize first 2 blocks
          />
        </Suspense>
      ))}
    </div>
  );
}
```

### 3.2 Mobile Image Gallery Optimization
- [ ] **Implement touch-friendly image viewer**
```typescript
// components/mobile-image-viewer.tsx
export default function MobileImageViewer({ images }: Props) {
  return (
    <div className="mobile-gallery">
      {images.map((image, index) => (
        <div key={image.id} className="mobile-image-container">
          <ResponsiveImage
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            priority={index < 3}
            className="mobile-gallery-image"
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Add swipe gestures for image navigation**
```typescript
// hooks/use-swipe-gesture.ts
export function useSwipeGesture(onSwipeLeft: () => void, onSwipeRight: () => void) {
  // Touch gesture implementation for mobile image navigation
}
```

### 3.3 Progressive Loading Strategy
- [ ] **Implement intersection observer for lazy content**
```typescript
// components/progressive-loader.tsx
export default function ProgressiveLoader({ children, threshold = 0.1 }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold, rootMargin: '50px' }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  
  return (
    <div ref={ref}>
      {isVisible ? children : <ContentSkeleton />}
    </div>
  );
}
```

---

## Phase 4: Mobile Performance Optimization

### 4.1 Bundle Size Optimization
- [ ] **Implement code splitting for mobile**
```typescript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <Skeleton />,
  ssr: false // Client-side only for interactive features
});

// Conditional loading based on screen size
const DesktopOnlyComponent = dynamic(() => import('./desktop-component'), {
  loading: () => null,
  ssr: false
});
```

- [ ] **Create mobile-specific component variants**
```typescript
// components/adaptive-component.tsx
export default function AdaptiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return isMobile ? <MobileVariant /> : <DesktopVariant />;
}
```

### 4.2 Network Optimization
- [ ] **Implement resource hints for mobile**
```typescript
// app/layout.tsx
export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="//d2qp8h5pbkohe6.cloudfront.net" />
        <link rel="preconnect" href="//d2qp8h5pbkohe6.cloudfront.net" crossOrigin="" />
        <link rel="prefetch" href="/api/read/collections/homePage" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Implement service worker for mobile caching**
```typescript
// public/sw.js - Mobile-optimized caching strategy
const CACHE_NAME = 'edens-portfolio-v1';
const MOBILE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// Cache strategy optimized for mobile connections
```

### 4.3 Core Web Vitals Optimization
- [ ] **Implement LCP optimization**
  - [ ] Preload hero images with `priority` prop
  - [ ] Optimize font loading with `font-display: swap`
  - [ ] Remove render-blocking resources

- [ ] **Implement CLS prevention**
  - [ ] Define explicit dimensions for all images
  - [ ] Reserve space for dynamic content
  - [ ] Use CSS aspect-ratio for responsive containers

- [ ] **Implement FID optimization**
  - [ ] Minimize JavaScript execution time
  - [ ] Use passive event listeners
  - [ ] Defer non-critical JavaScript

---

## Phase 5: Mobile Accessibility & UX

### 5.1 Touch Interaction Optimization
- [ ] **Implement proper touch targets**
```scss
.touch-optimized {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-sm);
  
  /* Touch feedback */
  @media (hover: none) and (pointer: coarse) {
    &:active {
      transform: scale(0.98);
      transition: transform 0.1s ease;
    }
  }
}
```

- [ ] **Add loading states for touch interactions**
```typescript
// components/touch-button.tsx
export default function TouchButton({ onClick, children, loading }: Props) {
  return (
    <button 
      className="touch-target"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
```

### 5.2 Mobile-Specific Accessibility
- [ ] **Implement proper focus management**
```typescript
// hooks/use-mobile-focus.ts
export function useMobileFocus() {
  useEffect(() => {
    // Skip focus management on touch devices
    const isTouchDevice = 'ontouchstart' in window;
    
    if (isTouchDevice) {
      // Implement touch-specific focus behavior
    }
  }, []);
}
```

- [ ] **Add screen reader optimizations**
```typescript
// components/mobile-screen-reader.tsx
export default function MobileScreenReader({ children }: Props) {
  return (
    <div>
      <div className="sr-only" aria-live="polite">
        Loading content for mobile view
      </div>
      {children}
    </div>
  );
}
```

### 5.3 Mobile Form Optimization (Admin Pages Exception)
- [ ] **Create mobile-optimized form inputs** (for any mobile forms)
```scss
.mobile-input {
  font-size: 16px; /* Prevent zoom on iOS */
  padding: var(--space-md);
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  
  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
}
```

---

## Phase 6: Testing & Monitoring

### 6.1 Mobile Testing Setup
- [ ] **Create mobile-specific test utilities**
```typescript
// test/mobile-utils.ts
export function renderMobile(component: ReactElement) {
  return render(component, {
    wrapper: ({ children }) => (
      <div style={{ width: '375px' }}>
        {children}
      </div>
    )
  });
}

export function mockMobileViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('max-width'),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
}
```

- [ ] **Implement mobile performance tests**
```typescript
// test/mobile-performance.test.ts
describe('Mobile Performance', () => {
  it('should meet Core Web Vitals targets', async () => {
    // Lighthouse CI integration
  });
  
  it('should load within 3s on Fast 3G', async () => {
    // Network throttling tests
  });
});
```

### 6.2 Mobile Monitoring & Analytics
- [ ] **Implement Web Vitals tracking**
```typescript
// lib/analytics/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function trackWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

- [ ] **Add mobile-specific error tracking**
```typescript
// lib/analytics/mobile-errors.ts
export function trackMobileErrors() {
  // Track mobile-specific issues like viewport problems, touch events
}
```

---

## Phase 7: Progressive Enhancement

### 7.1 Offline Support
- [ ] **Implement offline-first strategy**
```typescript
// components/offline-indicator.tsx
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="offline-banner">
      <p>You're viewing cached content. Some features may be limited.</p>
    </div>
  );
}
```

### 7.2 Mobile-Specific Features
- [ ] **Add pull-to-refresh functionality**
```typescript
// hooks/use-pull-to-refresh.ts
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  // Implementation for mobile pull-to-refresh
}
```

- [ ] **Implement mobile share functionality**
```typescript
// components/mobile-share.tsx
export default function MobileShare({ url, title }: Props) {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ url, title });
    } else {
      // Fallback for non-supporting browsers
    }
  };
  
  return (
    <button onClick={handleShare} className="touch-target">
      Share
    </button>
  );
}
```

---

## Implementation Priority

### Phase 1 (Immediate - Week 1)
- [ ] Next.js configuration optimization
- [ ] Viewport and meta configuration
- [ ] Mobile-first CSS foundation

### Phase 2 (High Priority - Week 2)
- [ ] Home page mobile layout
- [ ] Mobile-optimized image loading
- [ ] Touch-optimized navigation

### Phase 3 (Medium Priority - Week 3-4)
- [ ] Collections page mobile optimization
- [ ] Mobile image gallery
- [ ] Progressive loading

### Phase 4 (Performance - Week 5)
- [ ] Bundle size optimization
- [ ] Core Web Vitals optimization
- [ ] Network optimization

### Phase 5-7 (Enhancement - Ongoing)
- [ ] Mobile accessibility
- [ ] Testing & monitoring
- [ ] Progressive enhancement features

## Success Metrics

### Performance Targets
- [ ] Lighthouse Mobile Score: 95+ Performance
- [ ] LCP < 2.5s on mobile
- [ ] FID < 100ms
- [ ] CLS < 0.1

### User Experience Targets
- [ ] 44px minimum touch targets
- [ ] Smooth 60fps scrolling
- [ ] Sub-second navigation feedback
- [ ] Accessible to WCAG 2.1 AA standards

### Business Targets
- [ ] Reduced mobile bounce rate
- [ ] Increased mobile engagement time
- [ ] Improved mobile conversion rates