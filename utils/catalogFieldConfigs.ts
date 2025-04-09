import styles from '@/styles/Catalog.module.scss';

export type FieldType = 'input' | 'textarea' | 'select' | 'button' | 'toggle';

export const fieldConfigs: Record<string, {
  placeholder: string;
  fieldType: FieldType;
  viewClassName: string;
  editClassName: string;
  options?: Array<{ value: string | number, label: string }>;
  editable: boolean;
  width: 'full' | 'half' | 'quarter';
  main: boolean;
}> = {
  title: {
    placeholder: 'Enter title',
    fieldType: 'input',
    options: [],
    viewClassName: styles.catalogTitle,
    editClassName: styles.catalogTitleEdit,
    editable: true,
    width: 'full',
    main: true,
  },
  date: {
    placeholder: new Date().toISOString().split('T')[0],
    fieldType: 'input',
    options: [],
    viewClassName: styles.catalogDate,
    editClassName: '',
    editable: false,
    width: 'half',
    main: true,
  },
  location: {
    placeholder: 'Enter location',
    fieldType: 'input',
    options: [],
    viewClassName: styles.catalogLocation,
    editClassName: styles.catalogLocationEdit,
    editable: true,
    width: 'full',
    main: true,
  },
  description: {
    placeholder: 'Enter description',
    fieldType: 'textarea',
    options: [],
    viewClassName: styles.catalogDescription,
    editClassName: styles.catalogDescriptionEdit,
    editable: true,
    width: 'full',
    main: true,
  },
  coverImageUrl: {
    placeholder: 'Select Cover Image',
    fieldType: 'button',
    options: [],
    viewClassName: '',
    editClassName: styles.catalogCoverImageUrlEdit,
    editable: true,
    width: 'half',
    main: false,
  },
  selectImages: {
    placeholder: 'Select Images',
    fieldType: 'button',
    options: [],
    viewClassName: '',
    editClassName: styles.catalogSelectImagesEdit,
    editable: true,
    width: 'half',
    main: false,
  },
  // tags: {
  //   placeholder: 'Choose Tags',
  //   fieldType: 'input',
  //   options: [],
  //   viewClassName: '',
  //   editClassName: styles.catalogTagsEdit,
  //   editable: true,
  //   width: 'half',
  //   main: false,
  // },
  priority: {
    placeholder: 'Select priority',
    fieldType: 'select',
    options: [
      { value: 1, label: 'High (1)' },
      { value: 2, label: 'Medium (2)' },
      { value: 3, label: 'Low (3)' },
    ],
    viewClassName: '',
    editClassName: styles.catalogPriorityEdit,
    editable: true,
    width: 'quarter',
    main: false,
  },
  isHomeCard: {
    placeholder: 'Home Item',
    fieldType: 'toggle',
    options: [],
    viewClassName: '',
    editClassName: styles.catalogHomeItemEdit,
    editable: true,
    width: 'quarter',
    main: false,
  },
};
