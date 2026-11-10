import type { NextFunction, Request, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncRoute(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function routeParam(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value;
}
