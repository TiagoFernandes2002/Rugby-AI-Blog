# Rugby AI Blog – Architecture

This repository contains my solution to Asymetric’s “auto-blog” style challenge:  
a fully automated rugby blog that combines external sports data, AI text generation, and a simple cloud-deployed web app.

---

## 1. High-Level Overview

The system is split into three main parts:

1. **Frontend (React + Vite)**
   - Single Page Application that lists all articles and shows the selected one.
   - Talks only to the backend via a small REST API.
   - Configured with `VITE_API_URL` to know where the backend lives (e.g. `http://<EC2_IP>:4000`).

2. **Backend (Node.js + Express)**
   - Exposes the REST API used by the frontend:
     - `GET /articles`
     - `GET /articles/:id`
   - Stores articles in a JSON file on disk.
   - Contains the cron jobs that:
     - Fetch rugby data from an external API (API-SPORTS Rugby).
     - Call an open-source text generation model on Hugging Face.
     - Persist newly generated articles.

3. **Infrastructure (AWS + Docker)**
   - **AWS CodeBuild** builds Docker images for backend and frontend and pushes them to **AWS ECR**.
   - An **EC2** instance pulls those images and runs the stack via `docker-compose`.

---

## 2. Backend Architecture

### 2.1. Responsibilities

The backend has four main responsibilities:

1. Serve a **simple REST API** for the frontend.
2. Store and load **blog articles** from a JSON file.
3. Integrate with:
   - **Rugby API** (API-SPORTS) for match data and standings.
   - **Hugging Face Inference API** for article generation.
4. Run **scheduled jobs** to automatically create new articles.

### 2.2. Modules (by folders)

> Paths may be slightly simplified here; names refer to the structure inside `backend/`.

- `app/index.js`
  - Creates the Express app.
  - Wires up routes:
    - `GET /articles`
    - `GET /articles/:id`
  - Loads initial articles from `app/data/articles.json`.
  - Starts the HTTP server on `PORT` (usually `4000`).

- `app/repositories/articlesRepo.js`
  - Encapsulates all access to the `articles.json` file.
  - Keeps an in-memory array of articles for fast reads.
  - Provides functions such as:
    - `getAllArticles()`
    - `getArticleById(id)`
    - `addArticle(article)` – assigns an ID, adds timestamps, and persists to disk.

- `app/data/articles.json`
  - Seed file with initial content.
  - The **first article** is a documentation/intro post that explains the project inside the blog itself.
  - All AI-generated articles are appended here.

Example structure:

```json
[
  {
    "id": 1,
    "title": "Welcome to Tiago's Rugby Analytics Blog",
    "content": "markdown content...",
    "type": "vlog | roundup",
    "topic": "optional topic string",
    "createdAt": "2025-12-08T20:00:00.000Z"
  }
]
```

- `app/services/rugbyData.js`
  - Wrapper around the API-SPORTS Rugby API.
  - Knows the league IDs and seasons to use (e.g. 2022) for:
    - TOP14
    - Premiership Rugby
    - United Rugby Championship (URC)
    - Super Rugby
    - Six Nations
    - Rugby Championship
    - Rugby World Cup
  - Functions typically:
    - Fetch all games for a given league and season.
    - Filter those games to a **“historical week”** window (same week of the year as “now”, but using a past season allowed by the free tier).
    - Fetch standings for the season.
    - Build a structured summary for each league (results + standings movement).

- `app/services/aiClient.js`
  - Client for the **Hugging Face Inference API**.
  - Uses the `HF_ACCESS_TOKEN` from `backend/.env`.
  - Exposes higher-level functions like:
    - `generateRoundupArticle(summaryText)`
    - `generateVlogArticle(topic, recentContext)`

  These functions take structured summaries or topic hints and return fully written articles.

- `app/services/vlogService.js`
  - Focused on “vlog” / opinion-style articles.
  - Maintains a lightweight memory of **recent topics** to avoid repetition.
  - Picks a new topic from a predefined list (tactics, defence systems, kicking strategy, league comparisons, etc.).
  - Builds a prompt mixing:
    - The chosen topic.
    - A short recap of recent vlog titles.
  - Calls `aiClient` to generate the final article.

- `app/services/aiScheduler.js`
  - Uses `node-cron` to schedule article creation.
  - Typical strategy:
    - Run once per day (e.g. 20:00 UTC).
    - On some days, generate **match-based roundups** using historical fixtures + standings.
    - On other days, generate **vlog/opinion pieces** that bring variety.
  - After receiving the article from AI:
    - Wraps it in the internal article format.
    - Persists via `articlesRepo`.

### 2.3. Environment Variables (Backend)

Stored in `backend/.env` (not committed):

- `PORT=4000`
- `HF_ACCESS_TOKEN=...` (Hugging Face Inference API token)
- `API_RUGBY_KEY=...` (API-SPORTS Rugby key)

These are only present on the developer machine and on the EC2 instance, never in Git.

---

## 3. Frontend Architecture

### 3.1. Stack

- **React** (functional components).
- **Vite** as the build tool.
- **Axios** for HTTP requests.
- Styling kept intentionally simple: the focus is on content and clarity, not a heavy design system.

### 3.2. API Client

File: `frontend/src/api/client.js`:

```js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});
```

- In development:
  - `VITE_API_URL` is typically `http://localhost:4000`.
