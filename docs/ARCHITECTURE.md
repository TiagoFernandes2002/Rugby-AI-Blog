# Rugby AI Blog – Architecture

_Last updated: 2025-12-09_

This document describes the overall architecture of the **Rugby AI Blog** project built for Asymetric’s technical challenge.

The goal of the project is to behave like a normal rugby blog from the outside (simple article list + detail page) while, under the hood, articles are created automatically by combining:

- Historical rugby data from an external API (API-SPORTS Rugby).
- An open‑source text‑generation model hosted on Hugging Face.
- A small Node.js backend that orchestrates data collection, AI generation and persistence.
- A React + Vite frontend that consumes the backend as if it were a normal REST API.

---

## 1. High‑level components

The system is split into three main layers:

1. **Frontend** – `frontend/`
   - React + Vite single‑page app.
   - Talks only to the backend via HTTP (`GET /articles`, `GET /articles/:id`, `GET /standings`).
   - Implements a desktop layout with article list on the left, article content on the right, and a small standings widget.
   - Includes a mobile layout with a slide‑in article list and a separate full standings page.

2. **Backend** – `backend/`
   - Node.js + Express application.
   - Provides the REST API for articles and standings.
   - Owns the cron jobs that periodically generate new AI‑written posts.
   - Integrates with external services: Rugby API (API‑SPORTS) and Hugging Face Inference.
   - Persists articles in a simple JSON file (`app/data/articles.json`) mounted as a Docker volume.

3. **Infrastructure** – `infra/`
   - Docker images for backend and frontend.
   - Amazon ECR private repositories for both images.
   - A single EC2 instance that runs `docker-compose` to bring the two containers up.
   - Shell scripts to bootstrap a fresh EC2 instance and deploy new versions of the images.

---

## 2. Backend architecture

### 2.1. Main entry point

**File:** `backend/src/index.js`

Responsibilities:

- Load configuration from `.env`.
- Configure Express (CORS + JSON body parsing).
- Register API routes:
  - `GET /` – health check.
  - `GET /articles` – list all articles.
  - `GET /articles/:id` – get a single article by id.
  - `GET /standings` – get league standings (either from live API or from local JSON snapshot, see below).
- Start HTTP server on `PORT` (defaults to `4000`).
- Configure and start cron jobs (via `node-cron`).

### 2.2. Data persistence – Article repository

**File:** `backend/src/articlesRepo.js`

Simple JSON‑file based storage that behaves like a tiny in‑memory repository with disk persistence.

- Loads `app/data/articles.json` at startup.
- Keeps everything in memory for fast reads.
- APIs:
  - `getAll()` – returns all articles sorted by descending id (most recent first).
  - `getById(id)` – returns a single article.
  - `addArticle(article)` – appends a new article, automatically assigning an incremental `id` and adding a `createdAt` timestamp if missing.
- On each write, the JSON file is overwritten on disk.
- In Docker, `app/data/` is mounted as a volume (`./data:/app/data`), so new articles survive container restarts.

### 2.3. Rugby data integration

**File:** `backend/src/rugbyData.js`

Encapsulates interaction with **API‑SPORTS Rugby** and prepares the data that is later fed into the AI model.

Key ideas:

- Uses `API_RUGBY_KEY` from the backend `.env` file.
- Creates a preconfigured Axios instance with:
  - `baseURL = https://v1.rugby.api-sports.io`
  - header `x-apisports-key: API_RUGBY_KEY`.
- Defines a set of **target competitions** in `LEAGUE_INFO`:

  ```js
  const LEAGUE_INFO = {
    TOP14:             { id: 16, season: 2022 },
    PREMIERSHIP:       { id: 13, season: 2022 },
    URC:               { id: 76, season: 2022 },
    SUPER_RUGBY:       { id: 71, season: 2022 },
    SIX_NATIONS:       { id: 51, season: 2022 },
    RUGBY_CHAMPIONSHIP:{ id: 85, season: 2022 },
    CHAMPIONS_CUP:     { id: 54, season: 2022 },
    CN_HONRA_PORTUGAL: { id: 31, season: 2022 },
  };
  ```

