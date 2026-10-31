# Agura

Agura (from *aguka*, to grow) is a crop adoption platform for Rwanda. It turns the
Rwanda Population and Housing Census microdata into evidence about what households
already grow, and uses that evidence to help a farmer choose what to plant next,
follow the steps to grow it, and keep a record of the harvest.

Two applications live here:

| Application | What it is | Runs on |
| --- | --- | --- |
| [`agura-backend`](./agura-backend) | FastAPI service, PostgreSQL, the survey pipeline, aggregations, AI suggestions and the WebSocket | `http://127.0.0.1:8000` |
| [`agura-frontend`](./agura-frontend) | React and TypeScript app for farmers at `/app` and an internal console at `/admin`, plus the public landing page at `/` | `http://127.0.0.1:5173` |

They share no code. They talk only through the REST API under `/api/v1` and the
WebSocket at `/ws`.

---

## The team

**Elie Kuradusenge**

Works on the backend and the data. The survey pipeline is the centre of it: reading
the 1.3 million row census file, cleaning and loading it, aggregating household
counts, and deriving the product catalogue from the questionnaire. Also the parts
that make an import trustworthy, which is mostly what happens when something goes
wrong: the advisory lock that stops two jobs colliding, restart recovery, and the
checksum that refuses to import the same dataset twice.

**Ange Muhawenimana**

Works on the frontend and the design system. The farmer app, the admin console and
the public landing page are one application with one theme: a single set of design
tokens, Google Sans, Material shape and motion, light and dark mode, and the
Kinyarwanda first copy. Accessibility is treated as a build gate rather than a
review note, so contrast, touch target size, focus visibility and colour
independence are enforced by tests.

Both of us are responsible for the interface between the two halves: the wire types,
the error envelope, the WebSocket protocol and the privacy rules around suppression.

| | Elie | Ange |
| --- | --- | --- |
| University and programme | ALU | ALU |
| Contact | e.kuradusen@alustudent.com | a.muhawenim@alustudent.com |

---

## Quick start

You need **Python 3.11+**, **PostgreSQL 15+**, **Node 18+** and **Yarn 1 (classic)**.
The backend needs a real PostgreSQL database, not SQLite, because the models use
UUID and JSONB columns.

### 1. Database

Create the two databases the project expects. One is for development, one is for
the test suite, and they must be different because the tests rewrite the schema.

```bash
createdb agura_dev
createdb agura_test
```

Confirm where your cluster actually listens before you write a connection string.
This is the single most common cause of a failed first run, because the port and the
database name are properties of your own cluster and not constants of the project.
The port below is only an example:

```bash
pg_isready -h 127.0.0.1 -p 5432      # substitute your own port
psql -h 127.0.0.1 -p 5432 -U postgres -l
```

`createdb` and every connection string must use that same port. If your cluster
listens on a non default port, add `-p` to `createdb` too.

### 2. Backend

```bash
cd agura-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp -n .env.example .env
```

`cp -n` matters. A bare `cp .env.example .env` overwrites a `.env` that already
works, including `DATABASE_URL`, `JWT_SECRET` and the administrator password, and
the next command then fails against a database that does not exist. Always use
`cp -n`, or open the file and edit it.

Now edit `.env` before going further. Three things need your attention:

1. **`JWT_SECRET` is empty in the example on purpose.** Set it to at least 32
   characters. Generate one and paste it in:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. **`DATABASE_URL` and `TEST_DATABASE_URL`** must match the cluster you confirmed
   in step 1, including the port, the role and the database name shown in
   `.env.example`.

3. **`ADMIN_BOOTSTRAP_PASSWORD`** becomes the first administrator's password. Set
   something you will remember.

Check the environment without starting anything:

```bash
python -m app.config
```

Then create the schema, seed, and run:

```bash
alembic upgrade head        # create the schema
python -m scripts.seed      # settings and the first administrator
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Confirm it is alive:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Interactive API documentation is at `http://127.0.0.1:8000/docs`.

`DATABASE_URL`, `JWT_SECRET` and `ALLOWED_ORIGINS` have no defaults. If any is
missing or malformed the API refuses to start and prints every problem at once, so it
cannot come up quietly pointed at the wrong database.

Full detail: [agura-backend/SETUP.md](./agura-backend/SETUP.md).

### 3. Frontend

```bash
cd agura-frontend
yarn install
cp -n .env.example .env
yarn dev
```

Open `http://127.0.0.1:5173`.

Start the backend first. Without it the app still renders and shows explicit
offline states rather than blank pages, but sign in and every list will be empty.

Full detail: [agura-frontend/SETUP.md](./agura-frontend/SETUP.md).

---

## Where to read next

| File | What it covers |
| --- | --- |
| [agura-backend/SETUP.md](./agura-backend/SETUP.md) | Environment variables, startup validation, migrations, seeding, the survey pipeline, aggregation and small cell suppression, the product catalogue, and the jobs that recover after a crash |
| [agura-frontend/SETUP.md](./agura-frontend/SETUP.md) | Yarn scripts, the theme token file, contrast testing, type and motion rules, and the hardening notes |
| [agura-backend/.env.example](./agura-backend/.env.example) | Every backend setting with a comment saying what it is for |
| [agura-frontend/.env.example](./agura-frontend/.env.example) | The two URLs the app needs |
| [agura-backend/alembic/versions](./agura-backend/alembic/versions) | The seven migrations, in order |
| [agura-frontend/src/features/styleguide](./agura-frontend/src/features/styleguide) | The living style guide, also served at `/style-guide`: tokens, type scale, component patterns |

