import '../styles/globals.css';

import { AppProvider } from '@/context/AppContext';
import { EditProvider } from '@/context/EditContext';

export default function App({ Component, pageProps }) {
  return (
    <AppProvider>
      <EditProvider>
        <Component {...pageProps} />
      </EditProvider>
    </AppProvider>
  );
}
