import {
  ArrowUpNarrowWide,
  AtSign,
  Bookmark,
  Calendar,
  Camera,
  Crown,
  EyeOff,
  Film,
  FingerprintPattern,
  Folders,
  Grid2x2,
  Grid3x3,
  Images,
  Inbox,
  LogOut,
  type LucideIcon,
  MapPinned,
  Network,
  RotateCcw,
  Share,
  Shield,
  Square,
  Star,
  Users,
  X,
} from 'lucide-react';

/** A control that has an approved icon in the 2026-10-18 chip design review. */
export type ChipIconKey =
  | 'order'
  | 'hidden'
  | 'people'
  | 'location'
  | 'date'
  | 'camera'
  | 'lens'
  | 'rated'
  | 'film'
  | 'following'
  | 'reset'
  | 'remove'
  | 'densityLarge'
  | 'densityMedium'
  | 'densitySmall'
  | 'admin'
  | 'collections'
  | 'images'
  | 'saved'
  | 'share'
  | 'contact'
  | 'passkey'
  | 'logout'
  | 'messages'
  | 'users'
  | 'roles';

/**
 * The one place a chip's icon is chosen. Callers look icons up here rather than importing from
 * `lucide-react` directly, so a control keeps the same icon on every page.
 */
export const CHIP_ICONS: Record<ChipIconKey, LucideIcon> = {
  order: ArrowUpNarrowWide,
  hidden: EyeOff,
  people: Users,
  location: MapPinned,
  date: Calendar,
  camera: Camera,
  lens: Camera,
  rated: Star,
  film: Film,
  following: Network,
  reset: RotateCcw,
  remove: X,
  densityLarge: Square,
  densityMedium: Grid2x2,
  densitySmall: Grid3x3,
  admin: Crown,
  collections: Folders,
  images: Images,
  saved: Bookmark,
  share: Share,
  contact: AtSign,
  passkey: FingerprintPattern,
  logout: LogOut,
  messages: Inbox,
  users: Users,
  roles: Shield,
};
