# Körnamnsvalet — Product Design

## Purpose

Körnamnsvalet is a one-time Swedish-language website through which a choir selects its name. It imports 32 anonymous Suggestions, each consisting of a proposed name and its motivation, and conducts an Administrator-led Approval Round followed by a configurable Final Vote and, when needed, Runoffs.

The experience is designed for a live choir gathering. Participants vote on phones while a shared presentation follows the Administrator's lead. The site uses ordinary HTTP requests and polling rather than real-time infrastructure.

The canonical domain language is defined in [`CONTEXT.md`](../CONTEXT.md).

## Goals

- Let every named Participant vote once through a personal Invitation.
- Keep each Participant's choices private while showing the Administrator named completion status.
- Prevent Participants from accessing Suggestions before the Administrator reveals them.
- Let late or disconnected Participants catch up on all revealed Suggestions.
- Give the Administrator deliberate control over progression, finalist selection, closure, Runoffs, and the Result Reveal.
- Make the phone experience clear and the shared result ceremony extremely festive.
- Remain operationally simple on Vercel with Drizzle and Postgres.

## Non-goals

- Reuse for future elections.
- User accounts, email delivery, or strong identity verification.
- Protection against deliberate impersonation by trusted choir members.
- Cryptographic ballot anonymity.
- WebSockets, subscriptions, or other real-time infrastructure.
- Scheduled phase changes.
- Localization beyond Swedish.
- Support for multiple concurrent sessions on one device.

## Trust model

The Administrator manually creates a Participant for each eligible choir member. Each Participant receives an eight-character, URL-safe bearer token at `/vote/[token]`. Tokens are stored directly in Postgres and can be copied or regenerated; regeneration invalidates the old link.

The Administrator may copy an individual link or generate one combined message in this exact shape:

```text
Anna
https://example.com/vote/a8K2mQ7x

Björn
https://example.com/vote/p4Nz6R1w
```

The complete list may be posted in the choir's group chat. This prevents accidental duplicate voting but knowingly allows a member with another person's link to impersonate them. Social trust is the accepted control.

Opening an Invitation shows `Du röstar som [namn]` before the ballot. Participant display labels must be unique; the Administrator can use labels such as `Anna L.` and `Anna K.` where needed.

Administrator authentication uses `ADMIN_PASSWORD` and a separate high-entropy `SESSION_SECRET`. The signed, HTTP-only, secure, same-site session cookie expires after approximately 12 hours.

## Election lifecycle

The lifecycle is forward-only:

1. **Draft**
2. **Approval Open**
3. **Approval Closed / Finalist Preparation**
4. **Final Vote Open**
5. **Final Vote Closed**
6. **Runoff Open / Closed**, repeated when necessary
7. **Complete**

There is no scheduling. Every transition is an explicit Administrator action. Irreversible transitions show a preview, consequences, and confirmation.

The roster, Suggestion content, and Suggestion order freeze when the Approval Round opens. The selected Finalists and Vote Token allowance freeze when the Final Vote opens. Closed rounds cannot reopen.

## Draft setup

### Suggestions

The Administrator uploads a UTF-8 CSV with required headers:

```csv
suggestion,motivation
```

Standard quoted CSV fields may contain commas, quotation marks, and line breaks. The browser shows a validated preview of every row before import. The file itself is never retained.

The source dataset is trusted to contain 32 unique, suitable Suggestions. Every motivation is always displayed together with its Suggestion. Imported order is preserved initially, and the Administrator may reorder Suggestions during Draft.

A later import during Draft replaces all Suggestions after explicit confirmation. Import becomes unavailable once the Approval Round opens.

### Participants

The Administrator adds Participants individually in the UI; there is no roster import. During Draft, Participants may be added, renamed, or removed. The UI can generate, copy, regenerate, and compile Invitation links.

After the Approval Round opens, the roster freezes. The Administrator may only correct a display-name typo or regenerate an Invitation.

## Approval Round

### Reveal and presentation

The Reveal Frontier is monotonic: revealing a Suggestion cannot be undone. The Presentation Position is independent and may move backward or forward among revealed Suggestions.

