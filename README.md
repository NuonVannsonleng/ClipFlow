# ClipFlow

**Save Your Favorite Public Videos, Simply.**

A media utility that takes a link to a **publicly accessible** video and, where the source
platform permits it, returns the formats that are actually available for download.

ClipFlow does not bypass DRM, authentication, paywalls, private-content restrictions, or
platform security. When a platform refuses a request, the app says so plainly instead of
looking for another way in.

---

## Stack

| Layer    | Choice                                                                    |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend  | Node.js + TypeScript + Express, clean layered architecture                 |
| Media    | yt-dlp for metadata and retrieval, FFmpeg for muxing and audio conversion  |
| Queue    | In-memory by default; BullMQ + Redis when `REDIS_URL` is set               |
| Storage  | Temporary files with a TTL and an automatic sweeper                        |

The browser only ever talks to the web origin: Next rewrites `/api/*` to the API
(`API_ORIGIN`, default `http://localhost:4000`). That means no CORS, same-origin
cookies, and no way to point the frontend at the wrong port. Set
`NEXT_PUBLIC_API_URL` only if you deploy the API on its own domain and want the
browser to call it directly.

---

## Quick start

```bash
npm install                 # installs both workspaces
npm run setup:tools -- --ffmpeg
cp server/.env.example server/.env
cp web/.env.example web/.env.local
npm run dev                 # API on :4000, web on :3000
```

`setup:tools` downloads yt-dlp (and optionally FFmpeg) into `server/bin/`, which is
gitignored. Nothing is installed system-wide. If you already have the binaries, point
`YTDLP_PATH` / `FFMPEG_PATH` at them instead.

```bash
npm run doctor              # what the server can see right now
```

### Without the media tooling

The app degrades honestly rather than pretending:

| Situation             | Behaviour                                                            |
| --------------------- | -------------------------------------------------------------------- |
| No yt-dlp             | `/api/analyze` returns `TOOLS_UNAVAILABLE`; the UI shows a banner      |
| No FFmpeg             | Only ready-made formats are offered; audio conversion is hidden        |
| `MEDIA_PROVIDER=mock` | Offline sample data for UI work; the UI labels it as demo data         |

---

## Architecture

```
Frontend (Next.js)
      |
      v
API (Express)
      |
URL validation  ->  SSRF guard (DNS resolve, private ranges rejected)
      |
Platform detection (shared registry)
      |
Media information service (yt-dlp -> normalised format table)
      |
Processing queue (memory | BullMQ)
      |
Media processor (yt-dlp + FFmpeg, real progress events)
      |
Temporary storage (TTL + sweeper)
      |
Download (streamed attachment, session-scoped)
```

```
server/src
  config/      environment
  core/        errors, logger, shared types
  http/        routes + middleware (session, rate limit, error handler)
  services/
    url/       validator, platform registry, SSRF guard
    media/     provider seam, yt-dlp adapter, mock adapter, format builder
    processing/ job runner
    jobs/      job store, queue drivers
    storage/   temp file store, cleanup
web
  app/         routes (App Router)
  components/  ui primitives, layout, downloader, landing sections
  lib/         api client, i18n, settings, history, platform mirror
  translations/ en.json, km.json
```

---

## API

| Method   | Path                    | Purpose                                          |
| -------- | ----------------------- | ------------------------------------------------ |
| `POST`   | `/api/analyze`          | Validate a URL and return available formats      |
| `POST`   | `/api/analyze/batch`    | Same, for several URLs; failures are per-item    |
| `POST`   | `/api/process`          | Queue a download job                             |
| `POST`   | `/api/process/batch`    | Queue several jobs                               |
| `GET`    | `/api/job/:id`          | Job status                                       |
| `GET`    | `/api/job/:id/events`   | Live status over SSE                             |
| `DELETE` | `/api/job/:id`          | Cancel a job and delete its files                |
| `GET`    | `/api/download/:id`     | Stream the finished file as an attachment        |
| `GET`    | `/api/history`          | Jobs belonging to this anonymous session         |
| `DELETE` | `/api/history/:id`      | Delete one job and its file                      |
| `DELETE` | `/api/history`          | Delete everything this session created           |
| `GET`    | `/api/platforms`        | Platform registry + current capabilities         |
| `GET`    | `/api/capabilities`     | Tooling capabilities and limits                  |
| `GET`    | `/api/health`           | Liveness and degradation status                  |

