import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { chromium, expect, type Browser, type Page } from "@playwright/test";

const root = process.cwd();
const distRoot = resolve(root, "apps/web/dist");
const port = 5174;
const url = `http://127.0.0.1:${port}`;

const screenshotPath = resolve(root, "docs/assets/react-flow-mvp.png");
const auditJsonPath = resolve(root, ".doctrine/out/demo/ui-audit.json");
const auditMarkdownPath = resolve(root, "docs/demo/PHASE_5B_UI_AUDIT.md");

function ensureParent(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function contentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function safeResolveFromDist(requestUrl: string): string {
  const parsed = new URL(requestUrl, url);
  const requestedPath = decodeURIComponent(parsed.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const candidate = normalize(resolve(distRoot, relativePath));
  const distPrefix = distRoot.endsWith(sep) ? distRoot : distRoot + sep;

  if (candidate !== distRoot && !candidate.startsWith(distPrefix)) {
    return resolve(distRoot, "index.html");
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  return resolve(distRoot, "index.html");
}

function startStaticServer(): Promise<{ close: () => Promise<void> }> {
  if (!existsSync(resolve(distRoot, "index.html"))) {
    throw new Error("apps/web/dist/index.html is missing. Run pnpm --filter @supply-chain-mode-lab/web build first.");
  }

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    try {
      const requestUrl = request.url ?? "/";
      const filePath = safeResolveFromDist(requestUrl);
      const body = readFileSync(filePath);

      response.statusCode = 200;
      response.setHeader("Content-Type", contentType(filePath));
      response.end(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      response.statusCode = 500;
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end(message);
    }
  });

  return new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);

    server.listen(port, "127.0.0.1", () => {
      server.off("error", rejectPromise);

      resolvePromise({
        close: () =>
          new Promise<void>((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }

              closeResolve();
            });
          })
      });
    });
  });
}

async function assertDemo(page: Page): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });

  await expect(page.getByText("Doctrine Supply Chain Mode Lab").first()).toBeVisible();
  await expect(page.getByText("Supply Chain Graph")).toBeVisible();
  await expect(page.getByText("Graph integrity passed")).toBeVisible();

  await page.getByText("auth-api pod").first().click();

  await expect(page.getByText("pod-auth-api").first()).toBeVisible();
  await expect(page.getByText("evidence-k8s-auth-api").first()).toBeVisible();
  await expect(page.getByText("finding-critical-pod-no-network-policy").first()).toBeVisible();
  await expect(page.getByText("DORA · ict-risk-management").first()).toBeVisible();
  await expect(page.getByText("remediate-network-policy").first()).toBeVisible();
  await expect(page.getByText("Rollback").first()).toBeVisible();

  ensureParent(screenshotPath);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
}

async function main(): Promise<void> {
  mkdirSync(resolve(root, "docs/assets"), { recursive: true });
  mkdirSync(resolve(root, "docs/demo"), { recursive: true });
  mkdirSync(resolve(root, ".doctrine/out/demo"), { recursive: true });

  const staticServer = await startStaticServer();
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch();

    const page = await browser.newPage({
      viewport: {
        width: 1600,
        height: 1000
      }
    });

    await assertDemo(page);

    const audit = {
      schemaVersion: "doctrine.ui-audit.v1",
      phase: "5-bis",
      app: "@supply-chain-mode-lab/web",
      url,
      capturedAt: new Date().toISOString(),
      screenshot: "docs/assets/react-flow-mvp.png",
      assertions: [
        "page title visible",
        "React Flow canvas visible",
        "graph integrity passed",
        "pod-auth-api selectable",
        "evidenceRefs visible",
        "finding visible",
        "DORA compliance impact visible",
        "remediation visible",
        "rollback visible"
      ],
      status: "passed"
    };

    ensureParent(auditJsonPath);
    writeFileSync(auditJsonPath, JSON.stringify(audit, null, 2) + "\n", "utf8");

    ensureParent(auditMarkdownPath);
    writeFileSync(
      auditMarkdownPath,
      `# Phase 5 bis - UI audit

## Status

PASSED

## Scope

This audit validates the React Flow MVP for the ecommerce DREPS evidence-pack.

## Assertions

- Page title visible.
- React Flow canvas visible.
- Graph integrity status visible.
- pod-auth-api node selectable.
- evidenceRefs visible.
- finding-critical-pod-no-network-policy visible.
- DORA compliance impact visible.
- remediation visible.
- rollback visible.

## Screenshot

![React Flow MVP](../assets/react-flow-mvp.png)

## Generated files

- docs/assets/react-flow-mvp.png
- .doctrine/out/demo/ui-audit.json
`,
      "utf8"
    );

    console.log("UI audit passed.");
    console.log("Screenshot: docs/assets/react-flow-mvp.png");
    console.log("Audit JSON: .doctrine/out/demo/ui-audit.json");
    console.log("Audit Markdown: docs/demo/PHASE_5B_UI_AUDIT.md");
  } finally {
    if (browser) {
      await browser.close();
    }

    await staticServer.close();
  }
}

await main();
