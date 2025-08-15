"use strict";
/**
 * Domain error types to make error handling explicit and reusable.
 */
export class AppError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "AppError";
    if (cause) this.cause = cause;
  }
}
export class ConfigError extends AppError {
  constructor(message, cause) {
    super(message, cause);
    this.name = "ConfigError";
  }
}
export class StorageError extends AppError {
  constructor(message, cause) {
    super(message, cause);
    this.name = "StorageError";
  }
}
export class SpeechError extends AppError {
  constructor(message, cause) {
    super(message, cause);
    this.name = "SpeechError";
  }
}
