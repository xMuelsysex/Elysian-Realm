# Elysian-Realm

## Local debug/admin interface

This repository includes a development-only admin/debug interface for the deterministic offline simulation.

- Start both the local Node admin API and Vite UI with `npm run dev` or `npm run admin`.
- Open the browser UI at `http://localhost:5173`.
- The admin API listens on `http://127.0.0.1:4317` and is proxied by Vite under `/api/admin/*`.

The admin surface is local-first and in-memory only: it has no production auth, no database, no persistence, and no public deployment scope. Resetting the admin state returns the simulation to the deterministic observation MVP seed.
