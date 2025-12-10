# Rugby AI Blog

Personal rugby blog powered by automated AI analysis – built for the Asymetric technical challenge.

From the outside it behaves like a normal blog: you see a list of posts on the left, you click one, and you read the full article on the right. Under the hood, a small backend periodically generates new rugby content using real match data and an open-source AI model.

---

## Table of contents

- [Architecture](#architecture)
- [Features](#features)
- [Rugby data and APIs](#rugby-data-and-apis)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [Deployment to AWS EC2](#deployment-to-aws-ec2)
- [Environment variables](#environment-variables)
- [Testing](#testing)

---

## Architecture

A longer description lives in `docs/ARCHITECTURE.md`.

At a high level:

- **Frontend** (React + Vite)
  - Talks only to the backend (`/articles`, `/articles/:id`, `/standings`).
  - Renders the article list, article detail, filters and standings widgets.
- **Backend** (Node.js + Express)
  - Serves articles from a JSON file stored on disk.
  - Uses cron jobs to create new articles periodically.
  - Enriches articles using:
    - **Rugby data** from the API-SPORTS Rugby API.
    - **Text generation** from a Hugging Face model.
  - Exposes a simple `/standings` endpoint backed by standings snapshots.

- **Infrastructure**
  - Deployed on an Amazon Linux EC2 instance with Docker + docker-compose.
  - Container images are built and pushed to ECR.
  - Two helper scripts live in `infra/scripts`:
    - `init-ec2.sh` – one-time bootstrap for a fresh EC2 box.
    - `deploy.sh` – pull new images & restart containers.

---

## Features

### Blog behaviour

- **Article list** on the left:
  - Shows all posts, sorted by newest first.
  - Each item displays date, type (intro, vlog, round-up, other) and league tag (when applicable).
  - Filters:
    - By **type** (`intro`, `vlog`, `roundup`, `other`).
    - By **league** (`Top 14`, `Premiership`, `URC`, `Super Rugby`, `Six Nations`, etc.).
- **Article view** on the right:
  - Renders the full article in Markdown.
  - Intro post explains the challenge and the architecture.
  - AI-generated posts read like normal tactical articles.

### Automatic content generation

All of the articles after the intro are created by the backend:

- **Weekly round-up articles**
  - Use historical data from the 2022 season for several leagues:
    - Top 14, Premiership Rugby, URC, Super Rugby,
      Six Nations, Rugby Championship, Champions Cup, CN Honra (Portugal).
  - For each league, the backend:
    - Fetches all matches for the season once.
    - Simulates a “week” around the current calendar date (but in 2022).
    - Builds a plain-text summary of that round.
    - Sends that summary to a Hugging Face text-generation model.
    - Stores the result as a new `roundup` article.

- **Weekly vlog / opinion article**
  - Once per week a topic is chosen from a curated list
    (e.g. “Pendulum defenses”, “URC vs Top 14 vs Premiership styles”, etc.).
  - The AI receives:
    - The selected topic.
    - A short list of previous vlog topics (to avoid repetition).
  - The generated article is stored as a `vlog` article with the chosen topic.

Scheduling is handled with `node-cron` inside the backend container.

---

## Rugby data and APIs

The project integrates with **API-SPORTS Rugby** and **Hugging Face**.

### Match data

- Calls to the Rugby API are used to fetch **games** for the 2022 season for each league.
- This is what powers the weekly round-up summaries.
- The backend caches the full season in memory per league to avoid repeated API calls.

### Standings

There are two ways to obtain **standings**:

1. **Live API helper functions**

   - The file `backend/src/rugbyStandings.js` contains helpers that call `/standings`
     on the API-SPORTS Rugby API and normalise the response.
   - These are useful if you have a paid plan or you want a one-off refresh.

2. **Local JSON snapshots (default)**

   - For the challenge, calling `/standings` on the free tier is too expensive:
     each request is relatively heavy and the quota is limited.
   - Instead, the project uses **local JSON files** with pre-fetched standings
     snapshots for the 2022 season.
   - The `/standings` endpoint reads from these JSON files so that:
     - The frontend can display standings instantly.
     - No additional quota is consumed – the live API is only used
       for match data that feeds the weekly round-ups.

If you want to switch back to live standings you can adapt the `/standings`
route to call the helpers in `rugbyStandings.js` instead of reading JSON.

---

## Tech stack

### Backend

- Node.js + Express
- Node-cron
- Axios
- Hugging Face Inference API
- API-SPORTS Rugby API
- Articles stored as JSON on disk (`/app/data/articles.json` in the container)

### Frontend

- React + Vite
- Axios for HTTP calls
- Custom responsive layout:
  - Article list & filters on the left.
  - Article content on the right.
  - Standings widget below the list (with a full-screen standings view on small screens).

### Infrastructure

- Docker & docker-compose
- Amazon ECR (images)
- Amazon EC2 (runtime)
- Helper scripts in `infra/scripts`

---

## Running locally

### 1. Clone the repository

```bash
git clone https://github.com/TiagoFernandes2002/Rugby-AI-Blog.git
cd Rugby-AI-Blog
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```dotenv
PORT=4000
HF_ACCESS_TOKEN=your-hugging-face-token
API_RUGBY_KEY=your-api-sports-rugby-key
```

Then start the backend:

```bash
npm run dev      # or: npm start
# Backend listens on http://localhost:4000
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env` for local development:

```dotenv
VITE_API_URL=http://localhost:4000
```

Then start the frontend dev server:

```bash
npm run dev
# Vite will print the local URL (usually http://localhost:5173)
```

Open the printed URL in your browser and you should see the blog.

---

## Running with Docker

To build and run both services with Docker locally:

```bash
docker-compose up --build
```

This uses the `docker-compose.yml` at the repo root. In the challenge setup
the images are built in CI and pulled from ECR, but for local development you
can also adjust the compose file to build from the local Dockerfiles instead.

Make sure your `.env` files are present on the host before starting the stack,
as the backend container reads `backend/.env` for the API keys.

---

## Deployment to AWS EC2

This is the setup used for the technical challenge deployment.

### 1. Launch an EC2 instance

- Amazon Linux 2023 (or Amazon Linux 2)
- Security group:
  - Allow **HTTP** (port 80) from the Internet.
  - Allow **SSH** (port 22) from your IP.
- Attach an IAM role that allows:
  - Pulling from the ECR repositories holding the images.

SSH into the instance as `ec2-user`.

### 2. One-time init

From the repository root (after cloning on the instance), run:

```bash
chmod +x infra/scripts/init-ec2.sh
./infra/scripts/init-ec2.sh
```

Then create the `.env` files on the server (same contents as in the local setup).

### 3. Deploy / update

Every time you push new images to ECR (or change the compose file):

```bash
./infra/scripts/deploy.sh
```

This will:

1. Pull the latest git changes.
2. Log in to ECR.
3. Pull the latest backend/frontend images.
4. Restart the containers with `docker-compose up -d`.

---

## Environment variables

### Backend (`backend/.env`)

- `PORT`  
  Port that the Express app listens on (default: `4000`).

- `HF_ACCESS_TOKEN`  
  Hugging Face Inference API token. Used to call the text-generation model.

- `API_RUGBY_KEY`  
  API-SPORTS Rugby API key.  
  Used only for match data (games) in the current configuration.  
  Standings use local JSON snapshots to avoid exhausting the free tier.

### Frontend (`frontend/.env` or `.env.production`)

- `VITE_API_URL`  
  Base URL for the backend, e.g.:

  - Local dev: `http://localhost:4000`
  - EC2 deployment: `http://<ec2-public-ip>:4000`

---

## Testing

This repository includes a small but working automated test setup for both the backend and the frontend.

### Backend tests (Jest)

Backend tests live under `backend/src/__tests__` and are written with **Jest**.
Right now there is a test focused on the standings module:

* `backend/src/__tests__/rugbyStandings.test.js`

  * Verifies that `LEAGUE_IDS` in `rugbyStandings.js` contains all expected league keys.
  * Checks that each league ID is numeric and positive.
  * Asserts some specific mappings (e.g. `TOP14`, `PREMIERSHIP`, `URC`).

#### Running backend tests locally

From the repo root:

```bash
cd backend
npm install        # first time only
npm test           # run the Jest suite once
```

Additional useful scripts (defined in `backend/package.json`):

```bash
npm run test:watch     # re-run tests automatically on file changes
npm run test:coverage  # generate a coverage report
```

---

### Frontend tests (Vitest + React Testing Library)

Frontend tests live under `frontend/src/__tests__` and use **Vitest** plus **React Testing Library**.

At the moment there is a simple smoke test:

* `frontend/src/__tests__/App.test.jsx`

  * Imports the main `App.jsx` component.
  * Asserts that `App` is defined (verifies the component can be imported without crashing).
  * Serves as a starting point to add more detailed UI tests.

#### Running frontend tests locally

From the repo root:

```bash
cd frontend
npm install        # first time only
npm test           # run Vitest once in CLI mode
```

Extra scripts available in `frontend/package.json`:

```bash
npm run test:ui        # launch the Vitest UI in the browser
npm run test:coverage  # generate a coverage report
```

---

As you add more tests, keep them under the existing `__tests__` folders so they are picked up automatically by Jest (backend) and Vitest (frontend).


