import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

/** Any content the modal can edit — images and animated GIF/MP4 blocks. */
export type EditableContent = ContentImageModel | ContentGifModel;
