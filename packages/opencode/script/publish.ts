#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

// Set OPENPURPLE_DRY_RUN=1 to assemble and pack without publishing.
const DRY_RUN = !!process.env.OPENPURPLE_DRY_RUN

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  // GitHub artifact downloads can drop the executable bit.
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  await $`bun pm pack`.cwd(dir)
  if (DRY_RUN) {
    console.log(`[dry-run] would publish ${name}@${version} with tag ${Script.channel}`)
    return
  }
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(dir)
}

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const platformPkg = await Bun.file(`./dist/${filepath}`).json()
  // Skip the assembled main package on re-runs; only platform dirs count.
  if (platformPkg.name === pkg.name) continue
  binaries[platformPkg.name] = platformPkg.version
}
console.log("binaries", binaries)
const version = Object.values(binaries)[0]
if (!version) throw new Error("No platform binaries found in ./dist — run the build first")

await $`mkdir -p ./dist/${pkg.name}`
await $`mkdir -p ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
// The repo has no LICENSE file; copy it only when one exists.
const license = Bun.file("../LICENSE")
if (await license.exists()) await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await license.text())
else console.warn("warning: no LICENSE file at repo root, skipping")
await Bun.file(`./dist/${pkg.name}/bin/${pkg.name}.exe`).write(
  [
    `echo "Error: ${pkg.name}'s postinstall script was not run." >&2`,
    'echo "" >&2',
    'echo "This occurs when using --ignore-scripts during installation, or when using a" >&2',
    'echo "package manager like pnpm that does not run postinstall scripts by default." >&2',
    'echo "" >&2',
    'echo "To fix this, run the postinstall script manually:" >&2',
    `echo "  cd node_modules/${pkg.name} && node postinstall.mjs" >&2`,
    'echo "" >&2',
    `echo "Or reinstall ${pkg.name} without the --ignore-scripts flag." >&2`,
    "exit 1",
    "",
  ].join("\n"),
)

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: {
        [pkg.name]: `./bin/${pkg.name}.exe`,
      },
      scripts: {
        postinstall: "node ./postinstall.mjs",
      },
      version: version,
      license: pkg.license,
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

const tasks = Object.entries(binaries).map(async ([name]) => {
  await publish(`./dist/${name}`, name, binaries[name])
})
await Promise.all(tasks)
await publish(`./dist/${pkg.name}`, pkg.name, version)
