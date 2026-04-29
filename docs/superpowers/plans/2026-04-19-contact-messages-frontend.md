# Contact Messages — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `mailto:` contact form with a backend-persisted message pipeline that POSTs JSON to `/api/proxy/api/public/messages`.

**Architecture:** A new `contactApi.ts` utility wraps `fetch` with a typed discriminated-union result. `ContactForm.tsx` drops the `title` field and `mailto` logic, gains an `email` field plus `status` state, and renders success/error banners. The existing proxy route (`app/api/proxy/[...path]/route.ts`) already handles POSTs and injects `X-Internal-Secret` — no proxy changes needed.

**Tech Stack:** React (useState, FormEvent), TypeScript strict, CSS Modules, @testing-library/react + jest-dom

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| **Create** | `app/utils/contactApi.ts` | Typed fetch wrapper; single source of truth for endpoint + error codes |
| **Create** | `tests/utils/contactApi.test.ts` | Unit tests — mocked global fetch |
| **Modify** | `app/components/ContactForm/ContactForm.module.scss` | Rename `.titleInput` → `.emailInput`; add `.statusBanner`, `.statusBannerSuccess`, `.statusBannerError` |
| **Modify** | `app/components/ContactForm/ContactForm.tsx` | Remove `mailto`/`BREAKPOINTS`; add `email` field + `status` state + submit via `contactApi` |
| **Create** | `tests/components/ContactForm.test.tsx` | Component tests — all UI branches + mailto fallback logic |

---

## Task 1: contactApi utility (TDD)

**Files:**
- Create: `tests/utils/contactApi.test.ts`
- Create: `app/utils/contactApi.ts`

- [ ] **Step 1: Write the failing test file**

Create `tests/utils/contactApi.test.ts`:

```typescript
import { submitContactMessage } from '@/app/utils/contactApi';

const PAYLOAD = { email: 'test@example.com', message: 'Hello' };

describe('submitContactMessage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('posts to correct endpoint with JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ id: 1, createdAt: '2026-04-19T10:00:00Z' }),
    } as Response);

    await submitContactMessage(PAYLOAD);

    expect(fetch).toHaveBeenCalledWith('/api/proxy/api/public/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PAYLOAD),
    });
  });

  it('returns ok:true with id and createdAt on 201', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ id: 42, createdAt: '2026-04-19T10:00:00Z' }),
    } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({ ok: true, id: 42, createdAt: '2026-04-19T10:00:00Z' });
  });

  it('returns rate-limit code on 429', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 429 } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'rate-limit',
      message: "You've sent a lot of messages. Try again in an hour.",
    });
  });

  it('returns validation code with backend message on 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ message: 'Invalid email address' }),
    } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'validation',
      message: 'Invalid email address',
    });
  });

  it('returns server code on 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 500 } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'server',
      message: 'Something went wrong. Please email me directly:',
    });
  });

  it('returns network code when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'network',
      message: 'Something went wrong. Please email me directly:',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contactApi.test.ts
```

Expected: `Cannot find module '@/app/utils/contactApi'`

- [ ] **Step 3: Write contactApi.ts**

Create `app/utils/contactApi.ts`:

```typescript
export interface ContactPayload {
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; id: number; createdAt: string }
  | { ok: false; code: 'rate-limit' | 'validation' | 'server' | 'network'; message: string };

const ENDPOINT = '/api/proxy/api/public/messages';

export async function submitContactMessage(payload: ContactPayload): Promise<ContactResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      const data = (await res.json()) as { id: number; createdAt: string };
      return { ok: true, id: data.id, createdAt: data.createdAt };
    }

    if (res.status === 429) {
      return {
        ok: false,
        code: 'rate-limit',
        message: "You've sent a lot of messages. Try again in an hour.",
      };
    }

    if (res.status === 400) {
      const data = (await res.json()) as { message?: string };
      return {
        ok: false,
        code: 'validation',
        message: data.message ?? 'Invalid submission.',
      };
    }

    return {
      ok: false,
      code: 'server',
      message: 'Something went wrong. Please email me directly:',
    };
  } catch {
    return {
      ok: false,
      code: 'network',
      message: 'Something went wrong. Please email me directly:',
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contactApi.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Format, lint, type-check**

```bash
/opt/homebrew/bin/node node_modules/.bin/prettier --write app/utils/contactApi.ts tests/utils/contactApi.test.ts
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/utils/contactApi.ts tests/utils/contactApi.test.ts
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/utils/contactApi.ts tests/utils/contactApi.test.ts
git commit -m "feat: add contactApi utility with typed result surface"
```

---

## Task 2: SCSS updates

**Files:**
- Modify: `app/components/ContactForm/ContactForm.module.scss`

Note on class names: CSS Modules uses camelCase property access (`styles.statusBannerSuccess`), so BEM `--` notation from the spec becomes camelCase here. The spec's `.statusBanner--success` → `.statusBannerSuccess`.

- [ ] **Step 1: Replace ContactForm.module.scss**

Full replacement of `app/components/ContactForm/ContactForm.module.scss`:

```scss
/*
  ContactForm component styles
*/

