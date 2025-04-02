export type QueueItemStatus = 'queued' | 'uploading' | 'completed' | 'error';

export interface ImageMetadata {
  id: number;
  title: string;
  imageWidth: number;
  imageHeight: number;
  iso: number;
  author: string;
  rating: number;
  lens: string;
  blackAndWhite: boolean;
  shutterSpeed: string;
  rawFileName: string;
  camera: string;
  focalLength: string;
  location: string;
  imageUrlWeb: string | null;
  imageUrlSmall: string | null;
  imageUrlRaw: string | null;
  catalog: string[];
  createDate: string;
  updateDate: string;
  fstop: string;
}

export interface QueueItem {
  id: string;
  file: File;
  status: QueueItemStatus;
  progress: number;
  metadata?: ImageMetadata;
}

export type QueueAction =
  | { type: 'ADD_FILES'; files: File[] }  // Make sure this matches exactly
  | { type: 'UPDATE_STATUS'; id: string; status: QueueItemStatus }
  | { type: 'UPDATE_METADATA'; id: string; metadata: ImageMetadata }
  | { type: 'SET_ERROR'; id: string }
  | { type: 'REMOVE_FILE'; id: string };