/*
  Phase 5.8 — Legacy Migration
  This file intentionally commented out so that the App Router is the only entrypoint that loads during local testing.
  We keep the legacy code below for reference and potential rollback.

  Previous contents:
  import '../styles/globals.css';
  import type { AppProps } from 'next/app';
  import { AppProvider } from '@/context/AppContext';
  import { EditProvider } from '@/context/EditContext';

  export default function App({ Component, pageProps }: AppProps) {
    return (
      <AppProvider>
        <EditProvider>
          <Component {...pageProps} />
        </EditProvider>
      </AppProvider>
    );
  }
*/

// Keep module non-empty to satisfy linting without providing a Pages Router entrypoint.
// export {};
