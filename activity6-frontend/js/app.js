import { recordService } from "./data.js";

// Find an HTML element by its ID.
const getElement = id => document.getElementById(id);

const form = getElement("record-form");
const recordList = getElement("record-list");
const messageElement = getElement("message");

const searchInput = getElement("search");
const statusFilter = getElement("status-filter");

const viewDialog = getElement("view-dialog");
const deleteDialog = getElement("delete-dialog");

const editableFields = [
  "title",
  "category",
  "description",
  "status"
];

const validStatuses = [
  "Pending",
  "In progress",
  "Completed"
];

let records = [];
let editingId = null;
let deletingId = null;
let saving = false;
let deleting = false;

// Display success or error messages.
function showMessage(message, type = "success") {
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  messageElement.hidden = false;
}

function handleError(error) {
  showMessage(
    error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.",
    "error"
  );
}

// Create elements safely.
function createElement(tag, text, className = "") {
  const element = document.createElement(tag);

  if (text !== undefined) {
    element.textContent = text;
  }

  if (className) {
    element.className = className;
  }

  return element;
}

// Remove previous field errors.
function clearFieldErrors() {
  for (const field of editableFields) {
    getElement(`${field}-error`).textContent = "";
    getElement(field).removeAttribute("aria-invalid");
  }
}

// Validate trimmed form input.
function validateRecord(record) {
  clearFieldErrors();

  const errors = {};

  if (
    record.title.length < 3 ||
    record.title.length > 80
  ) {
    errors.title = "Enter a title of 3 to 80 characters.";
  }

  if (
    record.category.length < 2 ||
    record.category.length > 40
  ) {
    errors.category = "Select a valid category.";
  }

  if (
    record.description.length < 5 ||
    record.description.length > 300
  ) {
    errors.description =
      "Enter a description of 5 to 300 characters.";
  }

  if (!validStatuses.includes(record.status)) {
    errors.status = "Select a valid status.";
  }

  const invalidFields = Object.keys(errors);

  if (invalidFields.length === 0) {
    return true;
  }

  for (const field of invalidFields) {
    getElement(`${field}-error`).textContent = errors[field];
    getElement(field).setAttribute("aria-invalid", "true");
  }

  showMessage(
    "Please correct the highlighted fields. No record was saved.",
    "error"
  );

  getElement(invalidFields[0]).focus();
  return false;
}

// Return the form to add mode.
function resetForm() {
  editingId = null;

  form.reset();
  clearFieldErrors();

  getElement("form-heading").textContent = "Add a Request";
  getElement("save-button").textContent = "Add Request";
  getElement("cancel-edit").hidden = true;
  getElement("editing-notice").hidden = true;
}

// Update summary figures.
function updateSummary() {
  getElement("total-count").textContent = records.length;

  getElement("pending-count").textContent =
    records.filter(record => record.status === "Pending").length;

  getElement("progress-count").textContent =
    records.filter(record => record.status === "In progress").length;

  getElement("completed-count").textContent =
    records.filter(record => record.status === "Completed").length;
}

function getStatusClass(status) {
  if (status === "Completed") return "completed";
  if (status === "In progress") return "in-progress";
  return "pending";
}

// Create an action button.
function createActionButton(label, className, record, action) {
  const button = createElement("button", label, className);

  button.type = "button";

  button.setAttribute(
    "aria-label",
    `${label} request ${record.id}: ${record.title}`
  );

  button.addEventListener("click", async () => {
    if (saving || deleting) return;

    button.disabled = true;

    try {
      await action(record.id);
    } catch (error) {
      handleError(error);
    } finally {
      button.disabled = false;
    }
  });

  return button;
}

// Display records matching both filters.
function renderRecords() {
  updateSummary();

  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredRecords = records.filter(record => {
    const matchesTitle =
      record.title.toLowerCase().includes(searchTerm);

    const matchesStatus =
      selectedStatus === "" ||
      record.status === selectedStatus;

    return matchesTitle && matchesStatus;
  });

  getElement("result-count").textContent =
    `${filteredRecords.length} of ${records.length} records`;

  recordList.replaceChildren();

  const emptyState = getElement("empty-state");
  emptyState.hidden = filteredRecords.length > 0;

  if (filteredRecords.length === 0) {
    emptyState.textContent = records.length === 0
      ? "No requests yet. Use the form to add your first request."
      : "No matching requests. Change your search or status filter.";
  }

  for (const record of filteredRecords) {
    const card = createElement(
      "article",
      undefined,
      "record-card"
    );

    const top = createElement("div", undefined, "record-top");

    top.append(
      createElement(
        "span",
        `#${record.id} | ${record.category}`,
        "record-meta"
      ),
      createElement(
        "span",
        record.status,
        `badge ${getStatusClass(record.status)}`
      )
    );

    const title = createElement("h4", record.title);

    const description = createElement(
      "p",
      record.description,
      "record-description"
    );

    const actions = createElement(
      "div",
      undefined,
      "record-actions"
    );

    actions.append(
      createActionButton("View", "secondary", record, viewRecord),
      createActionButton("Edit", "primary", record, editRecord),
      createActionButton("Delete", "danger", record, requestDeletion)
    );

    card.append(top, title, description, actions);
    recordList.append(card);
  }
}

