import { fireEvent, render, screen } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/ImageMetadata/hooks/useImageMetadataState';
import CameraSettingsSection from '@/app/components/ImageMetadata/sections/CameraSettingsSection';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  FilmFormatDTO,
} from '@/app/types/ImageMetadata';

// Coverage note: the Camera "add new" optimistic-create flow (onAddNew → eager createCamera) is the
// riskiest path in this component, but it is intentionally NOT tested here. Its fix lives in a
// separate filed MR — docs/superpowers/plans/006-camera-optimistic-create-race.md — which removes
// the eager createCamera call. Asserting createCamera here would pin behavior that MR deletes, so
// the add-new coverage ships with the fix. This suite covers the stable wiring: field round-trips,
// the isFilm-gated Film Stock section, and the GIF-disabled state.

const baseUpdateState: ImageUpdateState = {
  id: 101,
  title: 'Test Image',
  blackAndWhite: false,
  isFilm: false,
  iso: undefined,
  fStop: undefined,
  shutterSpeed: undefined,
  focalLength: undefined,
  camera: undefined,
  lens: undefined,
  filmType: undefined,
  filmFormat: undefined,
  collections: [],
  tags: [],
  people: [],
  locations: [],
};

const baseCameras: ContentCameraModel[] = [
  { id: 1, name: 'Hasselblad 500cm', isFilm: true, defaultFilmFormat: 'MM_120' },
  { id: 2, name: 'Sony A7R IV', isFilm: false },
];

const baseLenses: ContentLensModel[] = [
  { id: 1, name: '80mm f/2.8 Planar' },
  { id: 2, name: '24-70mm f/2.8 GM' },
];

const baseFilmTypes: ContentFilmTypeModel[] = [
  { id: 1, name: 'Kodak Portra 400', defaultIso: 400 },
  { id: 2, name: 'Ilford HP5 Plus', defaultIso: 400 },
];

const baseFilmFormats: FilmFormatDTO[] = [
  { name: 'MM_35', displayName: '35mm' },
  { name: 'MM_120', displayName: '120 / Medium Format' },
];

function makeProps(
  overrides: Partial<Parameters<typeof CameraSettingsSection>[0]> = {}
): Parameters<typeof CameraSettingsSection>[0] {
  return {
    updateState: baseUpdateState,
    updateStateField: jest.fn(),
    availableCameras: baseCameras,
    availableLenses: baseLenses,
    availableFilmTypes: baseFilmTypes,
    availableFilmFormats: baseFilmFormats,
    isGif: false,
    ...overrides,
  };
}

describe('CameraSettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Camera and Lens dropdowns', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Lens')).toBeInTheDocument();
  });

  // Each EXIF field maps to its own updateState key (ISO coerces to a number; the rest pass the
  // string straight through). Parametrized so a new field is one row, not a copy-pasted test.
  const inputCases: {
    field: string;
    placeholder: RegExp;
    value: string;
    expected: Partial<ImageUpdateState>;
  }[] = [
    { field: 'ISO', placeholder: /e\.g\., 800/i, value: '400', expected: { iso: 400 } },
    {
      field: 'F-Stop',
      placeholder: /e\.g\., f\/2\.8/i,
      value: 'f/2.8',
      expected: { fStop: 'f/2.8' },
    },
    {
      field: 'Shutter Speed',
      placeholder: /e\.g\., 1\/250 sec/i,
      value: '1/250',
      expected: { shutterSpeed: '1/250' },
    },
    {
      field: 'Focal Length',
      placeholder: /e\.g\., 50 mm/i,
      value: '50 mm',
      expected: { focalLength: '50 mm' },
    },
  ];

  it.each(inputCases)(
    '$field input round-trips a change through updateStateField',
    ({ placeholder, value, expected }) => {
      const updateStateField = jest.fn();
      render(<CameraSettingsSection {...makeProps({ updateStateField })} />);
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
      expect(updateStateField).toHaveBeenCalledWith(expected);
    }
  );

  it('renders the Film Stock section only when updateState.isFilm is true', () => {
    const { rerender } = render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.queryByText('Film Stock')).not.toBeInTheDocument();

    rerender(
      <CameraSettingsSection
        {...makeProps({ updateState: { ...baseUpdateState, isFilm: true } })}
      />
    );
    expect(screen.getByText('Film Stock')).toBeInTheDocument();
    expect(screen.getByText('Film Format')).toBeInTheDocument();
  });

  it('marks the section aria-disabled for GIF content and leaves it enabled otherwise', () => {
    const { container, rerender } = render(
      <CameraSettingsSection {...makeProps({ isGif: true })} />
    );
    expect(container.querySelector('[aria-disabled="true"]')).toBeInTheDocument();

    rerender(<CameraSettingsSection {...makeProps({ isGif: false })} />);
    expect(container.querySelector('[aria-disabled="true"]')).not.toBeInTheDocument();
  });
});
