import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every interactive `ui/` SCSS module must carry the coarse-pointer `::after` overlay that lifts
 * its tap target to `--touch-target-min` (44px). The check reads the stylesheet source because
 * jsdom cannot evaluate `@media (pointer: coarse)`.
 */
const UI_ROOT = path.resolve(__dirname, '../../../app/components/ui');

const INTERACTIVE_MODULES = [
  'Button/Button.module.scss',
  'IconButton/IconButton.module.scss',
  'FilterChip/FilterChip.module.scss',
  'SegmentedChip/SegmentedChip.module.scss',
  'Chip/Chip.module.scss',
];

const COARSE_OVERLAY =
  /@media \(pointer: coarse\)\s*{\s*&::after\s*{[^}]*min-width: var\(--touch-target-min, 44px\);[^}]*min-height: var\(--touch-target-min, 44px\);[^}]*}/;

describe('interactive ui/ touch targets', () => {
  it.each(INTERACTIVE_MODULES)('%s has a coarse-pointer ::after overlay', modulePath => {
    const source = readFileSync(path.join(UI_ROOT, modulePath), 'utf8');
    expect(source).toMatch(COARSE_OVERLAY);
  });
});
