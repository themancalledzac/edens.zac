import { type BaseBlock } from '@/lib/api/contentCollections';

/**
 * Shared Content Block Types for frontend components.
 *
 * Centralized definitions to avoid duplicating interfaces across components.
 */
export interface ImageBlock extends BaseBlock {
  type: 'IMAGE';
  webUrl?: string;
  url?: string;
  src?: string;
  rawUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  overlayText?: string;
  aspectRatio?: number;
  [key: string]: unknown;
}

export interface TextBlock extends BaseBlock {
  type: 'TEXT';
  content?: string;
  text?: string;
  value?: string;
  format?: 'plain' | 'markdown' | 'html';
  align?: 'start' | 'center' | 'end';
  [key: string]: unknown;
}

export interface CodeBlock extends BaseBlock {
  type: 'CODE';
  code?: string;
  content?: string;
  text?: string;
  language?: string;
  filename?: string;
  [key: string]: unknown;
}

export type AnyContentBlock = ImageBlock | TextBlock | CodeBlock | BaseBlock;
