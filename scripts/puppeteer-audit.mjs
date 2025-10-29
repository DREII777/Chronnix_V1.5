#!/usr/bin/env node

import puppeteer from "puppeteer";

const BASE_URL = process.env.CHRONNIX_BASE_URL ?? "http://127.0.0.1:3100";

const ROUTES = [
  { name: "Dashboard", path: "/" },
  { name: "Clients", path: "/clients" },
  { name: "Workers", path: "/workers" },
  { name: "Timesheets", path: "/timesheets" },
  { name: "Settings", path: "/settings" },
];

const VIEWPORT = { width: 1440, height: 900 };

async function auditRoute(browser, route) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const consoleMessages = [];
  const pageErrors = [];

  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message ?? String(error));
  });

  const targetUrl = `${BASE_URL}${route.path}`;
  let response = null;
  let gotoError = null;

  try {
    response = await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
  } catch (error) {
    gotoError = error instanceof Error ? error.message : String(error);
  }

  const status = response?.status() ?? null;
  const timing = response?.timing();

  let layout = null;

  try {
    layout = await page.evaluate(() => {
      const extractNav = () => {
        const nav = document.querySelector("header nav");
        if (!nav) return [];
        return Array.from(nav.querySelectorAll("a"), (link) => {
          const text = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const classes = link.className ?? "";
          const isActive =
            link.getAttribute("aria-current") === "page" ||
            link.dataset.state === "active" ||
            classes.includes("bg-slate-900") ||
            classes.includes("data-[state=active]");
          return {
            text,
            href: link.getAttribute("href"),
            active: Boolean(isActive),
            classes,
          };
        });
      };

      const header = document.querySelector("header");
      const headerRect = header?.getBoundingClientRect();

      const main = document.querySelector("main");
      const container = main?.querySelector(":scope > div") ?? main;

      const sectionSummaries = container
        ? Array.from(container.children, (child, index) => {
            const rect = child.getBoundingClientRect();
            const style = window.getComputedStyle(child);

            const headings = Array.from(child.querySelectorAll("h1, h2, h3"), (heading) =>
              heading.textContent?.replace(/\s+/g, " ").trim() ?? "",
            ).filter(Boolean);

            const buttons = Array.from(child.querySelectorAll("button"), (button) => ({
              text: button.textContent?.replace(/\s+/g, " ").trim() ?? "",
              disabled: button.disabled,
              classes: button.className ?? "",
            }));

            const links = Array.from(child.querySelectorAll("a"), (link) => ({
              text: link.textContent?.replace(/\s+/g, " ").trim() ?? "",
              href: link.getAttribute("href"),
              classes: link.className ?? "",
            })).filter((link) => link.text);

            const tables = Array.from(child.querySelectorAll("table"), (table) => ({
              columns: Array.from(table.querySelectorAll("thead th"), (th) =>
                th.textContent?.replace(/\s+/g, " ").trim() ?? "",
              ),
              rows: table.querySelectorAll("tbody tr").length,
            }));

            const inputs = Array.from(child.querySelectorAll("input, select, textarea"), (element) => ({
              tag: element.tagName.toLowerCase(),
              type: element instanceof HTMLInputElement ? element.type : undefined,
              placeholder: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
                ? element.placeholder
                : undefined,
              classes: element.className ?? "",
            }));

            const badges = Array.from(child.querySelectorAll("span, div"), (el) => ({
              text: el.textContent?.replace(/\s+/g, " ").trim() ?? "",
              classes: el.className ?? "",
            })).filter((badge) =>
              badge.classes.includes("badge") ||
              badge.classes.includes("Badge") ||
              badge.classes.includes("uppercase") ||
              badge.classes.includes("tracking")
            ).slice(0, 6);

            const cards = Array.from(child.querySelectorAll("div"), (div) => div.className ?? "").filter((className) =>
              className.includes("rounded-2xl") || className.includes("rounded-xl"),
            ).length;

            const textSample = child.textContent?.replace(/\s+/g, " ").trim() ?? "";

            return {
              index,
              tag: child.tagName.toLowerCase(),
              classes: child.className ?? "",
              headings,
              buttons,
              links,
              tables,
              inputs,
              badges,
              cards,
              grid: style.display === "grid",
              gridTemplateColumns: style.gridTemplateColumns,
              gap: style.gap,
              flexDirection: style.flexDirection,
              overflowX: style.overflowX,
              overflowY: style.overflowY,
              scrollHeight: child.scrollHeight,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              textSample: textSample ? textSample.slice(0, 220) : "",
            };
          })
        : [];

      const floatingButtons = Array.from(document.querySelectorAll("button, a"), (element) => {
        const style = window.getComputedStyle(element);
        const position = style.position;
        if (position === "fixed" || position === "sticky") {
          return {
            text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
            tag: element.tagName.toLowerCase(),
            classes: element.className ?? "",
            position,
          };
        }
        return null;
      }).filter(Boolean);

      const pageTitle =
        document.querySelector("main h1")?.textContent?.replace(/\s+/g, " ").trim() ??
        document.title ??
        null;

      return {
        navItems: extractNav(),
        header: headerRect
          ? {
              height: headerRect.height,
              width: headerRect.width,
              classes: header?.className ?? "",
            }
          : null,
        pageTitle,
        sectionSummaries,
        floatingButtons,
      };
    });
  } catch (error) {
    layout = { error: error instanceof Error ? error.message : String(error) };
  }

  await page.close();

  return {
    name: route.name,
    path: route.path,
    url: targetUrl,
    status,
    timing,
    gotoError,
    consoleMessages,
    pageErrors,
    layout,
  };
}

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: VIEWPORT,
  });

  const results = [];

  for (const route of ROUTES) {
    const result = await auditRoute(browser, route);
    results.push(result);
  }

  await browser.close();

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    auditedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    routes: results,
  }, null, 2));
}

run().catch((error) => {
  console.error("Puppeteer audit failed:", error);
  process.exitCode = 1;
});
