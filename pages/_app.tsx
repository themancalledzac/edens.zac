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
