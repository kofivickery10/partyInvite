import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiSend, apiUpload } from '../lib/api.js'

export default function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'))
  const [event, setEvent] = useState({
    title: '',
    event_date: '',
    party_time: '',
    intro_text: '',
    location: ''
  })
  const [foodChoices, setFoodChoices] = useState([])
  const [metrics, setMetrics] = useState({ invited: 0, rsvps: 0, foodTotals: [] })
  const [rsvps, setRsvps] = useState([])
  const [invites, setInvites] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      navigate('/admin')
      return
    }

    const load = async () => {
      try {
        const [eventData, foodData, metricData, rsvpData, inviteData] =
          await Promise.all([
            apiGet('/api/admin/event', token),
            apiGet('/api/admin/food-choices', token),
            apiGet('/api/admin/metrics', token),
            apiGet('/api/admin/rsvps', token),
            apiGet('/api/admin/invites', token)
          ])
        setEvent(eventData)
        setFoodChoices(foodData)
        setMetrics(metricData)
        setRsvps(rsvpData)
        setInvites(inviteData)
      } catch (err) {
        setError(err.message)
      }
    }

    load()
  }, [token, navigate])

  const logout = () => {
    localStorage.removeItem('adminToken')
    setToken('')
    navigate('/admin')
  }

  const saveEvent = async () => {
    setMessage('')
    setError('')
    try {
      const updated = await apiSend('/api/admin/event', 'PUT', event, token)
      setEvent(updated)
      setMessage('Event settings updated.')
    } catch (err) {
      setError(err.message)
    }
  }

  const addFoodChoice = async () => {
    const label = prompt('Food choice label')
    if (!label) return
    try {
      const created = await apiSend(
        '/api/admin/food-choices',
        'POST',
        { label },
        token
      )
      setFoodChoices((prev) => [...prev, created])
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleFoodChoice = async (choice) => {
    try {
      const updated = await apiSend(
        `/api/admin/food-choices/${choice.id}`,
        'PUT',
        { label: choice.label, active: !choice.active },
        token
      )
      setFoodChoices((prev) =>
        prev.map((item) => (item.id === choice.id ? updated : item))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteFoodChoice = async (choice) => {
    if (!confirm('Delete this food choice?')) return
    try {
      await apiSend(
        `/api/admin/food-choices/${choice.id}`,
        'DELETE',
        {},
        token
      )
      setFoodChoices((prev) => prev.filter((item) => item.id !== choice.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const uploadInvites = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMessage('')
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await apiUpload('/api/admin/invites/import', formData, token)
      setMessage(`Imported ${result.inserted} invites. Skipped ${result.skipped}.`)
      const inviteData = await apiGet('/api/admin/invites', token)
      setInvites(inviteData)
    } catch (err) {
      setError(err.message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page admin-page">
      <div className="card admin-card">
        <div className="admin-header">
          <h1>Admin dashboard</h1>
          <button className="ghost" onClick={logout}>
            Log out
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <section>
          <h2>Event details</h2>
          <label>
            Title
            <textarea
              rows={2}
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
            />
          </label>
          <label>
            Date
            <textarea
              rows={2}
              value={event.event_date}
              onChange={(e) =>
                setEvent({ ...event, event_date: e.target.value })
              }
            />
          </label>
          <label>
            Time
            <textarea
              rows={2}
              value={event.party_time}
              onChange={(e) =>
                setEvent({ ...event, party_time: e.target.value })
              }
              placeholder="11am to 1pm"
            />
          </label>
          <label>
            Intro text
            <textarea
              rows={3}
              value={event.intro_text}
              onChange={(e) =>
                setEvent({ ...event, intro_text: e.target.value })
              }
              placeholder="Lace up for a footie celebration. Please RSVP below."
            />
          </label>
          <label>
            Location
            <textarea
              rows={3}
              value={event.location}
              onChange={(e) => setEvent({ ...event, location: e.target.value })}
            />
          </label>
          <button type="button" onClick={saveEvent}>
            Save event details
          </button>
        </section>

        <section>
          <div className="section-header">
            <h2>Food choices</h2>
            <button className="ghost" onClick={addFoodChoice}>
              Add choice
            </button>
          </div>
          {foodChoices.map((choice) => (
            <div key={choice.id} className="row">
              <span>
                {choice.label} {choice.active ? '' : '(inactive)'}
              </span>
              <div className="actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => toggleFoodChoice(choice)}
                >
                  {choice.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => deleteFoodChoice(choice)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2>Invite list</h2>
          <input type="file" accept=".csv" onChange={uploadInvites} />
          <p className="muted">Total invites: {invites.length}</p>
        </section>

        <section>
          <h2>Metrics</h2>
          <div className="metrics">
            <div>
              <strong>Invited</strong>
              <p>{metrics.invited}</p>
            </div>
            <div>
              <strong>RSVPs</strong>
              <p>{metrics.rsvps}</p>
            </div>
          </div>
          <h3>Food totals</h3>
          {metrics.foodTotals.map((item) => (
            <div key={item.label} className="row">
              <span>{item.label}</span>
              <span>{item.count}</span>
            </div>
          ))}
        </section>

        <section>
          <h2>RSVP list</h2>
          {rsvps.map((rsvp) => (
            <div key={rsvp.id} className="rsvp-card">
              <strong>{rsvp.invite_name_entered}</strong>
              <p>{rsvp.phone}</p>
              <ul>
                {rsvp.children.map((child) => (
                  <li key={child.id}>
                    {child.child_name} — {child.food_choice_label}
                    {child.has_dietary_requirements && child.dietary_requirements
                      ? ` — Dietary: ${child.dietary_requirements}`
                      : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
