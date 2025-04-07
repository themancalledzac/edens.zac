import styles from '@/styles/Catalog.module.scss';
import { Catalog } from '@/types/Catalog';

/**
 * Catalog Object Template for Create page.
 * @returns A new empty catalog object
 */
export const createEmptyCatalog = (): Catalog => ({
  id: null,
  title: '',
  location: '',
  priority: 2, // default to medium priority
  coverImageUrl: '',
  people: [],
  tags: [],
  images: [],
  slug: '',
  date: new Date().toISOString().split('T')[0], // today's date in YYYY-MM-DD format
});

export interface CatalogPageProps {
  create: boolean;
  catalog: Catalog | null;
}

/**
 * Checks if a catalog has the minimum required fields
 * @param catalog
 */
export const validateCatalog = (catalog: Catalog): boolean => {
  return !(!!catalog.title && catalog.title.trim().length > 0 ||
    !!catalog.location && catalog.location.trim().length > 0 ||
    !!catalog.coverImageUrl && catalog.coverImageUrl.trim().length > 0);
};

export const formatCatalogDate = (dateString: string): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export type FieldType = 'input' | 'textarea' | 'select' | 'button';

export const fieldConfigs: Record<string, {
  placeholder: string;
  fieldType: FieldType;
  viewClassName: string;
  editClassName: string;
  options?: Array<{ value: string | number, label: string }>;
  editable: boolean;
  main: boolean;
}> = {
  title: {
    placeholder: 'Enter title',
    fieldType: 'input',
    options: [],
    viewClassName: styles.catalogTitle,
    editClassName: styles.catalogTitleEdit,
    editable: true,
    main: true,
  },
  location: {
    placeholder: 'Enter location',
    fieldType: 'input',
    options: [],
    viewClassName: styles.catalogLocation,
    editClassName: styles.catalogLocationEdit,
    editable: true,
    main: true,
  },
  date: {
    placeholder: new Date().toISOString().split('T')[0],
    fieldType: 'input',
    options: [],
    viewClassName: styles.catalogDate,
    editClassName: '',
    editable: false,
    main: true,
  },
  paragraph: {
    placeholder: 'Enter description',
    fieldType: 'textarea',
    options: [],
    viewClassName: styles.catalogParagraph,
    editClassName: styles.catalogParagraphEdit,
    editable: true,
    main: true,
  },
  coverImageUrl: {
    placeholder: 'Choose Image',
    fieldType: 'button',
    options: [],
    viewClassName: styles.catalogCoverImageUrl,
    editClassName: styles.catalogCoverImageUrlEdit,
    editable: true,
    main: false,
  },
  priority: {
    placeholder: 'Select priority',
    fieldType: 'select',
    options: [
      { value: 1, label: 'High (1)' },
      { value: 2, label: 'Medium (2)' },
      { value: 3, label: 'Low (3)' },
    ],
    viewClassName: styles.catalogPriority,
    editClassName: styles.catalogPriorityEdit,
    editable: true,
    main: false,
  },
};
