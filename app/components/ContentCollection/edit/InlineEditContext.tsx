'use client';

import { createContext, type ReactNode, useContext } from 'react';

/** The two free-text fields any inline-editable header rail exposes. */
export type InlineEditField = 'title' | 'description';

/**
 * The inline-editable header rail.
 *
 * Two surfaces mount this. `EditModeLayer` supplies the collection shape (every member below).
 * `/admin/users/[id]` supplies a user: title is the display name, description is the profile
 * blurb, and the collection-only members are simply absent — which is why everything past
 * `onCommitField` is optional. The renderer treats each one's presence as the switch for its own
 * affordance rather than inferring a "mode", so a consumer gets exactly the controls it filled in.
 */
export interface InlineEditContextValue {
  /** Current title buffer value. Unused when {@link titleLead} takes the leading slot instead. */
  title?: string;
  /** Current description buffer value. */
  description: string;
  /** Write a field to the shared edit buffer and persist (save-on-blur). */
  onCommitField: (field: InlineEditField, value: string) => void;
  /**
   * Accessible names for the two text fields. Default to the collection wording; the user surface
   * overrides them, because "Collection title" announced on a person's name is simply wrong.
   */
  titleLabel?: string;
  descriptionLabel?: string;
  /**
   * Applied to the title and description CONTROLS, on top of the class their read state already
   * carries, so a surface can make entering edit visually silent.
   *
   * Absent (collection manage) the controls keep `Input`/`Textarea`'s bordered box — the long-
   * standing look there. The admin user rail passes a class that strips that box, so clicking a
   * value to change it redraws nothing.
   */
  textEditorClassName?: string;
  /** Open the location picker so locations can be edited. Collection surfaces only. */
  onEditLocation?: () => void;
  /**
   * Enter or leave cover-pick mode, where a click on any grid image commits it as the cover.
   * Null when the active manage mode already owns grid clicks (reorder, select, pick-date), which
   * is what gates the affordance — the renderer has no other view of the manage state machine.
   */
  onTogglePickCover?: (() => void) | null;
  /** True while cover-pick mode is active; flips the affordance to its cancel label. */
  isPickingCover?: boolean;
  /**
   * Whether the collection has a cover image. False means no cover block is laid out at all, so
   * the metadata rail — not the (absent) cover — has to carry the entry point into cover-pick.
   */
  hasCover?: boolean;
  /**
   * Takes the leading slot of the title row INSTEAD of the editable title.
   *
   * The admin user surface puts the email here. The space's cover already carries the person's
   * name as its overlay, so drawing it again in the rail put one name on screen twice — and once
   * it was gone the corner sat empty while the email hid further down the block. One slot, rather
   * than a "hide the title" flag plus somewhere else to put a replacement: the row's leading
   * position has exactly one occupant, and this decides which.
   */
  titleLead?: ReactNode;
  /**
   * Rendered at the end of the title row, opposite the title itself.
   *
   * The admin user surface puts account status there: it belongs beside the name it qualifies, and
   * the top corner of the rail is the one spot in this block that is not already spoken for.
   */
  titleAside?: ReactNode;
  /**
   * Rendered directly above the description.
   *
   * The admin user surface puts the email here, which is where a reader looks for it — under the
   * name, over the prose — and where a duplicate block above the space would otherwise have put it.
   */
  beforeDescription?: ReactNode;
}

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

export const InlineEditProvider = InlineEditContext.Provider;

/** Returns the inline-edit surface when on-page editing is active, else null (public view). */
export function useInlineEdit(): InlineEditContextValue | null {
  return useContext(InlineEditContext);
}

export default InlineEditContext;
