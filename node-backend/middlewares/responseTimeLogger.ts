import { NextFunction, Request, Response } from 'express';

export const responseTimeLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Store start time on the request object
  const start = process.hrtime();

  // Store original end function
  const originalEnd = res.end;

  // Override end function
  res.end = function (
    chunk?: any,
    encoding?: string | (() => void),
    cb?: () => void
  ): any {
    // Calculate elapsed time
    const elapsed = process.hrtime(start);
    const elapsedTimeMs = elapsed[0] * 1000 + elapsed[1] / 1e6;

    // Add response time to headers (rounded to 2 decimal places)
    res.setHeader('X-Response-Time', `${elapsedTimeMs.toFixed(2)}ms`);

    // Call original end with all arguments
    return originalEnd.call(this, chunk, encoding as any, cb);
  };

  next();
};
