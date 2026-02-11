import { useEffect, useState } from 'react'
import { apiGet, apiSend } from '../lib/api.js'

const emptyChild = () => ({
  child_name: '',
  food_choice_id: '',
  has_dietary_requirements: false,
  dietary_requirements: ''
})
const defaultTitle = "Riley's 5th Birthday"
const defaultDate = '28 March 2026'
const defaultTime = '11am to 1pm'
const defaultLocation = 'White Rock Primary School, Davies Ave, Paignton TQ4 7AW'
const defaultIntro = 'Lace up for a footie celebration. Please RSVP below.'

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

function parsePartyDateTime(eventDateText, partyTimeText) {
  const dateText = (eventDateText || '').trim()
  const timeText = (partyTimeText || '').trim().toLowerCase()
  if (!dateText || !timeText) return null

  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return null

  const timeMatch = timeText.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/
  )
  if (!timeMatch) return null

  const to24 = (hour, minute, ampm) => {
    let h = Number(hour) % 12
    if (ampm === 'pm') h += 12
    return { h, m: Number(minute || 0) }
  }

  const startParts = to24(timeMatch[1], timeMatch[2], timeMatch[3])
  const endParts = to24(timeMatch[4], timeMatch[5], timeMatch[6])

  const start = new Date(date)
  start.setHours(startParts.h, startParts.m, 0, 0)
  const end = new Date(date)
  end.setHours(endParts.h, endParts.m, 0, 0)

  if (end <= start) end.setDate(end.getDate() + 1)
  return { start, end }
}

function toGoogleCalendarDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export default function RsvpPage() {
  const [event, setEvent] = useState(null)
  const [foodChoices, setFoodChoices] = useState([])
  const [mainChildName, setMainChildName] = useState('')
  const [mainFoodChoiceId, setMainFoodChoiceId] = useState('')
  const [mainHasDietaryRequirements, setMainHasDietaryRequirements] = useState(false)
  const [mainDietaryRequirements, setMainDietaryRequirements] = useState('')
  const [phone, setPhone] = useState('')
  const [additionalChildren, setAdditionalChildren] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [submittedThisSession, setSubmittedThisSession] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    mainChildName: '',
    mainFoodChoiceId: '',
    additionalChildren: []
  })
  const parsedDateTime = parsePartyDateTime(
    event?.event_date || defaultDate,
    event?.party_time || defaultTime
  )
  const calendarTitle = event?.title || defaultTitle
  const calendarLocation = event?.location || defaultLocation
  const calendarDescription = event?.intro_text || defaultIntro
  const googleCalendarUrl = parsedDateTime
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        calendarTitle
      )}&dates=${toGoogleCalendarDate(
        parsedDateTime.start
      )}/${toGoogleCalendarDate(parsedDateTime.end)}&details=${encodeURIComponent(
        calendarDescription
      )}&location=${encodeURIComponent(calendarLocation)}`
    : null

  const downloadIcs = () => {
    if (!parsedDateTime) return
    const uid = `${Date.now()}@party-invite`
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Party Invite//RSVP//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(parsedDateTime.start)}`,
      `DTEND:${toIcsDate(parsedDateTime.end)}`,
      `SUMMARY:${calendarTitle.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${calendarDescription.replace(/\n/g, ' ')}`,
      `LOCATION:${calendarLocation.replace(/\n/g, ' ')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'party-invite.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

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
      mainDietaryRequirements: '',
      additionalChildren: additionalChildren.map(() => ({
        child_name: '',
        food_choice_id: '',
        dietary_requirements: ''
      }))
    }

    if (!mainChildName.trim()) errors.mainChildName = "Child's Name is required."
    if (!mainFoodChoiceId) errors.mainFoodChoiceId = 'Food Choice is required.'
    if (mainHasDietaryRequirements && !mainDietaryRequirements.trim()) {
      errors.mainDietaryRequirements = 'Please tell us the dietary requirement.'
    }

    additionalChildren.forEach((child, index) => {
      if (!child.child_name.trim()) {
        errors.additionalChildren[index].child_name = 'Child name is required.'
      }
      if (!child.food_choice_id) {
        errors.additionalChildren[index].food_choice_id = 'Food choice is required.'
      }
      if (child.has_dietary_requirements && !child.dietary_requirements.trim()) {
        errors.additionalChildren[index].dietary_requirements =
          'Please tell us the dietary requirement.'
      }
    })

    return errors
  }

  const hasValidationErrors = (errors) => {
    if (
      errors.mainChildName ||
      errors.mainFoodChoiceId ||
      errors.mainDietaryRequirements
    ) {
      return true
    }
    return errors.additionalChildren.some(
      (child) =>
        child.child_name || child.food_choice_id || child.dietary_requirements
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
          food_choice_id: Number(mainFoodChoiceId),
          has_dietary_requirements: mainHasDietaryRequirements,
          dietary_requirements: mainHasDietaryRequirements
            ? mainDietaryRequirements.trim()
            : null
        },
        ...additionalChildren.map((child) => ({
          child_name: child.child_name.trim(),
          food_choice_id: Number(child.food_choice_id),
          has_dietary_requirements: Boolean(child.has_dietary_requirements),
          dietary_requirements: child.has_dietary_requirements
            ? child.dietary_requirements.trim()
            : null
        }))
      ]
      await withTimeout(
        apiSend('/api/rsvp', 'POST', {
          invite_name_entered: mainChildName.trim(),
          phone: phone.trim() || null,
          children
        }),
        15000
      )
      setSubmittedThisSession(true)
      setShowSuccessPopup(true)
      setMainChildName('')
      setMainFoodChoiceId('')
      setMainHasDietaryRequirements(false)
      setMainDietaryRequirements('')
      setPhone('')
      setAdditionalChildren([])
      setFieldErrors({
        mainChildName: '',
        mainFoodChoiceId: '',
        mainDietaryRequirements: '',
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
            ⚽ {renderTitleWithSmallOrdinal(event?.title || defaultTitle)} ⚽
          </h1>
          <div className="event-details muted">
            <p className="event-date">{event?.event_date || '28 March 2026'}</p>
            <p className="event-time">{event?.party_time || defaultTime}</p>
            <p className="event-location">
              {event?.location || defaultLocation}
            </p>
          </div>
          <p className="hero-subtitle">
            {event?.intro_text || defaultIntro}
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
              <option value="">Select food option</option>
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
              <span className="label-title">Parent Phone</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xxxx"
            />
          </label>
          <label className="checkbox-label">
            <span className="checkbox-row">
              <input
                type="checkbox"
                checked={mainHasDietaryRequirements}
                onChange={(e) => setMainHasDietaryRequirements(e.target.checked)}
              />
              Allergies or dietary requirements
            </span>
          </label>
          {mainHasDietaryRequirements && (
            <label>
              <span className="label-title">Tell us what it is</span>
              <input
                type="text"
                value={mainDietaryRequirements}
                onChange={(e) => setMainDietaryRequirements(e.target.value)}
                placeholder="e.g. nut allergy, vegetarian"
                className={fieldErrors.mainDietaryRequirements ? 'input-invalid' : ''}
              />
              {fieldErrors.mainDietaryRequirements && (
                <span className="field-error">{fieldErrors.mainDietaryRequirements}</span>
              )}
            </label>
          )}

          <div className="children">
            <p className="children-helper">
              Bringing siblings? Add them below so we can prepare them a lunchbox too.
            </p>
            <button type="button" onClick={addChild} className="ghost add-child-full">
              + Add Another Child
            </button>

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
                    <option value="">Select food option</option>
                    {foodChoices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                  <label className="checkbox-label">
                    <span className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={Boolean(child.has_dietary_requirements)}
                        onChange={(e) =>
                          onChildChange(
                            index,
                            'has_dietary_requirements',
                            e.target.checked
                          )
                        }
                      />
                      Allergies or dietary requirements
                    </span>
                  </label>
                  {child.has_dietary_requirements && (
                    <input
                      type="text"
                      placeholder="Tell us what it is"
                      value={child.dietary_requirements || ''}
                      onChange={(e) =>
                        onChildChange(index, 'dietary_requirements', e.target.value)
                      }
                      className={
                        fieldErrors.additionalChildren[index]?.dietary_requirements
                          ? 'input-invalid'
                          : ''
                      }
                    />
                  )}
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
                    {[
                      childError.child_name,
                      childError.food_choice_id,
                      childError.dietary_requirements
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                )
              ))}
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? '🏆 Submitting...' : '🏆 Submit RSVP'}
            </button>
          </form>
        )}

        {submittedThisSession && !showSuccessPopup && (
          <p className="success">
            RSVP submitted. Refresh the page to submit another response.
          </p>
        )}

        {showSuccessPopup && (
          <div className="popup-overlay" role="dialog" aria-modal="true">
            <div className="popup-card">
              <h2>Thank you</h2>
              <p>Your RSVP has been received.</p>
              {parsedDateTime && (
                <div className="calendar-actions">
                  {googleCalendarUrl && (
                    <a
                      className="calendar-link"
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Add to Google Calendar
                    </a>
                  )}
                  <button type="button" className="calendar-link" onClick={downloadIcs}>
                    Download iPhone/Android Calendar File
                  </button>
                </div>
              )}
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
