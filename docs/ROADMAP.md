# Roadmap

## Phase 1: Web MVP (this version)
- [x] Groups with invite codes and links
- [x] Shared availability calendar with a heat map and drag-to-select
- [x] Ranked best-date suggestions, confirmed by the organizer
- [x] Finalize step that unlocks booking links and document storage
- [x] Group-saved custom links

## Phase 2: Production readiness
- **Real auth.** Email magic links or Google/Apple sign-in, e.g. via Clerk, Supabase Auth or Auth.js. Replace the `x-user-id` header with a session token. All API membership checks already go through `currentUser()` in `apps/server/src/app.ts`, so this is a single swap.
- **Hosted storage.** Move uploads to S3/R2/Supabase Storage with signed URLs, and the database to Postgres.
- **Real-time updates** over WebSockets or SSE instead of polling.
- **Notifications** when dates are confirmed or the trip is finalized (email first, push on mobile).
- **Deploy.** A single Node service (Render, Fly.io, Railway) serves both the API and the built web app.

## Phase 3: Mobile app
- **Expo (React Native) app** in `apps/mobile`, reusing `@tripsync/core` for date ranking, link building and types, and talking to the same API.
- Mobile-specific features: push notifications, adding the confirmed trip to the phone calendar (`expo-calendar`), and uploading documents from the camera or files.
- Invite links open the app through deep links / universal links.

## Ideas, in the spirit of Splitwise
- **Expense splitting per trip:** who paid for what, and who owes whom.
- Polls for destination or activities.
- A day-by-day itinerary builder.
- Per-person documents that only some members can see (e.g. passports).
- Booking partner APIs (affiliate links / package search) in place of plain search links.
