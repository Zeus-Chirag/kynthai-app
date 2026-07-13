type WebRTCSignalMessage = {
  id: string
  appointmentId: string
  role: 'doctor' | 'patient' | 'unknown'
  userId: string
  userName: string
  type: string
  payload: Record<string, unknown>
  createdAt: number
}

const store = new Map<string, WebRTCSignalMessage[]>()

let seq = 0
function nextId() {
  seq += 1
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seq}`
}

export const signalingStore = {
  push(message: Omit<WebRTCSignalMessage, 'id' | 'createdAt'>) {
    const key = message.appointmentId
    const list = store.get(key) || []
    const msg: WebRTCSignalMessage = {
      ...message,
      id: nextId(),
      createdAt: Date.now(),
    }
    list.push(msg)
    // Cap store size per room to prevent memory leaks
    if (list.length > 500) list.splice(0, list.length - 500)
    store.set(key, list)
    return msg
  },

  list(appointmentId: string, afterId?: string) {
    const list = store.get(appointmentId) || []
    if (!afterId) return list.slice(-200)
    const idx = list.findIndex((m) => m.id === afterId)
    if (idx < 0) return []
    return list.slice(idx + 1)
  },

  clear(appointmentId: string) {
    store.delete(appointmentId)
  },
}
