# Testing Strategy & Patterns

## Required Testing

- **Unit tests**: All new API functions and utility functions
- **Component tests**: All new React components using RTL (React Testing Library)
- **Integration tests**: API endpoints and data flow
- **Test file naming**: `Component.test.tsx`, `api-function.test.ts`
- **Test location**: Mirror `app/` structure in `tests/` directory

## Testing Patterns

### API Function Test
```typescript
describe('fetchCollectionBySlug', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  
  it('should return collection data for valid slug', async () => {
    const mockData = { id: 1, slug: 'test', title: 'Test Collection' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });
    
    const result = await fetchCollectionBySlug('test');
    expect(result).toEqual(mockData);
  });
  
  it('should throw error for invalid slug', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    
    await expect(fetchCollectionBySlug('invalid')).rejects.toThrow();
  });
});
```

### Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import GridSection from '@/app/components/Content/GridSection';

describe('GridSection', () => {
  it('should render card with correct title and image', () => {
    const mockData = {
      title: 'Test Title',
      image: { src: '/test.jpg', alt: 'Test Image' },
    };
    
    render(<GridSection data={mockData} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByAltText('Test Image')).toBeInTheDocument();
  });
});
```

### Utility Function Test
```typescript
import { processContentLayout } from '@/app/utils/contentLayout';
import { describe, it, expect } from '@jest/globals';

describe('processContentLayout', () => {
  it('should process content blocks into rows', () => {
    const content = [
      { type: 'IMAGE', width: 100, height: 100 },
      { type: 'TEXT', content: 'Test' },
    ];
    
    const result = processContentLayout(content);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('IMAGE');
  });
});
```

## Test Setup

### Jest Configuration
- Uses `jest.config.mjs` for configuration
- Setup file: `jest.setup.ts`
- Test environment: jsdom for React components
- Coverage: Aim for >80% coverage on new code

### Mocking Patterns
```typescript
// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock API calls
global.fetch = jest.fn();

// Mock window methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

## Testing Best Practices

1. **Test behavior, not implementation**: Focus on what the component/function does, not how
2. **Use descriptive test names**: `it('should return error when API fails', ...)`
3. **Arrange-Act-Assert pattern**: Set up, execute, verify
4. **Test edge cases**: Empty arrays, null values, error states
5. **Mock external dependencies**: APIs, browser APIs, Next.js features
6. **Keep tests isolated**: Each test should be independent
7. **Test user interactions**: Click, type, submit actions in component tests

## Testing Backlog Items

Based on current state, prioritize tests for:
- [ ] `app/lib/api/collections.ts` - All API functions
- [ ] `app/components/` - All new App Router components
- [ ] `app/[slug]/page.tsx` - Dynamic route components
- [ ] `app/types/Collection.ts` - Type validation
- [ ] New utility functions and processing logic

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test/file.test.ts
```
