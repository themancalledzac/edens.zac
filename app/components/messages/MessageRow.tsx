import { Button } from '@/app/components/ui/Button/Button';
import { type AdminMessageView } from '@/app/lib/api/messages';
import { gmailReplyUrl, relative, truncateWords } from '@/app/utils/messageFormat';

/**
 * Class names the message parts read off the caller's CSS module. Each context — the full
 * /comments card, the compact admin-hub row — keeps its own styling by passing its own module
 * under these shared keys.
 *
 * The record is `Partial` because the two contexts arrange the same parts differently and so use
 * different keys: `meta` is the card's email-beside-time line, `identity` the hub row's
 * email-over-body left section. A caller declares the keys its own arrangement reaches for.
 */
type MessageRowStyles = Partial<
  Record<'meta' | 'identity' | 'email' | 'time' | 'body' | 'actions' | 'replyButton', string>
>;

interface MessagePartProps {
  message: AdminMessageView;
  styles: MessageRowStyles;
}

/**
 * The four parts one message is made of, defined once and arranged twice below.
 *
 * They are separate components rather than inlined into each arrangement because the two
 * arrangements group them differently — the card puts the timestamp beside the email, the hub row
 * puts it above the actions — so there is no single JSX tree both can share. Sharing the parts is
 * what keeps "what a message shows" in one place regardless.
 */
function EmailLink({ message, styles }: MessagePartProps) {
  return (
    <a href={`mailto:${message.email}`} className={styles.email}>
      {message.email}
    </a>
  );
}

function Timestamp({ message, styles }: MessagePartProps) {
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

function MessageBody({ message, styles, excerptWords }: MessageBodyProps) {
  return (
    <p className={styles.body} title={excerptWords ? message.message : undefined}>
      {excerptWords ? truncateWords(message.message, excerptWords) : message.message}
    </p>
  );
}

interface MessageActionsProps extends MessagePartProps {
  onDelete: (m: AdminMessageView) => void;
  deleting: boolean;
}

function MessageActions({ message, styles, onDelete, deleting }: MessageActionsProps) {
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
      <Button variant="danger" size="sm" onClick={() => onDelete(message)} disabled={deleting}>
        {deleting ? 'Deleting…' : 'Delete'}
      </Button>
    </div>
  );
}

type MessageRowProps = MessageActionsProps & MessageBodyProps;

/**
 * Inner markup for one message CARD: email + time, body, reply + delete actions, stacked in one
 * column. The /comments page's arrangement — it has a full page width to spend and shows the whole
 * message body, so it does not split into left/right sections the way the hub row does.
 */
export function MessageRow({ message, onDelete, deleting, styles, excerptWords }: MessageRowProps) {
  return (
    <>
      <div className={styles.meta}>
        <EmailLink message={message} styles={styles} />
        <Timestamp message={message} styles={styles} />
      </div>
      <MessageBody message={message} styles={styles} excerptWords={excerptWords} />
      <MessageActions message={message} styles={styles} onDelete={onDelete} deleting={deleting} />
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
export function MessageRowLeft({ message, styles, excerptWords }: MessageBodyProps) {
  return (
    <div className={styles.identity}>
      <EmailLink message={message} styles={styles} />
      <MessageBody message={message} styles={styles} excerptWords={excerptWords} />
    </div>
  );
}

/**
 * A hub row's right section: when it arrived, over what to do about it. Needs no wrapper —
 * `ListPanel`'s `.rowRight` is already the flex column that stacks and right-aligns these two.
 */
export function MessageRowRight({ message, styles, onDelete, deleting }: MessageActionsProps) {
  return (
    <>
      <Timestamp message={message} styles={styles} />
      <MessageActions message={message} styles={styles} onDelete={onDelete} deleting={deleting} />
    </>
  );
}

export default MessageRow;
