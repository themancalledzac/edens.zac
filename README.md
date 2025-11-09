# Edens Zac - Portfolio Platform

A modern, full-stack portfolio platform showcasing photography and software engineering work. Built with Next.js 15 App Router, TypeScript, Spring Boot backend, and AWS infrastructure.

## Overview

This platform provides a flexible content management system supporting multiple collection types (blogs, galleries, portfolios, client work) with rich media support including images, text blocks, GIFs, and hierarchical collections. The architecture emphasizes performance, type safety, and maintainability.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.8+
- **Styling**: SCSS Modules
- **State Management**: URL state and Server Components (minimal client-side state)
- **Image Optimization**: Next.js Image with AWS CloudFront CDN

### Backend
- **Framework**: Spring Boot with Hibernate/JPA
- **Database**: MySQL on AWS RDS
- **Storage**: AWS S3 with CloudFront distribution
- **API**: RESTful endpoints with proper pagination and caching

### Infrastructure
- **Hosting**: AWS (EC2, RDS, S3, CloudFront)
- **Development**: Node.js 20+ with strict ESLint and TypeScript configuration

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin routes (protected)
│   │   ├── all-collections/      # Collection management
│   │   ├── all-images/           # Image management
│   │   └── collection/manage/    # Collection editor
│   ├── [slug]/                   # Dynamic collection pages
│   ├── collectionType/           # Collections by type
│   ├── api/                      # API routes (proxy, revalidate)
│   ├── components/               # React components
│   │   ├── Content/              # Content renderers (Image, Text, GIF)
│   │   ├── ContentCollection/    # Collection page component
│   │   ├── ImageMetadata/        # Metadata management
│   │   └── SiteHeader/           # Site navigation
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities and API layer
│   │   ├── api/                  # API client functions
│   │   └── components/           # Shared components
│   ├── types/                    # TypeScript definitions
│   ├── utils/                    # Utility functions
│   └── styles/                   # Global styles
├── amplify/                      # AWS Amplify configuration
└── public/                       # Static assets
```

## Content Architecture

The platform supports four collection types:

- **BLOG**: Chronological content with mixed media
- **ART_GALLERY**: Curated artistic collections
- **CLIENT_GALLERY**: Private client deliveries with password protection
- **PORTFOLIO**: Professional showcases

Each collection supports multiple content types:
- **Images**: S3-hosted with CloudFront optimization
- **Text**: Database-stored with markdown support
- **GIFs**: Optimized animation support
- **Collections**: Hierarchical collections (collections containing other collections)

## Getting Started

### Prerequisites
- Node.js 20+ (enforced via `engines` in package.json)
- npm 9+
- Access to backend API (Spring Boot on localhost:8080 or production)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3001`.

### Development Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Testing
npm test
npm run test:watch
```

## Architecture Highlights

### Server-Side Rendering
- Maximized use of React Server Components for performance
- Minimal client-side JavaScript
- URL-based state management to avoid heavy React Context

### Type Safety
- Strict TypeScript configuration (no `any` types)
- Shared type definitions between frontend and backend
- Runtime validation for API responses

### Performance Optimizations
- CloudFront CDN for global image delivery
- Next.js Image component with automatic WebP/AVIF conversion
- Server-side rendering for better SEO and initial load times
- Proper caching strategies with Next.js cache tags

## API Integration

The frontend communicates with a Spring Boot backend through RESTful APIs:

- **Read endpoints**: `/api/read/collections/*` (production)
- **Admin endpoints**: `/api/admin/collections/*` (development)
- **Content endpoints**: `/api/admin/content/*` (development)

API functions are located in `app/lib/api/` and use Next.js caching for optimal performance.

## Contributing

This is a personal portfolio project. The codebase demonstrates:

- Modern Next.js App Router patterns
- Full-stack TypeScript development
- AWS infrastructure integration
- Performance optimization techniques
- Type-safe API integration

## License

This project is for demonstration and educational purposes.
