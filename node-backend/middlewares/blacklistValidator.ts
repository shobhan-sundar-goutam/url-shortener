import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

class BlacklistCache {
  private blacklistedKeys: Set<string> = new Set();
  private lastUpdate: number = 0;
  private readonly updateInterval: number = 2 * 1000; // 2 seconds for testing
  private readonly blacklistPath: string;

  constructor() {
    // Find project root by looking for package.json
    let currentDir = __dirname;
    while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error('Could not find project root');
      }
      currentDir = parentDir;
    }
    this.blacklistPath = path.join(currentDir, 'config', 'blacklist.txt');
    this.updateBlacklist(); // Initial load
  }

  async updateBlacklist(): Promise<void> {
    try {
      const content = await fsPromises.readFile(this.blacklistPath, 'utf-8');
      const keys = content
        .split('\n')
        .map((key) => key.trim())
        .filter((key) => key && !key.startsWith('//')); // Skip empty lines and comments
      this.blacklistedKeys = new Set(keys);
      this.lastUpdate = Date.now();
      console.log('Blacklist updated successfully');
    } catch (error) {
      console.error('Error updating blacklist:', error);
    }
  }

  async checkKey(key: string): Promise<boolean> {
    // Update blacklist if enough time has passed
    if (Date.now() - this.lastUpdate > this.updateInterval) {
      await this.updateBlacklist();
    }
    return this.blacklistedKeys.has(key);
  }
}

// Create a singleton instance
const blacklistCache = new BlacklistCache();

export const blacklistValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    // Let apiKeyValidator handle missing API key
    return next();
  }

  try {
    const isBlacklisted = await blacklistCache.checkKey(apiKey);

    if (isBlacklisted) {
      res.status(403).json({
        success: false,
        message: 'User has been blacklisted',
        data: null,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking blacklist:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking API key blacklist',
      data: null,
    });
  }
};
