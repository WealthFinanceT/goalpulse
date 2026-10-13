# Goal Pulse Web Push notifications

Goal Pulse stores Web Push subscriptions, notification preferences, fixture
snapshots, processed event IDs, and pending deliveries in Upstash Redis. It uses
only the existing normalized Streamed.pk fixture feed; it does not add a
football data provider or browser-driven background polling.

## Required configuration

Create an Upstash Redis database in a region close to the Vercel deployment and
set these server-side environment variables in Vercel and in `.env.local` for
local development:

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Private Upstash REST token; never expose with a `NEXT_PUBLIC_` prefix |
| `VAPID_PUBLIC_KEY` | Web Push application-server public key |
| `VAPID_PRIVATE_KEY` | Matching private key; server-side only |
| `VAPID_SUBJECT` | Contact URI, for example `mailto:admin@example.com` |
| `CRON_SECRET` | At least 32 random characters used to authenticate the monitoring job |

Generate one VAPID key pair locally with `npx web-push generate-vapid-keys`.
Keep the same pair for all deployments and subscriptions. Put the public and
private values into the matching server environment variables; do not commit
them, print them in CI logs, or rotate them without expecting existing browser
subscriptions to need replacement. Generate a cron secret locally, for example:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Set all six variables in `.env.local` for local testing, without committing
that file. In Vercel, configure them for **Production** and **Preview** as
appropriate, then redeploy so the cron job and server functions receive them.

## Redis key layout

The adapter uses these version-independent keys:

| Key | Contents |
| --- | --- |
| `goal-pulse:{notifications}:subscription:<sha256-endpoint>` | One device's push subscription and preferences |
| `goal-pulse:{notifications}:subscriptions` | Set of subscription IDs |
| `goal-pulse:{notifications}:subscriptions:goals` | Goal-alert audience |
| `goal-pulse:{notifications}:subscriptions:full-time` | Full-time audience |
| `goal-pulse:{notifications}:subscriptions:kickoffs:<minutes>` | Kickoff-reminder audience per selected lead time |
| `goal-pulse:{notifications}:match-snapshots` | Last observed normalized fixture snapshots |
| `goal-pulse:{notifications}:processed:<event-id>` | Atomic, 30-day event deduplication marker |
| `goal-pulse:{notifications}:outbox` and `...:event:<id>` | Pending event queue and retry state |
| `goal-pulse:{notifications}:delivered:<id>` / `...:failed:<id>` | Per-subscription delivery progress |
| `goal-pulse:{notifications}:job-lock` | Short-lived distributed monitoring lock |

Subscription updates, audience membership, event enqueueing, and the monitoring
lock use atomic Redis operations. Subscription deletion requires the matching
push endpoint; responses never return another device's subscription. Rate-limit
counters use short-lived keys. Pending deliveries are retried with bounded
concurrency and backoff for up to 24 hours; expired push endpoints (HTTP 404 or
410) are removed.

## Monitoring and scheduler

`vercel.json` schedules `/api/notifications/cron` every minute. The endpoint
requires the configured `CRON_SECRET` bearer token and serializes concurrent
runs with the Redis lock. It reads the existing normalized fixture helpers with
cache bypassed for this scheduled observation, so a run compares fresh provider
responses. The whole fixture catalogue and live-status feed are fetched once
per job run (at most once per minute under the configured schedule); website
requests retain their existing cache behavior. It persists snapshots/events
before delivery and does not run when a user visits the site.

Vercel's [Cron Jobs usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
documentation lists one-minute minimum intervals and per-minute precision for
Pro and Enterprise. Hobby is limited to once per day with up to ±59-minute
timing variation; the one-minute expression in this project will not deploy on
Hobby. Confirm the linked Vercel project's plan in its dashboard before
deploying. If it is Hobby, upgrade or replace Vercel Cron with an external
scheduler; a daily schedule is not suitable for timely goals or kickoff
reminders.

