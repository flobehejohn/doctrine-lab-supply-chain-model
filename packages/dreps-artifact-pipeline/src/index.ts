import { createCipheriv, createHash, randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { maskSecrets } from "../../dreps-safe-logger/src/index.js";

export const ArtifactActionTypeSchema = z.enum([
  "copy",
  "hash",
  "zip",
  "encrypt",
  "upload",
  "delete",
  "cleanup"
]);

export const ArtifactActionSchema = z.object({
  type: ArtifactActionTypeSchema,
  input: z.string().optional(),
  output: z.string().optional(),
  target: z.string().optional(),
  key: z.string().optional(),
  keyEnv: z.string().optional(),
  allowDelete: z.boolean().default(false),
  allowMissing: z.boolean().default(false)
});

export const ArtifactPipelinePlanSchema = z.object({
  pipelineId: z.string().min(1),
  actions: z.array(ArtifactActionSchema).min(1)
});

export type ArtifactAction = z.infer<typeof ArtifactActionSchema>;
export type ArtifactPipelinePlan = z.infer<typeof ArtifactPipelinePlanSchema>;

export interface ArtifactPipelineEvent {
  action: string;
  input?: string;
  output?: string;
  target?: string;
  status: "ok" | "skipped";
  message: string;
}

export interface ArtifactPipelineResult {
  pipelineId: string;
  events: ArtifactPipelineEvent[];
}

export interface HashManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
}

export interface HashManifest {
  algorithm: "sha256";
  input: string;
  generatedAt: string;
  files: HashManifestEntry[];
  aggregateSha256: string;
}

const CRC32_TABLE = buildCrc32Table();

function buildCrc32Table(): number[] {
  const table: number[] = [];

  for (let index = 0; index < 256; index += 1) {
    let current = index;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((current & 1) === 1) {
        current = 0xedb88320 ^ (current >>> 1);
      } else {
        current >>>= 1;
      }
    }

    table[index] = current >>> 0;
  }

  return table;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTime(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);

  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate()
  };
}

function ensureParent(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function ensureInsideRoot(root: string, path: string): string {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(root, path);
  const rootPrefix = resolvedRoot.endsWith(sep) ? resolvedRoot : resolvedRoot + sep;

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(rootPrefix)) {
    throw new Error("Path escapes repository root: " + path);
  }

  return resolvedPath;
}

