import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  checkRegistryCertificate,
  loadRegistryCertificate,
  loadRegistryCiTlsPolicy,
  registryTrustFindings
} from "../../packages/dreps-registry-trust/src/index.js";

const certPath = process.argv[2] ?? "labs/supply-chain/examples/registry-trust-fixture/registry-cert.self-signed.json";
const policyPath = process.argv[3] ?? "labs/supply-chain/examples/registry-trust-fixture/ci-tls-policy.json";
const outputPath = ".doctrine/out/registry-trust/registry-trust.normalized.json";

const cert = loadRegistryCertificate(resolve(process.cwd(), certPath));
const policy = loadRegistryCiTlsPolicy(resolve(process.cwd(), policyPath));
const check = checkRegistryCertificate(cert, policy);

const output = {
  ...check,
  findings: registryTrustFindings(check)
};

const resolvedOutput = resolve(process.cwd(), outputPath);

mkdirSync(dirname(resolvedOutput), { recursive: true });
writeFileSync(resolvedOutput, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log("Registry certificate trust check completed.");
console.log(outputPath);
console.log("registry: " + check.registry);
console.log("selfSigned: " + check.selfSigned);
console.log("chainTrusted: " + check.chainTrusted);
console.log("ciTlsVerified: " + check.ciTlsVerified);
console.log("daysUntilExpiry: " + check.daysUntilExpiry);
