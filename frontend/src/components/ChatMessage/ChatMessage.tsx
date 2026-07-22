import type { Message } from '../../types'
import './ChatMessage.css'

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      <div className="message__bubble">
        <pre className="message__content">{message.content}</pre>
        {message.sources && (
          <details className="message__sources">
            <summary>Sources</summary>
            <pre className="message__source-text">{message.sources}</pre>
          </details>
        )}
      </div>
    </div>
  )
}