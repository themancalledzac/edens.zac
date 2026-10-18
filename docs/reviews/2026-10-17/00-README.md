# Critical review, 2026-10-17

Three reports on the frontend at `main` @ `9f7302b7` (plus the uncommitted working tree), written for Zac to read and decide from. Each report ends with a priority table that says what we will do, in order, with files.

| Report | What it covers | First thing it asks for |
| --- | --- | --- |
| [01-design-review.md](01-design-review.md) | Mobile-first design: collection info block, filters, Related, heart, first paint, menu and navigation, admin panels, all-images, design-system consistency | Restore the message-row styles deleted in August, then the info-block layout fix |
| [02-code-review.md](02-code-review.md) | Face / Touch ID root cause, security, speed, duplication and dead code, navigation logic, the working tree | Set `WEBAUTHN_RP_ID` on the EC2 box and redeploy (production currently says `rpId: "localhost"`) |
| [03-markdown-docs-review.md](03-markdown-docs-review.md) | Every tracked `.md` file: inventory, false claims, overlap, target structure, open backlog | Write `docs/backlog.md` and `docs/decisions.md`, then delete 54 files |

## Screenshots

`screenshots/` holds the captures the design report references. Mobile captures (`m-*`) are 393x852 at 2x; desktop (`d-*`) are 1440 wide. Full-page captures were cropped to 6000 px tall. The three files in `screenshots/private/` show real user names and email addresses from the admin and comments pages. Do not commit those three to a public repository without blurring them.

The three `user-*` files are Zac's own captures that started the review.

## How the reports were made

Twelve read-only review passes over the repo, the running dev server on port 3001 and the backend repo, followed by one editing pass per report. The lead reviewer re-verified the headline claims by hand before they went in: the production `rpId` value, the `www` 403, the message-row regression, and the test suite status. Anything that could not be verified is marked "unverified" in the report that carries it.