- Uses **historical seasons** (2022) instead of the current season, due to free‑plan limits of the API.

Responsibilities:

1. **Fetching all games for a league season** – `fetchAllGamesForLeagueSeason(leagueId, season)`
   - Requests `GET /games?league={id}&season={season}`.
   - Caches the full response in memory per `{leagueId-season}` to avoid repeated requests.

2. **Computing a “historical week” window** – `getHistoricalWindow(targetYear, daysBack)`
   - Takes the current calendar date (e.g. 2025‑12‑09) and maps it to the same day in the target year (e.g. 2022‑12‑09).
   - Builds a `[from, to]` window of the last 7 days in that historical year.

3. **Filtering games for that week** – `filterGamesForHistoricalWeek(allGames, targetYear, daysBack)`
   - Selects only games with `date` between `from` and `to`.

4. **Building textual summaries** – `buildWeeklySummaryForLeagueHistorical(leagueKey, targetYear)`
   - Fetches the full season, filters games for the week, and (optionally) retrieves standings for context.
   - Produces a long text summary with:
     - League name and season.
     - List of fixtures and scores in that week.
     - Short description of standings (top 6 teams) if available.
   - Returns an object `{ leagueKey, leagueName, season, summaryText }`.

5. **Aggregating all leagues** – `buildWeeklySummariesForAllLeaguesHistorical(targetYear)`
   - Iterates over `LEAGUE_INFO` and calls `buildWeeklySummaryForLeagueHistorical` for each.
   - Skips leagues with no games in the target week.

> **Note on cost control**
>
> Only a **very small number of Rugby API endpoints** are used (mainly `games` for a given league/season). To avoid burning free‑tier quota, standings for the frontend are served from static JSON snapshots instead of live API calls.

### 2.4. Standings service

**File:** `backend/src/rugbyStandings.js`

This module abstracts how standings are obtained. It supports two strategies:

1. **Static JSON snapshots** (default, free‑tier‑friendly):
   - For each league key (e.g. `TOP14`, `PREMIERSHIP`, etc.) there is a JSON file under `backend/src/standings/`.
   - Example: `backend/src/standings/top14-2022.json`.
   - These files are generated offline using the Rugby API and then committed to the repo.
   - At runtime, standings are loaded from disk, so no external quota is consumed.

2. **Live API fallback** (optional):
   - The module still contains a function that can call the live Rugby API if needed.
   - This is not used by default in production, precisely to respect free‑tier limits.

API:

- `fetchStandings(leagueKey, season)`
  - Normalises league key (e.g. accepts `16` or `TOP14`).
  - If a local JSON exists for `{leagueKey, season}`, returns the parsed table.
  - Otherwise can fall back to calling the live API (currently optional and behind a flag).
  - Returns rows in a normalised shape:

    ```js
    {
      position,
      team,
      logo,
      played,
      wins,
      draws,
      losses,
      points,
      for,
      against,
      form,
    }
    ```

- `LEAGUE_IDS` – map of human‑readable keys to numeric IDs.

### 2.5. AI integration

**File:** `backend/src/aiClient.js`

Encapsulates all calls to **Hugging Face Inference API**.

- Uses `HF_ACCESS_TOKEN` from `.env`.
- Uses the official `@huggingface/inference` client.
- Currently targets a generic chat‑completion style model that is:
  - Capable of handling long prompts (league summaries, previous vlog topics).
  - Cheap enough to use on a small personal project.

Main functions:

1. `generateRoundupArticle(summaryText)`
   - Prompted with the pre‑built text summary for one league.
   - Instructs the model to write a structured blog post (title + markdown content) about that week.

2. `generateVlogArticle(topic, previousVlogsSummary)`
   - Uses a high‑level topic (e.g. “Pendulum defence systems”) plus a short list of previous vlog‑style articles.
   - Asks the model to avoid repeating previous topics too closely.

