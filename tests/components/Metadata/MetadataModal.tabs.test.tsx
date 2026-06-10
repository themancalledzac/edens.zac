import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import MetadataModal from '@/app/components/Metadata/MetadataModal';
import type { ContentImageModel } from '@/app/types/Content';

const EMPTY_LOCATIONS: never[] = [];

function imageFixture(id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id,
    orderIndex: 0,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    imageWidth: 4000,
    imageHeight: 3000,
    title: `Image ${id}`,
    alt: `Alt ${id}`,
    rating: null,
    blackAndWhite: false,
    isFilm: false,
    collections: [],
    tags: [],
    people: [],
    locations: [],
    ...overrides,
  } as ContentImageModel;
}

const baseProps = {
  onClose: jest.fn(),
  selectedIds: [101],
  selectedImages: [imageFixture(101)],
  availableLocations: EMPTY_LOCATIONS,
};

describe('MetadataModal — tab structure and bulk-edit field visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });

  it('renders exactly three tabs: Info, Camera, Collections (no Tags tab)', () => {
    render(<MetadataModal {...baseProps} />);
    expect(screen.getByRole('tab', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Camera' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Collections' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('defaults to the Info tab active', () => {
    render(<MetadataModal {...baseProps} />);
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Camera' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Camera tab when clicked', () => {
    render(<MetadataModal {...baseProps} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Camera' }));
    expect(screen.getByRole('tab', { name: 'Camera' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Collections tab when clicked', () => {
    render(<MetadataModal {...baseProps} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Collections' }));
    expect(screen.getByRole('tab', { name: 'Collections' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('single-image edit: shows Title, Caption, and Alt fields', () => {
    render(<MetadataModal {...baseProps} />);
    expect(screen.getByPlaceholderText(/enter image title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter caption/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe the image/i)).toBeInTheDocument();
  });

  it('bulk edit: hides Title, Caption, and Alt fields when more than one image is selected', () => {
    const images = [imageFixture(101), imageFixture(102)];
    render(<MetadataModal {...baseProps} selectedIds={[101, 102]} selectedImages={images} />);
    expect(screen.queryByPlaceholderText(/enter image title/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter caption/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/describe the image/i)).not.toBeInTheDocument();
  });

  it('bulk edit: still shows Rating and Author fields', () => {
    const images = [imageFixture(101), imageFixture(102)];
    render(<MetadataModal {...baseProps} selectedIds={[101, 102]} selectedImages={images} />);
    expect(screen.getByPlaceholderText(/photographer name/i)).toBeInTheDocument();
  });

  it('renders the close button', () => {
    render(<MetadataModal {...baseProps} />);
    expect(screen.getByRole('button', { name: /close metadata editor/i })).toBeInTheDocument();
  });

  describe('ARIA tab/panel associations', () => {
    it('each role=tab has an id and aria-controls pointing to its panel', () => {
      render(<MetadataModal {...baseProps} />);
      const tabs = screen.getAllByRole('tab');
      for (const tab of tabs) {
        const tabId = tab.getAttribute('id');
        expect(tabId).toBeTruthy();

        const controlsId = tab.getAttribute('aria-controls');
        expect(controlsId).toBeTruthy();

        // The panel element must exist in the document
         
        const panel = document.getElementById(controlsId!);
        expect(panel).not.toBeNull();
        expect(panel?.getAttribute('role')).toBe('tabpanel');
      }
    });

    it('each role=tabpanel aria-labelledby resolves to an existing tab button', () => {
      render(<MetadataModal {...baseProps} />);
      const panels = screen.getAllByRole('tabpanel', { hidden: true });
      expect(panels.length).toBeGreaterThan(0);
      for (const panel of panels) {
        const labelledById = panel.getAttribute('aria-labelledby');
        expect(labelledById).toBeTruthy();

        // The element referenced by aria-labelledby must exist and be a tab button
         
        const labelEl = document.getElementById(labelledById!);
        expect(labelEl).not.toBeNull();
        expect(labelEl?.getAttribute('role')).toBe('tab');
      }
    });

    it('Info tab button id is tab-info and controls tabpanel-info', () => {
      render(<MetadataModal {...baseProps} />);
      const infoTab = screen.getByRole('tab', { name: 'Info' });
      expect(infoTab).toHaveAttribute('id', 'tab-info');
      expect(infoTab).toHaveAttribute('aria-controls', 'tabpanel-info');
      expect(document.getElementById('tabpanel-info')).not.toBeNull();
    });

    it('Camera tab button id is tab-camera and controls tabpanel-camera', () => {
      render(<MetadataModal {...baseProps} />);
      const cameraTab = screen.getByRole('tab', { name: 'Camera' });
      expect(cameraTab).toHaveAttribute('id', 'tab-camera');
      expect(cameraTab).toHaveAttribute('aria-controls', 'tabpanel-camera');
      expect(document.getElementById('tabpanel-camera')).not.toBeNull();
    });

    it('Collections tab button id is tab-collections and controls tabpanel-collections', () => {
      render(<MetadataModal {...baseProps} />);
      const collectionsTab = screen.getByRole('tab', { name: 'Collections' });
      expect(collectionsTab).toHaveAttribute('id', 'tab-collections');
      expect(collectionsTab).toHaveAttribute('aria-controls', 'tabpanel-collections');
      expect(document.getElementById('tabpanel-collections')).not.toBeNull();
    });
  });
});
