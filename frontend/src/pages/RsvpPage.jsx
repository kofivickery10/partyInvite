import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiSend } from '../lib/api.js'

const emptyChild = () => ({ child_name: '', food_choice_id: '' })

export default function RsvpPage() {
  const [event, setEvent] = useState(null)
  const [foodChoices, setFoodChoices] = useState([])
  const [inviteName, setInviteName] = useState('')
  const [phone, setPhone] = useState('')
  const [children, setChildren] = useState([emptyChild()])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
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
    if (!inviteName.trim() || !phone.trim()) return false
    if (children.length === 0) return false
    return children.every(
      (child) => child.child_name.trim() && child.food_choice_id
    )
  }, [inviteName, phone, children])

  const onChildChange = (index, key, value) => {
    setChildren((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const addChild = () => setChildren((prev) => [...prev, emptyChild()])
  const removeChild = (index) =>
    setChildren((prev) => prev.filter((_, i) => i !== index))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await apiSend('/api/rsvp', 'POST', {
        invite_name_entered: inviteName.trim(),
        phone: phone.trim(),
        children: children.map((child) => ({
          child_name: child.child_name.trim(),
          food_choice_id: Number(child.food_choice_id)
        }))
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="page">
        <div className="card">
          <h1>RSVP received</h1>
          <p>Thanks for submitting! We will see you at the party.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <header className="hero">
          <h1 className="title-center">
            {event?.title || "Riley's 5th Birthday"}
          </h1>
          <p className="muted">
            {event?.event_date || '28 March 2026'} ·{' '}
            {(event?.party_time || '11am to 1pm')} ·{' '}
            {event?.location ||
              'White Rock Primary School, Davies Ave, Paignton TQ4 7AW'}
          </p>
          <p className="hero-subtitle">
            {event?.intro_text || 'Lace up for a footie celebration. Please RSVP below.'}
          </p>
        </header>

        <form onSubmit={submit} className="pitch-form">
          <label>
            Child's name
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Enter the child's name"
              required
            />
          </label>

          <label>
            Parent/guardian phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xxxx"
              required
            />
          </label>

          <div className="children">
            <div className="children-header">
              <h2>Children attending</h2>
              <button type="button" onClick={addChild} className="ghost">
                Add child
              </button>
            </div>

            {children.map((child, index) => (
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
                {children.length > 1 && (
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
      </div>
    </div>
  )
}