function listFiles(inputPath: string): string[] {
  if (!existsSync(inputPath)) {
    throw new Error("Input path does not exist: " + inputPath);
  }

  const stats = statSync(inputPath);

  if (stats.isFile()) {
    return [inputPath];
  }

  if (!stats.isDirectory()) {
    throw new Error("Unsupported input path type: " + inputPath);
  }

  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const entryStats = statSync(fullPath);

      if (entryStats.isDirectory()) {
        walk(fullPath);
      } else if (entryStats.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(inputPath);
  return files.sort();
}

function relativeZipPath(base: string, file: string): string {
  const stats = statSync(base);
  const raw = stats.isFile() ? basename(file) : relative(base, file);
  return raw.split(sep).join("/");
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sha256File(path: string): string {
  return sha256Buffer(readFileSync(path));
}

export function hashPath(input: string): HashManifest {
  const fullInput = resolve(input);
  const files = listFiles(fullInput);
  const inputStats = statSync(fullInput);
  const base = inputStats.isFile() ? dirname(fullInput) : fullInput;

  const entries: HashManifestEntry[] = files.map((file) => {
    const buffer = readFileSync(file);

    return {
      path: relative(base, file).split(sep).join("/"),
      bytes: buffer.length,
      sha256: sha256Buffer(buffer)
    };
  });

  const aggregateSha256 = createHash("sha256")
    .update(
      entries
        .map((entry) => entry.path + ":" + entry.bytes + ":" + entry.sha256)
        .join("\n")
    )
    .digest("hex");

  return {
    algorithm: "sha256",
    input,
    generatedAt: new Date().toISOString(),
    files: entries,
    aggregateSha256
  };
}

export function copyPath(input: string, output: string): void {
  const inputStats = statSync(input);

  if (inputStats.isFile()) {
    ensureParent(output);
    copyFileSync(input, output);
    return;
  }

  if (!inputStats.isDirectory()) {
    throw new Error("Unsupported copy input: " + input);
  }

  mkdirSync(output, { recursive: true });

  for (const file of listFiles(input)) {
    const relativePath = relative(input, file);
    const target = join(output, relativePath);
    ensureParent(target);
    copyFileSync(file, target);
  }
}

export function createZipArchive(input: string, output: string): void {
  const fullInput = resolve(input);
  const files = listFiles(fullInput);
  const inputStats = statSync(fullInput);
  const base = inputStats.isFile() ? dirname(fullInput) : fullInput;

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const content = readFileSync(file);
    const name = Buffer.from(relativeZipPath(base, file), "utf8");
    const stats = statSync(file);
    const dos = toDosTime(stats.mtime);
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dos.time, 10);
    localHeader.writeUInt16LE(dos.date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dos.time, 12);
    centralHeader.writeUInt16LE(dos.date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  ensureParent(output);
  writeFileSync(output, Buffer.concat([...localParts, centralDirectory, end]));
}

export function encryptFile(input: string, output: string, keyMaterial: string): void {
  if (!keyMaterial || keyMaterial.length < 12) {
    throw new Error("Encryption key material is missing or too short.");
  }

  const key = createHash("sha256").update(keyMaterial).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = readFileSync(input);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope = {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };

  ensureParent(output);
  writeFileSync(output, JSON.stringify(envelope, null, 2) + "\n", "utf8");
}

export function runArtifactPipeline(
  planInput: unknown,
  options: { root?: string } = {}
): ArtifactPipelineResult {
  const plan = ArtifactPipelinePlanSchema.parse(planInput);
  const root = resolve(options.root ?? process.cwd());
  const events: ArtifactPipelineEvent[] = [];

  for (const action of plan.actions) {
    const type = action.type;

    if (type === "copy") {
      if (!action.input || !action.output) {
        throw new Error("copy action requires input and output.");
      }

      const input = ensureInsideRoot(root, action.input);
      const output = ensureInsideRoot(root, action.output);
      copyPath(input, output);

      events.push({
        action: type,
        input: action.input,
        output: action.output,
        status: "ok",
        message: "Copied artifact."
      });

      continue;
    }

    if (type === "hash") {
      if (!action.input) {
        throw new Error("hash action requires input.");
      }

      const input = ensureInsideRoot(root, action.input);
      const output = ensureInsideRoot(
        root,
        action.output ?? action.input + ".sha256.json"
      );
      const manifest = hashPath(input);

      ensureParent(output);
      writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");

      events.push({
        action: type,
        input: action.input,
        output: action.output ?? action.input + ".sha256.json",
        status: "ok",
        message: "SHA-256 manifest generated."
      });

      continue;
    }

    if (type === "zip") {
      if (!action.input || !action.output) {
        throw new Error("zip action requires input and output.");
      }

      const input = ensureInsideRoot(root, action.input);
      const output = ensureInsideRoot(root, action.output);
      createZipArchive(input, output);

      events.push({
        action: type,
        input: action.input,
        output: action.output,
        status: "ok",
        message: "ZIP archive generated."
      });

      continue;
    }

    if (type === "encrypt") {
      if (!action.input || !action.output) {
        throw new Error("encrypt action requires input and output.");
      }

      const keyMaterial = action.key ?? (action.keyEnv ? process.env[action.keyEnv] : undefined);

      if (!keyMaterial) {
        throw new Error("encrypt action requires key or keyEnv.");
      }

      const input = ensureInsideRoot(root, action.input);
      const output = ensureInsideRoot(root, action.output);
      encryptFile(input, output, keyMaterial);

      events.push({
        action: type,
        input: action.input,
        output: action.output,
        status: "ok",
        message: "Encrypted artifact with masked key " + maskSecrets("key=" + keyMaterial)
      });

      continue;
    }

    if (type === "upload") {
      if (!action.input || !action.target) {
        throw new Error("upload action requires input and target.");
      }

      const input = ensureInsideRoot(root, action.input);
      const targetDir = ensureInsideRoot(root, action.target);
      const output = join(targetDir, basename(input));

      mkdirSync(targetDir, { recursive: true });
      copyPath(input, output);

      events.push({
        action: type,
        input: action.input,
        target: action.target,
        output: relative(root, output).split(sep).join("/"),
        status: "ok",
        message: "Published artifact locally."
      });

      continue;
    }

    if (type === "delete" || type === "cleanup") {
      const target = action.input ?? action.target;

      if (!target) {
        throw new Error(type + " action requires input or target.");
      }

      if (!action.allowDelete) {
        throw new Error(type + " action requires allowDelete=true.");
      }

      const resolvedTarget = ensureInsideRoot(root, target);

      if (!existsSync(resolvedTarget)) {
        if (action.allowMissing) {
          events.push({
            action: type,
            input: target,
            status: "skipped",
            message: "Target missing and allowMissing=true."
          });

          continue;
        }

        throw new Error(type + " target does not exist: " + target);
      }

      rmSync(resolvedTarget, { recursive: true, force: true });

      events.push({
        action: type,
        input: target,
        status: "ok",
        message: "Deleted target."
      });

      continue;
    }

    throw new Error("Unsupported action type: " + type);
  }

  return {
    pipelineId: plan.pipelineId,
    events
  };
}
