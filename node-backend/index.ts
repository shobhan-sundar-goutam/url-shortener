import express, { json, urlencoded } from 'express';
import prisma from './prisma';

export const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('url shortener working fine');
});

app.post('/shorten', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({
      success: false,
      message: 'Please provide a valid url',
      data: null,
    });
    return;
  }

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

    const shortCode = generateRandomShortCode();

    const newUrl = await prisma.shortened_urls.create({
      data: {
        original_url: url,
        short_code: shortCode,
        user_id: user.id,
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

app.get('/redirect', async (req, res) => {
  const { code } = req.query;
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

app.patch('/redirect', async (req, res) => {
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
    const apiKey = req.headers['x-api-key'] as string;
    const user = await prisma.users.findUnique({ where: { api_key: apiKey } });
    if (!user) {
      res.status(403).json({
        success: false,
        message: 'Invalid API key',
        data: null,
      });
      return;
    }

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

    if (url.user_id !== user.id) {
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

app.get('/all', async (req, res) => {
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

app.delete('/all', async (req, res) => {
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
