import { app, dialog } from 'electron'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * Gestion locale des images d'exercices.
 * Toutes les images (téléchargées depuis une source libre OU importées par
 * l'utilisateur) sont stockées dans `userData/images`, ce qui les rend
 * disponibles hors-ligne et embarquables dans les PDF.
 */

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function imagesDir(): string {
  const dir = join(app.getPath('userData'), 'images')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function extFromUrl(url: string): string {
  const m = url.split('?')[0].match(/\.(png|jpe?g|gif|webp|svg)$/i)
  if (!m) return '.png'
  return '.' + m[1].toLowerCase().replace('jpeg', 'jpg')
}

/** Télécharge une URL dans le cache local si absente ; renvoie le nom de fichier. */
async function ensureLocalFromUrl(url: string): Promise<string> {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16)
  const file = hash + extFromUrl(url)
  const full = join(imagesDir(), file)
  if (existsSync(full)) return file
  const res = await fetchWithRetry(url)
  writeFileSync(full, Buffer.from(await res.arrayBuffer()))
  return file
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Télécharge avec reprise sur rate-limit (429) ou erreur serveur (5xx).
 * User-Agent descriptif requis : Wikimedia refuse les requêtes anonymes.
 */
async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let last = 0
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CoachMuscu/0.1 (application personnelle locale)' },
      redirect: 'follow',
    })
    if (res.ok) return res
    last = res.status
    if (res.status === 429 || res.status >= 500) {
      await delay(700 * (i + 1))
      continue
    }
    throw new Error(`Téléchargement échoué (${res.status})`)
  }
  throw new Error(`Téléchargement échoué (${last}) après ${attempts} tentatives`)
}

/** Lit un fichier local et renvoie un data-URL base64 (affichage + PDF). */
function readDataUrl(file: string): string {
  const buf = readFileSync(join(imagesDir(), file))
  const mime = MIME[extname(file).toLowerCase()] ?? 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

export interface ImageSpec {
  url?: string
  localPath?: string
}

/**
 * Résout une image en data-URL affichable :
 *  - `localPath` présent  -> lecture directe du cache local ;
 *  - sinon `url` présent   -> téléchargement local puis lecture.
 * Renvoie aussi le `localPath` (pour persistance éventuelle). null si échec.
 */
export async function resolveImage(spec: ImageSpec): Promise<{ dataUrl: string; localPath: string } | null> {
  try {
    let file = spec.localPath
    if (!file && spec.url) file = await ensureLocalFromUrl(spec.url)
    if (!file || !existsSync(join(imagesDir(), file))) return null
    return { dataUrl: readDataUrl(file), localPath: file }
  } catch {
    return null
  }
}

/** Ouvre un sélecteur de fichier, copie l'image dans le cache local. */
export async function importImage(): Promise<{ dataUrl: string; localPath: string } | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir une image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return null
  const src = filePaths[0]
  const buf = readFileSync(src)
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 16)
  const file = hash + (extname(src).toLowerCase() || '.png')
  copyFileSync(src, join(imagesDir(), file))
  return { dataUrl: readDataUrl(file), localPath: file }
}
