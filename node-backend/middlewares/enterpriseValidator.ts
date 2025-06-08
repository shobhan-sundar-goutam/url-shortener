import { NextFunction, Request, Response } from 'express';

export const enterpriseValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user.tier !== 'enterprise') {
    res.status(403).json({
      success: false,
      message: 'This feature is only available for enterprise users.',
      data: null,
    });
    return;
  }

  next();
};
