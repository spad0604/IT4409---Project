import { useMemo, useState } from 'react'
import * as labelApi from '../api/labelApi'

const DEFAULT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export default function LabelManager({
  t,
  projectId,
  labels,
  loading,
  onLabelsChanged,
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sortedLabels = useMemo(
    () => [...(Array.isArray(labels) ? labels : [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [labels],
  )

  const resetForm = () => {
    setName('')
    setColor(DEFAULT_COLORS[0])
    setEditingId('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!projectId) return
    const trimmedName = String(name ?? '').trim()
    if (!trimmedName) {
      setError(t('labels.validationName', { defaultValue: 'Label name is required' }))
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await labelApi.updateLabel(editingId, { name: trimmedName, color })
      } else {
        await labelApi.createLabel(projectId, { name: trimmedName, color })
      }
      resetForm()
      await onLabelsChanged?.()
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (label) => {
    setEditingId(String(label?.id || ''))
    setName(String(label?.name || ''))
    setColor(String(label?.color || DEFAULT_COLORS[0]))
    setError('')
  }

  const handleDelete = async (labelId) => {
    if (!labelId) return
    if (!window.confirm(t('labels.confirmDelete', { defaultValue: 'Delete this label?' }))) return
    setSaving(true)
    try {
      await labelApi.deleteLabel(labelId)
      if (editingId === labelId) resetForm()
      await onLabelsChanged?.()
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel" aria-label={t('labels.title', { defaultValue: 'Project labels' })}>
      <header className="panel-head">
        <div>
          <h2>{t('labels.title', { defaultValue: 'Project labels' })}</h2>
          <p>{t('labels.subtitle', { defaultValue: 'Create and maintain labels for this project.' })}</p>
        </div>
      </header>

      <div className="assigned-list">
        {loading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
        {!loading && sortedLabels.length === 0 ? (
          <article className="assigned-item">
            <div>
              <h3>{t('labels.empty', { defaultValue: 'No labels yet' })}</h3>
              <p>{t('labels.emptyHint', { defaultValue: 'Create the first label for this project.' })}</p>
            </div>
          </article>
        ) : null}

        {sortedLabels.map((label) => (
          <article key={label?.id} className="assigned-item">
            <div>
              <div className="label-row">
                <span className="label-chip" style={label?.color ? { background: label.color } : undefined}>
                  {label?.name}
                </span>
              </div>
              <p style={{ marginTop: '0.4rem' }}>{label?.color || ''}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="filter-btn" onClick={() => handleEdit(label)}>
                {t('common.edit')}
              </button>
              <button type="button" className="open-btn" onClick={() => handleDelete(label?.id)} disabled={saving}>
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>

      <form className="panel" style={{ marginTop: '1rem', padding: '1rem' }} onSubmit={handleSubmit}>
        <header className="panel-head">
          <h2>{editingId ? t('labels.edit', { defaultValue: 'Edit label' }) : t('labels.create', { defaultValue: 'New label' })}</h2>
        </header>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
          <label className="inline-field">
            <span className="inline-label">{t('common.name', { defaultValue: 'Name' })}</span>
            <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('common.color', { defaultValue: 'Color' })}</span>
            <input className="inline-input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>

        <div className="label-row" style={{ marginTop: '0.75rem' }}>
          {DEFAULT_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`color-swatch ${color === preset ? 'is-active' : ''}`}
              style={{ background: preset }}
              onClick={() => setColor(preset)}
              aria-label={preset}
            />
          ))}
        </div>

        {error ? <p className="inline-error">{error}</p> : null}

        <div className="modal-actions" style={{ marginTop: '0.9rem' }}>
          {editingId ? (
            <button type="button" className="filter-btn" onClick={resetForm}>
              {t('common.cancel')}
            </button>
          ) : null}
          <button type="submit" className="create-issue-btn" disabled={saving || !projectId}>
            {saving ? t('common.saving') : editingId ? t('common.save') : t('labels.create', { defaultValue: 'New label' })}
          </button>
        </div>
      </form>
    </section>
  )
}