At one-minute cron intervals, the expected goal/result detection delay is
typically up to about one minute plus provider response and push-service
delivery time; missed/late cron invocations add delay. Kickoff reminders are
evaluated once a minute and may be late by one run. Vercel and push providers
do not guarantee exact delivery time. Delivery is at-least-once across network
ambiguities; stable notification tags coalesce duplicate display where the
browser supports it.

The worker checks provider-reported match status and valid score snapshots. It
does not infer full time from elapsed kickoff time, notify on score regressions,
or send goal notifications without a fresh prior live score. Kickoff reminders
are supported at 5, 10, 15 (default), 30, and 60 minutes. A reminder queued for
a fixture is cancelled if the provider reports a postponement, cancellation, or
changed kickoff before delivery. Kickoff alerts require a valid UTC-normalized
provider timestamp and a scheduled fixture status; future fixtures whose feed
omits status may use the existing normalizer's scheduled-from-timestamp
classification. Late-discovered reminders report the actual remaining time.
Background data checks require at least one valid fixture from the provider; an
empty/error response does not replace stored snapshots.

## Supported alerts and match scope

Each anonymous device subscription has a master switch and independent goal,
kickoff, half-time, and full-time preferences. Existing Redis preference
records are normalized with backward-compatible defaults. By default, the
editable priority list includes the requested clubs from the Premier League,
La Liga, Serie A, Bundesliga, and Ligue 1. Users may select specific clubs and
follow any of the listed domestic leagues or UEFA club competitions. An alert
is delivered only when a selected priority club participates or the provider
identifies a competition the device follows. A fixture with two priority clubs
still creates one event per kind and score transition.

The current Streamed.pk adapter can identify a goal only as a non-regressing
score increase between fresh observations, and can identify half-time and
full-time only from explicit provider status changes. It has no sampled event
timeline or red-card records. Consequently, an upward score correction cannot
be distinguished from a goal in this feed; goal alerts are score-transition
alerts, not provider event-ID-confirmed goal records. Red-card settings are
therefore shown as unavailable and no red-card notification is generated. The sampled payload
also did not expose stable provider team or competition IDs; matching currently
uses normalized provider team names and explicit competition name/category
aliases when present. This is a limitation, not a claim of provider-ID-grade
identity. Reliable event timelines and stable IDs require support in the
existing provider response; this project does not fabricate them.

Goal, kickoff, half-time, and full-time alerts honor the master toggle, alert
type, and selected fixture scope. Competition follows can include matches
outside the priority-club set when the provider supplies a matching competition
identity. The provider's current payload may omit that identity for some
fixtures, in which case those fixtures cannot be included reliably.

## Local testing

1. Create an Upstash Redis database and generate a VAPID pair as described
   above. Put the variables in the ignored `.env.local`.
2. Run `npm run dev` on `localhost` (supported secure context) or use an HTTPS
   development tunnel for a physical phone. Visit `/settings#notifications`.
3. Select the alert types and lead time, then explicitly choose **Enable
   Notifications**. Check the browser's permission prompt, the subscription
   response, and Redis keys. Use **Disable and unsubscribe** to remove that
   device.
4. Exercise the protected job locally by setting its authorization header to
   the bearer scheme followed by your locally configured `CRON_SECRET`. Do not
   paste the secret into source control or shared logs. The job uses the
   existing Streamed.pk feed. Its score-transition and preference behavior is
   covered by `npm test`; an actual goal/fixture event is needed to verify
   delivery end to end.
5. For Android, open the HTTPS site in Chrome, allow notifications, and install
   Goal Pulse. For iPhone/iPad, use iOS/iPadOS 16.4 or later: open the HTTPS
   site in Safari, use **Share → Add to Home Screen**, launch the installed app,
   then enable notifications from Settings. iOS Web Push is not available to
   ordinary Safari tabs.

Actual push delivery is not operational until Redis, VAPID values, the
production cron secret, a compatible deployed schedule, and a real browser
subscription are all configured and verified.
