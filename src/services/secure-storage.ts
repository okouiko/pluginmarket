const DB_NAME = 'mc-plugin-market-secure'
const DB_VERSION = 2
const STORE_NAME = 'keys'
const KEY_ID = 'models-aes-gcm'
const SECURE_MODELS_KEY = 'mc-plugin-market-models-secure'
const LEGACY_MODELS_KEY = 'mc-plugin-market-models'

let keyPromise: Promise<CryptoKey> | null = null

/**
 * Web Crypto 与 IndexedDB 仅在安全上下文可用。不可用时 API Key 只保留在内存中。
 */
export function isSecureStorageSupported(): boolean {
  try {
    return typeof crypto !== 'undefined'
      && !!crypto.subtle
      && typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB 升级被其他标签页阻塞'))
  })
}

function readStoredKey(): Promise<CryptoKey | null> {
  return openDatabase().then((db) => new Promise<CryptoKey | null>((resolve, reject) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close()
      resolve(null)
      return
    }

    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(KEY_ID)
    request.onsuccess = () => {
      resolve((request.result as CryptoKey | undefined) ?? null)
      db.close()
    }
    request.onerror = () => {
      reject(request.error)
      db.close()
    }
  }))
}

async function createAndStoreKey(): Promise<CryptoKey> {
  if (!isSecureStorageSupported()) {
    throw new Error('当前环境不支持 Web Crypto，API Key 不会持久化')
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(key, KEY_ID)
    transaction.oncomplete = () => {
      resolve()
      db.close()
    }
    transaction.onerror = () => {
      reject(transaction.error)
      db.close()
    }
  })
  return key
}

function getOrCreateKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = readStoredKey()
      .then((key) => key ?? createAndStoreKey())
      .catch((error) => {
        keyPromise = null
        throw error
      })
  }
  return keyPromise
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function encryptJson(value: unknown): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`
}

async function decryptJson<T>(payload: string): Promise<T | null> {
  const [version, ivValue, cipherValue] = payload.split('.')
  if (version !== 'v1' || !ivValue || !cipherValue) return null
  if (!isSecureStorageSupported()) return null

  const storedKey = await readStoredKey()
  if (!storedKey) return null

  keyPromise = Promise.resolve(storedKey)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivValue) },
    storedKey,
    base64ToBytes(cipherValue),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

/**
 * 加密保存模型配置（含 API Key）。
 * 密钥以不可导出 CryptoKey 的形式保存在 IndexedDB，localStorage 中只保存密文。
 */
export async function saveSecureModels(models: unknown): Promise<void> {
  if (!isSecureStorageSupported()) return
  const payload = await encryptJson(models)
  localStorage.setItem(SECURE_MODELS_KEY, payload)
}

/**
 * 读取模型配置：优先迁移旧版明文 localStorage 数据，再读取加密数据。
 * 加密不可用时仅返回内存数据，不回退为明文持久化。
 */
export async function loadModelsWithMigration<T>(fallback: T): Promise<T> {
  try {
    const legacy = localStorage.getItem(LEGACY_MODELS_KEY)
    if (legacy) {
      localStorage.removeItem(LEGACY_MODELS_KEY)
      const parsed = JSON.parse(legacy) as T
      try {
        await saveSecureModels(parsed)
      } catch {
        // 加密不可用时保留在内存中，刷新后需重新填写 API Key。
      }
      return parsed
    }

    const secure = localStorage.getItem(SECURE_MODELS_KEY)
    if (!secure) return fallback

    const decrypted = await decryptJson<T>(secure)
    return decrypted ?? fallback
  } catch (error) {
    console.warn('读取加密模型配置失败，使用默认配置', error)
    return fallback
  }
}

/**
 * 清空加密模型配置与密钥库，用于“重置所有设置”。
 */
export async function clearSecureModels(): Promise<void> {
  localStorage.removeItem(SECURE_MODELS_KEY)
  localStorage.removeItem(LEGACY_MODELS_KEY)
  keyPromise = null

  if (typeof indexedDB === 'undefined') return

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}
