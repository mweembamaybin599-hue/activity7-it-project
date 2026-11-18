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

// Display success or error messages.
function showMessage(message, type = "success") {
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  messageElement.hidden = false;
}

function handleError(error) {
  const message = error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

  showMessage(message, "error");
}

// Create elements safely using textContent.
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

// Remove previous field validation messages.
function clearFieldErrors() {
  for (const field of editableFields) {
    getElement(`${field}-error`).textContent = "";
    getElement(field).removeAttribute("aria-invalid");
  }
}

// Check trimmed input before saving.
function validateRecord(record) {
  clearFieldErrors();

  const errors = {};

  if (record.title.length < 3 || record.title.length > 80) {
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

    getElement(field).setAttribute(
      "aria-invalid",
      "true"
    );
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
    records.filter(record => {
      return record.status === "Pending";
    }).length;

  getElement("progress-count").textContent =
    records.filter(record => {
      return record.status === "In progress";
    }).length;

  getElement("completed-count").textContent =
    records.filter(record => {
      return record.status === "Completed";
    }).length;
}

// Convert each status into its CSS class.
function getStatusClass(status) {
  if (status === "Completed") {
    return "completed";
  }

  if (status === "In progress") {
    return "in-progress";
  }

  return "pending";
}

// Create a button for one record action.
function createActionButton(label, className, record, action) {
  const button = createElement(
    "button",
    label,
    className
  );

  button.type = "button";

  button.setAttribute(
    "aria-label",
    `${label} request ${record.id}: ${record.title}`
  );

  button.addEventListener("click", async () => {
    try {
      await action(record.id);
    } catch (error) {
      handleError(error);
    }
  });

  return button;
}

// Display records matching the search and status filter.
function renderRecords() {
  updateSummary();

  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredRecords = records.filter(record => {
    const matchesTitle = record.title
      .toLowerCase()
      .includes(searchTerm);

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

    const top = createElement(
      "div",
      undefined,
      "record-top"
    );

    const metadata = createElement(
      "span",
      `#${record.id} | ${record.category}`,
      "record-meta"
    );

    const badge = createElement(
      "span",
      record.status,
      `badge ${getStatusClass(record.status)}`
    );

    top.append(metadata, badge);

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
      createActionButton(
        "View",
        "secondary",
        record,
        viewRecord
      ),
      createActionButton(
        "Edit",
        "primary",
        record,
        editRecord
      ),
      createActionButton(
        "Delete",
        "danger",
        record,
        requestDeletion
      )
    );

    card.append(top, title, description, actions);
    recordList.append(card);
  }
}

// Load the latest records from the data service.
async function refreshRecords() {
  records = await recordService.list();
  renderRecords();
}

// Show all details of one record.
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
    const term = createElement("dt", label);
    const definition = createElement("dd", String(value));

    row.append(term, definition);
    details.append(row);
  }

  viewDialog.showModal();
}

// Put an existing record into the form.
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

// Ask for confirmation before deleting.
async function requestDeletion(id) {
  const record = await recordService.get(id);

  deletingId = record.id;

  getElement("delete-description").textContent =
    `Request #${record.id}: ${record.title}`;

  deleteDialog.showModal();
}

// Add a new record or update the selected record.
form.addEventListener("submit", async event => {
  event.preventDefault();

  const record = {};

  for (const field of editableFields) {
    record[field] = getElement(field).value.trim();
  }

  if (!validateRecord(record)) {
    return;
  }

  const saveButton = getElement("save-button");
  saveButton.disabled = true;

  try {
    const isEditing = editingId !== null;

    const savedRecord = isEditing
      ? await recordService.update(editingId, record)
      : await recordService.create(record);

    resetForm();
    await refreshRecords();

    showMessage(
      `Request #${savedRecord.id} ${
        isEditing ? "updated" : "added"
      } successfully.`
    );
  } catch (error) {
    handleError(error);
  } finally {
    saveButton.disabled = false;
  }
});

// Cancel editing without changing the saved record.
getElement("cancel-edit").addEventListener("click", () => {
  resetForm();

  showMessage(
    "Editing cancelled. The saved record was not changed."
  );

  getElement("title").focus();
});

// Close the record details dialog.
getElement("close-view").addEventListener("click", () => {
  viewDialog.close();
});

// Cancel a pending deletion.
getElement("cancel-delete").addEventListener("click", () => {
  deletingId = null;
  deleteDialog.close();

  showMessage(
    "Deletion cancelled. The record was kept."
  );
});

// Pressing Escape also cancels deletion.
deleteDialog.addEventListener("cancel", () => {
  deletingId = null;

  showMessage(
    "Deletion cancelled. The record was kept."
  );
});

// Delete only after the user confirms.
getElement("confirm-delete").addEventListener(
  "click",
  async () => {
    if (deletingId === null) {
      return;
    }

    const deleteButton = getElement("confirm-delete");
    deleteButton.disabled = true;

    try {
      const message = await recordService.remove(deletingId);

      if (editingId === deletingId) {
        resetForm();
      }

      deletingId = null;
      deleteDialog.close();

      await refreshRecords();
      showMessage(message);
    } catch (error) {
      handleError(error);
    } finally {
      deleteButton.disabled = false;
    }
  }
);

// Search and filtering work together.
searchInput.addEventListener("input", renderRecords);
statusFilter.addEventListener("change", renderRecords);

// Clear both filters.
getElement("clear-filters").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";

  renderRecords();
});

// Refresh if another tab changes this application's data.
window.addEventListener("storage", event => {
  if (
    event.key === "it-support-demo-v1" ||
    event.key === null
  ) {
    refreshRecords().catch(handleError);
  }
});

// Load records when the page opens.
refreshRecords().catch(error => {
  handleError(error);

  const emptyState = getElement("empty-state");

  emptyState.textContent =
    "Records could not be loaded. Check whether browser storage is available.";

  emptyState.hidden = false;
});