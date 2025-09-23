# Portfolio & Photography Platform

A modern, performance-optimized portfolio platform showcasing photography and software engineering work. Built with Next.js 15 App Router, Spring Boot backend, and AWS infrastructure.

## 🚀 Current Status

This project is in **active development** with a significant architectural refactor nearing completion. The codebase demonstrates modern full-stack development practices and performance optimization techniques.

### Recent Accomplishments

- **🔄 Next.js App Router Migration**: Successfully migrated from Pages Router to App Router for improved performance and developer experience
- **⚡ Performance Optimizations**: Implemented Server-Side Rendering (SSR), optimized image loading with CloudFront CDN, and mobile-first responsive design
- **🏗️ Backend Architecture**: Complete ContentCollection system with Spring Boot, supporting multiple content types (blogs, galleries, portfolios, client work)
- **📱 Mobile-First Design**: Responsive design with optimized mobile performance and proper image handling
- **🧪 Testing Infrastructure**: Comprehensive testing setup with Jest, React Testing Library, and unit/integration tests

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.8+
- **Styling**: SCSS Modules with mobile-first approach
- **State Management**: URL state over React Context for SSR optimization
- **Image Optimization**: Next.js Image component with AWS CloudFront CDN
- **Testing**: Jest + React Testing Library

### Backend
- **Framework**: Spring Boot with Hibernate/JPA
- **Database**: MySQL on AWS RDS
- **Storage**: AWS S3 with CloudFront distribution
- **Architecture**: RESTful APIs with proper pagination and caching

### Infrastructure
- **Hosting**: AWS (EC2, RDS, S3, CloudFront)
- **Development**: Node.js 20+ with strict ESLint and TypeScript configuration
- **Performance**: Server-side rendering, image optimization, and edge caching

## 📁 Project Structure

```
├── app/                          # Next.js App Router (modern architecture)
│   ├── [cardType]/[slug]/        # Dynamic collection pages (SSR)
│   ├── (admin)/                  # Protected admin routes
│   ├── collection/               # Collection viewer with parallel routes
│   └── components/               # Modern React Server Components
├── pages-old/                    # Legacy Pages Router (preserved during migration)
├── Components/                   # Legacy components (preserved)
├── lib/api/                      # API layer with Next.js caching
├── types/                        # TypeScript definitions
├── utils/                        # Utility functions and image processing
├── styles/                       # SCSS modules and global styles
└── tests/                        # Comprehensive test suite
```

## 🎯 Content Architecture

The platform supports four distinct content collection types:

- **📝 BLOG**: Daily moments and mixed content with chronological presentation
- **🎨 ART_GALLERY**: Curated artistic collections with gallery-style layouts
- **👤 CLIENT_GALLERY**: Private client deliveries with password protection
- **💼 PORTFOLIO**: Professional showcases for client acquisition

Each collection supports mixed content blocks:
- **Images**: S3-hosted with CloudFront optimization
- **Text**: Database-stored with markdown support
- **Code**: Syntax-highlighted code blocks
- **GIFs**: Optimized animation support

## ⚡ Performance Features

### Image Optimization
- **CloudFront CDN**: Global content delivery with edge caching
- **Next.js Image**: Automatic WebP/AVIF conversion and lazy loading
- **Responsive Images**: Proper sizing for mobile and desktop
- **Priority Loading**: Above-the-fold images load first

### Rendering Strategy
- **Server-Side Rendering**: Pages render on the server for better SEO and performance
- **Streaming**: Progressive loading with React Suspense
- **Minimal Client JavaScript**: Only interactive components run client-side
- **URL State Management**: Avoids heavy React Context for better caching

### Mobile-First Design
- **Progressive Enhancement**: Mobile layouts as foundation, desktop as enhancement
- **Optimized Touch Interactions**: Proper touch targets and gestures
- **Reduced Motion Support**: Respects user accessibility preferences
- **Performance Budget**: Strict JavaScript and CSS size limits

## 🔧 Development

### Prerequisites
- Node.js 20+ (enforced via `engines` in package.json)
- npm 9+

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format
```

### Development Server
- **Frontend**: http://localhost:3001 (Next.js)
- **Backend**: http://localhost:8080 (Spring Boot)

## 🎭 Architecture Highlights

### App Router Implementation
The project showcases advanced Next.js App Router patterns:

- **Parallel Routes**: Collection viewer with independent loading states
- **Server Components**: Maximized server-side rendering for performance
- **Route Groups**: Organized admin features with `(admin)` grouping
- **Metadata API**: Dynamic SEO optimization
- **Streaming**: Progressive content loading with Suspense boundaries

### Type Safety
- **Strict TypeScript**: No `any` types, comprehensive interface definitions
- **API Type Safety**: Shared types between frontend and backend
- **Validation**: Bean Validation on backend, runtime validation on frontend

### Testing Strategy
- **Unit Tests**: API functions and utility functions
- **Component Tests**: React components with React Testing Library
- **Integration Tests**: End-to-end data flow testing
- **Performance Tests**: Lighthouse CI for performance monitoring

## 🔮 Planned Features

### Near-term Development
- **Authentication**: Secure admin interface for content management
- **Content Creation**: In-browser content creation and editing tools
- **Advanced Gallery Features**: Lightbox, slideshow, and download capabilities
- **Search & Filtering**: Tag-based content discovery

### Future Enhancements
- **Progressive Web App**: Offline capability and app-like experience
- **Advanced Animations**: GPU-accelerated transitions and parallax effects
- **Social Integration**: Direct sharing to social platforms
- **Analytics**: User engagement and performance metrics

## 📊 Performance Targets

- **First Contentful Paint**: < 1.0s on fast 4G
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **JavaScript Bundle**: < 50KB initial load
- **Lighthouse Score**: 90+ on mobile, 100 on desktop

## 📝 Migration Notes

This project demonstrates a **gradual migration strategy** from Pages Router to App Router:

- **Parallel Development**: New features built with App Router alongside legacy code
- **Zero Downtime**: Legacy functionality preserved during migration
- **Performance Gains**: Measurable improvements in load times and user experience
- **Developer Experience**: Enhanced development workflow with modern tooling

The migration showcases best practices for evolving large applications without breaking changes.

## 🤝 Contributing

This is a personal portfolio project demonstrating modern web development practices. The codebase serves as a reference for:

- Next.js App Router implementation
- Performance optimization techniques
- Full-stack TypeScript development
- AWS infrastructure integration
- Mobile-first responsive design

## 📄 License

This project is for demonstration and educational purposes.

---

*Built with ❤️ using modern web technologies to showcase both photography and software engineering craftsmanship.*