.contactFormContainer {
  display: flex;
  flex-direction: column;
  padding-top: var(--space-4);

  @media (width >= 768px) {
    padding-top: var(--default-padding);
  }
}

.formWrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 15rem);
  overflow-y: auto;
}

.contactForm {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--default-padding);
  padding-bottom: 5px;
}

.emailInput {
  height: var(--menu-item-height);
  font-size: var(--text-lg);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-1);
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--color-fg);
  }

  &::placeholder {
    color: var(--color-fg-muted);
  }
}

.messageTextarea {
  flex: 1;
  font-size: var(--text-md);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-1);
  resize: none;
  font-family: inherit;
  min-height: 360px;

  &:focus {
    outline: none;
    border-color: var(--color-fg);
  }

  &::placeholder {
    color: var(--color-fg-muted);
  }
}

.submitButton {
  height: 60px;
  font-size: var(--text-lg);
  background-color: var(--color-fg);
  color: var(--color-bg);
  border: none;
  border-radius: var(--radius-1);
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-family: inherit;
  font-weight: 500;

  &:hover {
    background-color: var(--color-fg-muted);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.statusBanner {
  padding: var(--space-2);
  border-radius: var(--radius-1);
  font-size: var(--text-md);
  margin-bottom: var(--space-2);
}

.statusBannerSuccess {
  background-color: #f0fdf4;
  color: var(--color-success-dark);
  border: 1px solid var(--color-success);
}

.statusBannerError {
  background-color: var(--color-error-bg);
  color: var(--color-error-text);
  border: 1px solid var(--color-error-border);

  a {
    color: var(--color-error-text);
    font-weight: 500;
  }
}
```

- [ ] **Step 2: Run stylelint**

```bash
/opt/homebrew/bin/node node_modules/.bin/stylelint --fix app/components/ContactForm/ContactForm.module.scss
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/components/ContactForm/ContactForm.module.scss
git commit -m "feat: update ContactForm SCSS — rename titleInput to emailInput, add status banner styles"
```

---

## Task 3: ContactForm component rewrite (TDD)

**Files:**
- Create: `tests/components/ContactForm.test.tsx`
- Modify: `app/components/ContactForm/ContactForm.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `tests/components/ContactForm.test.tsx`:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import * as contactApi from '@/app/utils/contactApi';

jest.mock('@/app/utils/contactApi');

const mockSubmit = contactApi.submitContactMessage as jest.MockedFunction<
  typeof contactApi.submitContactMessage
>;

describe('ContactForm', () => {
  const defaultProps = { onBack: jest.fn(), onSubmit: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email input, message textarea, and send button', () => {
    render(<ContactForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('Your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument();
  });

  it('email input has type="email" and maxLength=320', () => {
    render(<ContactForm {...defaultProps} />);
    const input = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(input.maxLength).toBe(320);
  });

  it('calls submitContactMessage with email and message on submit', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        message: 'Hello!',
      }),
    );
  });

  it('shows success banner and calls onSubmit on 201', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('Message sent!')).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('clears form inputs after successful submission', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    render(<ContactForm {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText('Your message') as HTMLTextAreaElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(messageInput, { target: { value: 'Hello!' } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(emailInput.value).toBe('');
      expect(messageInput.value).toBe('');
    });
  });

  it('disables button and shows "Sending..." during submission', async () => {
    let resolveCall!: (v: contactApi.ContactResult) => void;
    mockSubmit.mockImplementation(
      () =>
        new Promise<contactApi.ContactResult>(resolve => {
          resolveCall = resolve;
        }),
    );
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled(),
    );

    await act(async () => {
      resolveCall({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    });
  });

  it('shows rate-limit message without mailto link on 429', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'rate-limit',
      message: "You've sent a lot of messages. Try again in an hour.",
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(
        screen.getByText("You've sent a lot of messages. Try again in an hour."),
      ).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('shows validation error without mailto link on 400', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'validation',
      message: 'Invalid email address',
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('shows error banner with mailto fallback link on server error', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'server',
      message: 'Something went wrong. Please email me directly:',
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        expect.stringContaining('mailto:'),
      );
    });
  });

  it('shows mailto fallback link on network error', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'network',
      message: 'Something went wrong. Please email me directly:',
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        expect.stringContaining('mailto:'),
      );
    });
  });

  it('does not show any banner or link in idle state', () => {
    render(<ContactForm {...defaultProps} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/message sent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/components/ContactForm.test.tsx
```

Expected: multiple failures (old component uses `title` field, no `status` state, no `contactApi` call)

- [ ] **Step 3: Rewrite ContactForm.tsx**

Full replacement of `app/components/ContactForm/ContactForm.tsx`:

```typescript
'use client';

import { type FormEvent, useState } from 'react';

import { type ContactResult, submitContactMessage } from '@/app/utils/contactApi';

import styles from './ContactForm.module.scss';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface ContactFormProps {
  onBack: () => void;
  onSubmit: () => void;
}

export function ContactForm({ onBack: _onBack, onSubmit }: ContactFormProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorResult, setErrorResult] = useState<Extract<ContactResult, { ok: false }> | null>(
    null,
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorResult(null);

    const result = await submitContactMessage({ email, message });

    if (result.ok) {
      setEmail('');
      setMessage('');
      setStatus('success');
      onSubmit();
    } else {
      setStatus('error');
      setErrorResult(result);
    }
  };

  const fallbackHref = `mailto:${atob('ZWRlbnMuemFjQGdtYWlsLmNvbQ==')}`;
  const showMailtoFallback =
    status === 'error' &&
    (errorResult?.code === 'server' || errorResult?.code === 'network');

  return (
    <div className={styles.contactFormContainer}>
      <div className={styles.formWrapper}>
        {status === 'success' && (
          <div className={`${styles.statusBanner} ${styles.statusBannerSuccess}`}>
            Message sent!
          </div>
        )}
        {status === 'error' && errorResult && (
          <div className={`${styles.statusBanner} ${styles.statusBannerError}`}>
            {errorResult.message}{' '}
            {showMailtoFallback && <a href={fallbackHref}>email me directly</a>}
          </div>
        )}
        <form aria-label="contact form" className={styles.contactForm} onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Your email"
            className={styles.emailInput}
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={320}
            required
          />
          <textarea
            name="message"
            placeholder="Your message"
            className={styles.messageTextarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run component tests to verify they pass**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/components/ContactForm.test.tsx
```

Expected: all 10 tests PASS

- [ ] **Step 5: Format, lint, type-check**

```bash
/opt/homebrew/bin/node node_modules/.bin/prettier --write app/components/ContactForm/ContactForm.tsx tests/components/ContactForm.test.tsx
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/components/ContactForm/ContactForm.tsx tests/components/ContactForm.test.tsx
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/components/ContactForm/ContactForm.tsx tests/components/ContactForm.test.tsx
git commit -m "feat: replace mailto flow with API-backed contact form submission"
```

---

## Task 4: Full regression

- [ ] **Step 1: Run the full test suite**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest
```

Expected: all tests PASS (including pre-existing suites)

- [ ] **Step 2: Done** — branch is ready for backend integration smoke test once backend merges

---

## Spec coverage checklist

| Spec requirement | Covered in |
|---|---|
| Remove `mailto`/base64 logic + `BREAKPOINTS` import | Task 3 |
| Replace `title` with `email` input (`type="email"`, `required`, `maxLength={320}`) | Task 3 |
| `status: 'idle' \| 'submitting' \| 'success' \| 'error'` state | Task 3 |
| Submit button disabled when submitting | Task 3 |
| POST JSON to `/api/proxy/api/public/messages` | Task 1 |
| On 201: clear form + show success banner | Task 3 |
| On 429: "too many requests" message, no mailto | Task 1 + Task 3 |
| On 400: surface backend `message` field, no mailto | Task 1 + Task 3 |
| On 500/network: error + inline mailto fallback link | Task 1 + Task 3 |
| `contactApi.ts` with `ContactPayload` + `ContactResult` types | Task 1 |
| `ContactForm.module.scss` — `.titleInput` → `.emailInput` | Task 2 |
| `.statusBanner`, `.statusBannerSuccess`, `.statusBannerError` styles | Task 2 |
| `tests/components/ContactForm.test.tsx` — all UI branches | Task 3 |
| mailto fallback only shown on server/network error, not idle | Task 3 |
| Owner email still base64-encoded at fallback point | Task 3 (`atob(...)`) |
