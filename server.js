require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();

app.disable("x-powered-by");

// Allow additional frontend origins listed in .env.
// The frontend served by this server uses the same origin.
const origins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

app.use(cors({ origin: origins }));
app.use(express.json({ limit: "20kb" }));

// Serve only the frontend folder.
// Do not serve the entire project folder.
const frontendDirectory = path.join(
  __dirname,
  "activity6-frontend"
);

app.use(express.static(frontendDirectory));

// Escape values displayed in the HTML guide.
function escapeHtml(value) {
  const characters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value).replace(
    /[&<>"']/g,
    character => characters[character]
  );
}

// GET /docs — API documentation.
// GET / displays activity6-frontend/index.html.
app.get("/docs", (req, res) => {
  const port = process.env.PORT || 3000;

  const baseUrl = (
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${port}`
  ).replace(/\/+$/, "");

  const studentNumber =
    process.env.STUDENT_NUMBER || "NOT PROVIDED";

  const exampleBody = JSON.stringify(
    {
      title: "Computer will not start",
      category: "Hardware",
      description:
        "The fictional practice computer in Lab C does not switch on.",
      status: "Pending"
    },
    null,
    2
  );

  res.status(200).type("html").send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      >
      <title>Campus IT Support Desk API</title>

      <style>
        * {
          box-sizing: border-box;
        }

        body {
          max-width: 1000px;
          margin: auto;
          padding: 25px;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          background: #f4f7f2;
          color: #20342b;
        }

        h1, h2 {
          color: #205b43;
        }

        section {
          background: white;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #d8e1d7;
          border-radius: 8px;
        }

        a {
          color: #175b9a;
          overflow-wrap: anywhere;
        }

        a:focus-visible {
          outline: 3px solid #176fc1;
          outline-offset: 3px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #d8e1d7;
          padding: 10px;
          text-align: left;
        }

        th {
          background: #e7eedf;
        }

        pre {
          padding: 15px;
          background: #eef2e9;
          border-radius: 5px;
          overflow-x: auto;
        }

        .notice {
          padding: 12px;
          border-left: 4px solid #b88117;
          background: #fff0cc;
        }
      </style>
    </head>

    <body>
      <header>
        <h1>Campus IT Support Desk API</h1>
        <p>
          Mulungushi University |
          ICT251 |
          Activity 7 Backend Development
        </p>
      </header>

      <main>
        <section>
          <h2>Project information</h2>

          <p>
            <strong>Student name:</strong>
            MAYBIN MWEEMBA
          </p>

          <p>
            <strong>Student number:</strong>
            ${escapeHtml(studentNumber)}
          </p>

          <p>
            A Node.js API using a hosted, SQLite-compatible
            Turso database to manage fictional Network,
            Software and Hardware support requests.
          </p>

          <p>
            <strong>API base URL:</strong>
            <a href="${escapeHtml(baseUrl)}">
              ${escapeHtml(baseUrl)}
            </a>
          </p>

          <p>
            <a href="/">Open support desk website</a>
            |
            <a href="/health">Check API health</a>
            |
            <a href="/api/records">Read all records</a>
          </p>

          <p class="notice">
            An idle hosted service may need time to start.
            Use fictional demonstration records only.
          </p>
        </section>

        <section>
          <h2>Available routes</h2>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Route</th>
                  <th>Purpose</th>
                  <th>Success code</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>GET</td>
                  <td>/</td>
                  <td>Open the frontend website</td>
                  <td>200</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/docs</td>
                  <td>Read the API guide</td>
                  <td>200</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/health</td>
                  <td>Check server and database</td>
                  <td>200</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/api/records</td>
                  <td>Read all records</td>
                  <td>200</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/api/records/:id</td>
                  <td>Read one record</td>
                  <td>200</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/api/records</td>
                  <td>Create a record</td>
                  <td>201</td>
                </tr>
                <tr>
                  <td>PUT</td>
                  <td>/api/records/:id</td>
                  <td>Replace all four editable fields</td>
                  <td>200</td>
                </tr>
                <tr>
                  <td>DELETE</td>
                  <td>/api/records/:id</td>
                  <td>Delete a record</td>
                  <td>200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Input fields</h2>

          <ul>
            <li>title: string, 3 to 80 characters.</li>
            <li>category: string, 2 to 40 characters.</li>
            <li>description: string, 5 to 300 characters.</li>
            <li>
              status: exactly Pending, In progress,
              or Completed after trimming.
            </li>
          </ul>

          <p>
            Suggested categories: Network, Software and Hardware.
            Leading and trailing spaces are removed before validation.
          </p>

          <p>
            POST and PUT require all four editable fields.
            IDs are generated by the database.
            Any client-supplied id is ignored.
          </p>

          <p>
            Route IDs must be positive whole numbers.
            PUT preserves the existing ID and does not create
            a missing record.
          </p>

          <h3>Valid POST body</h3>
          <p>
            POST /api/records with
            Content-Type: application/json
          </p>
          <pre><code>${escapeHtml(exampleBody)}</code></pre>

          <h3>Valid PUT body</h3>
          <p>
            PUT /api/records/1 with
            Content-Type: application/json.
            Use an existing ID and send all four fields.
          </p>
          <pre><code>${escapeHtml(exampleBody)}</code></pre>
        </section>

        <section>
          <h2>Responses</h2>

          <ul>
            <li>GET all: an array, or [] when empty.</li>
            <li>GET one: one record object including id.</li>
            <li>POST: the created record including its new id.</li>
            <li>PUT: the updated record with its original id.</li>
          </ul>

          <p>DELETE success response:</p>
          <pre><code>{"message":"Record deleted."}</code></pre>

          <h3>Status codes</h3>
          <ul>
            <li>200: successful read, update or delete.</li>
            <li>201: record created.</li>
            <li>400: invalid input, invalid ID or malformed JSON.</li>
            <li>404: record or route not found.</li>
            <li>500: unexpected server failure.</li>
            <li>503: database health check failed.</li>
          </ul>

          <p>Example error response:</p>
          <pre><code>{"message":"Record not found."}</code></pre>

          <p>
            You can test the API independently using Postman
            or another API client.
          </p>
        </section>
      </main>

      <footer>
        <p>
          Created by MAYBIN MWEEMBA |
          Mulungushi University | 2026
        </p>
      </footer>
    </body>
    </html>
  `);
});

