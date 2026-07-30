// Bubblewrap's CLI is interactive end to end, which makes it unusable from an
// automated build. This drives the same @bubblewrap/core pipeline directly:
// generate the Android project from twa-manifest.json, assemble release,
// zipalign, then sign with the Wormifi release key.
import { createRequire } from "node:module";
import path from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const {
  Config,
  JdkHelper,
  AndroidSdkTools,
  GradleWrapper,
  JarSigner,
  TwaGenerator,
  TwaManifest,
  ConsoleLog,
} = require("@bubblewrap/core");

const PASSWORD = "wormifi-release-2026";
const projectDir = process.cwd();
const log = new ConsoleLog("wormifi-apk");

const config = new Config(
  "C:\\Program Files\\Microsoft\\jdk-17.0.19.10-hotspot",
  path.join(process.env.LOCALAPPDATA, "Android", "Sdk"),
);

const twaManifest = await TwaManifest.fromFile(path.join(projectDir, "twa-manifest.json"));

log.info("generating android project");
await new TwaGenerator().createTwaProject(projectDir, twaManifest, log);

// Bubblewrap invokes the wrapper as a bare `gradlew.bat`, and Windows does not
// resolve the current directory from PATH. Put the project dir on PATH for the
// child processes so the wrapper is found.
process.env.PATH = `${projectDir}${path.delimiter}${process.env.PATH}`;

const jdkHelper = new JdkHelper(process, config);
const androidSdkTools = await AndroidSdkTools.create(process, config, jdkHelper, log);
const gradle = new GradleWrapper(process, androidSdkTools, projectDir);

log.info("assembling release");
await gradle.assembleRelease();

log.info("zipalign");
await androidSdkTools.zipalign(
  "./app/build/outputs/apk/release/app-release-unsigned.apk",
  "./app-release-unsigned-aligned.apk",
);

// Bubblewrap's JarSigner produces a v1 (JAR) signature ONLY. Android 11 and
// newer refuse to install such a package -- INSTALL_PARSE_FAILED_NO_CERTIFICATES,
// "No signature found in package of version 2 or newer" -- and `keytool
// -printcert` reads the v1 signature happily, so the broken package looks
// correctly signed right up until a device rejects it. Sign with apksigner and
// enable v1+v2+v3 instead.
log.info("signing with apksigner (v1+v2+v3)");
const apksigner = `"${path.join(config.androidSdkPath, "build-tools", "35.0.0", "apksigner.bat")}"`;
execFileSync(apksigner, [
  "sign",
  "--ks", twaManifest.signingKey.path,
  "--ks-key-alias", twaManifest.signingKey.alias,
  "--ks-pass", `pass:${PASSWORD}`,
  "--key-pass", `pass:${PASSWORD}`,
  "--v1-signing-enabled", "true",
  "--v2-signing-enabled", "true",
  "--v3-signing-enabled", "true",
  "--out", "app-release-signed.apk",
  "app-release-unsigned-aligned.apk",
], { stdio: "inherit", shell: true });

const verification = execFileSync(apksigner, ["verify", "-v", "app-release-signed.apk"], { shell: true }).toString();
for (const scheme of ["v1 scheme", "v2 scheme", "v3 scheme"]) {
  if (!new RegExp(`Verified using ${scheme}[^:]*: true`).test(verification)) {
    throw new Error(`apksigner did not apply ${scheme} - the package will not install on Android 11+`);
  }
}
log.info("verified v1+v2+v3");
log.info("DONE -> app-release-signed.apk");
