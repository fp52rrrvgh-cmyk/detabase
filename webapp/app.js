const form = document.querySelector("#expense-form");
const submitButton = document.querySelector("#submit-button");
const statusPanel = document.querySelector("#status-panel");
const activityDateOutput = document.querySelector("#activity-date");

const inputs = {
  endpoint: document.querySelector("#function-endpoint"),
  accessValue: document.querySelector("#access-value"),
  accountId: document.querySelector("#account-id"),
  categoryId: document.querySelector("#category-id"),
  amount: document.querySelector("#amount"),
  description: document.querySelector("#description"),
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function currentLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Logging..." : "Log expense";
  for (const field of Object.values(inputs)) {
    field.disabled = isLoading;
  }
}

function setStatus(type, content) {
  statusPanel.hidden = false;
  statusPanel.className = `status-panel status-${type}`;
  statusPanel.replaceChildren(content);
}

function statusBlock(title, details) {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement("h2");
  heading.textContent = title;
  fragment.append(heading);

  if (details.length > 0) {
    const list = document.createElement("dl");
    for (const [label, value] of details) {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      list.append(term, description);
    }
    fragment.append(list);
  }

  return fragment;
}

function safeErrorCode(responseBody) {
  const code = responseBody?.error?.code;
  if (typeof code !== "string") {
    return "request_failed";
  }

  return /^[a-z0-9_]+$/i.test(code) ? code : "request_failed";
}

function bearerToken(value) {
  return value.replace(/^bearer\s+/i, "").trim();
}

function readFormValues() {
  return {
    endpoint: inputs.endpoint.value.trim(),
    accessValue: bearerToken(inputs.accessValue.value),
    accountId: inputs.accountId.value.trim().toLowerCase(),
    categoryId: inputs.categoryId.value.trim().toLowerCase(),
    amount: inputs.amount.value.trim(),
    description: inputs.description.value.trim(),
    activityDate: activityDateOutput.value,
  };
}

function validate(values) {
  if (!values.endpoint || !values.accessValue) {
    return "Runtime config is required.";
  }

  try {
    const url = new URL(values.endpoint);
    if (url.protocol !== "https:") {
      return "Function endpoint must use HTTPS.";
    }
  } catch {
    return "Function endpoint must be a valid URL.";
  }

  if (!uuidPattern.test(values.accountId)) {
    return "Account ref must be a UUID.";
  }

  if (!uuidPattern.test(values.categoryId)) {
    return "Expense category ref must be a UUID.";
  }

  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(values.amount)) {
    return "Amount must be a positive decimal.";
  }

  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be greater than 0.";
  }

  if (!values.description) {
    return "Description is required.";
  }

  return null;
}

async function submitExpense(values) {
  const response = await fetch(values.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${values.accessValue}`,
    },
    body: JSON.stringify({
      activity_date: values.activityDate,
      movement_type: "expense",
      amount: values.amount,
      currency: "TWD",
      account_id: values.accountId,
      category_id: values.categoryId,
      description: values.description,
    }),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok || responseBody?.ok !== true) {
    const error = new Error("Request failed");
    error.status = response.status;
    error.code = safeErrorCode(responseBody);
    throw error;
  }

  return responseBody;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = readFormValues();
  const validationError = validate(values);
  if (validationError) {
    setStatus("error", statusBlock("Logging failed", [["Reason", validationError]]));
    return;
  }

  setLoading(true);
  setStatus("loading", statusBlock("Logging expense", []));

  try {
    const result = await submitExpense(values);
    const activity = result.activity ?? {};
    const safeId = typeof activity.id === "string" ? activity.id : "not returned";

    setStatus(
      "success",
      statusBlock("Expense logged", [
        ["Date", values.activityDate],
        ["Amount", values.amount],
        ["Description", values.description],
        ["Activity", safeId],
      ]),
    );

    inputs.amount.value = "";
    inputs.description.value = "";
    inputs.amount.focus();
  } catch (error) {
    const status = typeof error.status === "number" ? String(error.status) : "unknown";
    const code = typeof error.code === "string" ? error.code : "request_failed";

    setStatus(
      "error",
      statusBlock("Logging failed", [
        ["Status", status],
        ["Code", code],
      ]),
    );
  } finally {
    setLoading(false);
  }
});

activityDateOutput.value = currentLocalDate();
activityDateOutput.textContent = activityDateOutput.value;
