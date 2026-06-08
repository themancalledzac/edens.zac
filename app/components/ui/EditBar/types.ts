export type EditBarCellVariant = 'default' | 'primary' | 'danger' | 'active';

export interface EditBarCell {
  key: string;
  label: string;
  onClick?: () => void;
  variant?: EditBarCellVariant;
  disabled?: boolean;
  /** When set, the cell renders as a <label> wrapping a hidden file input (e.g. Upload). */
  fileInput?: { accept?: string; multiple?: boolean; onFiles: (files: FileList) => void };
}

export interface EditBarTab {
  id: string;
  label: string;
}

export interface EditBarProps {
  /** Optional tab row (edit shape). Rendered above the action row when present. */
  tabs?: ReadonlyArray<EditBarTab>;
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Action cells. In mode shape this is the only row. */
  cells: ReadonlyArray<EditBarCell>;
  ariaLabel?: string;
}
