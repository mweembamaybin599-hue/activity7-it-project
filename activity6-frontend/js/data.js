// The frontend and backend run at the same address.
// Works locally through npm start and on Render.
const RECORDS_URL = "/api/records";

const VALID_STATUSES = [
  "Pending",
  "In progress",
  "Completed"
];

// Validate and return only the four editable fields.
function prepareRecord(record) {
  const cleanedRecord = {
    title: String(record.title ?? "").trim(),
    category: String(record.category ?? "").trim(),
    description: String(record.description ?? "").trim(),
    status: String(record.status ?? "").trim()
  };

  if (
    cleanedRecord.title.length < 3 ||
    cleanedRecord.title.length > 80
  ) {
    throw new Error(
      "Title must contain 3 to 80 characters."
    );
  }

  if (
    cleanedRecord.category.length < 2 ||
    cleanedRecord.category.length > 40
  ) {
    throw new Error(
      "Category must contain 2 to 40 characters."
    );
  }

  if (
    cleanedRecord.description.length < 5 ||
    cleanedRecord.description.length > 300
  ) {
    throw new Error(
      "Description must contain 5 to 300 characters."
    );
  }

  if (!VALID_STATUSES.includes(cleanedRecord.status)) {
    throw new Error("Please select a valid status.");
  }

  return cleanedRecord;
}

// Validate IDs before placing them in a request URL.
function recordPath(id) {
  const number = Number(id);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(
      "Record ID must be a positive whole number."
    );
  }

  return `/${number}`;
}

// Send a request and report server or connection errors.
async function apiRequest(path = "", options = {}) {
  let response;

  try {
    response = await fetch(RECORDS_URL + path, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {})
      },
      cache: "no-store"
    });
  } catch {
    throw new Error(
      "Could not reach the server. Check your internet connection and try again."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Refresh the page and try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `Request failed with status ${response.status}.`
    );
  }

  return data;
}

// app.js uses this service for every data operation.
export const recordService = {
  // GET /api/records
  async list() {
    const records = await apiRequest();

    if (!Array.isArray(records)) {
      throw new Error(
        "The server returned an invalid records list."
      );
    }

    return records;
  },

  // GET /api/records/:id
  async get(id) {
    return apiRequest(recordPath(id));
  },

  // POST /api/records
  async create(record) {
    const cleanedRecord = prepareRecord(record);

    // The database generates the new ID.
    return apiRequest("", {
      method: "POST",
      body: JSON.stringify(cleanedRecord)
    });
  },

  // PUT /api/records/:id
  async update(id, record) {
    const path = recordPath(id);
    const cleanedRecord = prepareRecord(record);

    return apiRequest(path, {
      method: "PUT",
      body: JSON.stringify(cleanedRecord)
    });
  },

  // DELETE /api/records/:id
  async remove(id) {
    const result = await apiRequest(recordPath(id), {
      method: "DELETE"
    });

    return result.message ||
      "Request deleted successfully.";
  }
};
