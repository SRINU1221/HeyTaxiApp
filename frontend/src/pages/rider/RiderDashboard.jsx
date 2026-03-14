import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

const VEHICLE_OPTIONS = [
  { icon: '🏍️', label: 'Bike', desc: 'From ₹20', bg: 'from-orange-500/10 to-red-500/5', border: 'border-orange-500/20' },
  { icon: '🛺', label: 'Auto', desc: 'From ₹25', bg: 'from-yellow-500/10 to-orange-500/5', border: 'border-yellow-500/20' },
  { icon: '🚗', label: 'Car', desc: 'From ₹40', bg: 'from-blue-500/10 to-indigo-500/5', border: 'border-blue-500/20' },
]

const QUICK_TIPS = [
  { icon: '⚡', title: 'Instant Booking', desc: 'Find drivers in seconds' },
  { icon: '₹', title: 'Fair Pricing', desc: 'Only ₹2 platform fee' },
  { icon: '⭐', title: 'Rate Your Ride', desc: 'Help improve quality' },
]

export default function RiderDashboard() {
  const { user } = useSelector(s => s.auth)
  const { currentRide } = useSelector(s => s.ride)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || localStorage.getItem('name')?.split(' ')[0] || 'Rider'

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-400 text-sm mb-1">{greeting} 👋</p>
        <h1 className="text-3xl font-display font-bold">{firstName}</h1>
        <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
          🧑 Rider
        </span>
      </div>

      {/* Active Ride Banner */}
      {currentRide && (
        <div className="mb-6 bg-gradient-to-r from-primary-400/20 to-orange-500/10 rounded-3xl p-5 border border-primary-400/30 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-primary-400 inline-block animate-pulse" />
                <span className="text-primary-400 text-sm font-semibold">RIDE IN PROGRESS</span>
              </div>
              <p className="font-semibold">{currentRide.pickupAddress} → {currentRide.dropAddress}</p>
              <p className="text-gray-400 text-sm mt-1">Est. ₹{currentRide.estimatedFare}</p>
            </div>
            <Link to="/rider/book" className="btn-primary text-sm py-2 px-4">Track →</Link>
          </div>
        </div>
      )}

      {/* Quick Book CTA */}
      <Link to="/rider/book"
        className="block mb-6 bg-gradient-to-br from-primary-400 to-orange-500 rounded-3xl p-6 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
        <div className="absolute -right-8 -bottom-8 text-8xl opacity-20 group-hover:opacity-30 transition-opacity">🚖</div>
        <div className="relative">
          <p className="text-orange-100 text-sm font-medium mb-2">WHERE TO?</p>
          <h2 className="text-2xl font-display font-bold text-white mb-4">Book a ride now</h2>
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm text-white font-medium">
            Tap to book →
          </div>
        </div>
      </Link>

      {/* Vehicle Types */}
      <div className="mb-6">
        <h3 className="font-display font-semibold text-lg mb-3">Available vehicles</h3>
        <div className="grid grid-cols-3 gap-3">
          {VEHICLE_OPTIONS.map((v) => (
            <Link to="/rider/book" key={v.label}
              className={`bg-gradient-to-br ${v.bg} rounded-2xl p-4 border ${v.border} hover:scale-105 transition-transform duration-200 text-center`}>
              <div className="text-3xl mb-2">{v.icon}</div>
              <div className="font-semibold text-sm">{v.label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{v.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div>
        <h3 className="font-display font-semibold text-lg mb-3">How it works</h3>
        <div className="space-y-3">
          {QUICK_TIPS.map((t) => (
            <div key={t.title} className="card flex items-center gap-4 py-4">
              <div className="w-10 h-10 bg-primary-400/10 rounded-xl flex items-center justify-center text-xl border border-primary-400/20">
                {t.icon}
              </div>
              <div>
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-gray-400 text-xs">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
