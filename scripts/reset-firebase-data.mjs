import { readFileSync } from 'node:fs'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

const values = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
    }),
)

const config = {
  apiKey: values.VITE_FIREBASE_API_KEY,
  authDomain: values.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: values.VITE_FIREBASE_PROJECT_ID,
  storageBucket: values.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: values.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: values.VITE_FIREBASE_APP_ID,
}

if (!config.apiKey || !config.projectId || !config.appId) throw new Error('Firebase config is missing in .env')

const database = getFirestore(getApps().length ? getApp() : initializeApp(config))
const names = ['children', 'lessons']
const snapshots = await Promise.all(names.map((name) => getDocs(collection(database, name))))
const counts = Object.fromEntries(names.map((name, index) => [name, snapshots[index].size]))

if (!process.argv.includes('--confirm')) {
  console.log(JSON.stringify({ projectId: config.projectId, collections: counts, message: 'Dry run only. Pass --confirm to delete these records.' }))
  process.exit(0)
}

for (const snapshot of snapshots) {
  for (let offset = 0; offset < snapshot.docs.length; offset += 500) {
    const batch = writeBatch(database)
    snapshot.docs.slice(offset, offset + 500).forEach((item) => batch.delete(item.ref))
    await batch.commit()
  }
}

console.log(JSON.stringify({ projectId: config.projectId, deleted: counts }))