Errors are always `{ "error": { "code": "...", "message": "..." } }`. The frontend
translates the code; raw tool output never reaches the client.

Job states: `queued -> analyzing -> processing -> completed | failed | expired`.

---

## Security

- URL validation: http/https only, standard ports, no embedded credentials, length capped.
- SSRF guard: hostnames are resolved and rejected if they land on loopback, RFC1918,
  link-local, CGNAT, unique-local, or multicast ranges.
- Rate limiting per IP, plus a cap on concurrent jobs per session.
- File size, processing time, and batch size limits.
- Downloads are opaque UUIDs resolved through a store — no user-controlled path reaches
  the filesystem — served as `Content-Disposition: attachment` with `nosniff`.
- Files are scoped to the anonymous session that created them.
- Temporary files expire and are swept; the temp directory is wiped on boot.
- No downloaded file is ever executed.

---

## Privacy

No accounts. The server holds an anonymous session id and the temporary file, nothing
else. History, theme, language, and format preferences live in the browser's
localStorage and are never sent to the server.

---

## Accessibility and i18n

Keyboard support throughout (the format listbox implements arrows, Home/End, type-ahead,
and Escape), visible focus rings, live regions for detection/progress/errors, semantic
landmarks, and status conveyed by icon and text as well as colour.
`prefers-reduced-motion` disables entrance animations, the ambient background, and layout
transitions.

English and Khmer ship in `web/translations/`. Switching is instant, with no reload, and
loads the Khmer font only for `lang="km"`.

---

## Configuration

See `server/.env.example` and `web/.env.example`. The most useful knobs:

| Variable            | Default | Meaning                                        |
| ------------------- | ------- | ---------------------------------------------- |
| `MEDIA_PROVIDER`    | `auto`  | `auto`, `ytdlp`, or `mock`                     |
| `MAX_FILESIZE_MB`   | `1024`  | Hard cap on a produced file                    |
| `FILE_TTL_MS`       | `1800000` | How long a download link lives (30 min)      |
| `MAX_CONCURRENT_JOBS` | `2`   | Worker concurrency                             |
| `MAX_BATCH_URLS`    | `10`    | Batch size cap                                 |
| `REDIS_URL`         | empty   | Switches the queue to BullMQ                   |
| `API_ORIGIN` (web)  | `http://localhost:4000` | Proxy target for `/api/*`      |

---

## Known limitations

- **Keep yt-dlp current.** Platforms change extraction requirements constantly, and a
  stale binary is the usual cause of a link that analyses but will not download. The
  installer tracks yt-dlp's **nightly** channel for exactly this reason; refresh with
  `npm run setup:tools -- --update`. When a platform genuinely refuses (private video,
  DRM, bot attestation), ClipFlow reports `PLATFORM_RESTRICTED` and stops rather than
  working around it.
- **Job state is per-process.** The Redis path uses BullMQ for queueing and concurrency,
  but the job store is in memory. Running several API instances behind a load balancer
  additionally needs a shared job store.
- **Live streams are not processed.**

---

## Scripts

| Command                          | Effect                              |
| -------------------------------- | ----------------------------------- |
| `npm run dev`                    | Both services with reload           |
| `npm run build`                  | Type-check and build both           |
| `npm run start`                  | Run the production builds           |
| `npm run typecheck`              | Type-check both workspaces          |
| `npm run setup:tools -- --ffmpeg` | Install yt-dlp and FFmpeg locally  |
| `npm run setup:tools -- --update` | Pull the latest yt-dlp nightly     |
| `npm run doctor`                 | Report detected tooling             |

---

## Platform trademarks

The platform cards show each service's own mark, generated into
`web/lib/platform-logos.ts` from the [simple-icons](https://simpleicons.org)
project (`npm run logos` regenerates it). The marks identify which service a
link comes from — nominative use — and are never redrawn, recoloured beyond the
lightness dark mode needs, or arranged to imply a partnership. A trademark
notice appears under the grid on both the landing page and `/platforms`.

Brands that have asked to be removed from simple-icons (LinkedIn, currently)
get a neutral monogram instead of a lookalike, which respects the request
rather than routing around it. If a platform asks you to stop using its mark,
delete its entry from `MAP` in `scripts/generate-platform-logos.mjs` and
regenerate — the monogram fallback takes over automatically.

---

## Responsible use

Only download content you have permission to save or that the source platform allows you
to download. Respect copyright, privacy, and platform rules.
