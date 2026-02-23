import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

export type DraftRow = {
  id: string
  youth_id: string | null
  draft_type: string
  author_id: string | null
  data: any
  updated_at: string
}

export const draftsService = {
  async get(youth_id: string | null, draft_type: string, author_id: string | null): Promise<DraftRow | null> {
    let q = query(collection(db, 'report_drafts'), where('draft_type', '==', draft_type))
    // Firestore doesn't support conditional where clauses inline, so we filter after
    const snapshot = await getDocs(q)
    const results = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as DraftRow))
      .filter(d => {
        if (youth_id && d.youth_id !== youth_id) return false
        if (author_id && d.author_id !== author_id) return false
        return true
      })
    return results[0] || null
  },

  async save(youth_id: string | null, draft_type: string, author_id: string | null, dataJson: any): Promise<DraftRow> {
    // Try to find existing draft to update
    const existing = await this.get(youth_id, draft_type, author_id)
    const id = existing?.id || uuidv4()
    const now = new Date().toISOString()
    const data: DraftRow = {
      id,
      youth_id,
      draft_type,
      author_id,
      data: dataJson,
      updated_at: now
    }
    await setDoc(doc(db, 'report_drafts', id), data, { merge: true })
    return data
  },

  async delete(youth_id: string | null, draft_type: string, author_id: string | null): Promise<void> {
    const q = query(collection(db, 'report_drafts'), where('draft_type', '==', draft_type))
    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => {
      const data = d.data()
      const matchYouth = !youth_id || data.youth_id === youth_id
      const matchAuthor = !author_id || data.author_id === author_id
      if (matchYouth && matchAuthor) {
        batch.delete(d.ref)
      }
    })
    await batch.commit()
  }
}