### Code layout

```
agura-backend/
  app/main.py            application factory, CORS, error handlers
  app/config.py          settings read from the environment, validated at startup
  app/core/              errors, security, permissions, pagination, rate limits
  app/models/            SQLAlchemy 2 models
  app/schemas/           Pydantic request and response models
  app/routers/           HTTP routers, one per area
  app/analysis/          the survey pipeline: ingest, dictionary, mapping, cleaning,
                         loading, aggregation, ranking, suppression
  app/jobs/              the job queue and worker, the advisory lock that stops
                         two jobs colliding, and startup recovery for orphans
  app/services/          auth, audit, settings, reference data, product catalogue
  alembic/               migrations
  scripts/               seed, em dash check, synthetic data generator
  tests/                 pytest suite

agura-frontend/
  src/app/               providers, router, guards
  src/components/        UI primitives, layout shells, charts, toasts
  src/features/          one folder per area: auth, products, plantings, tasks,
                         notifications, help, funding, settings, admin, landing,
                         styleguide
  src/lib/api/           typed client, wire types, refresh handling
  src/lib/i18n/          provider plus the rw, en and fr dictionaries
  src/lib/ws/            reconnecting socket client with catch up
  src/styles/            tokens.css is the only file that names a colour
  src/test/              Vitest setup and tests
  scripts/               the style checks
```

---

## Checks and tests

Run these before you push. Both are the same commands CI uses.

```bash
# backend
cd agura-backend
pytest
ruff check .
ruff format --check .
python scripts/check_no_em_dash.py

# frontend
cd agura-frontend
yarn check:all      # typecheck, em dash, icons, font, colours, then Vitest
yarn build
```

The backend suite talks to a real PostgreSQL database and rewrites its schema, so it
refuses to run unless the database name contains the word `test`. Point
`TEST_DATABASE_URL` at a scratch database and never at `agura_dev`.

The four frontend checks are not style preferences, they are the house rules: only
Lucide icons, only Google Sans, no colour literal outside `src/styles/tokens.css`,
and no em dash character anywhere. Each one fails the build rather than leaving a
review comment.

---

## Working rules

These are enforced by scripts, so they hold whether or not anyone remembers them.

- **No em dash character** anywhere in the source tree.
- **One palette.** `src/styles/tokens.css` is the only file that names a colour.
  Components use semantic names such as `bg-surface`, and dark mode comes from the
  tokens resolving per theme, not from `dark:` variants.
- **Google Sans only**, falling back to Google Sans Flex and then the system stack.
- **Lucide only** for icons, and no emoji or ASCII art used as an icon.
- **Status is never colour alone.** Every badge carries text.
- **Suppressed data is shown as suppressed**, with the reason, never as a zero and
  never as a blank.
- **Secrets and data never enter git.** `.env`, `uploads/` and the survey files
  (`*.dta`, `*.sav`, `*.zip`) are ignored.

---

## Importing survey data

Administrators upload a Stata `.dta` file through the console. The pipeline runs in
stages and stops at `awaiting_mapping` until a human confirms the questionnaire
mapping, which is deliberate: nothing is written to the households tables before
that confirmation, and it is the most common reason a fresh upload looks like it did
nothing.

Two things worth knowing up front:

- The same file cannot be imported twice. Uploads are hashed and a byte identical
  file is rejected, because two copies of one dataset silently double every count in
  every aggregate.
- A full import of the census file takes roughly forty minutes. If the process dies
  with no traceback, that is the operating system's memory killer, not an application
  error. Lower `ANALYSIS_CHUNK_SIZE` in `.env` and run it again.

The pipeline, the memory sizing and the recovery behaviour are documented in
[agura-backend/SETUP.md](./agura-backend/SETUP.md#importing-the-real-census-file).

---

## Troubleshooting

**The API will not start and prints a list of problems.** That is the environment
validator working. It names every missing or malformed setting at once and never
prints a secret value. Fix them in `.env`, then run `python -m app.config` to check
without starting the server.

**`FATAL: database "agura" does not exist` or a connection refused on 5432.** The
connection string and your cluster disagree. Check the port and list the databases
that really exist with `pg_isready` and `psql -l`, then correct `DATABASE_URL`. Do
not copy a connection string from a guide without confirming it.

**`JWT_SECRET` is rejected.** It must be at least 32 characters and must not be a
placeholder copied from a template. Generate a fresh one with the command above.

**Tests refuse to run, or complain about the database name.** This is the guard
stopping the suite from wiping real data. Set `TEST_DATABASE_URL` to a database
whose name contains `test`.

**The frontend loads but everything is empty.** The backend is probably not
running, or `VITE_API_URL` points at the wrong port. The app shows offline states
rather than failing silently, so an empty list plus an offline banner means the API
is unreachable, not that there is no data.

**A job sits at `queued` or `running` and never moves.** Jobs left behind by a
crash are put back on the queue when the API starts, so restart the API with no
`--reload` and watch the log. If it stays stuck, check that only one process is
writing to that database.

---

## Repository status

All ten milestones are implemented and the test suites pass. The pipeline has been
run end to end against the real census file, and the counts in the database match the
published totals.

One known limitation is reported honestly rather than filled in: the readiness
analysis warns that its `internet` component has no usable value codes, because the
questionnaire ships no labels for it. It is shown as a warning, not as an invented
number.
