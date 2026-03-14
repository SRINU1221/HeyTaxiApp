import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getRideHistory } from '../../store/slices/rideSlice'
import { format } from 'date-fns'

const STATUS_STYLES = {
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
  REQUESTED: 'badge-requested',
  RIDE_STARTED: 'badge-on-ride',
}

const VEHICLE_ICONS = { BIKE: '🏍️', AUTO: '🛺', CAR: '🚗' }

export default function RiderHistory() {
  const dispatch = useDispatch()
  const { history, loading } = useSelector(s => s.ride)

  useEffect(() => { dispatch(getRideHistory()) }, [dispatch])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6">My Rides</h1>

      {history.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🚖</div>
          <h3 className="font-semibold text-lg mb-2">No rides yet</h3>
          <p className="text-gray-400">Your ride history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((ride) => (
            <div key={ride.id} className="card hover:border-white/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{VEHICLE_ICONS[ride.vehicleType] || '🚖'}</span>
                  <div>
                    <div className="font-semibold text-sm">{ride.vehicleType}</div>
                    <div className="text-xs text-gray-500">
                      {ride.requestedAt ? format(new Date(ride.requestedAt), 'MMM d, h:mm a') : '—'}
                    </div>
                  </div>
                </div>
                <span className={STATUS_STYLES[ride.status] || 'badge'}>{ride.status}</span>
              </div>

              <div className="flex gap-2 mb-3">
                <div className="flex flex-col items-center pt-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary-400" />
                  <div className="w-0.5 h-6 bg-white/10 my-0.5" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-sm">
                  <div className="text-gray-300 mb-2">{ride.pickupAddress}</div>
                  <div className="text-gray-300">{ride.dropAddress}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="text-xs text-gray-500">{ride.distanceKm ? `${Number(ride.distanceKm).toFixed(1)} km` : '—'}</div>
                <div className="font-bold text-primary-400">
                  {ride.actualFare ? `₹${ride.actualFare}` : ride.estimatedFare ? `~₹${ride.estimatedFare}` : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
