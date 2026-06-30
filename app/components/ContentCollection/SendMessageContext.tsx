'use client';

import { createContext, type ReactNode, useContext } from 'react';

/**
 * Whether the "Send a message" button should appear in the filter-bar area of the
 * collection header. Provided as `true` by the /user page (see CollectionPageClient)
 * and defaults to `false` everywhere else, so the button is scoped to the signed-in
 * user's own page without threading a prop through the recursive content tree.
 */
const SendMessageContext = createContext<boolean>(false);

export function SendMessageProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return <SendMessageContext value={enabled}>{children}</SendMessageContext>;
}

export function useSendMessageEnabled(): boolean {
  return useContext(SendMessageContext);
}
