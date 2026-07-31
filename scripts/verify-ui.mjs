const pages = await fetch("http://127.0.0.1:9223/json").then((response) =>
  response.json(),
);
const page = pages.find((entry) => entry.type === "page");
if (!page) throw new Error("No debuggable Chrome page found on port 9223");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result);
});

function send(method, params = {}) {
  commandId += 1;
  socket.send(JSON.stringify({ id: commandId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
  });
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function evaluate(expression, awaitPromise = false) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  return response.result?.value;
}

async function waitFor(expression, timeout = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await wait(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function click(selector) {
  const clicked = await evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    target?.click();
    return Boolean(target);
  })()`);
  if (!clicked) throw new Error(`Unable to click ${selector}`);
  await wait(250);
}

async function clickText(selector, text) {
  const clicked = await evaluate(`(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find((element) => element.textContent?.trim().includes(${JSON.stringify(text)}));
    target?.click();
    return Boolean(target);
  })()`);
  if (!clicked) throw new Error(`Unable to click ${text}`);
  await wait(250);
}

async function press(key) {
  const virtualKeyCodes = {
    ArrowDown: 40,
    ArrowRight: 39,
    End: 35,
    Enter: 13,
    Escape: 27,
    Tab: 9,
  };
  const virtualKeyCode = virtualKeyCodes[key];
  const params = virtualKeyCode
    ? {
        key,
        code: key,
        windowsVirtualKeyCode: virtualKeyCode,
        nativeVirtualKeyCode: virtualKeyCode,
      }
    : { key };
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...params });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
  await wait(100);
}

const checks = [];
const check = (name, passed, details = "") => {
  checks.push({ name, passed: Boolean(passed), details });
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

await evaluate(
  `document.documentElement.setAttribute("data-verification-reloading", "");
  fetch("/api/auth/logout", { method: "POST" }).then(() => {
    localStorage.setItem("nimbus-theme", "light");
    location.reload();
  })`,
);
await waitFor(
  `Boolean(document.querySelector('[data-ui="login-page"]')) &&
    !document.documentElement.hasAttribute("data-verification-reloading")`,
);
check(
  "Login form renders",
  await evaluate(
    `Boolean(document.querySelector("#login-email")) &&
      Boolean(document.querySelector("#login-password"))`,
  ),
);
check(
  "Remember me is enabled by default",
  (await evaluate(
    `document.querySelector('[data-slot="checkbox"]')?.getAttribute("aria-checked")`,
  )) === "true",
);
await clickText('[data-slot="tabs-trigger"]', "Бүртгүүлэх");
check(
  "Signup mode exposes all required fields",
  await evaluate(
    `["signup-name", "signup-email", "signup-password", "signup-confirm"]
      .every((id) => Boolean(document.getElementById(id)))`,
  ),
);
await clickText('[data-slot="tabs-trigger"]', "Нэвтрэх");
await clickText("button", "Temuulen E.");
check(
  "Demo account selection updates credentials",
  (await evaluate(`document.querySelector("#login-email")?.value`)) ===
    "temuulen@acme.mn",
);
await click('[data-slot="checkbox"]');
check(
  "Remember me can be toggled",
  (await evaluate(
    `document.querySelector('[data-slot="checkbox"]')?.getAttribute("aria-checked")`,
  )) === "false",
);

await evaluate(
  `document.documentElement.setAttribute("data-verification-reloading", "");
  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "temuulen@acme.mn",
      password: "nimbus",
      remember: "true"
    })
  }).then(() => {
    localStorage.setItem("nimbus-theme", "light");
    location.reload();
  })`,
);
await waitFor(
  `Boolean(document.querySelector('[data-ui="app-shell"]')) &&
    !document.documentElement.hasAttribute("data-verification-reloading")`,
);
await wait(500);

check(
  "Workspace shell loads",
  await evaluate(`Boolean(document.querySelector('[data-ui="app-shell"]'))`),
);

const themeLabel = await evaluate(
  `document.querySelector('[aria-label*="горимд шилжих"]')?.getAttribute("aria-label")`,
);
await click('[aria-label*="горимд шилжих"]');
const themeState = await evaluate(`({
  attribute: document.documentElement.dataset.theme,
  dark: document.documentElement.classList.contains("dark"),
  stored: localStorage.getItem("nimbus-theme")
})`);
check(
  "Theme attribute, class, and storage stay synchronized",
  themeState.attribute === "dark" &&
    themeState.dark &&
    themeState.stored === "dark",
  JSON.stringify({ themeLabel, ...themeState }),
);
await click('[aria-label*="горимд шилжих"]');

await click('[aria-label="Workspace солих"]');
check(
  "Workspace switcher opens",
  await evaluate(`Boolean(document.querySelector('[data-slot="popover-content"]'))`),
);
await press("Escape");
check(
  "Workspace switcher closes with Escape",
  !(await evaluate(
    `Boolean(document.querySelector('[data-slot="popover-content"]'))`,
  )),
);

await click('[aria-label^="Төслийн үйлдэл:"]');
check(
  "Project actions menu exposes supported actions",
  (await evaluate(
    `[...document.querySelectorAll('[data-slot="dropdown-menu-item"]')]
      .filter((item) => item.getClientRects().length > 0).length`,
  )) === 3,
);
await press("Escape");

await click('[aria-label="Хэрэглэгчийн цэс"]');
check(
  "Account menu opens",
  await evaluate(
    `Boolean(document.querySelector('[data-slot="dropdown-menu-content"]'))`,
  ),
);
await press("Escape");
check(
  "Account menu keyboard close",
  !(await evaluate(
    `Boolean(document.querySelector('[data-slot="dropdown-menu-content"]'))`,
  )),
);

await click('[aria-label^="Мэдэгдэл"]');
check(
  "Notification popover opens",
  await evaluate(`Boolean(document.querySelector('[data-slot="popover-content"]'))`),
);
await press("Escape");

await click('[aria-label="Төлвөөр шүүх"]');
check(
  "Shadcn status filter opens",
  await evaluate(
    `Boolean(document.querySelector('[data-slot="select-content"][data-open]'))`,
  ),
);
await press("ArrowDown");
await press("Enter");
await wait(200);
const selectKeyboardState = await evaluate(`({
  label: document.querySelector('[aria-label="Төлвөөр шүүх"]')?.textContent?.trim(),
  open: Boolean(document.querySelector('[data-slot="select-content"][data-open]')),
  active: document.activeElement?.textContent?.trim()
})`);
check(
  "Select supports keyboard choice and closes",
  !selectKeyboardState.label?.startsWith("Бүх төлөв") &&
    !selectKeyboardState.open,
  JSON.stringify(selectKeyboardState),
);
await click('[aria-label="Төлвөөр шүүх"]');
await clickText('[data-slot="select-item"]', "Бүх төлөв");

await click('[aria-label="Төсөл үүсгэх"]');
check(
  "Project dialog opens",
  await evaluate(`Boolean(document.querySelector('[data-slot="dialog-content"]'))`),
);
await press("Escape");

await clickText("button", "Багийн гишүүд");
check(
  "Team dialog opens",
  await evaluate(`Boolean(document.querySelector('[data-slot="dialog-content"]'))`),
);
await press("Escape");

for (const [label, selector] of [
  ["Жагсаалт", '[data-ui="task-list"]'],
  ["Самбар", '[data-ui="task-board"]'],
  ["Календарь", '[data-ui="task-calendar"]'],
  ["Timeline", '[data-ui="task-timeline"]'],
  ["Дашбоард", '[data-ui="task-dashboard"]'],
]) {
  await clickText('[data-slot="tabs-trigger"]', label);
  check(
    `${label} view renders`,
    await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`),
  );
}
await clickText('[data-slot="tabs-trigger"]', "Жагсаалт");

