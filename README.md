# Elysia with Bun runtime

## Getting Started
To get started with this template, simply paste this command into your terminal:
```bash
bun create elysia ./elysia-example
```

## Development
To start the development server run:
```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

LOW PRIORITY: i dont understand why bun doesnt want to build the frontend project:
bun run build
$ bunx --bun vite build

♻️  Generating routes...
✅ Processed routes in 216ms
vite v6.0.7 building for production...
✓ 2416 modules transformed.
x Build failed in 3.69s
error during build:
undefined
error: script "build" exited with code 1
--------------
frontend/package.json:
    "build": "bunx --bun vite build",