// GET /health — check the real Turso records table.
app.get("/health", async (req, res) => {
  try {
    await db.prepare(
      "SELECT id FROM records LIMIT 1"
    ).get();

    return res.status(200).json({
      status: "ok",
      server: "running",
      database: "connected"
    });
  } catch (error) {
    console.error(
      "Health check failed. Code:",
      error.code || "UNKNOWN"
    );

    return res.status(503).json({
      message: "Database is currently unavailable."
    });
  }
});

// Record routes use the existing Turso connection.
app.use("/api/records", require("./routes/records"));

// Unknown route.
app.use((req, res) => {
  return res.status(404).json({
    message: "Route not found."
  });
});

// Error middleware must have four parameters.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Malformed JSON. Check your request body."
    });
  }

  if (
    error.type === "entity.too.large" ||
    error.status === 400 ||
    error.status === 415
  ) {
    return res.status(400).json({
      message: "Invalid request body. Send a small, valid JSON object."
    });
  }

  console.error(
    "Unexpected server error. Code:",
    error.code || "UNKNOWN"
  );

  return res.status(500).json({
    message: "An unexpected server error occurred."
  });
});

// Render supplies PORT automatically.
const port = Number(process.env.PORT || 3000);

if (
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error("PORT must be a number from 1 to 65535.");
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(
    `IT Support Desk running at http://localhost:${port}`
  );

  console.log(
    `API guide available at http://localhost:${port}/docs`
  );
});

server.on("error", error => {
  console.error(
    "Server could not start. Code:",
    error.code || "UNKNOWN"
  );

  db.close();
  process.exit(1);
});

// Finish active requests before closing the database.
let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  server.close(() => {
    db.close();
    process.exit(0);
  });

  setTimeout(() => {
    db.close();
    process.exit(1);
  }, 10000).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);