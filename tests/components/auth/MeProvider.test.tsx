/**
 * Tests for MeProvider / useMe — the client context that surfaces the
 * server-resolved principal to deep gallery consumers without prop-drilling.
 */

import { render, screen } from '@testing-library/react';

import { MeProvider, useMe } from '@/app/components/auth/MeProvider';
import { type MeResponse } from '@/app/types/Auth';

const me: MeResponse = {
  email: 'a@b.com',
  isAdmin: false,
  mfaSatisfied: false,
  galleries: [],
};

function Probe() {
  return <span>{useMe()?.email ?? 'anon'}</span>;
}

describe('MeProvider / useMe', () => {
  it('exposes the principal to consumers wrapped in the provider', () => {
    render(
      <MeProvider me={me}>
        <Probe />
      </MeProvider>
    );
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('defaults to null (anon) when no provider is mounted', () => {
    render(<Probe />);
    expect(screen.getByText('anon')).toBeInTheDocument();
  });
});
