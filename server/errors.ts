/**
 * Unified HTTP error classes for consistent status code handling.
 *
 * Rule: validation errors → 400, resource not found → 404,
 *       conflict → 409, analysis error → 422, server error → 500.
 *
 * Service layer throws these; global error middleware maps to status codes.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class AnalysisError extends HttpError {
  constructor(message: string) {
    super(422, 'ANALYSIS_ERROR', message);
    this.name = 'AnalysisError';
  }
}
