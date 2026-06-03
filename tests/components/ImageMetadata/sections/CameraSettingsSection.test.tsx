import { fireEvent, render, screen } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/ImageMetadata/hooks/useImageMetadataState';
import CameraSettingsSection from '@/app/components/ImageMetadata/sections/CameraSettingsSection';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  FilmFormatDTO,
} from '@/app/types/ImageMetadata';

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

  it('renders the "Camera Settings" section heading', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.getByRole('heading', { name: /camera settings/i })).toBeInTheDocument();
  });

  it('Camera Dropdown is rendered with the availableCameras label', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText(/no camera set/i)).toBeInTheDocument();
  });

  it('Lens Dropdown is rendered with the availableLenses label', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.getByText('Lens')).toBeInTheDocument();
    expect(screen.getByText(/no lens set/i)).toBeInTheDocument();
  });

  it('ISO input round-trips a change through updateStateField', () => {
    const updateStateField = jest.fn();
    render(<CameraSettingsSection {...makeProps({ updateStateField })} />);
    const isoInput = screen.getByPlaceholderText(/e\.g\., 800/i);
    fireEvent.change(isoInput, { target: { value: '400' } });
    expect(updateStateField).toHaveBeenCalledWith({ iso: 400 });
  });

  it('F-Stop input round-trips a change through updateStateField', () => {
    const updateStateField = jest.fn();
    render(<CameraSettingsSection {...makeProps({ updateStateField })} />);
    const fStopInput = screen.getByPlaceholderText(/e\.g\., f\/2\.8/i);
    fireEvent.change(fStopInput, { target: { value: 'f/2.8' } });
    expect(updateStateField).toHaveBeenCalledWith({ fStop: 'f/2.8' });
  });

  it('Shutter Speed input round-trips a change through updateStateField', () => {
    const updateStateField = jest.fn();
    render(<CameraSettingsSection {...makeProps({ updateStateField })} />);
    const shutterInput = screen.getByPlaceholderText(/e\.g\., 1\/250 sec/i);
    fireEvent.change(shutterInput, { target: { value: '1/250' } });
    expect(updateStateField).toHaveBeenCalledWith({ shutterSpeed: '1/250' });
  });

  it('Focal Length input round-trips a change through updateStateField', () => {
    const updateStateField = jest.fn();
    render(<CameraSettingsSection {...makeProps({ updateStateField })} />);
    const focalInput = screen.getByPlaceholderText(/e\.g\., 50 mm/i);
    fireEvent.change(focalInput, { target: { value: '50 mm' } });
    expect(updateStateField).toHaveBeenCalledWith({ focalLength: '50 mm' });
  });

  it('Film Stock section does NOT render when updateState.isFilm is false', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.queryByText('Film Stock')).not.toBeInTheDocument();
  });

  it('Film Stock section DOES render when updateState.isFilm is true', () => {
    render(
      <CameraSettingsSection
        {...makeProps({ updateState: { ...baseUpdateState, isFilm: true } })}
      />
    );
    expect(screen.getByText('Film Stock')).toBeInTheDocument();
    expect(screen.getByText('Film Format')).toBeInTheDocument();
  });

  it('isGif=true applies the sectionDisabled class to the section root', () => {
    const { container } = render(<CameraSettingsSection {...makeProps({ isGif: true })} />);
    const section = container.querySelector('[aria-disabled="true"]');
    expect(section).toBeInTheDocument();
  });

  it('isGif=false does NOT apply the disabled attribute', () => {
    const { container } = render(<CameraSettingsSection {...makeProps({ isGif: false })} />);
    const section = container.querySelector('[aria-disabled="true"]');
    expect(section).not.toBeInTheDocument();
  });

  it('B&W checkbox is rendered', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.getByText(/black & white/i)).toBeInTheDocument();
  });

  it('Film Photography checkbox is rendered', () => {
    render(<CameraSettingsSection {...makeProps()} />);
    expect(screen.getByText(/film photography/i)).toBeInTheDocument();
  });
});
