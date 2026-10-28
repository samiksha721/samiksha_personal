# TripSync

Group trip planning, like Splitwise but for scheduling. The flow:

1. **Create a trip.** Give it a destination, the range of dates you're considering and how many days it should last. Share the invite code or link.
2. **Everyone marks their free days** on a shared calendar. Darker days work for more of the group.
3. **TripSync suggests the best date windows.** These are the ones where the most people are free for the whole trip. The organizer confirms one.
4. **Finalize the trip.** This unlocks:
   - **Booking links** for flights, hotels, Airbnb, travel packages, tours, car rental, visa info and insurance. They're pre-filled with the destination, dates and group size where the site supports it, and the group can save its own links (e.g. the villa you picked).
   - **Shared document storage** for tickets, booking confirmations, IDs and itineraries (up to 20 MB per file).

## Project layout

```
packages/core   Shared TypeScript logic: types, date math, best-date ranking, booking-link builder.
                No UI or Node dependencies, so the future mobile app can reuse it as-is.
apps/server     Express API + SQLite (Node's built-in node:sqlite) + file uploads on disk.
apps/web        React + Vite web app.
docs/           Roadmap, including the mobile plan.
```

## Running locally

Requires **Node.js 22.13 or newer**.

```bash
npm install
```

```bash
npm run dev
```

This starts the API at http://localhost:4000 and the web app at http://localhost:5173. To try the group flow, open the invite link in a second browser or a private window and sign in under another name.

Other commands:

```bash
npm test          # core + API tests
```

```bash
npm run typecheck
```

```bash
npm run build && npm start   # production build served by the API on :4000
```

Data (the SQLite database and uploaded files) is stored in `apps/server/data/`. Set `DATA_DIR` to put it somewhere else.

## Current limitations

- **No real authentication yet.** People sign in with just a name, and the browser remembers their user id. Anyone who has a user id can act as that user. This is fine for trying the app with friends, but add proper sign-in (see `docs/ROADMAP.md`) before putting it on the public internet.
- Updates from other members arrive by polling every 10 seconds, not in real time.
- Uploaded files are stored on the server's local disk.
