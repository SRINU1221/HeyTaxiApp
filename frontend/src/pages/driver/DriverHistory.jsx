import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getDriverRides } from '../../store/slices/driverSlice'
import { format } from 'date-fns'

export default function DriverHistory() {
  const dispatch = useDispatch()
  const { rideHistory, loading } = useSelector(s => s.driver)

  useEffect(() => { dispatch(getDriverRides()) }, [dispatch])

  const totalEarned = rideHistory
    .filter(r => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + (Number(r.driverEarnings) || 0), 0)

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-2">Ride History</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-primary-400">₹{totalEarned.toFixed(0)}</div>
          <div className="text-xs text-gray-400 mt-1">Total Earned</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold">{rideHistory.filter(r => r.status === 'COMPLETED').length}</div>
          <div className="text-xs text-gray-400 mt-1">Completed Rides</div>
        </div>
      </div>

      {rideHistory.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="font-semibold text-lg mb-2">No rides yet</h3>
          <p className="text-gray-400">Go online to start accepting rides</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rideHistory.map(ride => (
            <div key={ride.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-400">
                  {ride.requestedAt ? format(new Date(ride.requestedAt), 'MMM d, h:mm a') : '—'}
                </div>
                <span className={`badge ${ride.status === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled'}`}>
                  {ride.status}
                </span>
              </div>
              <div className="text-sm mb-3">
                <div className="text-gray-300 mb-1">📍 {ride.pickupAddress}</div>
                <div className="text-gray-300">🏁 {ride.dropAddress}</div>
              </div>
              {ride.status === 'COMPLETED' && (
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="text-xs text-gray-500">Fare: ₹{ride.actualFare} • Commission: ₹{ride.commissionAmount}</div>
                  <div className="font-bold text-emerald-400">+₹{ride.driverEarnings}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
