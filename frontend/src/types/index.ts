export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string
}

export interface Repository {
  id: string
  name: string
  path: string
  messages: Message[]
}