import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/Metadata/hooks/useMetadataState';
import CameraSettingsSection from '@/app/components/Metadata/sections/CameraSettingsSection';
import { createCamera } from '@/app/lib/api/content';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  FilmFormatDTO,
} from '@/app/types/Metadata';

jest.mock('@/app/lib/api/content', () => ({
  createCamera: jest.fn(),
}));

const mockCreateCamera = createCamera as jest.MockedFunction<typeof createCamera>;

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
    replaceOptimisticCamera: jest.fn(),
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

  describe('Camera add-new (optimistic create)', () => {
    /** Open the Camera dropdown and reveal its inline "add new" form. */
    function openCameraAddNew(): void {
      fireEvent.click(screen.getByRole('button', { name: /camera:.*click to change/i }));
      fireEvent.click(screen.getByRole('button', { name: /add new camera/i }));
    }

    function typeCameraName(name: string): void {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\., hasselblad 500cm/i), {
        target: { value: name },
      });
    }

    function submitCamera(): void {
      fireEvent.click(screen.getByRole('button', { name: /^set camera$/i }));
    }

    it('writes an optimistic {id:0} camera and POSTs createCamera with the entered fields', () => {
      const updateStateField = jest.fn();
      mockCreateCamera.mockResolvedValue({ id: 55, cameraName: 'Leica M6', isFilm: false });
      render(<CameraSettingsSection {...makeProps({ updateStateField })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      expect(updateStateField).toHaveBeenCalledWith({
        camera: { id: 0, name: 'Leica M6', isFilm: false, defaultFilmFormat: null },
      });
      expect(mockCreateCamera).toHaveBeenCalledWith({
        cameraName: 'Leica M6',
        isFilm: false,
        defaultFilmFormat: null,
      });
    });

    it('swaps the optimistic camera for the server-assigned id on success', async () => {
      const replaceOptimisticCamera = jest.fn();
      mockCreateCamera.mockResolvedValue({ id: 55, cameraName: 'Leica M6', isFilm: false });
      render(<CameraSettingsSection {...makeProps({ replaceOptimisticCamera })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      await waitFor(() =>
        expect(replaceOptimisticCamera).toHaveBeenCalledWith('Leica M6', {
          id: 55,
          name: 'Leica M6',
          isFilm: false,
          defaultFilmFormat: null,
        })
      );
    });

    it('reverts the optimistic camera and surfaces an inline error when the create fails', async () => {
      const replaceOptimisticCamera = jest.fn();
      mockCreateCamera.mockRejectedValue(new Error('boom'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<CameraSettingsSection {...makeProps({ replaceOptimisticCamera })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/leica m6/i);
      expect(replaceOptimisticCamera).toHaveBeenCalledWith('Leica M6', null);
      errSpy.mockRestore();
    });

    it('reverts to the previously-selected camera (not null) on failure', async () => {
      const replaceOptimisticCamera = jest.fn();
      const previous = baseCameras[1]!; // Sony A7R IV
      mockCreateCamera.mockRejectedValue(new Error('boom'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(
        <CameraSettingsSection
          {...makeProps({
            replaceOptimisticCamera,
            updateState: { ...baseUpdateState, camera: previous },
          })}
        />
      );

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      await screen.findByRole('alert');
      expect(replaceOptimisticCamera).toHaveBeenCalledWith('Leica M6', previous);
      errSpy.mockRestore();
    });

    it('keeps the optimistic camera (no swap, no error) when the API returns 204/null', async () => {
      const replaceOptimisticCamera = jest.fn();
      mockCreateCamera.mockResolvedValue(null);
      render(<CameraSettingsSection {...makeProps({ replaceOptimisticCamera })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      await waitFor(() => expect(mockCreateCamera).toHaveBeenCalled());
      expect(replaceOptimisticCamera).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('passes film fields through and auto-toggles film when adding a film camera', () => {
      const updateStateField = jest.fn();
      mockCreateCamera.mockResolvedValue({ id: 60, cameraName: 'Hasselblad 500cm', isFilm: true });
      render(<CameraSettingsSection {...makeProps({ updateStateField })} />);

      openCameraAddNew();
      typeCameraName('Hasselblad 500cm');
      // Tick "Film Camera" so the Film Format select appears, then pick a format.
      fireEvent.click(screen.getByRole('checkbox', { name: /film camera/i }));
      fireEvent.change(screen.getByLabelText(/film format/i), { target: { value: 'MM_120' } });
      submitCamera();

      expect(updateStateField).toHaveBeenCalledWith({
        camera: { id: 0, name: 'Hasselblad 500cm', isFilm: true, defaultFilmFormat: 'MM_120' },
        isFilm: true,
        filmFormat: 'MM_120',
      });
      expect(mockCreateCamera).toHaveBeenCalledWith({
        cameraName: 'Hasselblad 500cm',
        isFilm: true,
        defaultFilmFormat: 'MM_120',
      });
    });
  });

  describe('Camera add-new (optimistic create)', () => {
    /** Open the Camera dropdown and reveal its inline "add new" form. */
    function openCameraAddNew(): void {
      fireEvent.click(screen.getByRole('button', { name: /camera:.*click to change/i }));
      fireEvent.click(screen.getByRole('button', { name: /add new camera/i }));
    }

    function typeCameraName(name: string): void {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\., hasselblad 500cm/i), {
        target: { value: name },
      });
    }

    function submitCamera(): void {
      fireEvent.click(screen.getByRole('button', { name: /^set camera$/i }));
    }

    it('writes an optimistic {id:0} camera and POSTs createCamera with the entered fields', () => {
      const updateStateField = jest.fn();
      mockCreateCamera.mockResolvedValue({ id: 55, cameraName: 'Leica M6', isFilm: false });
      render(<CameraSettingsSection {...makeProps({ updateStateField })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      expect(updateStateField).toHaveBeenCalledWith({
        camera: { id: 0, name: 'Leica M6', isFilm: false, defaultFilmFormat: null },
      });
      expect(mockCreateCamera).toHaveBeenCalledWith({
        cameraName: 'Leica M6',
        isFilm: false,
        defaultFilmFormat: null,
      });
    });

    it('swaps the optimistic camera for the server-assigned id on success', async () => {
      const replaceOptimisticCamera = jest.fn();
      mockCreateCamera.mockResolvedValue({ id: 55, cameraName: 'Leica M6', isFilm: false });
      render(<CameraSettingsSection {...makeProps({ replaceOptimisticCamera })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      await waitFor(() =>
        expect(replaceOptimisticCamera).toHaveBeenCalledWith('Leica M6', {
          id: 55,
          name: 'Leica M6',
          isFilm: false,
          defaultFilmFormat: null,
        })
      );
    });

    it('reverts the optimistic camera and surfaces an inline error when the create fails', async () => {
      const replaceOptimisticCamera = jest.fn();
      mockCreateCamera.mockRejectedValue(new Error('boom'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<CameraSettingsSection {...makeProps({ replaceOptimisticCamera })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/leica m6/i);
      expect(replaceOptimisticCamera).toHaveBeenCalledWith('Leica M6', null);
      errSpy.mockRestore();
    });

    it('reverts to the previously-selected camera (not null) on failure', async () => {
      const replaceOptimisticCamera = jest.fn();
      const previous = baseCameras[1]!; // Sony A7R IV
      mockCreateCamera.mockRejectedValue(new Error('boom'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(
        <CameraSettingsSection
          {...makeProps({
            replaceOptimisticCamera,
            updateState: { ...baseUpdateState, camera: previous },
          })}
        />
      );

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      await screen.findByRole('alert');
      expect(replaceOptimisticCamera).toHaveBeenCalledWith('Leica M6', previous);
      errSpy.mockRestore();
    });

    it('keeps the optimistic camera (no swap, no error) when the API returns 204/null', async () => {
      const replaceOptimisticCamera = jest.fn();
      mockCreateCamera.mockResolvedValue(null);
      render(<CameraSettingsSection {...makeProps({ replaceOptimisticCamera })} />);

      openCameraAddNew();
      typeCameraName('Leica M6');
      submitCamera();

      await waitFor(() => expect(mockCreateCamera).toHaveBeenCalled());
      expect(replaceOptimisticCamera).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('passes film fields through and auto-toggles film when adding a film camera', () => {
      const updateStateField = jest.fn();
      mockCreateCamera.mockResolvedValue({ id: 60, cameraName: 'Hasselblad 500cm', isFilm: true });
      render(<CameraSettingsSection {...makeProps({ updateStateField })} />);

      openCameraAddNew();
      typeCameraName('Hasselblad 500cm');
      // Tick "Film Camera" so the Film Format select appears, then pick a format.
      fireEvent.click(screen.getByRole('checkbox', { name: /film camera/i }));
      fireEvent.change(screen.getByLabelText(/film format/i), { target: { value: 'MM_120' } });
      submitCamera();

      expect(updateStateField).toHaveBeenCalledWith({
        camera: { id: 0, name: 'Hasselblad 500cm', isFilm: true, defaultFilmFormat: 'MM_120' },
        isFilm: true,
        filmFormat: 'MM_120',
      });
      expect(mockCreateCamera).toHaveBeenCalledWith({
        cameraName: 'Hasselblad 500cm',
        isFilm: true,
        defaultFilmFormat: 'MM_120',
      });
    });
  });
});
