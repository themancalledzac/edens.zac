import { Button } from '@/app/components/ui/Button/Button';
import { type AdminMessageView } from '@/app/lib/api/messages';
import { gmailReplyUrl, relative, truncateWords } from '@/app/utils/messageFormat';

import styles from './MessageRow.module.scss';

interface MessagePartProps {
  message: AdminMessageView;
}

/**
 * The four parts one message is made of, defined once and arranged twice below.
 *
 * They are separate components rather than inlined into each arrangement because the two
 * arrangements group them differently — the card puts the timestamp beside the email, the hub row
 * puts it above the actions — so there is no single JSX tree both can share. Sharing the parts is
 * what keeps "what a message shows" in one place regardless.
 */
function EmailLink({ message }: MessagePartProps) {
  return (
    <a href={`mailto:${message.email}`} className={styles.email}>
      {message.email}
    </a>
  );
}

function Timestamp({ message }: MessagePartProps) {
  return (
    <time className={styles.time} dateTime={message.createdAt} title={message.createdAt}>
      {relative(message.createdAt)}
    </time>
  );
}

interface MessageBodyProps extends MessagePartProps {
  /** When set, the body is truncated to this many words and the full text moves to a title tooltip. */
  excerptWords?: number;
}

function MessageBody({ message, excerptWords }: MessageBodyProps) {
  return (
    <p className={styles.body} title={excerptWords ? message.message : undefined}>
      {excerptWords ? truncateWords(message.message, excerptWords) : message.message}
    </p>
  );
}

interface MessageActionsProps extends MessagePartProps {
  onDelete: (m: AdminMessageView) => void;
  deleting: boolean;
  /**
   * Toggles this message between read and unread. Passing it is what makes a surface read-aware:
   * the button and the Unread badge both appear only when it is present, so a caller that does not
   * manage read state — the admin hub's compact row — renders exactly as it did before.
   */
  onToggleRead?: (m: AdminMessageView) => void;
  togglingRead?: boolean;
}

function MessageActions({
  message,
  onDelete,
  deleting,
  onToggleRead,
  togglingRead,
}: MessageActionsProps) {
  const read = message.readAt !== null;
  return (
    <div className={styles.actions}>
      <a
        href={gmailReplyUrl(message.email)}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.replyButton}
      >
        Reply in Gmail
      </a>
      {onToggleRead && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleRead(message)}
          disabled={togglingRead}
        >
          {read ? 'Mark unread' : 'Mark read'}
        </Button>
      )}
      <Button variant="danger" size="sm" onClick={() => onDelete(message)} disabled={deleting}>
        {deleting ? 'Deleting…' : 'Delete'}
      </Button>
    </div>
  );
}

/**
 * The "Unread" badge. Real text rather than a coloured dot, so the state reaches a screen reader
 * without an aria-label doing the work a visible word already does.
 */
function UnreadBadge() {
  return <span className={styles.unread}>Unread</span>;
}

type MessageRowProps = MessageActionsProps & MessageBodyProps;

/**
 * Inner markup for one message CARD: email + time, body, reply + delete actions, stacked in one
 * column. The /comments page's arrangement — it has a full page width to spend and shows the whole
 * message body, so it does not split into left/right sections the way the hub row does.
 *
 * Passing `onToggleRead` adds the Unread badge and the read button; omitting it renders the card
 * exactly as it did before read state existed.
 */
export function MessageRow({
  message,
  onDelete,
  deleting,
  excerptWords,
  onToggleRead,
  togglingRead,
}: MessageRowProps) {
  return (
    <>
      <div className={styles.meta}>
        <EmailLink message={message} />
        {onToggleRead && message.readAt === null && <UnreadBadge />}
        <Timestamp message={message} />
      </div>
      <MessageBody message={message} excerptWords={excerptWords} />
      <MessageActions
        message={message}
        onDelete={onDelete}
        deleting={deleting}
        onToggleRead={onToggleRead}
        togglingRead={togglingRead}
      />
    </>
  );
}

/**
 * A hub row's left section: who wrote it, over what they wrote.
 *
 * The wrapper is not decoration — it is a flex column, which blockifies the `<a>` inside it. An
 * inline `<a>` ignores `overflow: hidden`, so without it the email would not ellipsise and a long
 * address would push the right rail off the panel.
 */
export function MessageRowLeft({ message, excerptWords }: MessageBodyProps) {
  return (
    <div className={styles.identity}>
      <EmailLink message={message} />
      <MessageBody message={message} excerptWords={excerptWords} />
    </div>
  );
}

/**
 * A hub row's right section: when it arrived, over what to do about it. Needs no wrapper —
 * `ListPanel`'s `.rowRight` is already the flex column that stacks and right-aligns these two.
 */
export function MessageRowRight({ message, onDelete, deleting }: MessageActionsProps) {
  return (
    <>
      <Timestamp message={message} />
      <MessageActions message={message} onDelete={onDelete} deleting={deleting} />
    </>
  );
}

export default MessageRow;
