/**
 * Display names for the backend `FilmFormat` enum.
 *
 * `ContentImageModel.filmFormat` carries the raw enum name (`MM_35`), not a label — the admin
 * editor resolves it against the fetched `FilmFormatDTO[]`, but public surfaces like the
 * fullscreen metadata overlay have no such list and would otherwise print `MM_35` verbatim.
 *
 * Mirrors `edens.zac.backend` `types/FilmFormat.java`. An unmapped value falls through
 * unchanged rather than rendering as blank, so a newly added backend format is visibly wrong
 * instead of silently missing.
 */

const FILM_FORMAT_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  MM_35: '35mm',
  MM_120: '120',
};

/**
 * Resolve a `FilmFormat` enum name to its human label.
 *
 * @param filmFormat - Backend enum name, e.g. `MM_35`.
 * @returns The display label (`35mm`), the input verbatim when unmapped, or an empty string.
 */
export function formatFilmFormat(filmFormat?: string | null): string {
  if (!filmFormat) {
    return '';
  }
  return FILM_FORMAT_DISPLAY_NAMES[filmFormat] ?? filmFormat;
}
