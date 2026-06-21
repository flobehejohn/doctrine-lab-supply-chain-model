export type TemplateContext = Record<string, unknown>;

export interface TemplateArtifact {
  templatePath: string;
  outputPath: string;
  content: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getTemplateValue(
  context: TemplateContext,
  pathExpression: string
): unknown {
  const cleanPath = pathExpression.trim();

  if (cleanPath.length === 0) {
    return "";
  }

  const parts = cleanPath.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (part === "this" && current === context) {
      current = context.this;
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

export function stringifyTemplateValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyTemplateValue(item)).join(", ");
  }

  if (isRecord(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}

function renderEachBlocks(template: string, context: TemplateContext): string {
  const eachRegex = /\{\{#each\s+([A-Za-z0-9_.-]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(
    eachRegex,
    (_match: string, listPath: string, body: string) => {
      const value = getTemplateValue(context, listPath);

      if (!Array.isArray(value)) {
        return "";
      }

      return value
        .map((item, index) =>
          renderTemplate(body, {
            ...context,
            this: item,
            item,
            index
          })
        )
        .join("");
    }
  );
}

function renderVariables(template: string, context: TemplateContext): string {
  const etaRegex = /<%=\s*([A-Za-z0-9_.-]+)\s*%>/g;
  const mustacheRegex = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

  const render = (_match: string, pathExpression: string): string =>
    stringifyTemplateValue(getTemplateValue(context, pathExpression));

  return template.replace(etaRegex, render).replace(mustacheRegex, render);
}

export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  const withLoops = renderEachBlocks(template, context);
  return renderVariables(withLoops, context);
}

export function assertRenderedArtifact(
  artifact: TemplateArtifact,
  requiredFragments: string[]
): void {
  for (const fragment of requiredFragments) {
    if (!artifact.content.includes(fragment)) {
      throw new Error(
        "Rendered artifact " +
          artifact.outputPath +
          " is missing required fragment: " +
          fragment
      );
    }
  }
}
