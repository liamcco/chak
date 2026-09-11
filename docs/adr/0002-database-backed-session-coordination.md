# Coordinate the session through Postgres and polling

Persist the election phase, Reveal Frontier, Presentation Position, selected Finalists, ballot state, and result visibility in Postgres, with clients polling every two to three seconds and offering manual refresh. This keeps every Vercel instance and participant device consistent without introducing WebSockets or a real-time service; writes remain server-authoritative and validate the current persisted state transactionally.
