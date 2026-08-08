# Architecture

The public application is a Vite-built React single-page app served by a small
static gateway. The gateway serves the SPA fallback and forwards `/api`,
`/events`, and `/health` to the private service over Railway private networking.

The public code owns rendering, interaction, local state, and normalized
browser contracts. The private service owns all operational behavior. This
separation keeps secrets, provider integration, persistence, and migrations
out of the public repository.
