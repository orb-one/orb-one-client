import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(projectRoot, 'public', 'THIRD_PARTY_LICENSES.txt')

const allowedLicenses = new Set([
  'BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MIT',
  'OFL-1.1',
  'Unlicense',
])

// 이 패키지들은 devDependency지만 생성된 코드가 정적 배포물에 포함됩니다.
const distributedToolPackages = ['msw', 'tailwindcss', 'vite']

function createMitLicense(copyright) {
  return `MIT License

${copyright}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
}

// 두 패키지의 npm 배포본에는 LICENSE 파일이 없어 공식 저장소의 원문을 고정합니다.
const licenseOverrides = new Map([
  [
    '@astryxdesign/core',
    createMitLicense('Copyright (c) 2026 Meta Platforms, Inc.'),
  ],
  [
    '@stylexjs/stylex',
    createMitLicense('Copyright (c) Meta Platforms, Inc. and affiliates.'),
  ],
])

function readPackageMetadata(packagePath) {
  return JSON.parse(readFileSync(join(packagePath, 'package.json'), 'utf8'))
}

function getLicense(metadata) {
  if (typeof metadata.license === 'string') return metadata.license
  if (typeof metadata.license?.type === 'string') return metadata.license.type

  throw new Error(
    `${metadata.name}@${metadata.version}: license 정보가 없습니다.`,
  )
}

function getRepository(metadata) {
  if (typeof metadata.repository === 'string') return metadata.repository
  if (typeof metadata.repository?.url === 'string')
    return metadata.repository.url
  if (typeof metadata.homepage === 'string') return metadata.homepage
  return 'Not provided'
}

function normalizeLicenseText(text) {
  return text
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

function getLicenseTexts(packageInfo) {
  const filenames = readdirSync(packageInfo.path)
    .filter((filename) => /^(license|copying|notice)(\.|$)/i.test(filename))
    .filter((filename) => statSync(join(packageInfo.path, filename)).isFile())
    .sort((left, right) => left.localeCompare(right))

  if (filenames.length > 0) {
    return filenames.map((filename) => ({
      filename,
      text: normalizeLicenseText(
        readFileSync(join(packageInfo.path, filename), 'utf8'),
      ),
    }))
  }

  const override = licenseOverrides.get(packageInfo.name)
  if (override) {
    return [
      { filename: 'LICENSE (upstream)', text: normalizeLicenseText(override) },
    ]
  }

  throw new Error(
    `${packageInfo.name}@${packageInfo.version}: 배포할 라이선스 원문이 없습니다.`,
  )
}

function collectProductionPackages() {
  const output = execFileSync(
    'pnpm',
    ['list', '--prod', '--depth', 'Infinity', '--json'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  const tree = JSON.parse(output)[0]
  const packages = new Map()
  const visitedPaths = new Set()

  function visit(node) {
    if (!node || typeof node !== 'object') return

    if (node.path && node.version && !visitedPaths.has(node.path)) {
      visitedPaths.add(node.path)
      const metadata = readPackageMetadata(node.path)
      packages.set(`${metadata.name}@${metadata.version}`, {
        license: getLicense(metadata),
        metadata,
        name: metadata.name,
        path: node.path,
        version: metadata.version,
      })
    }

    for (const field of ['dependencies', 'optionalDependencies']) {
      for (const dependency of Object.values(node[field] ?? {}))
        visit(dependency)
    }
  }

  for (const dependency of Object.values(tree.dependencies ?? {}))
    visit(dependency)

  for (const packageName of distributedToolPackages) {
    const packagePath = join(projectRoot, 'node_modules', packageName)
    const metadata = readPackageMetadata(packagePath)
    packages.set(`${metadata.name}@${metadata.version}`, {
      license: getLicense(metadata),
      metadata,
      name: metadata.name,
      path: packagePath,
      version: metadata.version,
    })
  }

  return [...packages.values()].sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(
      `${right.name}@${right.version}`,
    ),
  )
}

function renderNotice(packages) {
  const disallowed = packages.filter(
    (packageInfo) => !allowedLicenses.has(packageInfo.license),
  )
  if (disallowed.length > 0) {
    const details = disallowed
      .map(
        (packageInfo) =>
          `${packageInfo.name}@${packageInfo.version} (${packageInfo.license})`,
      )
      .join(', ')
    throw new Error(`허용되지 않은 production 라이선스가 있습니다: ${details}`)
  }

  const sections = packages.map((packageInfo) => {
    const licenseTexts = getLicenseTexts(packageInfo)
      .map(({ filename, text }) => `--- ${filename} ---\n\n${text}`)
      .join('\n\n')

    return [
      '='.repeat(80),
      `Package: ${packageInfo.name}`,
      `Version: ${packageInfo.version}`,
      `License: ${packageInfo.license}`,
      `Source: ${getRepository(packageInfo.metadata)}`,
      '',
      licenseTexts,
    ].join('\n')
  })

  return `${[
    'ORB ONE THIRD-PARTY SOFTWARE NOTICES',
    '',
    'This file contains the license notices for production dependencies and',
    'generated third-party files distributed with the Orb One client.',
    'These components remain under their respective licenses and are not',
    'relicensed under the Orb One project license.',
    '',
    `Packages covered: ${packages.length}`,
    '',
    ...sections,
  ].join('\n')}\n`
}

const notice = renderNotice(collectProductionPackages())

if (process.argv.includes('--check')) {
  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== notice) {
    console.error(
      'public/THIRD_PARTY_LICENSES.txt가 현재 의존성과 일치하지 않습니다. pnpm licenses:generate를 실행하세요.',
    )
    process.exitCode = 1
  } else {
    console.log('Third-party license notices are up to date.')
  }
} else {
  writeFileSync(outputPath, notice)
  console.log(`Generated ${outputPath}`)
}
