import { useEffect, useState } from 'react'
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
  const [submittedThisSession, setSubmittedThisSession] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    mainChildName: '',
    mainFoodChoiceId: '',
    phone: '',
    additionalChildren: []
  })

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

  const validateForm = () => {
    const errors = {
      mainChildName: '',
      mainFoodChoiceId: '',
      phone: '',
      additionalChildren: additionalChildren.map(() => ({
        child_name: '',
        food_choice_id: ''
      }))
    }

    if (!mainChildName.trim()) errors.mainChildName = "Child's Name is required."
    if (!mainFoodChoiceId) errors.mainFoodChoiceId = 'Food Choice is required.'
    if (!phone.trim()) errors.phone = 'Parent Phone is required.'

    additionalChildren.forEach((child, index) => {
      if (!child.child_name.trim()) {
        errors.additionalChildren[index].child_name = 'Child name is required.'
      }
      if (!child.food_choice_id) {
        errors.additionalChildren[index].food_choice_id = 'Food choice is required.'
      }
    })

    return errors
  }

  const hasValidationErrors = (errors) => {
    if (errors.mainChildName || errors.mainFoodChoiceId || errors.phone) return true
    return errors.additionalChildren.some(
      (child) => child.child_name || child.food_choice_id
    )
  }

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
    const errors = validateForm()
    setFieldErrors(errors)
    if (hasValidationErrors(errors)) return

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
      setSubmittedThisSession(true)
      setShowSuccessPopup(true)
      setMainChildName('')
      setMainFoodChoiceId('')
      setPhone('')
      setAdditionalChildren([])
      setFieldErrors({
        mainChildName: '',
        mainFoodChoiceId: '',
        phone: '',
        additionalChildren: []
      })
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
            {renderTitleWithSmallOrdinal(event?.title || defaultTitle)} ⚽
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

        {!submittedThisSession && (
          <form onSubmit={submit} className="pitch-form" noValidate>
            <label>
              <span className="label-title">
                Child's Name <span className="required-mark">*</span>
              </span>
              <input
                type="text"
                value={mainChildName}
                onChange={(e) => setMainChildName(e.target.value)}
                placeholder="Enter the child's name"
                className={fieldErrors.mainChildName ? 'input-invalid' : ''}
              />
              {fieldErrors.mainChildName && (
                <span className="field-error">{fieldErrors.mainChildName}</span>
              )}
            </label>
            <label>
              <span className="label-title">
                Food Choice <span className="required-mark">*</span>
              </span>
              <select
                value={mainFoodChoiceId}
                className={`${mainFoodChoiceId ? '' : 'placeholder-select'} ${fieldErrors.mainFoodChoiceId ? 'input-invalid' : ''}`.trim()}
                onChange={(e) => setMainFoodChoiceId(e.target.value)}
              >
                <option value="">Select food</option>
                {foodChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
              {fieldErrors.mainFoodChoiceId && (
                <span className="field-error">{fieldErrors.mainFoodChoiceId}</span>
              )}
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
                className={fieldErrors.phone ? 'input-invalid' : ''}
              />
              {fieldErrors.phone && (
                <span className="field-error">{fieldErrors.phone}</span>
              )}
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
                    className={
                      fieldErrors.additionalChildren[index]?.child_name
                        ? 'input-invalid'
                        : ''
                    }
                  />
                  <select
                    value={child.food_choice_id}
                    className={`${child.food_choice_id ? '' : 'placeholder-select'} ${
                      fieldErrors.additionalChildren[index]?.food_choice_id
                        ? 'input-invalid'
                        : ''
                    }`.trim()}
                    onChange={(e) =>
                      onChildChange(index, 'food_choice_id', e.target.value)
                    }
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
              {fieldErrors.additionalChildren.map((childError, index) => (
                (childError.child_name || childError.food_choice_id) && (
                  <p key={`child-error-${index}`} className="field-error">
                    Additional child {index + 1}:{' '}
                    {[childError.child_name, childError.food_choice_id]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                )
              ))}
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </form>
        )}

        {submittedThisSession && !showSuccessPopup && (
          <p className="success">
            RSVP submitted. Reload the page to submit another response.
          </p>
        )}

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
