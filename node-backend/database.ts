// Not getting used anymore as the project switched to Prisma ORM

import sqlite3 from 'sqlite3';

const sqlite = sqlite3.verbose();

const DB = new sqlite.Database(
  './url_shortener.db',
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log('Created db or sqlite db already exists');
  }
);

const sql = `CREATE TABLE IF NOT EXISTS shortened_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

DB.run(sql, [], (err) => {
  if (err) {
    console.log('Error creating table');
    console.log(err);
    return;
  }
  console.log('Table Created Successfully');
});

export default DB;
