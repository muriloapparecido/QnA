# React + TypeScript Reference

A personal reference for building the Codebase Q&A Agent frontend.
Not a blueprint — just the building blocks and how they work.

---

## Core Concepts

### Components
A component is a function that returns JSX. In TypeScript, you define prop types explicitly.

```tsx
// No props
function Header() {
  return <h1>Codebase Q&A</h1>
}

// With typed props
type ButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean  // optional prop
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
```

---

## Hooks

### useState
Stores a value that, when changed, causes the component to re-render.

```tsx
import { useState } from 'react'

const [value, setValue] = useState('')           // string, starts empty
const [count, setCount] = useState(0)            // number
const [loading, setLoading] = useState(false)    // boolean
const [data, setData] = useState<string | null>(null)  // typed with null
```

Updating state:
```tsx
setValue('new value')             // replace
setCount(prev => prev + 1)       // use previous value
```

---

### useEffect
Runs side effects (API calls, subscriptions) after render.

```tsx
import { useEffect } from 'react'

// Runs once on mount (empty dependency array)
useEffect(() => {
  console.log('component mounted')
}, [])

// Runs when `question` changes
useEffect(() => {
  console.log('question changed:', question)
}, [question])

// Runs on every render (no dependency array — use rarely)
useEffect(() => {
  console.log('rendered')
})
```

---

### useRef
Stores a value that persists between renders but doesn't trigger re-render.
Common use: accessing a DOM element directly.

```tsx
import { useRef } from 'react'

const inputRef = useRef<HTMLInputElement>(null)

// Attach to element
<input ref={inputRef} />

// Access the DOM element
inputRef.current?.focus()
inputRef.current?.value
```

---

## Fetching Data

### Basic fetch in an event handler
```tsx
async function handleSubmit() {
  setLoading(true)
  try {
    const response = await fetch('http://localhost:8000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: inputValue })
    })
    const data = await response.json()
    setAnswer(data.answer)
  } catch (error) {
    console.error('Request failed:', error)
    setError('Something went wrong')
  } finally {
    setLoading(false)
  }
}
```

### Typing the response
```tsx
type ApiResponse = {
  answer: string
  sources: string
}

const data: ApiResponse = await response.json()
```

---

## Event Handling

```tsx
// Input change
<input
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
/>

// Button click
<button onClick={handleSubmit}>Ask</button>

// Form submit (prevents page reload)
<form onSubmit={(e) => {
  e.preventDefault()
  handleSubmit()
}}>

// Enter key press
<input
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSubmit()
  }}
/>
```

---

## Conditional Rendering

```tsx
// Show/hide based on boolean
{loading && <p>Loading...</p>}

// Ternary
{loading ? <p>Loading...</p> : <p>Done</p>}

// Null renders nothing
{error ? <p>{error}</p> : null}
```

---

## Rendering Lists

```tsx
const items = ['file1.ts', 'file2.tsx', 'file3.java']

// Always include a unique key
<ul>
  {items.map((item, index) => (
    <li key={index}>{item}</li>
  ))}
</ul>

// Better: use a unique ID if available
<ul>
  {items.map((item) => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>
```

---

## TypeScript Patterns

### Typing state with an interface
```tsx
interface Message {
  id: number
  question: string
  answer: string
}

const [messages, setMessages] = useState<Message[]>([])

// Add a new message
setMessages(prev => [...prev, { id: Date.now(), question, answer }])
```

### Typing event handlers
```tsx
// Input change event
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value)
}

// Button click event
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault()
}

// Form submit event
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
}
```

---

## Component Patterns

### Passing a setter down to a child
```tsx
type InputProps = {
  value: string
  onChange: (value: string) => void
}

function QuestionInput({ value, onChange }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ask a question about the codebase..."
    />
  )
}

// In parent:
<QuestionInput value={question} onChange={setQuestion} />
```

### Lifting state up
If two components need the same data, put the state in their closest common parent and pass it down as props. Don't put state in a child if a sibling needs it.

---

## CSS in React

### Inline styles (quick, not recommended for production)
```tsx
<div style={{ color: 'red', fontSize: '16px', marginTop: '8px' }}>
  Hello
</div>
```

### CSS modules (scoped, recommended)
```tsx
// App.module.css
.container { padding: 24px; }
.title { font-size: 24px; }

// App.tsx
import styles from './App.module.css'
<div className={styles.container}>
  <h1 className={styles.title}>Hello</h1>
</div>
```

### className with conditions
```tsx
<button className={`btn ${loading ? 'btn-disabled' : 'btn-primary'}`}>
  Submit
</button>
```

---

## File Structure (Vite default)
```
frontend/
  src/
    App.tsx          ← root component, start here
    App.css          ← styles for App
    main.tsx         ← entry point, renders App into the DOM
    index.css        ← global styles
    assets/          ← images, svgs
    components/      ← create this folder for reusable components
```

---

## Useful Patterns for this Project

### Loading state with a spinner or text
```tsx
const [loading, setLoading] = useState(false)

{loading ? <p>Searching codebase...</p> : null}
```

### Displaying multiline text (preserves line breaks)
```tsx
<pre style={{ whiteSpace: 'pre-wrap' }}>{answer}</pre>
```

### Textarea instead of input for longer questions
```tsx
<textarea
  value={question}
  onChange={(e) => setQuestion(e.target.value)}
  rows={3}
  placeholder="Ask anything about the codebase..."
/>
```

### Disabling button while loading
```tsx
<button onClick={handleSubmit} disabled={loading || question.trim() === ''}>
  {loading ? 'Thinking...' : 'Ask'}
</button>
```

---

## Common Mistakes

- Mutating state directly: `state.push(item)` — wrong. Use `setState(prev => [...prev, item])`
- Missing `key` prop in lists — React will warn and performance suffers
- Calling a hook inside a condition or loop — hooks must be at the top level of the component
- Forgetting `e.preventDefault()` on form submit — page will reload
- Not handling the loading/error states — UI will feel broken on slow connections
