import bcrypt from 'bcryptjs';
import { isValid, parse } from 'date-fns';
import express, { json, urlencoded } from 'express';
import { apiKeyValidator } from './middlewares/apiKeyValidator';
import { blacklistValidator } from './middlewares/blacklistValidator';
import { enterpriseValidator } from './middlewares/enterpriseValidator';
import { requestLogger } from './middlewares/requestLogger';
import prisma from './prisma';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.use(blacklistValidator);

app.get('/health', requestLogger, async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: 'Everything is working smoothly.',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
    });
  }
});

app.post('/shorten', requestLogger, apiKeyValidator, async (req, res) => {
  const { url, expiryDate, code, password } = req.body;
  if (!url) {
    res.status(400).json({
      success: false,
      message: 'Please provide a valid url',
      data: null,
    });
    return;
  }

  try {
    let expriryDateObj: Date | undefined = undefined;

    if (expiryDate) {
      const parsedDate = parse(expiryDate, 'dd-MM-yyyy', new Date());
      if (!isValid(parsedDate)) {
        res.status(400).json({
          success: false,
          message:
            'Invalid expriy date format. Please use dd-MM-yyyy format (e.g. 22-05-2025)',
          data: null,
        });
        return;
      }

      expriryDateObj = parsedDate;
    }

    let shortCode;

    if (code) {
      shortCode = code;

      const url = await prisma.shortened_urls.findUnique({
        where: {
          short_code: shortCode,
        },
      });

      if (url) {
        res.status(400).json({
          success: false,
          message: `${shortCode} already exists. Please try again with another code.`,
          data: null,
        });
        return;
      }
    } else {
      shortCode = generateRandomShortCode();
    }

    let hashedPassword: string | undefined = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUrl = await prisma.shortened_urls.create({
      data: {
        original_url: url,
        short_code: shortCode,
        user_id: req.user.id,
        expiry_date: expriryDateObj,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Short Url created successfully',
      data: { shortCode: newUrl.short_code },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.post(
  '/shorten/batch',
  requestLogger,
  apiKeyValidator,
  enterpriseValidator,
  async (req, res) => {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Urls must be a non-empty array.',
        data: null,
      });
      return;
    }

    const results = await Promise.all(
      urls.map(async (url) => {
        if (!url) {
          return {
            url,
            success: false,
            message: 'URL is missing',
          };
        }

        const shortCode = generateRandomShortCode();

        try {
          const newUrl = await prisma.shortened_urls.create({
            data: {
              original_url: url,
              short_code: shortCode,
              user_id: req.user.id,
            },
          });

          return {
            url,
            shortCode: newUrl.short_code,
            success: true,
            message: 'Short Url created successfully',
          };
        } catch (err) {
          console.error(err);
          return {
            url,
            success: false,
            message: 'Database error',
          };
        }
      })
    );

    res.status(207).json({
      success: true,
      message: 'Batch processed',
      data: results,
    });
  }
);

app.get('/redirect', requestLogger, async (req, res) => {
  const { code } = req.query;
  const inputPassword = req.query.password as string | undefined;

  if (!code) {
    res.status(400).json({
      success: false,
      message: 'Please provide a valid code',
      data: null,
    });
    return;
  }

  try {
    const url = await prisma.shortened_urls.findUnique({
      where: { short_code: String(code) },
    });

    if (!url) {
      res.status(404).json({
        success: false,
        message: 'No url found',
        data: null,
      });
      return;
    }

    if (url.expiry_date && url.expiry_date < new Date()) {
      res.status(410).json({
        success: false,
        message: 'Url has expired',
        data: null,
      });
      return;
    }

    if (url.password) {
      if (!inputPassword) {
        res.status(401).json({
          success: false,
          message: 'This short URL is protected. Password required.',
        });
        return;
      }

      const valid = await bcrypt.compare(inputPassword, url.password);
      if (!valid) {
        res.status(403).json({
          success: false,
          message: 'Invalid password.',
        });
        return;
      }
    }

    await prisma.shortened_urls.update({
      where: { id: url.id },
      data: {
        access_count: { increment: 1 },
        last_accessed_at: new Date(),
      },
    });

    res.redirect(url.original_url);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.patch('/redirect', requestLogger, apiKeyValidator, async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(404).json({
      success: false,
      message: 'Please provide a valid code',
      data: null,
    });
    return;
  }

  try {
    const url = await prisma.shortened_urls.findUnique({
      where: { short_code: String(code) },
    });

    if (!url) {
      res.status(404).json({
        success: false,
        message: `No URL found for the short code ${code}`,
        data: null,
      });
      return;
    }

    if (url.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: `You do not own this short code`,
        data: null,
      });
      return;
    }

    await prisma.shortened_urls.update({
      where: { short_code: String(code) },
      data: { deleted_at: new Date() },
    });

    res.status(200).json({
      success: true,
      message: `short code ${code} deleted sucessfully`,
      data: null,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.patch(
  '/shorten/:code',
  requestLogger,
  apiKeyValidator,
  async (req, res) => {
    const { code } = req.params;
    const { expiryDate, password } = req.body;

    try {
      let hashedPassword: string | undefined;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const record = await prisma.shortened_urls.findUnique({
        where: { short_code: code },
      });

      if (!record) {
        res.status(404).json({
          success: false,
          message: 'Short code not found',
          data: null,
        });
        return;
      }

      if (record.user_id !== req.user.id) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this short code',
          data: null,
        });
        return;
      }

      if (expiryDate) {
        const parsedDate = parse(expiryDate, 'dd-MM-yyyy', new Date());
        if (!isValid(parsedDate)) {
          res.status(400).json({
            success: false,
            message: 'Invalid expiry date format. Use dd-MM-yyyy.',
            data: null,
          });
          return;
        }

        await prisma.shortened_urls.update({
          where: { short_code: code },
          data: {
            expiry_date: parsedDate,
            password: hashedPassword,
          },
        });

        res.status(200).json({
          success: true,
          message: 'Expiry date updated to make short code inactive',
          data: { shortCode: code, newExpiryDate: expiryDate },
        });
        return;
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ success: false, message: 'Something went wrong', data: null });
    }
  }
);

app.get('/urls', requestLogger, apiKeyValidator, async (req, res) => {
  try {
    const urls = await prisma.shortened_urls.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });

    const result = urls.map((url) => ({
      id: url.id,
      original_url: url.original_url,
      short_code: url.short_code,
      expiry_date: url.expiry_date,
      password_protected: !!url.password,
      created_at: url.created_at,
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      data: null,
    });
  }
});

app.get('/all', requestLogger, async (req, res) => {
  try {
    const urls = await prisma.shortened_urls.findMany();
    res.status(200).json({
      success: true,
      message: 'urls retrieved sucessfully',
      data: urls,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.delete('/all', requestLogger, async (req, res) => {
  try {
    await prisma.shortened_urls.deleteMany();
    res.status(200).json({
      success: true,
      message: `All data deleted sucessfully`,
      data: null,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

export function generateRandomShortCode() {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let shortCode = '';
  for (let i = 0; i < 5; i++) {
    shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return shortCode;
}

app.listen(4000, () => console.log('Server running on http://localhost:4000'));