- Back changes only the Presentation Position.
- Next moves through already revealed Suggestions.
- Next at the Reveal Frontier asks for confirmation before revealing the following Suggestion.
- Participants can access every Suggestion at or behind the Reveal Frontier, regardless of the Presentation Position.
- The Approval Round cannot close until all Suggestions have been revealed.

The presentation page displays one Suggestion and motivation in large type. It polls for changes and contains no Administrator controls.

### Participant ballot

The Participant UI displays one Suggestion and motivation at a time with large `Ja!` and `Nej` controls. It defaults to the earliest unanswered revealed Suggestion and offers Back/Next navigation only among revealed Suggestions.

Each choice saves immediately. A confirmed save is visibly distinguished from a pending or failed save. Every revealed choice remains editable until the Approval Round closes.

After answering all revealed Suggestions, the Participant sees an animated `Du är ikapp!` waiting state. Silent polling detects the next reveal and moves into the new Suggestion automatically. Background polling itself does not animate.

### Administrator visibility and closure

While the round is open, the Administrator sees:

- the number of Participants who answered the presented Suggestion;
- the number fully caught up with the Reveal Frontier;
- invitation status, last activity, and named completion status.

The Administrator never sees live Yay/Nay totals or individual choices.

The Administrator may close with incomplete Ballots after a strong warning that lists unfinished Participants. Every saved Yay or Nay counts, including choices from partial Ballots.

After closure, each Suggestion reports:

- Yay count;
- Nay count;
- unanswered count;
- Approval Score: Yay divided by submitted Yay plus Nay responses.

Suggestions rank by Yay count, then Approval Score, then original order. Approval results remain Administrator-only unless deliberately published later.

## Finalist preparation

After reviewing Approval results, the Administrator deliberately selects Finalists rather than accepting an automatic cutoff.

- Default: five Finalists.
- Minimum for a Final Vote: two.
- Maximum: ten.
- If only one acceptable Suggestion remains, the Administrator may declare it the Winner without a Final Vote.

The Administrator configures the Vote Token allowance, defaulting to three, and previews the complete ballot before opening it.

## Final Vote

Each eligible Participant receives the same fixed number of indivisible Vote Tokens. Participation in the Approval Round is not required.

Participants may stack all tokens on one Finalist or distribute them among several. Each Finalist card always includes its motivation and large plus/minus controls. Animated token markers and a sticky `X röster kvar` indicator make the remaining allowance explicit.

Allocations save immediately. The Ballot is complete only when every token is allocated, but a completed allocation remains editable until closure. The server rejects negative allocations, excess tokens, ineligible Finalists, and writes after closure.

The Administrator may close with incomplete Participants after confirmation. Only saved, fully allocated Final Ballots count.

## Runoffs

A unique leader in a closed Final Vote becomes the Winner. A tie among leaders unlocks a Runoff containing only those tied Finalists.

Each Participant gets exactly one vote in a Runoff, editable until closure. If the Runoff ties, another Runoff may be launched among the newly tied leaders. After a second tied Runoff, the Administrator may either continue again or declare a shared result; the system never selects randomly.

## Result Reveal

Closing a Final Vote or Runoff computes and freezes its outcome without publishing it. Before the ceremony, the Administrator sees only whether the outcome is unique or tied—not the identity or totals.

For a unique Winner, the Administrator triggers a separate Result Reveal. The reveal state is persisted. Polling Participant devices celebrate when they first observe it; late visitors see the completed result without automatically replaying the ceremony.

The presentation receives the fullest effect: theatrical curtains, spotlights, flying notes, confetti, animated typography, and an optional user-triggered fanfare. Participant screens celebrate too. Reduced-motion preferences receive a calm but polished reveal, and no essential information depends on animation or sound.

Afterward, Participants see the Winner followed by a ranked chart of Finalist Vote Token totals and turnout. Approval results remain private to the Administrator unless deliberately published.

## Administrator exports and cleanup

The Administrator can export an aggregate CSV containing Suggestions, Approval totals, finalist status, Final Vote totals, Runoff totals, and turnout. It never includes Participant-level choices.

After completion, an explicit typed-confirmation cleanup action:

