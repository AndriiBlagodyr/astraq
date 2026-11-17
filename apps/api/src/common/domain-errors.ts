// Errors a repository raises for what the caller asked, not for a fault:
// a row that isn't there (or isn't the user's), a name already taken. They
// know nothing about HTTP. `AllExceptionsFilter` gives each kind its status,
// so a service lets them pass instead of catching and rethrowing every one.
//
// A new domain error extends one of the two kinds below and sets its own
// `name`. An error that needs a status of its own (the ledger's
// `insufficient_cash` as a 422) is still translated by the service that
// knows what it means for the request.

export abstract class DomainError extends Error {}

/** The thing asked for doesn't exist, or isn't this user's: a 404. */
export class NotFoundError extends DomainError {}

/** The change collides with what is already stored: a 409. */
export class ConflictError extends DomainError {}
