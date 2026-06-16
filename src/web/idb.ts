// Petit wrapper IndexedDB (sans dépendance) pour la version web/PWA.
// Chaque "store" est un object store clé/valeur ; les valeurs sont des objets JSON.

const DB_NAME = 'coach-muscu'
const VERSION = 1
export const STORES = [
  'profile',
  'exercises',
  'limitations',
  'programs',
  'sessions',
  'dailyStates',
  'measures',
  'ratings',
  'images',
] as const
export type Store = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const req = fn(tx.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const idb = {
  get<T>(store: Store, key: string): Promise<T | undefined> {
    return run<T | undefined>(store, 'readonly', (s) => s.get(key))
  },
  getAll<T>(store: Store): Promise<T[]> {
    return run<T[]>(store, 'readonly', (s) => s.getAll())
  },
  put(store: Store, key: string, value: unknown): Promise<IDBValidKey> {
    return run<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key))
  },
  delete(store: Store, key: string): Promise<undefined> {
    return run<undefined>(store, 'readwrite', (s) => s.delete(key))
  },
  clear(store: Store): Promise<undefined> {
    return run<undefined>(store, 'readwrite', (s) => s.clear())
  },
}