await clickText("button", "Шинэ таск");
await waitFor(`Boolean(document.querySelector('[data-slot="dialog-content"]'))`);
const dialogInitialFocus = await evaluate(
  `document.querySelector('[data-slot="dialog-content"]')?.contains(document.activeElement)`,
);
for (let index = 0; index < 14; index += 1) await press("Tab");
const dialogTrappedFocus = await evaluate(
  `document.querySelector('[data-slot="dialog-content"]')?.contains(document.activeElement)`,
);
check(
  "Task dialog initial focus and focus trap",
  dialogInitialFocus && dialogTrappedFocus,
);
await click('[aria-label="Төлөв"]');
check(
  "Status tile picker opens in task dialog",
  await evaluate(
    `Boolean(document.querySelector('[role="listbox"][aria-label="Төлөв"]'))`,
  ),
);
await press("ArrowRight");
await press("Enter");
await wait(200);
const statusPickerState = await evaluate(`({
  label: document.querySelector('[aria-label="Төлөв"]')?.textContent?.trim(),
  open: Boolean(document.querySelector('[role="listbox"][aria-label="Төлөв"]')),
  activeText: document.activeElement?.textContent?.trim(),
  activeRole: document.activeElement?.getAttribute("role"),
  activeLabel: document.activeElement?.getAttribute("aria-label"),
  activeTag: document.activeElement?.tagName
})`);
check(
  "Status tile picker supports keyboard selection",
  statusPickerState.label?.includes("Хийгдэж байна") &&
    !statusPickerState.open,
  JSON.stringify(statusPickerState),
);
await press("Escape");
check(
  "Task dialog closes with Escape",
  !(await evaluate(
    `Boolean(document.querySelector('[data-slot="dialog-content"]'))`,
  )),
);

const unlabeledIconButtons = await evaluate(`(() =>
  [...document.querySelectorAll("button")]
    .filter((button) => {
      const visible = button.getClientRects().length > 0;
      const name = button.getAttribute("aria-label") ||
        button.getAttribute("title") ||
        button.textContent?.trim();
      return visible && !name;
    }).length
)()`);
check(
  "Visible buttons expose an accessible name",
  unlabeledIconButtons === 0,
  `${unlabeledIconButtons} unnamed visible button(s)`,
);

for (const [width, height] of [
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 420,
  });
  await wait(250);
  const geometry = await evaluate(`({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  })`);
  check(
    `${width}×${height} has no document overflow`,
    geometry.scrollWidth <= geometry.innerWidth,
    JSON.stringify(geometry),
  );
}

await click('[aria-label="Цэс нээх"]');
check(
  "Mobile navigation Sheet opens",
  await evaluate(`Boolean(document.querySelector('[data-slot="sheet-content"]'))`),
);
await press("Escape");
await waitFor(
  `!document.querySelector('[data-slot="sheet-content"]')`,
  2_000,
);
check(
  "Mobile navigation Sheet closes with Escape",
  !(await evaluate(
    `Boolean(document.querySelector('[data-slot="sheet-content"]'))`,
  )),
);

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await click('[aria-label="Хэрэглэгчийн цэс"]');
await clickText('[data-slot="dropdown-menu-item"]', "Гарах");
await waitFor(`Boolean(document.querySelector('[data-ui="login-page"]'))`);
check(
  "Logout returns to the login screen",
  await evaluate(`Boolean(document.querySelector('[data-ui="login-page"]'))`),
);

const failed = checks.filter((item) => !item.passed);
process.stdout.write(
  `${JSON.stringify(
    {
      passed: checks.length - failed.length,
      failed: failed.length,
      checks,
    },
    null,
    2,
  )}\n`,
);
socket.close();
if (failed.length) process.exitCode = 1;
