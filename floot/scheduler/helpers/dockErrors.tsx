// @ts-nocheck
// Migrated from errors.js; source behavior retained.
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
