const STORAGE_KEY = "it-support-demo-v1";

const VALID_STATUSES = [
  "Pending",
  "In progress",
  "Completed"
];

const startingRecords = [
  {
    id: 1,
    title: "Wi-Fi unavailable in Lab A",
    category: "Network",
    description:
      "The demonstration computers in Lab A cannot connect to Wi-Fi.",
    status: "Pending"
  },
  {
    id: 2,
    title: "Install Python in Lab B",
    category: "Software",
    description:
      "Install Python on the practice computers before the next lesson.",
    status: "In progress"
  },
  {
    id: 3,
    title: "Library printer paper jam",
    category: "Hardware",
    description:
      "The fictional library printer stops feeding paper during printing.",
    status: "Pending"
  },
  {
    id: 4,
    title: "Projector display repaired",
    category: "Hardware",
    description:
      "The demonstration projector cable was replaced and tested.",
    status: "Completed"
  },
  {
    id: 5,
    title: "Browser closes unexpectedly",
    category: "Software",
    description:
      "The browser on a practice computer closes when opening new tabs.",
    status: "In progress"
  },
  {
    id: 6,
    title: "Slow internet in study room",
    category: "Network",
    description:
      "The fictional study room has a slow internet connection.",
    status: "Pending"
  },
  {
    id: 7,
    title: "Keyboard replacement completed",
    category: "Hardware",
    description:
      "A faulty keyboard on the demonstration workstation was replaced.",
    status: "Completed"
  },
  {
    id: 8,
    title: "Update spreadsheet software",
    category: "Software",
    description:
      "Update the spreadsheet application on the practice machines.",
    status: "Pending"
  }
];

// Read records from localStorage.
function readRecords() {
  const storedData = localStorage.getItem(STORAGE_KEY);

  // Starting records are added only when the key does not exist.
  // A saved empty array must remain empty.
  if (storedData === null) {
    saveRecords(startingRecords);

    return startingRecords.map(record => ({ ...record }));
  }

  let records;

  try {
    records = JSON.parse(storedData);
  } catch {
    throw new Error(
      "Saved records cannot be read. Existing data has been preserved."
    );
  }

  if (!Array.isArray(records)) {
    throw new Error("Saved records have an invalid format.");
  }

  const validRecords = records.every(record => {
    return (
      record !== null &&
      typeof record === "object" &&
      Number.isSafeInteger(record.id) &&
      record.id > 0 &&
      typeof record.title === "string" &&
      typeof record.category === "string" &&
      typeof record.description === "string" &&
      VALID_STATUSES.includes(record.status)
    );
  });

  const uniqueIds = new Set(records.map(record => record.id));

  if (!validRecords || uniqueIds.size !== records.length) {
    throw new Error(
      "Saved records are invalid. Existing data has been preserved."
    );
  }

  return records;
}

// Save the complete array under one localStorage key.
function saveRecords(records) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records)
  );
}

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
    throw new Error("Title must contain 3 to 80 characters.");
  }

  if (
    cleanedRecord.category.length < 2 ||
    cleanedRecord.category.length > 40
  ) {
    throw new Error("Category must contain 2 to 40 characters.");
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

// Locate a record or report that it is missing.
function findRecordIndex(records, id) {
  const index = records.findIndex(record => {
    return record.id === Number(id);
  });

  if (index === -1) {
    throw new Error("The requested record could not be found.");
  }

  return index;
}

// app.js uses this service for every data operation.
export const recordService = {
  async list() {
    return readRecords();
  },

  async get(id) {
    const records = readRecords();
    const index = findRecordIndex(records, id);

    return records[index];
  },

  async create(record) {
    const records = readRecords();
    const cleanedRecord = prepareRecord(record);

    // The next ID is greater than every currently stored ID.
    const highestId = records.reduce((highest, current) => {
      return Math.max(highest, current.id);
    }, 0);

    const newId = highestId + 1;

    if (!Number.isSafeInteger(newId)) {
      throw new Error("No more record IDs are available.");
    }

    const newRecord = {
      id: newId,
      ...cleanedRecord
    };

    records.push(newRecord);
    saveRecords(records);

    return newRecord;
  },

  async update(id, record) {
    const records = readRecords();
    const index = findRecordIndex(records, id);
    const cleanedRecord = prepareRecord(record);

    // Keep the original ID when replacing editable fields.
    const updatedRecord = {
      id: records[index].id,
      ...cleanedRecord
    };

    records[index] = updatedRecord;
    saveRecords(records);

    return updatedRecord;
  },

  async remove(id) {
    const records = readRecords();
    const index = findRecordIndex(records, id);

    records.splice(index, 1);
    saveRecords(records);

    return "Request deleted successfully.";
  }
};