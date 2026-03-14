import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const VEHICLE_TYPES = [
  { value: 'BIKE', icon: '🏍️', label: 'Bike', desc: 'Motorcycles & scooters' },
  { value: 'AUTO', icon: '🛺', label: 'Auto', desc: 'Three-wheelers' },
  { value: 'CAR', icon: '🚗', label: 'Car', desc: 'Four-wheelers' },
]

export default function DriverOnboarding() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    vehicleType: 'BIKE',
    vehicleName: '',
    vehicleNumber: '',
    vehicleColor: '',
    licenseNumber: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/drivers/register', { ...form, vehicleNumber: form.vehicleNumber.toUpperCase() })
      toast.success('Vehicle registered! Awaiting admin verification 🎉')
      navigate('/driver')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-2">Register Your Vehicle</h1>
      <p className="text-gray-400 mb-6">Complete your driver profile to start earning</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Vehicle Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Vehicle Type</label>
          <div className="grid grid-cols-3 gap-3">
            {VEHICLE_TYPES.map(v => (
              <button key={v.value} type="button" onClick={() => setForm(p => ({ ...p, vehicleType: v.value }))}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${
                  form.vehicleType === v.value ? 'border-primary-400 bg-primary-400/10' : 'border-white/10 bg-dark-700'
                }`}>
                <div className="text-2xl mb-1">{v.icon}</div>
                <div className="text-xs font-semibold">{v.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Name</label>
          <input type="text" value={form.vehicleName} onChange={e => setForm(p => ({ ...p, vehicleName: e.target.value }))}
            placeholder="e.g., Honda Activa, TVS Apache" required className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Number</label>
          <input type="text" value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
            placeholder="e.g., TN01AB1234" required className="input-field font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Color</label>
          <input type="text" value={form.vehicleColor} onChange={e => setForm(p => ({ ...p, vehicleColor: e.target.value }))}
            placeholder="e.g., Red, Black, Blue" className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Driving License Number</label>
          <input type="text" value={form.licenseNumber} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value.toUpperCase() }))}
            placeholder="e.g., TN0120230012345" required className="input-field font-mono" />
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-400 text-sm font-medium mb-1">📋 Verification Process</p>
          <p className="text-gray-400 text-xs">After registration, our team will verify your details within 24 hours. You'll be notified by email once approved.</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-4">
          {loading ? 'Registering...' : 'Register Vehicle →'}
        </button>
      </form>
    </div>
  )
}
