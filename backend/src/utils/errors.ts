export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertFound<T>(value: T | null | undefined, message = 'Not found'): T {
  if (value == null) {
    throw new AppError(404, message);
  }
  return value;
}
