import express, { json, urlencoded } from 'express';
import DB from './database';

const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('url shortener working fine');
});

app.post('/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(404).json({
      success: false,
      message: 'Please provide a valid url',
      data: null,
    });
    return;
  }

  const shortCode = generateRandomShortCode();

  const insertSql = `INSERT INTO shortened_urls(original_url, short_code) VALUES (?, ?)`;

  try {
    DB.run(insertSql, [url, shortCode], (err) => {
      if (err) throw err;
      res.status(201).json({
        success: true,
        message: 'Short Url created successfully',
        data: { shortCode },
      });
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.get('/redirect', (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(404).json({
      success: false,
      message: 'Please provide a valid code',
      data: null,
    });
    return;
  }

  const sql = `SELECT original_url FROM shortened_urls WHERE short_code = ?`;

  try {
    DB.all(
      sql,
      [code],
      (err: Error | null, rows: [{ original_url: string }] | undefined) => {
        if (err) throw err;
        if (!rows || !rows.length) {
          res.status(201).json({
            success: true,
            message: 'No url found',
            data: null,
          });
          return;
        }
        res.redirect(rows[0].original_url);
      }
    );
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

app.get('/all', (req, res) => {
  const sql = `SELECT * FROM shortened_urls`;

  try {
    DB.all(sql, [], (err, rows) => {
      if (err) throw err;
      console.log(61, rows);
      res.status(201).json({
        success: true,
        message: 'urls retrieved sucessfully',
        data: rows,
      });
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: 'Something went wrong', data: null });
  }
});

function generateRandomShortCode() {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let shortCode = '';
  for (let i = 0; i < 5; i++) {
    shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return shortCode;
}

app.listen(4000, () => console.log('Server running on http://localhost:4000'));
