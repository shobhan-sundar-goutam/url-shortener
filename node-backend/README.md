# URL Shortener

This is a URL shortener application built using Node.js, Express, TypeScript, and SQLite3. It allows users to shorten URLs, redirect using short codes, and view all stored URLs.

---

## Features

- Shorten a given URL and generate a unique short code.
- Redirect to the original URL using the short code.

---

## Prerequisites

Ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [npm](https://www.npmjs.com/)
- [TypeScript](https://www.typescriptlang.org/) (if not globally installed, it will be installed via dependencies)

---

## Getting Started

Follow these steps to set up and run the application locally:

Fork and clone the [repo](https://github.com/shobhan-sundar-goutam/url-shortener)

### 1. Get into the folder

```bash
cd node-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 2. Build the Project

Compile the TypeScript code to JavaScript using the TypeScript compiler:

```bash
npm run build
```

This will create a dist folder containing the compiled code.

### 3. Start the Server

Run the compiled code using Node.js:

```bash
npm start
```

The server will start on http://localhost:4000.

### 4. Running Tests

To execute the test suite, use the following command:

```bash
npm run test
```

**Note:** Ensure that only the test suite or the server is running at any given time, not both simultaneously, to avoid conflicts.

## Observations on /shorten API

This is the API for shortening a given URL and generating a unique short code.

### Concurrent Calls Performance Metrics

| Concurrent Calls | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) |
| ---------------- | -------- | -------- | -------- | -------- |
| 10               | 1230.5   | 1251.5   | 1294.25  | 1328.45  |
| 50               | 4509.5   | 5834.4   | 6021.6   | 6173.12  |
| 100              | 5668     | 8448.1   | 9013.4   | 9041.47  |
| 200              | 29340    | 45519.2  | 47968.3  | 48908.14 |

### Latency Graph
![image](https://github.com/user-attachments/assets/59aa23ce-19af-4602-abe1-450fba7397a2)

## Observations on /redirect API

This is the API for redirecting to the original URL using the short code.

### Concurrent Calls Performance Metrics

| Concurrent Calls | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) |
| ---------------- | -------- | -------- | -------- | -------- |
| 10               | 1902     | 1933.9   | 1937.95  | 1941.19  |
| 50               | 3082     | 3871.4   | 3934.8   | 4065.51  |
| 100              | 3941     | 4694.1   | 4795.25  | 4816.54  |
| 200              | 6329.5   | 7311.7   | 7530.15  | 7644.99  |

### Latency Graph
![image](https://github.com/user-attachments/assets/89b9d510-bb2a-4a48-91b9-25f637f84a56)

**Note:** Both /shorten and /redirect were giving request timeout errors at 500 concurrent requests