- In production:
  - `frontend/.env` defines `VITE_API_URL=http://<EC2_PUBLIC_IP>:4000`.

This keeps the frontend completely decoupled from the actual backend address.

### 3.3. UI Behaviour

- On load:
  - Calls `GET /articles` to fetch the full list.
  - Displays article titles (and possibly short excerpts) in a list.
- When the user clicks an article:
  - Loads the body (from the same list or via `GET /articles/:id`).
  - Renders markdown-style content in a reading panel.
- Error handling:
  - If the API fails, shows a clear “Failed to load articles” message.

The design deliberately supports long-form content, which is suitable for AI-generated rugby analysis.

---

## 4. AI & Data Flow

### 4.1. Match-Based “Roundup” Articles

1. **Cron job** fires at the scheduled time.
2. Backend calls the Rugby API (API-SPORTS) and:
   - Fetches all fixtures for the configured leagues and season (e.g. 2022).
   - Filters matches to the “historical week” corresponding to the current date, but in that past season.
   - Fetches standings for the same competitions.
3. Backend builds a textual, structured summary:
   - Results by league.
   - Key changes in the table.
   - Context on form and momentum.
4. Summary is passed to the Hugging Face model:
   - Prompt instructs the model to write as a rugby analyst.
   - Asks for coherent structure: intro, per-league sections, conclusion.
5. The generated article is stored via `articlesRepo` and automatically appears in the frontend.

### 4.2. Vlog / Opinion Articles

1. Cron decides that today should be a **vlog** (based on weekday or rotation).
2. Vlog service picks a fresh topic from a small domain-specific list.
3. It builds a context string with recent vlog topics to avoid repetition.
4. Hugging Face model receives:
   - The topic.
   - The “do not repeat” context.
5. Output is again stored as an article and shown in the blog.

---

## 5. Infrastructure & Deployment (AWS)

### 5.1. Dockerisation

Both backend and frontend are packaged as Docker images:

- `backend/Dockerfile`
  - Based on `node:20-alpine`.
  - Copies backend source.
  - Installs dependencies.
  - Starts the Express server (port `4000`).

- `frontend/Dockerfile`
  - Based on Node for the build stage (Vite).
  - Builds the static assets.
  - Uses a lightweight web server (for example, an nginx or node-based server) to serve the compiled frontend.

### 5.2. Build Pipeline – AWS CodeBuild

- Source: GitHub repository (`master` branch).
- Config: `infra/buildspec.yml`.
- Steps:
  1. Log in to AWS ECR.
  2. Build backend image (`auto-blog-backend`).
  3. Build frontend image (`auto-blog-frontend`).
  4. Tag both as `:latest`.
  5. Push to ECR.

This acts as a very simple CI pipeline.

### 5.3. Runtime – AWS EC2 + docker-compose

- Single EC2 instance (Amazon Linux).
- Tools installed:
  - `docker`
  - `docker-compose`
  - `awscli`
- `docker-compose.yml` lives at the project root and references the ECR images:

```yaml
services:
  backend:
    image: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/auto-blog-backend:latest
    env_file:
      - ./backend/.env
    ports:
      - "4000:4000"

  frontend:
    image: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/auto-blog-frontend:latest
    ports:
      - "80:80"
```

- The EC2 instance has an IAM Role with at least:
  - `AmazonEC2ContainerRegistryReadOnly`

This allows `docker login` via:

```bash
aws ecr get-login-password --region <REGION> \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com
```

### 5.4. Helper Scripts

Under `infra/scripts/`:

- `init-ec2.sh`
  - One-time bootstrap script for a new EC2 instance.
  - Installs Docker, git, awscli.
  - Clones this repository.
  - Creates a `backend/.env` template.
  - Logs into ECR and pulls/starts the stack.

- `deploy.sh`
  - Used on the EC2 instance for subsequent deploys.
  - Logs into ECR.
  - Runs `docker-compose pull`.
  - Runs `docker-compose up -d`.

This keeps the operational story simple: **CodeBuild builds → ECR stores images → EC2 pulls and runs**.

---

## 6. Design Choices & Trade-offs

- **JSON file as storage**  
  - Chosen for simplicity and transparency in the context of a coding challenge.
  - Easy to inspect and reset (e.g. clearing test articles).
  - Would be replaced by a database (PostgreSQL/SQLite) in a production scenario.

- **Historical season instead of live season**  
  - API-SPORTS free tier has limitations for date-based queries and seasons.
  - Using a past season (e.g. 2022) allows:
    - Realistic match data.
    - Stable behaviour without hitting rate limits.
  - The logic simulates a “current week” over historical data.

- **Hugging Face instead of a proprietary model**  
  - Fulfils the “open-source / external AI model” spirit.
  - Keeps the solution vendor-agnostic.
  - Token is kept in `backend/.env` and never committed to Git.

- **Single EC2 + docker-compose**  
  - Enough for a personal demo / technical challenge.
  - Clean separation of concerns between services.
  - Could be migrated to ECS/EKS or serverless if needed for scale.

---

## 7. Possible Future Improvements

- Replace `articles.json` with a relational database.
- Add pagination, tags, and filtering in the frontend.
- Add authentication and an admin UI to approve/reject AI-generated drafts.
- Improve styling and UX (charts for standings, richer match visualisation).
- Add automated tests (unit + integration) for the API and generation logic.

