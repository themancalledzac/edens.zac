/**
 * ContentBlock Type Definitions
 *
 * Comprehensive TypeScript interfaces and type definitions for the ContentBlock system.
 * Provides strongly typed contracts for all ContentBlock components, renderers, and utilities.
 * Ensures type safety across image blocks, text blocks, badges, and wrapper components.
 *
 * @dependencies
 * - NormalizedContentBlock from imageUtils for core block structure
 * - React types for component prop definitions
 *
 * @exports
 * - Component prop interfaces for all ContentBlock renderers
 * - Badge system configuration types
 * - Enhanced block data structures with metadata
 * - Wrapper and overlay component interfaces
 */

import { type NormalizedContentBlock } from '@/utils/imageUtils';

// Enhanced original block interface with proper types
export interface EnhancedOriginalBlock {
  overlayText?: string;
  cardTypeBadge?: string;
  dateBadge?: string;
  title?: string;
  text?: string;
  content?: string;
  align?: 'left' | 'center' | 'right';
  [key: string]: unknown;
}

// Badge configuration interface
export interface BadgeConfig {
  text: string;
  position: 'top-left' | 'top-right';
  className: string;
}

// Block wrapper props
export interface BlockWrapperProps {
  children: React.ReactNode;
  width: number;
  height: number;
  className: string;
  isMobile?: boolean;
  onClick?: () => void;
  hasOverlays?: boolean;
}

// Image block renderer props
export interface ImageBlockRendererProps {
  block: NormalizedContentBlock;
  width: number;
  height: number;
  className: string;
  isMobile?: boolean;
  onClick?: () => void;
}

// Text block renderer props
export interface TextBlockRendererProps {
  block: NormalizedContentBlock;
  width: number;
  height: number;
  className: string;
  isMobile?: boolean;
}

// Badge overlay props
export interface BadgeOverlayProps {
  badges: BadgeConfig[];
}

// Enhanced block data with proper typing
export interface EnhancedBlockData {
  block: NormalizedContentBlock;
  originalBlock: EnhancedOriginalBlock;
  width: number;
  height: number;
  className: string;
}