1. creates and verifies an immutable aggregate snapshot;
2. deletes Participant names and Invitation tokens;
3. deletes individual Ballots;
4. keeps the anonymous aggregate result available to the site.

## Routes

- `/` — festive Swedish landing page explaining that a personal Invitation is required.
- `/vote/[token]` — Participant identity confirmation, ballots, waiting states, and published results.
- `/present` — control-free shared presentation, current Suggestion, and Result Reveal.
- `/admin/login` — shared-password Administrator login.
- `/admin` — setup, facilitation, completion tracking, results, exports, and cleanup.

Ballot navigation stays within a single route; it does not add browser-history entries. The browser Back button therefore leaves the ballot normally.

## Visual and motion direction

The UI is Swedish, mobile-first, highly legible, and deliberately unlike a generic SaaS dashboard. Its concert-stage visual language uses deep burgundy and midnight backgrounds, warm gold and cream typography, velvet-like gradients, moving spotlights, musical staves and notes, oversized editorial headings, and vivid Yay/Nay accents.

Native React View Transitions communicate ordered movement between previous and next Suggestions and continuity between relevant UI states. Unsupported browsers degrade gracefully. Poll refreshes do not trigger transitions. All animation honors `prefers-reduced-motion`.

The working title is `Körnamnsvalet`; interface copy is centralized so it can be edited before deployment.

## Technical architecture

- Next.js App Router and TypeScript.
- React Server Components for initial reads.
- Focused client components for ballots, polling, presentation controls, and animation.
- Server Actions for mutations.
- Tailwind CSS for the bespoke visual system.
- Zod for form and CSV validation.
- Drizzle ORM with Postgres.js against `POSTGRES_URL`.
- Bun for package management and scripts.
- Vitest for domain rules and database integration tests.
- Playwright for essential Administrator and Participant journeys and authorization boundaries.
- Vercel hosting with any compatible managed Postgres provider, using its pooled connection URL.

`bun run db:migrate` applies committed, provider-neutral SQL migrations before deployment. Migrations do not run automatically during Vercel builds.

### Persistent model

The database needs concepts equivalent to:

- one Election record containing lifecycle phase, Reveal Frontier, Presentation Position, configuration, result visibility, and a state version;
- ordered Suggestions;
- named Participants with direct Invitation tokens and activity timestamps;
- one Approval choice per Participant and Suggestion;
- selected Finalists;
- one non-negative Final allocation per Participant and Finalist;
- zero or more Runoff rounds and one choice per Participant per Runoff;
- immutable aggregate result snapshots created at completion or cleanup.

Database constraints and transactional server checks enforce uniqueness, eligibility, revealed access, phase restrictions, and token budgets. Writes are idempotent where retries are expected. The product assumes one active session per device and does not add dedicated multi-tab conflict UX.

## Refresh and failure behavior

Open voting and presentation screens poll every two to three seconds and also expose a manual refresh action. A failed save remains visibly unsaved, retries automatically, and offers an explicit retry control. The UI never reports success until the server confirms it. Reloading an Invitation restores all confirmed choices.

## Acceptance criteria

- An Administrator can import and preview the 32 Suggestions and manually create the roster.
- Every Participant receives a unique working link, and the combined-message clipboard format is exact.
- A Participant cannot access or write a vote for an unrevealed Suggestion.
- Presentation navigation can revisit revealed Suggestions without moving the Reveal Frontier backward.
- Approval choices save immediately, survive reload, remain editable while open, and freeze on close.
- The Administrator can identify incomplete Participants without seeing their choices.
- Approval ranking and partial-response denominators follow the documented rules.
- Final allocations cannot exceed or fall short of the allowance when counted as complete.
- Finalist and allowance configuration cannot change after opening.
- Runoff eligibility and one-vote rules are enforced.
- Closing does not leak the outcome before the explicit Result Reveal.
- Every connected device observes progression through polling without real-time services.
- The full ceremony, reduced-motion result, reconnect path, stale write rejection, and cleanup snapshot are tested.
- Current mobile Safari and Chrome, including practical in-app browser use, can complete every Participant flow.