// Retrieve records from the backend and Turso.
async function refreshRecords() {
  recordList.setAttribute("aria-busy", "true");

  try {
    const latestRecords = await recordService.list();
    records = latestRecords;
    renderRecords();
  } finally {
    recordList.setAttribute("aria-busy", "false");
  }
}

// Report a successful change even if reloading the board fails.
async function refreshAfterChange(successMessage) {
  try {
    await refreshRecords();
    showMessage(successMessage);
  } catch {
    showMessage(
      `${successMessage} The board could not reload. ` +
      "Refresh the page to see the latest records.",
      "error"
    );
  }
}

// Display details fetched from the database.
async function viewRecord(id) {
  const record = await recordService.get(id);
  const details = getElement("view-details");

  details.replaceChildren();

  const fields = [
    ["ID", record.id],
    ["Title", record.title],
    ["Category", record.category],
    ["Description", record.description],
    ["Status", record.status]
  ];

  for (const [label, value] of fields) {
    const row = createElement("div");

    row.append(
      createElement("dt", label),
      createElement("dd", String(value))
    );

    details.append(row);
  }

  if (!viewDialog.open) {
    viewDialog.showModal();
  }
}

// Load a record into the editing form.
async function editRecord(id) {
  const record = await recordService.get(id);

  clearFieldErrors();
  editingId = record.id;

  for (const field of editableFields) {
    getElement(field).value = record[field];
  }

  getElement("form-heading").textContent =
    `Edit Request #${record.id}`;

  getElement("save-button").textContent = "Save Changes";
  getElement("cancel-edit").hidden = false;

  const notice = getElement("editing-notice");

  notice.textContent =
    `Editing record #${record.id}. Its ID will stay the same.`;

  notice.hidden = false;
  getElement("title").focus();
}

// Ask before deleting a shared record.
async function requestDeletion(id) {
  const record = await recordService.get(id);

  deletingId = record.id;

  getElement("delete-description").textContent =
    `Request #${record.id}: ${record.title}`;

  if (!deleteDialog.open) {
    deleteDialog.showModal();
  }
}

// Create or update a record.
form.addEventListener("submit", async event => {
  event.preventDefault();

  if (saving || deleting) return;

  const record = {};

  for (const field of editableFields) {
    record[field] = getElement(field).value.trim();
  }

  if (!validateRecord(record)) return;

  const saveButton = getElement("save-button");
  const cancelButton = getElement("cancel-edit");
  const isEditing = editingId !== null;
  const currentId = editingId;

  saving = true;
  saveButton.disabled = true;
  cancelButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    const savedRecord = isEditing
      ? await recordService.update(currentId, record)
      : await recordService.create(record);

    resetForm();

    await refreshAfterChange(
      `Request #${savedRecord.id} ${
        isEditing ? "updated" : "added"
      } successfully.`
    );
  } catch (error) {
    handleError(error);
  } finally {
    saving = false;
    saveButton.disabled = false;
    cancelButton.disabled = false;

    saveButton.textContent = editingId === null
      ? "Add Request"
      : "Save Changes";
  }
});

// Cancel editing.
getElement("cancel-edit").addEventListener("click", () => {
  if (saving || deleting) return;

  resetForm();

  showMessage(
    "Editing cancelled. The saved record was not changed."
  );

  getElement("title").focus();
});

// Close details.
getElement("close-view").addEventListener("click", () => {
  viewDialog.close();
});

// Cancel deletion.
getElement("cancel-delete").addEventListener("click", () => {
  if (deleting) return;

  deletingId = null;
  deleteDialog.close();

  showMessage("Deletion cancelled. The record was kept.");
});

// Escape cancels deletion unless a delete is already being sent.
deleteDialog.addEventListener("cancel", event => {
  if (deleting) {
    event.preventDefault();
    return;
  }

  deletingId = null;
  showMessage("Deletion cancelled. The record was kept.");
});

// Delete after confirmation.
getElement("confirm-delete").addEventListener(
  "click",
  async () => {
    if (deletingId === null || deleting || saving) return;

    const id = deletingId;
    const deleteButton = getElement("confirm-delete");
    const cancelButton = getElement("cancel-delete");

    deleting = true;
    deleteButton.disabled = true;
    cancelButton.disabled = true;
    deleteButton.textContent = "Deleting...";

    try {
      const message = await recordService.remove(id);

      if (editingId === id) {
        resetForm();
      }

      deletingId = null;
      deleteDialog.close();

      await refreshAfterChange(message);
    } catch (error) {
      handleError(error);
    } finally {
      deleting = false;
      deleteButton.disabled = false;
      cancelButton.disabled = false;
      deleteButton.textContent = "Delete Request";
    }
  }
);

// Search and filtering work together.
searchInput.addEventListener("input", renderRecords);
statusFilter.addEventListener("change", renderRecords);

// Clear filters.
getElement("clear-filters").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  renderRecords();
});

// Load shared records when the page opens.
// Refresh the webpage to see changes made by other users.
getElement("empty-state").textContent = "Loading requests...";
getElement("empty-state").hidden = false;

refreshRecords().catch(error => {
  handleError(error);

  getElement("empty-state").textContent =
    "Requests could not be loaded. Check your internet " +
    "connection and refresh the page. The server may " +
    "need time to start.";

  getElement("empty-state").hidden = false;
});
