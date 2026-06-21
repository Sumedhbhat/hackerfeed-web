Welcome to your new TanStack Start app! 

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
bun --bun run test
```

## Backend Boundaries

The backend currently lives inside the TanStack Start app, but it should remain separable from the React application so it can later move to an independent API service.

Server-only modules live under `src/server/` and must not be imported by React UI, client hooks, or other browser code. This includes database access in `src/server/database/`, current-user resolution in `src/server/auth/`, user services and repositories in `src/server/users/`, favorites services and repositories in `src/server/favorites/`, and tRPC context, router, and handler modules in `src/server/trpc/`.

React UI and hooks must communicate through the tRPC client. They must not import D1 bindings, `src/server/database/client.ts`, or repository modules directly. Shared schemas that are safe for both client and server imports live outside `src/server/`, such as `src/lib/favorites/schemas.ts`.

tRPC is the current application boundary. Route handlers should adapt HTTP/tRPC requests to backend services; durable domain behavior belongs in services, and database details belong in repositories.

To keep a future API-service split cheap, services and repositories should stay portable. Avoid dependencies on React, TanStack Router route modules, browser APIs, and TanStack Start UI concerns inside `src/server/` feature code. If the backend is extracted later, these modules should be movable with only boundary wiring changes.

Story freshness is refresh-on-favorite for this rollout. Stale-on-read story refresh is intentionally deferred.

## Observability

Sentry tracing and structured logs are enabled in both the browser and the
Cloudflare Worker. Incoming requests, outgoing HTTP calls, tRPC procedures, and
D1 queries are recorded as spans in the same trace. Application `logger` calls
are attached to the active trace so the events leading to an error can be
inspected alongside it.

Sentry ingests warning and error logs. Trace volume is controlled by
`SENTRY_TRACES_SAMPLE_RATE` and `VITE_SENTRY_TRACES_SAMPLE_RATE`; both default to
`0.1`, while error events are captured independently of trace sampling.

## Database

Persistent app data uses Cloudflare D1 through the `DB` binding in `wrangler.jsonc`.
Database tables are defined in `src/server/database/schema.ts`; Drizzle Kit
generates SQL migrations, and Wrangler applies them.

```bash
# After changing wrangler.jsonc bindings or variables
bun run cf:typegen

# After changing the Drizzle schema
bun run db:generate --name descriptive_migration_name

# Apply generated migrations
bun run db:migrate:local
bun run db:migrate:remote
```

The same Worker runs Hugging Face Daily Papers ingestion from the Cloudflare cron
`30 23 * * *` (23:30 UTC / 05:00 Asia/Kolkata). Deploying `wrangler.jsonc`
registers the production trigger; there is intentionally no HTTP ingestion route.
Apply the D1 migrations before deploying a Worker version that enables ingestion.

The Worker creates one typed `DatabaseContext` from its D1 binding. tRPC contexts,
services, and repositories receive that Drizzle context; they must not access
`env.DB` directly. Use Drizzle's `sql` API through the context when a query cannot
be expressed clearly with the query builder.

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `bun install @tailwindcss/vite tailwindcss -D`

## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:


```bash
bun --bun run lint
bun --bun run format
bun --bun run check
```


## Setting up WorkOS

- Set `VITE_WORKOS_CLIENT_ID` in `.env.local`.
- Set `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, and `WORKOS_JWT_AUDIENCE` in `.dev.vars` for local Cloudflare/Vite dev.
- In GitHub Actions, set the same names as environment secrets so the deploy workflow can upload them as Cloudflare Worker secrets.


## T3Env

- You can use T3Env to add type safety to your environment variables.
- Add Environment variables to the `src/env.mjs` file.
- Use the environment variables in your code.

### Usage

```ts
import { env } from "#/env";

console.log(env.VITE_APP_TITLE);
```






## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