The module returns normalised article objects:

```js
{
  title: string,
  content: string,      // markdown
  type?: 'roundup' | 'vlog' | 'intro' | 'other',
  league?: string,      // e.g. 'TOP14'
  season?: number,
  topic?: string,
}
```

### 2.6. Cron jobs

Cron jobs are configured in `backend/src/index.js` using **node‑cron**.

There are two main schedules (in production they are weekly; for local testing the cron expressions can be changed):

1. **Weekly league roundups**
   - Cron expression: e.g. `0 20 * * 1` (Monday at 20:00).
   - Calls `buildWeeklySummariesForAllLeaguesHistorical(2022)`.
   - For each returned summary, calls `generateRoundupArticle` and saves the article with metadata:

     ```js
     addArticle({
       ...article,
       title: `${leagueName} ${season} – Weekly Round-Up: ${article.title}`,
       type: 'roundup',
       league: leagueKey,
       season,
     });
     ```

2. **Weekly vlog / opinion article**
   - Cron expression: e.g. `0 20 * * 3` (Wednesday at 20:00).
   - Chooses the next topic via `pickNextVlogTopic()` (prefers topics not used before).
   - Builds a short summary of previous vlog posts for context.
   - Calls `generateVlogArticle(topic, previousVlogsSummary)` and persists the result with `type: 'vlog'`.

Both jobs log their progress to stdout so they can be inspected via `docker logs` on the EC2 instance.

---

## 3. Frontend architecture

**Folder:** `frontend/`

The frontend is a **React + Vite** app styled entirely in CSS (no component library) with a dark “analytics dashboard” look.

### 3.1. API client

**File:** `frontend/src/api/client.js`

- Wraps Axios with a base URL.
- Uses `VITE_API_URL` from the frontend `.env` (for local dev this is usually `http://localhost:4000`).

```js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_BASE_URL });
```

### 3.2. Articles API hooks

**File:** `frontend/src/api/articles.js`

- `fetchArticles()` – `GET /articles`, returns the full list.
- `fetchArticleById(id)` – `GET /articles/:id`.

These are used directly inside React `useEffect` hooks in `App.jsx`.

### 3.3. Application layout

**File:** `frontend/src/App.jsx`

The main component is responsible for:

- Fetching all articles on mount.
- Tracking the **selected article**.
- Deriving available filters (article type, league).
- Fetching standings for the currently selected league.
- Handling responsive layout (desktop vs mobile).

Layout overview:

- **Desktop** (`min-width: 960px`):
  - Left column (`.sidebar`):
    - Section header: “Rugby Hot Game of the Week”.
    - Filter bar: select by type (`All`, `Round-up`, `Vlog`, etc.) and by league.
    - Scrollable list of articles.
    - Standings widget at the bottom.
  - Right column (`.main-column`):
    - Article header with type + date tags.
    - Article content rendered as markdown.

- **Mobile**:
  - Top bar with blog title and a “hamburger” button.
  - When the button is pressed, the article list slides over the content.
  - Standings link appears inside the mobile menu and leads to a dedicated full‑screen standings view.

### 3.4. Standings components

**File:** `frontend/src/components/StandingsWidget.jsx`

- Small card that appears in the sidebar under the article list.
- Props:
  - `leagueKey`, `leagueName` – to render the heading.
  - `season` – currently fixed at 2022.
  - `onOpenFull` – callback to open the full standings view.
- Internally calls `fetchStandings(leagueKey)` from `frontend/src/api/standings.js`.
- Renders:
  - Current league name and a short “2022 season (snapshot)” badge.
  - Left/right arrows to change between leagues (Top 14, Premiership, URC, Super Rugby, Six Nations, Rugby Championship, Champions Cup, CN Honra Portugal).
  - Compact table with `position`, `team`, `points`.

**File:** `frontend/src/components/StandingsCarousel.jsx`

