#!/usr/bin/env node
/**
 * Playtopia Git Guard: Code Validation + Dual Git System
 * 1. Validates codebase (conflict markers, backend syntax, critical files, Vite build)
 * 2. Tipe 1 (Local Backup): Pushes branches + timestamped snapshot tag to local bare repo
 * 3. Tipe 2 (Public Git): Pushes verified branches to GitHub (origin)
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LOCAL_BACKUP_DIR = path.resolve(ROOT, '..', 'playtopia-local-backup.git')
const BUNDLES_DIR = path.resolve(ROOT, '..', 'playtopia-local-backups')

const mode = process.argv[2] || 'all' // 'validate' | 'local' | 'public' | 'all' | 'restore-list'

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts }).trim()
}

function logStep(step, msg) {
  console.log(`\n[${step}] ${msg}`)
}

// ============================================================================
// 1. VALIDASI KODE (Conflict Check, Backend Syntax, Critical Files, Vite Build)
// ============================================================================
function validateCode() {
  logStep('VALIDASI 1/4', 'Memeriksa tanda merge conflict (<<<<<<<, =======, >>>>>>>)...')
  const trackedFiles = run('git ls-files src backend').split(/\r?\n/).filter(Boolean)
  const conflicted = []

  for (const rel of trackedFiles) {
    if (!/\.(vue|js|mjs|cjs|json|css|scss|html)$/.test(rel)) continue
    const full = path.join(ROOT, rel)
    if (!fs.existsSync(full)) continue
    const content = fs.readFileSync(full, 'utf8')
    if (/^<<<<<<< |^=======$|^>>>>>>> /m.test(content)) {
      conflicted.push(rel)
    }
  }
  if (conflicted.length > 0) {
    throw new Error(`Ditemukan tanda merge conflict pada file:\n  - ${conflicted.join('\n  - ')}`)
  }
  console.log('  ✅ Tidak ada merge conflict marker.')

  logStep('VALIDASI 2/4', 'Memeriksa kelengkapan file inti Playtopia (Sidebar, Layout, Router, POS, Backend)...')
  const criticalFiles = [
    'src/components/PosLayout/PosLayout.vue',
    'src/components/PosLayout/PosSidebar.vue',
    'src/components/PosLayout/PosHeader.vue',
    'src/pages/Pos/PosDashboard.vue',
    'src/pages/Pos/PosLogin.vue',
    'src/pages/Pos/PosCashier.vue',
    'src/pages/Pos/CustomerDisplay.vue',
    'src/router/index.js',
    'backend/src/index.js',
    'backend/src/db_mysql.js',
    'backend/src/routes/auth.js',
    'backend/src/routes/admin.js'
  ]
  for (const rel of criticalFiles) {
    const full = path.join(ROOT, rel)
    if (!fs.existsSync(full)) {
      throw new Error(`File inti hilang: ${rel}`)
    }
  }
  console.log(`  ✅ Semua ${criticalFiles.length} file inti tersedia.`)

  logStep('VALIDASI 3/4', 'Memeriksa sintaks JavaScript Backend (node --check)...')
  const backendFiles = trackedFiles.filter((f) => f.startsWith('backend/') && f.endsWith('.js'))
  for (const rel of backendFiles) {
    run(`node --check "${path.join(ROOT, rel)}"`)
  }
  console.log(`  ✅ Semua ${backendFiles.length} file backend lolos uji sintaks.`)

  logStep('VALIDASI 4/4', 'Memeriksa kompilasi Frontend Vue (vite build)...')
  run('node ./node_modules/vite/bin/vite.js build --logLevel error')
  console.log('  ✅ Build Frontend Vue (vite build) sukses tanpa error!')
}

// ============================================================================
// 2. TIPE 1: LOCAL GIT BACKUP (Bare Repo + Bundle Snapshot Anti-Kehilangan)
// ============================================================================
function backupLocal() {
  logStep('BACKUP LOKAL', `Menyiapkan repository Git lokal di: ${LOCAL_BACKUP_DIR}`)
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true })
    execSync(`git init --bare "${LOCAL_BACKUP_DIR}"`, { stdio: 'pipe' })
    console.log('  ✅ Repository bare lokal berhasil dibuat.')
  }

  const remotes = run('git remote').split(/\r?\n/)
  const normalizedBackupPath = LOCAL_BACKUP_DIR.replace(/\\/g, '/')
  if (!remotes.includes('local-backup')) {
    run(`git remote add local-backup "${normalizedBackupPath}"`)
  } else {
    run(`git remote set-url local-backup "${normalizedBackupPath}"`)
  }

  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const commitHash = run('git rev-parse --short HEAD')
  const tagName = `backup/${stamp}-${commitHash}`

  // Buat tag snapshot & push ke local-backup
  run(`git tag -f "${tagName}" HEAD`)
  run('git push local-backup --all --force')
  run(`git push local-backup "refs/tags/${tagName}" --force`)

  // Buat juga file .bundle mandiri (1 file utuh berisi seluruh histori git)
  if (!fs.existsSync(BUNDLES_DIR)) {
    fs.mkdirSync(BUNDLES_DIR, { recursive: true })
  }
  const bundleFile = path.join(BUNDLES_DIR, `playtopia-${stamp}-${commitHash}.bundle`)
  run(`git bundle create "${bundleFile}" --all`)

  console.log(`  ✅ Push ke remote 'local-backup' selesai (branch dev & prod).`)
  console.log(`  ✅ Snapshot Tag: ${tagName}`)
  console.log(`  ✅ File Bundle Lokal: ${bundleFile}`)
}

// ============================================================================
// 3. TIPE 2: PUBLIC GIT (GitHub origin)
// ============================================================================
function pushPublic() {
  logStep('PUBLIC GIT', 'Push kode yang sudah tervalidasi ke GitHub (origin)...')
  const currentBranch = run('git rev-parse --abbrev-ref HEAD')
  run(`git push origin ${currentBranch}`)
  console.log(`  ✅ Berhasil push branch '${currentBranch}' ke GitHub (origin/${currentBranch}).`)
}

function listRestores() {
  logStep('DAFTAR BACKUP LOKAL', 'Snapshot yang tersimpan di lokal:')
  const tags = run('git tag -l "backup/*" --sort=-creatordate').split(/\r?\n/).filter(Boolean)
  tags.slice(0, 10).forEach((t, i) => {
    const info = run(`git log -1 --format="%h | %ci | %s" "${t}"`)
    console.log(`  ${i + 1}. ${t}  -->  ${info}`)
  })
  if (fs.existsSync(BUNDLES_DIR)) {
    const bundles = fs.readdirSync(BUNDLES_DIR).filter((f) => f.endsWith('.bundle')).reverse()
    console.log(`\n  File Bundle (.bundle) di ${BUNDLES_DIR}:`)
    bundles.slice(0, 5).forEach((b) => console.log(`  - ${b}`))
  }
}

try {
  if (mode === 'validate') {
    validateCode()
  } else if (mode === 'local') {
    validateCode()
    backupLocal()
  } else if (mode === 'public') {
    validateCode()
    backupLocal()
    pushPublic()
  } else if (mode === 'restore-list') {
    listRestores()
  } else {
    validateCode()
    backupLocal()
    pushPublic()
  }
  console.log('\n🎉 SELESAI: Kode valid & aman!')
} catch (err) {
  console.error(`\n❌ GAGAL VALIDASI / GIT GUARD:\n${err.message}`)
  process.exit(1)
}

