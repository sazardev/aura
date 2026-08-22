import { Check, Copy, Database, Download, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/button'
import { playSound } from '@/engine/sounds'
import { serializeProgress, tryRestoreProgress } from '@/state/store'

export function BackupScreen() {
  const [copied, setCopied] = useState(false)
  const [clipboardError, setClipboardError] = useState(false)
  const [paste, setPaste] = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>(() => 'idle')
  const [restored, setRestored] = useState(false)

  const copy = async () => {
    const payload = serializeProgress()
    try {
      await navigator.clipboard.writeText(payload)
      setClipboardError(false)
      setCopied(true)
      playSound('correct')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setClipboardError(true)
    }
  }

  const restore = () => {
    if (paste.trim().length === 0) return
    const ok = tryRestoreProgress(paste)
    setStatus(ok ? 'ok' : 'error')
    if (ok) {
      playSound('success')
      setRestored(true)
    } else {
      playSound('wrong')
    }
  }

  const upload = async (file: File | undefined) => {
    if (file === undefined) return
    const content = await file.text()
    setPaste(content)
  }

  return (
    <div className="backup-screen">
      <h1 className="screen-title">
        <Database size={22} aria-hidden="true" /> Backup
      </h1>
      <p className="screen-subtitle">
        Your progress lives only on this device. Copy a backup or download a file to keep it safe —
        and restore it here on any device.
      </p>

      <section className="result-section">
        <h2 className="section-title">
          <Download size={18} aria-hidden="true" /> Export
        </h2>
        <div className="backup-actions">
          <Button variant="primary" block onClick={() => void copy()}>
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? 'Copied to clipboard' : 'Copy backup'}
          </Button>
          <Button variant="secondary" block onClick={downloadBackup}>
            <Download size={16} aria-hidden="true" /> Download as file
          </Button>
        </div>
        {clipboardError && (
          <p className="dictation-verdict" role="alert">
            <Trash2 size={14} aria-hidden="true" /> Clipboard unavailable — use "Download as file".
          </p>
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Upload size={18} aria-hidden="true" /> Import
        </h2>
        <p className="screen-subtitle">
          Paste a backup or choose a file, then restore. Current progress will be replaced.
        </p>
        <textarea
          className="analyzer-textarea"
          rows={4}
          aria-label="Paste backup content"
          placeholder="Paste your backup here…"
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <label className="aura-button aura-button--secondary aura-button--block aura-button--file">
          <Upload size={16} aria-hidden="true" /> Choose backup file
          <input
            type="file"
            name="backup-file"
            accept="application/json,.json"
            className="backup-file-input"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        <Button variant="danger" block disabled={paste.trim().length === 0} onClick={restore}>
          <Trash2 size={16} aria-hidden="true" /> Restore this backup
        </Button>
        {status === 'ok' && (
          <p className="dictation-verdict dictation-verdict--correct" role="alert">
            <Check size={14} aria-hidden="true" /> Progress restored.
          </p>
        )}
        {status === 'error' && (
          <p className="dictation-verdict" role="alert">
            <Trash2 size={14} aria-hidden="true" /> That doesn't look like a valid Aura backup.
          </p>
        )}
      </section>

      {restored && (
        <Button variant="ghost" block onClick={() => window.location.reload()}>
          Reload the app
        </Button>
      )}
    </div>
  )
}

function downloadBackup(): void {
  const payload = serializeProgress()
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `aura-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
