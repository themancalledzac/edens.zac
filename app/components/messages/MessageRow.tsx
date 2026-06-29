import { Button } from '@/app/components/ui/Button/Button';
import { type AdminMessageView } from '@/app/lib/api/messages';
import { gmailReplyUrl, relative, truncateWords } from '@/app/utils/messageFormat';

/**
 * Class names MessageRow reads off the caller's CSS module. Each context (the
 * full /comments page vs. the compact admin-hub column) keeps its own styling
 * by passing its own module under these shared keys.
 */
type MessageRowStyles = Partial<
  Record<'meta' | 'email' | 'time' | 'body' | 'actions' | 'replyButton', string>
>;

interface MessageRowProps {
  message: AdminMessageView;
  onDelete: (m: AdminMessageView) => void;
  deleting: boolean;
  styles: MessageRowStyles;
  /** When set, the body is truncated to this many words and the full text moves to a title tooltip. */
  excerptWords?: number;
}

/** Inner markup for one admin message row: email + time, body, reply + delete actions. */
export function MessageRow({ message, onDelete, deleting, styles, excerptWords }: MessageRowProps) {
  const body = excerptWords ? truncateWords(message.message, excerptWords) : message.message;
  return (
    <>
      <div className={styles.meta}>
        <a href={`mailto:${message.email}`} className={styles.email}>
          {message.email}
        </a>
        <time className={styles.time} dateTime={message.createdAt} title={message.createdAt}>
          {relative(message.createdAt)}
        </time>
      </div>
      <p className={styles.body} title={excerptWords ? message.message : undefined}>
        {body}
      </p>
      <div className={styles.actions}>
        <a
          href={gmailReplyUrl(message.email)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.replyButton}
        >
          Reply in Gmail
        </a>
        <Button variant="danger" size="sm" onClick={() => onDelete(message)} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </>
  );
}

export default MessageRow;
