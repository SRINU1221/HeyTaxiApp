import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { driverAPI, userAPI } from '../../services/api'

export default function DriverProfile() {
  const { user: authUser } = useSelector(s => s.auth)
  const { profile: driverProfile } = useSelector(s => s.driver)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const [dRes] = await Promise.allSettled([driverAPI.getProfile()])
      if (dRes.status === 'fulfilled') setProfile(dRes.value.data.data)
    } catch { setMsg('Failed to load profile') }
    finally { setLoading(false) }
  }

  const displayName = profile?.name || driverProfile?.name || authUser?.name || 'Driver'
  const displayEmail = profile?.email || driverProfile?.email || authUser?.email || ''
  const displayRole = authUser?.role || localStorage.getItem('role') || 'DRIVER'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Driver Profile</h1>

      {msg && <div className="p-3 rounded-lg text-sm bg-red-500/20 text-red-400">{msg}</div>}

      {/* Avatar + Role */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-3xl font-bold text-white">
          {displayName[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{displayName}</h2>
          <p className="text-gray-400 text-sm">{displayEmail}</p>
          <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            🚖 {displayRole}
          </span>
          {profile?.isVerified && (
            <span className="inline-block ml-2 mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              ✅ Verified
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Rides', value: profile?.totalRides ?? 0, icon: '🚖' },
          { label: 'Earned', value: `₹${profile?.totalEarnings ?? 0}`, icon: '💰' },
          { label: 'Rating', value: `${profile?.averageRating ?? '5.0'} ⭐`, icon: '⭐' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-display font-bold text-lg">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Vehicle Info */}
      {profile && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Vehicle Details</h3>
          <div className="space-y-3">
            {[
              { label: 'Vehicle Type', value: profile.vehicleType },
              { label: 'Vehicle Name', value: profile.vehicleName },
              { label: 'Vehicle Number', value: profile.vehicleNumber },
              { label: 'Vehicle Color', value: profile.vehicleColor },
              { label: 'License Number', value: profile.licenseNumber },
              { label: 'Status', value: profile.status },
            ].filter(i => i.value).map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!profile && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🚖</div>
          <p className="text-gray-400 mb-4">No vehicle registered yet</p>
          <a href="/driver/onboarding" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
            Register Vehicle →
          </a>
        </div>
      )}
    </div>
  )
}
