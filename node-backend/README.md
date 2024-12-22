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
