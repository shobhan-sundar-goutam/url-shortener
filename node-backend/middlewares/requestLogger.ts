import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';

export const requestLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Request logger middleware triggered');

    // Get the required information from the request
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('user-agent');
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Save to database asynchronously
    const log = await prisma.request_logs.create({
      data: {
        method,
        url,
        user_agent: userAgent,
        ip,
      },
    });

    console.log('Log created:', log);

    // Continue with the request
    next();
  } catch (error) {
    // Log error but don't block the request
    console.error('Error logging request:', error);
    next();
  }
};
