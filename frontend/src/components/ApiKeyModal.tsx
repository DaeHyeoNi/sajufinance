import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const API_KEY_STORAGE_KEY = 'gemini_api_key'

export function getStoredApiKey(): string | null {
  return sessionStorage.getItem(API_KEY_STORAGE_KEY)
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ApiKeyModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState(getStoredApiKey() ?? '')

  if (!isOpen) return null

  const handleSave = () => {
    const trimmed = value.trim()
    if (trimmed) {
      sessionStorage.setItem(API_KEY_STORAGE_KEY, trimmed)
    } else {
      sessionStorage.removeItem(API_KEY_STORAGE_KEY)
    }
    onClose()
  }

  const handleClear = () => {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY)
    setValue('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box api-key-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{t('apiKey.modalTitle')}</h2>

        <div className="api-key-warning">
          <strong>{t('apiKey.warningTitle')}</strong>
          <ul>
            <li>{t('apiKey.warning1')}</li>
            <li>{t('apiKey.warning2')}</li>
            <li>
              {t('apiKey.warning3')}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('apiKey.warningLink')}
              </a>
            </li>
          </ul>
        </div>

        <label className="form-label">{t('apiKey.inputLabel')}</label>
        <input
          type="password"
          className="form-input"
          placeholder={t('apiKey.inputPlaceholder')}
          value={value}
          onChange={e => setValue(e.target.value)}
          autoComplete="off"
        />

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClear}>
            {t('apiKey.clearBtn')}
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {t('apiKey.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