- Full‑screen view used in mobile or when the user clicks the standings widget.
- Reuses the same API and styling but shows more rows and wider columns.

### 3.5. Styling

**File:** `frontend/src/App.css`

- Defines the dark theme: navy background, soft cards, and subtle glows on hover.
- Uses CSS grid / flexbox for layout.
- Media queries ensure the two‑column layout becomes stacked on smaller screens.
- Tables for standings are constrained to avoid pushing content down in desktop mode.

---

## 4. Infrastructure & deployment

### 4.1. Docker images

The project uses two images:

- `auto-blog-backend`
  - Based on Node.js.
  - Copies `backend/` sources.
  - Installs dependencies with `npm ci`.
  - Exposes port `4000`.
  - ENTRYPOINT runs `node src/index.js`.

- `auto-blog-frontend`
  - Based on a Node.js builder stage + Nginx (or a simple Node static server, depending on final Dockerfile).
  - Builds the Vite app.
  - Serves the static files on port `3000`.

Both images are pushed to **Amazon ECR** and referenced in `docker-compose.yml`.

### 4.2. docker-compose

**File:** `docker-compose.yml` (root)

Defines two services:

```yaml
services:
  backend:
    image: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/auto-blog-backend:latest
    ports:
      - "4000:4000"
    env_file:
      - ./backend/.env
    volumes:
      - ./data:/app/data

  frontend:
    image: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/auto-blog-frontend:latest
    ports:
      - "80:3000"
    depends_on:
      - backend
```

On the EC2 instance the repo is cloned under `~/rugby-blog/`, `.env` files are created manually, and then `docker-compose up -d` starts both containers.

### 4.3. EC2 bootstrap

Two shell scripts (to be added under `infra/scripts/`) are planned:

1. `init-ec2.sh`
   - Install system dependencies: `git`, `docker`, `docker-compose-plugin`.
   - Add the EC2 user to the `docker` group.
   - Log in to ECR using an IAM role attached to the instance.
   - Clone the GitHub repo.

2. `deploy.sh`
   - Log in to ECR.
   - `docker-compose pull` to fetch latest images.
   - `docker-compose up -d` to restart services with the new versions.

Both scripts are idempotent so that they can be re‑run safely.

---

## 5. Testing strategy (future work)

Right now the project includes only manual testing. A natural next step would be to add automated tests:

1. **Unit tests (backend)**
   - Use **Jest**.
   - Target pure functions such as:
     - `filterGamesForHistoricalWeek`.
     - `buildPreviousVlogsSummary`.
     - `pickNextVlogTopic`.
   - Mock external services (Rugby API and Hugging Face).

2. **API tests**
   - Use **supertest** to hit `GET /articles`, `GET /articles/:id`, `GET /standings`.

3. **Frontend tests**
   - Use **Vitest** + React Testing Library.
   - Example tests:
     - Article list renders titles from mocked `/articles` response.
     - Clicking an article updates the detail view.
     - Standings widget shows the correct league and points when provided with fake data.

4. **End‑to‑end tests** (stretch goal)
   - Use **Playwright** or **Cypress**.
   - Spin up backend + frontend locally with test data and exercise the main flows.

---

## 6. Limitations & future improvements

Known limitations:

- Historical data only: all content is based on the 2022 season for each league, mapped onto the current calendar dates.
- No authentication or admin interface – articles cannot be edited manually through the UI.
- Persistence is a single JSON file; there is no database or backup process.
- AI model is a generic text generator; domain‑specific fine‑tuning would improve consistency.

Potential improvements:

- Move persistence to a managed database (e.g. DynamoDB or Postgres on RDS).
- Add an admin panel to flag / delete generated posts.
- Collect telemetry on prompt cost and response times for AI calls.
- Add caching and rate limiting on the API layer.
- Add comprehensive automated tests as described above.

---

This document should be kept in sync with the codebase. Whenever a new major feature is added (e.g. comments, authentication, new AI models), this architecture description should be updated accordingly.

