import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiSend } from '../lib/api.js'

const emptyChild = () => ({ child_name: '', food_choice_id: '' })
const defaultTitle = "Riley's 5th Birthday"

async function withTimeout(promise, ms) {
  let timeoutId
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Request timed out. Please try again.')),
          ms
        )
      })
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

function renderTitleWithSmallOrdinal(title) {
  const text = title || defaultTitle
  const match = text.match(/(\d+)(st|nd|rd|th)/i)
  if (!match || match.index === undefined) return text

  const full = match[0]
  const number = match[1]
  const suffix = match[2]
  const start = match.index
  const end = start + full.length

  return (
    <>
      {text.slice(0, start)}
      {number}
      <span className="ordinal-suffix">{suffix}</span>
      {text.slice(end)}
    </>
  )
}

export default function RsvpPage() {
  const [event, setEvent] = useState(null)
  const [foodChoices, setFoodChoices] = useState([])
  const [mainChildName, setMainChildName] = useState('')
  const [mainFoodChoiceId, setMainFoodChoiceId] = useState('')
  const [phone, setPhone] = useState('')
  const [additionalChildren, setAdditionalChildren] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [eventData, foodData] = await Promise.all([
          apiGet('/api/event'),
          apiGet('/api/food-choices')
        ])
        setEvent(eventData)
        setFoodChoices(foodData)
      } catch (err) {
        setError(err.message)
      }
    }
    load()
  }, [])

  const canSubmit = useMemo(() => {
    if (!mainChildName.trim() || !mainFoodChoiceId || !phone.trim()) return false
    return additionalChildren.every(
      (child) => child.child_name.trim() && child.food_choice_id
    )
  }, [mainChildName, mainFoodChoiceId, phone, additionalChildren])

  const onChildChange = (index, key, value) => {
    setAdditionalChildren((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const addChild = () => setAdditionalChildren((prev) => [...prev, emptyChild()])
  const removeChild = (index) =>
    setAdditionalChildren((prev) => prev.filter((_, i) => i !== index))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const children = [
        {
          child_name: mainChildName.trim(),
          food_choice_id: Number(mainFoodChoiceId)
        },
        ...additionalChildren.map((child) => ({
          child_name: child.child_name.trim(),
          food_choice_id: Number(child.food_choice_id)
        }))
      ]
      await withTimeout(
        apiSend('/api/rsvp', 'POST', {
          invite_name_entered: mainChildName.trim(),
          phone: phone.trim(),
          children
        }),
        15000
      )
      setShowSuccessPopup(true)
      setMainChildName('')
      setMainFoodChoiceId('')
      setPhone('')
      setAdditionalChildren([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page rsvp-page">
      <div className="card">
        <header className="hero">
          <h1 className="title-center">
            {renderTitleWithSmallOrdinal(event?.title || defaultTitle)}
          </h1>
          <div className="event-details muted">
            <p>{event?.event_date || '28 March 2026'}</p>
            <p>{event?.party_time || '11am to 1pm'}</p>
            <p>
              {event?.location ||
                'White Rock Primary School, Davies Ave, Paignton TQ4 7AW'}
            </p>
          </div>
          <p className="hero-subtitle">
            {event?.intro_text || 'Lace up for a footie celebration. Please RSVP below.'}
          </p>
        </header>

        <form onSubmit={submit} className="pitch-form">
          <label>
            <span className="label-title">
              Child's Name <span className="required-mark">*</span>
            </span>
            <input
              type="text"
              value={mainChildName}
              onChange={(e) => setMainChildName(e.target.value)}
              placeholder="Enter the child's name"
              required
            />
          </label>
          <label>
            <span className="label-title">
              Food Choice <span className="required-mark">*</span>
            </span>
            <select
              value={mainFoodChoiceId}
              className={mainFoodChoiceId ? '' : 'placeholder-select'}
              onChange={(e) => setMainFoodChoiceId(e.target.value)}
              required
            >
              <option value="">Select food</option>
              {foodChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Parent Phone
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xxxx"
              required
            />
          </label>

          <div className="children">
            <div className="children-header">
              <h2>Additional children</h2>
              <button type="button" onClick={addChild} className="ghost">
                Add Another Child
              </button>
            </div>

            {additionalChildren.map((child, index) => (
              <div key={index} className="child-row">
                <input
                  type="text"
                  placeholder="Child name"
                  value={child.child_name}
                  onChange={(e) =>
                    onChildChange(index, 'child_name', e.target.value)
                  }
                  required
                />
                <select
                  value={child.food_choice_id}
                  className={child.food_choice_id ? '' : 'placeholder-select'}
                  onChange={(e) =>
                    onChildChange(index, 'food_choice_id', e.target.value)
                  }
                  required
                >
                  <option value="">Select food</option>
                  {foodChoices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label}
                    </option>
                  ))}
                </select>
                {additionalChildren.length > 0 && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => removeChild(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? 'Submitting...' : 'Submit RSVP'}
          </button>
        </form>

        {showSuccessPopup && (
          <div className="popup-overlay" role="dialog" aria-modal="true">
            <div className="popup-card">
              <h2>Thank you</h2>
              <p>Your RSVP has been received.</p>
              <button type="button" onClick={() => setShowSuccessPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
