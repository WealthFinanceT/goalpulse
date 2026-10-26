# Authorized stream configuration

Goal Pulse supports provider-independent iframe, HLS, DASH, and MP4 playback in
its existing responsive player. Configure the Ballon d’Or event source with
server-side environment variables:

```text
BALLON_DOR_STREAM_URL=https://authorized-provider.example/embed/...
BALLON_DOR_STREAM_KIND=iframe
```

`BALLON_DOR_STREAM_KIND` must explicitly be `iframe`, `hls`, `dash`, or `mp4`.
The player does not infer HLS or DASH from a URL. For HLS, provide an authorized
HLS manifest URL; for DASH, provide an authorized DASH MPD manifest URL. The
source must permit embedding/playback from Goal Pulse, use HTTPS, and remain
subject to the provider's access and geographic restrictions. Do not use direct
media URLs unless the provider authorizes their use.

Browsers restrict cross-origin iframe inspection, so Goal Pulse can detect that
an iframe did not load in time but cannot always distinguish a loaded player
from playback blocked inside the provider frame. Native HLS/DASH/MP4 playback
errors are surfaced by the video player.

The values are read on the server when `/ballon-dor-2026` is rendered; add them
to the deployment environment and restart/redeploy the app as appropriate.
When no source is configured, or the configuration is invalid, the page shows
an unavailable/configuration state without fabricating a stream URL.

Streamed.pk's documented streams API returns `embedUrl` values and identifies
the source stream endpoint. Only use a returned embed URL after confirming the
specific source and its permitted use. Goal Pulse does not scrape watch pages,
extract media URLs, or proxy streams.
