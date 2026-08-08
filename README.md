# FutureWell UI

FutureWell is a preventive heart-health assessment for Malaysian adults aged
41–59. It presents population context, collects cardiovascular risk inputs,
shows the backend result and guidance, and includes a public clinic finder.

Built with React 19, TypeScript, Vite, Zustand, Leaflet, MSW and Vitest.

- [API contract](docs/api-contract.md)
- [Archived prototype](docs/prototype/)

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:4200>. Development uses the mock backend by default, so
the separate FastAPI project is not required.

## Commands

| Command              | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Start the development server on port 4200  |
| `npm run build`      | Type-check and build the app into `dist/`  |
| `npm run preview`    | Preview the production build               |
| `npm test`           | Run the automated test suite once          |
| `npm run test:watch` | Run the automated test suite in watch mode |

## Application behavior

- The assessment has four screens: Basic Profile, Awareness, Risk Profile and
  Recommendation.
- The clinic finder is separate and can be opened from the risk and
  recommendation screens.
- Assessment and clinic state are kept in memory. Reloading the page clears the
  assessment; health data is not written to browser storage.
- Risk calculation, awareness statistics, guidance and clinic data belong to
  the backend. The frontend displays the returned values.
- API requests use relative `/api` URLs. Vite and nginx proxy them to the
  backend when mocks are not active.

## Mock backend

Development and tests use shared
[MSW](https://mswjs.io/) handlers from `src/core/api/mock/`. The mock API is
enabled automatically during local development. To use the real FastAPI
backend, start it on `http://localhost:8000` and open the frontend with
`?mock=off`.

Mock statistics and clinic records are demonstration fixtures. They are not
approved production data. MSW starts only in development, and the Vite build
removes its worker file from `dist/`.

## Project structure

```text
src/
├── App.tsx          application flow and request coordination
├── core/            models, API modules, mocks and Zustand stores
├── sections/        assessment screens and clinic finder
├── shell/           page shell and progress navigation
├── test/            shared test setup and browser stubs
└── ui/              shared loading, error and empty states
```

HTTP requests are started from user actions rather than fetching effects.
Clinic search and filter changes also request updated list and cluster data once
the finder is open.

## Testing

The Vitest and Testing Library suite runs in jsdom against the same MSW handlers
used during development.

```bash
npm test
```

For a complete verification run:

```bash
npm test
npx tsc -b
npm run build
```

## Docker

```bash
docker build -t futurewell-ui .
docker run -p 8080:80 futurewell-ui
```

nginx serves the built app and proxies `/api/` to
`http://backend:8000`. That hostname must resolve to the FastAPI service in the
deployment network.
