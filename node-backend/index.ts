import { Prisma } from '@prisma/client';
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

  try {
    const urlAlreadyExists = await prisma.shortened_urls.findFirst({
      where: { original_url: url },
    });

    if (urlAlreadyExists) {
      res.status(200).json({
        success: true,
        message: 'Url already present',
        data: { shortCode: urlAlreadyExists.short_code },
      });
      return;
    }

    const shortCode = generateRandomShortCode();

    const newUrl = await prisma.shortened_urls.create({
      data: {
        original_url: url,
        short_code: shortCode,
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
    res.redirect(url.original_url);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.delete('/redirect', async (req, res) => {
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
    const deletedUrl = await prisma.shortened_urls.delete({
      where: { short_code: String(code) },
    });
    res.status(200).json({
      success: true,
      message: `short code ${code} deleted sucessfully`,
      data: deletedUrl,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      res.status(404).json({
        success: true,
        message: `No URL found for the short code ${code}`,
        data: null,
      });
    } else {
      console.log(error);
      res
        .status(500)
        .json({ success: false, message: 'Something went wrong', data: null });
    }
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
