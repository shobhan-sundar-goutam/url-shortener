import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';

export const apiKeyValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: 'Missing API key',
      data: null,
    });
    return;
  }

  try {
    const user = await prisma.users.findUnique({ where: { api_key: apiKey } });

    if (!user) {
      res.status(403).json({
        success: false,
        message: 'Invalid API key',
        data: null,
      });
      return;
    }

    // Add user to request object for later use
    req.user = user;

    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong validating the API key',
      data: null,
    });
    return;
  }
};
