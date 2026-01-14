import type { Context } from 'hono';
import type { Env, Variables } from '../types';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  c: Context<{ Bindings: Env; Variables: Variables }>
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as any
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as any;
    const details = zodError.errors?.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力内容に誤りがあります',
          details,
        },
      },
      422
    );
  }

  // Default server error
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          c.env.ENVIRONMENT === 'production'
            ? 'An unexpected error occurred'
            : err.message,
      },
    },
    500
  );
}
