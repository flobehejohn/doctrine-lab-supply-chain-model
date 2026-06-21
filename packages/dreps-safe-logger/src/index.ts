export const REDACTION_MARK = "***REDACTED***";

export interface RedactionRule {
  id: string;
  description: string;
  pattern: RegExp;
  replace: (value: string) => string;
}

export interface SafeLogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  redactedMessage: string;
  redacted: boolean;
  timestamp: string;
}

export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  {
    id: "authorization-bearer",
    description: "Authorization bearer token",
    pattern: /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
    replace: () => "Bearer " + REDACTION_MARK
  },
  {
    id: "github-token-classic",
    description: "GitHub classic token",
    pattern: /ghp_[A-Za-z0-9_]{20,}/g,
    replace: () => REDACTION_MARK
  },
  {
    id: "github-token-fine-grained",
    description: "GitHub fine-grained token",
    pattern: /github_pat_[A-Za-z0-9_]+/g,
    replace: () => REDACTION_MARK
  },
  {
    id: "gitlab-token",
    description: "GitLab personal access token",
    pattern: /glpat-[A-Za-z0-9_-]+/g,
    replace: () => REDACTION_MARK
  },
  {
    id: "openai-like-token",
    description: "OpenAI-like API token",
    pattern: /sk-[A-Za-z0-9_-]{16,}/g,
    replace: () => REDACTION_MARK
  },
  {
    id: "jwt",
    description: "JWT-like token",
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replace: () => REDACTION_MARK
  },
  {
    id: "key-value-secret",
    description: "Common key-value secret assignment",
    pattern: /\b(token|password|passwd|secret|api_key|api-key|apikey|client_secret|access_token)\b\s*[:=]\s*["']?[^"'\s&]+/gi,
    replace: (value: string) => {
      const separator = value.includes(":") ? ":" : "=";
      const key = value.split(separator)[0]?.trim() ?? "secret";
      return key + separator + REDACTION_MARK;
    }
  }
];

export function maskSecrets(
  input: string,
  rules: RedactionRule[] = DEFAULT_REDACTION_RULES
): string {
  let output = input;

  for (const rule of rules) {
    output = output.replace(rule.pattern, rule.replace);
  }

  return output;
}

export function hasRedaction(input: string): boolean {
  return maskSecrets(input) !== input;
}

export function createSafeLogEntry(
  level: SafeLogEntry["level"],
  message: string
): SafeLogEntry {
  const redactedMessage = maskSecrets(message);

  return {
    level,
    message,
    redactedMessage,
    redacted: redactedMessage !== message,
    timestamp: new Date().toISOString()
  };
}

export class SafeLogger {
  private readonly entries: SafeLogEntry[] = [];

  log(level: SafeLogEntry["level"], message: string): SafeLogEntry {
    const entry = createSafeLogEntry(level, message);
    this.entries.push(entry);
    return entry;
  }

  debug(message: string): SafeLogEntry {
    return this.log("debug", message);
  }

  info(message: string): SafeLogEntry {
    return this.log("info", message);
  }

  warn(message: string): SafeLogEntry {
    return this.log("warn", message);
  }

  error(message: string): SafeLogEntry {
    return this.log("error", message);
  }

  getEntries(): SafeLogEntry[] {
    return [...this.entries];
  }

  flushText(): string {
    return this.entries
      .map((entry) => "[" + entry.level.toUpperCase() + "] " + entry.redactedMessage)
      .join("\n");
  }
}

export function assertMasked(input: string, forbiddenFragments: string[]): void {
  const masked = maskSecrets(input);

  for (const fragment of forbiddenFragments) {
    if (masked.includes(fragment)) {
      throw new Error("Secret fragment leaked after masking: " + fragment);
    }
  }
}
