/**
 * Global 404 Not Found Page
 *
 * Renders when routes fail to resolve or notFound() is called. Uses the
 * canonical StatusPage on the painted, dark-safe surface (review §5).
 */
import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';

export default function NotFound() {
  return (
    <StatusPage title="404 — Not Found" message="The page you're looking for doesn't exist." />
  );
}
