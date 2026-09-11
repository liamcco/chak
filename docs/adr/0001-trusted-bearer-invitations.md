# Use trusted bearer invitations without strong identity verification

The Name Election is a low-stakes event among trusted choir members, so participant-specific links use short tokens stored directly in Postgres and may be distributed together in a group chat. This prevents accidental duplicate voting and gives the Administrator named completion tracking, but deliberately does not prevent a participant from impersonating another member who shared or exposed their link; stronger authentication and hashed credentials are out of scope.
