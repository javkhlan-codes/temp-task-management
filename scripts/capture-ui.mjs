import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const [, , outputPath, theme = "light", action = "workspace", width = "1440", height = "1000"] =
  process.argv;

if (!outputPath) {
  throw new Error(
    "Usage: node scripts/capture-ui.mjs <output.png> <light|dark> <action> [width] [height]",
  );
}

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
  return send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
}

async function waitForSelector(selector, timeout = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const result = await evaluate(
      `Boolean(document.querySelector(${JSON.stringify(selector)})) &&
        !document.documentElement.hasAttribute("data-capture-reloading")`,
    );
    if (result.result?.value) return;
    await wait(300);
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.bringToFront");
await send("Emulation.setDeviceMetricsOverride", {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 1,
  mobile: Number(width) <= 420,
});

if (action === "login") {
  await evaluate(
    `document.documentElement.setAttribute("data-capture-reloading", "");
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      localStorage.setItem("nimbus-theme", ${JSON.stringify(theme)});
      location.reload();
    })`,
  );
} else {
  await evaluate(
    `document.documentElement.setAttribute("data-capture-reloading", "");
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "temuulen@acme.mn",
        password: "nimbus",
        remember: "true"
      })
    }).then(() => {
      localStorage.setItem("nimbus-theme", ${JSON.stringify(theme)});
      location.reload();
    })`,
  );
}

await wait(1_200);
await waitForSelector(
  action === "login" ? '[data-ui="login-page"]' : '[data-ui="app-shell"]',
);
await wait(500);

const clickByText = async (selector, text) => {
  await evaluate(`(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find((element) => element.textContent?.trim().includes(${JSON.stringify(text)}));
    target?.click();
    return Boolean(target);
  })()`);
  await wait(700);
};

if (action === "task-dialog") {
  await clickByText("button", "Шинэ таск");
} else if (action === "project-dialog") {
  await evaluate(`document.querySelector('[aria-label="Төсөл үүсгэх"]')?.click()`);
  await wait(700);
} else if (action === "team-dialog") {
  await clickByText("button", "Багийн гишүүд");
} else if (action === "workspace-switcher") {
  await evaluate(`document.querySelector('[aria-label="Workspace солих"]')?.click()`);
  await wait(700);
} else if (action === "notification") {
  await evaluate(
    `document.querySelector('.notification-button,[aria-label*="Мэдэгдэл"]')?.click()`,
  );
  await wait(900);
} else if (action === "status-filter") {
  await evaluate(
    `document.querySelector('[aria-label="Төлвөөр шүүх"]')?.click()`,
  );
  await wait(700);
} else if (action === "row-status") {
  await evaluate(
    `document.querySelector('[aria-label^="Status for"]')?.click()`,
  );
  await wait(700);
} else if (action === "task-dialog-status") {
  await clickByText("button", "Шинэ таск");
  await evaluate(
    `document.querySelector('[aria-label="Төлөв"]')?.click()`,
  );
  await wait(700);
} else if (action === "project-menu") {
  if (Number(width) <= 420) {
    await evaluate(`document.querySelector('[aria-label="Цэс нээх"]')?.click()`);
    await wait(500);
  }
  await evaluate(
    `[...document.querySelectorAll('[aria-label^="Төслийн үйлдэл:"]')]
      .find((element) => element.getClientRects().length > 0)?.click()`,
  );
  await wait(700);
} else if (
  ["list", "board", "calendar", "timeline", "dashboard"].includes(action)
) {
  const labels = {
    list: "Жагсаалт",
    board: "Самбар",
    calendar: "Календарь",
    timeline: "Timeline",
    dashboard: "Дашбоард",
  };
  await clickByText('[data-slot="tabs-trigger"]', labels[action]);
}

const state = await evaluate(`(() => ({
  title: document.title,
  theme: document.documentElement.dataset.theme,
  darkClass: document.documentElement.classList.contains("dark"),
  viewport: [window.innerWidth, window.innerHeight],
  bodyOverflow: getComputedStyle(document.body).overflow,
  scrollWidth: document.documentElement.scrollWidth,
  activeElementId: document.activeElement?.id || null,
  activeElementClass: document.activeElement?.className || null,
  activeFocusMatches: document.activeElement?.matches(":focus") || false,
  activeBrandColor: document.activeElement
    ? getComputedStyle(document.activeElement).getPropertyValue("--brand")
    : null,
  activeBorderColor: document.activeElement
    ? getComputedStyle(document.activeElement).borderColor
    : null,
  action: ${JSON.stringify(action)}
}))()`);

const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
process.stdout.write(`${JSON.stringify(state.result?.value ?? {}, null, 2)}\n`);
socket.close();
