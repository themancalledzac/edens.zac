import '@testing-library/jest-dom';

import { render } from '@testing-library/react';

import { CopyrightYear } from '@/app/components/MenuDropdown/CopyrightYear';

describe('CopyrightYear', () => {
  it('renders the current year and nothing else', () => {
    const { container } = render(<CopyrightYear />);

    expect(container.textContent).toBe(String(new Date().getFullYear()));
  });
});
