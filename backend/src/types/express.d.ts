// Global augmentation (this file has no imports/exports, so it is a script).
declare namespace Express {
  interface Request {
    /** Set by the owner middleware on every request; always "local" in v1. */
    ownerId: string;
  }
}
