import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import api from '../../services/api'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

export default function DriverDashboard() {
  const { user } = useSelector(s => s.auth)

  const [isOnline, setIsOnline] = useState(false)
  const [availableRides, setAvailableRides] = useState([])
  const [currentRide, setCurrentRide] = useState(null)
  const [vehicleType, setVehicleType] = useState(null)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [todayStats, setTodayStats] = useState({ rides: 0, earnings: 0 })

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pollingRef = useRef(null)
  // ✅ Refs avoid stale closures inside setInterval
  const vehicleTypeRef = useRef(null)

  useEffect(() => { vehicleTypeRef.current = vehicleType }, [vehicleType])

  // ─── Fetch driver profile to get vehicleType ──────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/drivers/profile')
        if (res.data.success) {
          const data = res.data.data
          const vt = data?.vehicle?.vehicleType || data?.vehicleType || data?.vehicle_type
          if (vt) { setVehicleType(vt); vehicleTypeRef.current = vt }
          console.log('[Driver] vehicle type:', vt, '| full data:', data)
        }
      } catch (err) {
        console.warn('[Driver] profile fetch failed:', err.message)
      }
    }
    fetchProfile()
  }, [])

  // ─── Load Google Maps ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return
    if (window.google?.maps?.Map) { setMapLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { clearInterval(check); setMapLoaded(true) }
      }, 100)
    }
    document.head.appendChild(script)
  }, [])

  // ─── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 17.3850, lng: 78.4867 },
      zoom: 13,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c54' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f3460' }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    })
  }, [mapLoaded])

  // ─── fetchCurrentRide — returns true if active ride ───────────────────────
  const fetchCurrentRide = useCallback(async () => {
    try {
      const res = await api.get('/rides/driver-current')
      if (res.data.success && res.data.data) {
        setCurrentRide(res.data.data)
        return true
      } else {
        setCurrentRide(null)
        return false
      }
    } catch {
      setCurrentRide(null)
      return false
    }
  }, [])

  // ─── fetchAvailableRides — always uses vehicleTypeRef (no stale closure) ──
  const fetchAvailableRides = useCallback(async () => {
    try {
      const vt = vehicleTypeRef.current
      const url = vt ? `/rides/available?vehicleType=${vt}` : '/rides/available'
      console.log('[Driver] polling:', url)
      const res = await api.get(url)
      if (res.data.success) setAvailableRides(res.data.data || [])
    } catch {
      setAvailableRides([])
    }
  }, [])

  // ─── Polling — starts/stops with isOnline ─────────────────────────────────
  useEffect(() => {
    if (isOnline) {
      // Immediate first fetch
      fetchCurrentRide().then(hasRide => { if (!hasRide) fetchAvailableRides() })

      // ✅ Both functions use refs internally — no stale closures
      pollingRef.current = setInterval(async () => {
        const hasRide = await fetchCurrentRide()
        if (!hasRide) await fetchAvailableRides()
      }, 5000)
    } else {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      setAvailableRides([])
      setCurrentRide(null)
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null } }
  }, [isOnline, fetchCurrentRide, fetchAvailableRides])

  const showRouteOnMap = (pickupLat, pickupLng, dropLat, dropLng) => {
    if (!window.google || !mapInstanceRef.current) return
    const renderer = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#FF6B35', strokeWeight: 4 },
    })
    new window.google.maps.DirectionsService().route({
      origin: { lat: pickupLat, lng: pickupLng },
      destination: { lat: dropLat, lng: dropLng },
      travelMode: 'DRIVING',
    }, (result, status) => {
      if (status === 'OK') renderer.setDirections(result)
    })
  }

  const toggleOnline = async () => {
    setLoading(true)
    try {
      await api.patch(`/drivers/status?status=${!isOnline ? 'ONLINE' : 'OFFLINE'}`)
      setIsOnline(prev => !prev)
      toast.success(!isOnline ? '🟢 You are online! Looking for rides...' : '🔴 You are offline')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (rideId) => {
    setLoading(true)
    try {
      const res = await api.post(`/rides/${rideId}/accept`)
      if (res.data.success) {
        const ride = res.data.data
        setCurrentRide(ride)
        setAvailableRides([])
        toast.success('Ride accepted! Head to pickup location 🚖')
        if (mapLoaded && mapInstanceRef.current && ride.pickupLatitude) {
          showRouteOnMap(ride.pickupLatitude, ride.pickupLongitude, ride.dropLatitude, ride.dropLongitude)
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept — ride may be taken!')
      fetchAvailableRides()
    } finally {
      setLoading(false)
    }
  }

  const handleArriving = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/rides/${currentRide.id}/arriving`)
      if (res.data.success) { setCurrentRide(res.data.data); toast.success('Rider notified you have arrived!') }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleStartRide = async () => {
    if (otp.length !== 4) { toast.error('Enter 4-digit OTP'); return }
    setLoading(true)
    try {
      const res = await api.post(`/rides/${currentRide.id}/start`, { otp })
      if (res.data.success) {
        setCurrentRide(res.data.data)
        setOtp('')
        toast.success('OTP verified! Ride started 🚀')
      } else {
        toast.error(res.data.message || 'Invalid OTP')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/rides/${currentRide.id}/complete`)
      if (res.data.success) {
        const completed = res.data.data
        toast.success(`Ride completed! You earned ₹${completed.driverEarnings} 💰`)
        setTodayStats(p => ({ rides: p.rides + 1, earnings: p.earnings + (completed.driverEarnings || 0) }))
        setCurrentRide(null)
        fetchAvailableRides()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete ride')
    } finally {
      setLoading(false)
    }
  }

  const vehicleIcon = (type) => type === 'BIKE' ? '🏍️' : type === 'AUTO' ? '🛺' : '🚗'

  return (
    <div className="p-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Driver Hub</h1>
          <p className="text-gray-400 text-sm">
            Welcome, {user?.name}
            {vehicleType && <span className="ml-2 text-xs text-primary-400">{vehicleIcon(vehicleType)} {vehicleType}</span>}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
          isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
        }`}>
          {isOnline ? '🟢 Online' : '⚫ Offline'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-400">{todayStats.rides}</div>
          <div className="text-xs text-gray-400">Rides Today</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-400">₹{todayStats.earnings}</div>
          <div className="text-xs text-gray-400">Today's Earnings</div>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-3xl overflow-hidden mb-4 border border-white/5" style={{ height: 180 }}>
        {mapLoaded ? (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="h-full bg-dark-800 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-3xl mb-2">🗺️</div>
              <div className="text-xs">{GOOGLE_MAPS_KEY ? 'Loading map...' : 'Add VITE_GOOGLE_MAPS_KEY'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Go Online / Offline */}
      {!currentRide && (
        <button onClick={toggleOnline} disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-lg mb-6 transition-all ${
            isOnline
              ? 'bg-red-500/20 border-2 border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'btn-primary'
          }`}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating...
            </span>
          ) : isOnline ? '🔴 Go Offline' : '🟢 Go Online — Start Earning'}
        </button>
      )}

      {/* ── ACTIVE RIDE ── */}
      {currentRide && (
        <div className="card mb-6 border border-primary-400/20 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">
              {currentRide.status === 'ACCEPTED' ? '📍' :
               currentRide.status === 'DRIVER_ARRIVING' ? '🔢' :
               currentRide.status === 'ONGOING' ? '🚖' : '✅'}
            </div>
            <div>
              <div className={`font-bold ${
                currentRide.status === 'ACCEPTED' ? 'text-amber-400' :
                currentRide.status === 'DRIVER_ARRIVING' ? 'text-blue-400' : 'text-emerald-400'
              }`}>
                {currentRide.status === 'ACCEPTED' ? 'Head to pickup location' :
                 currentRide.status === 'DRIVER_ARRIVING' ? 'Ask rider for OTP' :
                 currentRide.status === 'ONGOING' ? 'Ride in progress' : currentRide.status}
              </div>
              <div className="text-xs text-gray-400">Ride #{currentRide.id} • {currentRide.vehicleType}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-3 h-3 rounded-full bg-primary-400" />
              <div className="w-0.5 h-8 bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-0.5">Pickup</div>
              <div className="font-medium text-sm mb-2">{currentRide.pickupAddress}</div>
              <div className="text-xs text-gray-400 mb-0.5">Drop</div>
              <div className="font-medium text-sm">{currentRide.dropAddress}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 border-t border-white/5 mb-4">
            <div className="text-center">
              <div className="font-bold text-primary-400">₹{currentRide.estimatedFare}</div>
              <div className="text-xs text-gray-400">Fare</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-emerald-400">₹{currentRide.estimatedFare - 2}</div>
              <div className="text-xs text-gray-400">Your Earnings</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{currentRide.paymentMethod}</div>
              <div className="text-xs text-gray-400">Payment</div>
            </div>
          </div>

          {currentRide.status === 'ACCEPTED' && (
            <button onClick={handleArriving} disabled={loading}
              className="w-full py-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium mb-3 hover:bg-amber-500/30 transition-all">
              📍 I've Arrived at Pickup Location
            </button>
          )}

          {currentRide.status === 'DRIVER_ARRIVING' && (
            <div className="bg-dark-700 rounded-2xl p-4 mb-3">
              <div className="text-sm font-medium text-gray-300 mb-3 text-center">🔢 Ask rider for their OTP</div>
              <div className="flex gap-2">
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="_ _ _ _"
                  className="input-field text-center text-2xl tracking-[0.5em] flex-1 font-bold"
                />
                <button onClick={handleStartRide} disabled={loading || otp.length !== 4}
                  className="px-5 py-2 bg-primary-400 text-white rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-primary-500 transition-all">
                  ✓
                </button>
              </div>
            </div>
          )}

          {currentRide.status === 'ONGOING' && (
            <button onClick={handleComplete} disabled={loading}
              className="w-full py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-lg hover:bg-emerald-500/30 transition-all">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  Completing...
                </span>
              ) : '🏁 Complete Ride'}
            </button>
          )}
        </div>
      )}

      {/* ── AVAILABLE RIDES ── */}
      {isOnline && !currentRide && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-300">
              Available Rides
              {availableRides.length > 0 && (
                <span className="ml-2 bg-primary-400 text-white text-xs px-2 py-0.5 rounded-full">
                  {availableRides.length}
                </span>
              )}
            </h3>
            <button onClick={fetchAvailableRides}
              className="text-xs text-primary-400 hover:text-primary-300 border border-primary-400/30 px-2 py-1 rounded-lg">
              ↻ Refresh
            </button>
          </div>

          {availableRides.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3 animate-pulse">🔍</div>
              <div className="text-gray-400 font-medium">Looking for ride requests...</div>
              <div className="text-gray-500 text-sm mt-1">Auto-refreshes every 5 seconds</div>
              {vehicleType && (
                <div className="mt-3 text-xs text-gray-600 bg-dark-700 rounded-xl px-3 py-2 inline-block">
                  Matching: {vehicleIcon(vehicleType)} {vehicleType} rides only
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {availableRides.map(ride => (
                <div key={ride.id} className="card border border-primary-400/20 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{vehicleIcon(ride.vehicleType)}</span>
                      <div>
                        <div className="font-semibold text-sm">{ride.vehicleType}</div>
                        <div className="text-xs text-gray-400">Ride #{ride.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary-400 font-bold text-lg">₹{ride.estimatedFare}</div>
                      <div className="text-xs text-emerald-400">You earn ₹{ride.estimatedFare - 2}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 mb-3">
                    <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary-400" />
                      <div className="w-0.5 h-5 bg-white/10" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400">Pickup</div>
                      <div className="text-sm truncate font-medium">{ride.pickupAddress}</div>
                      <div className="text-xs text-gray-400 mt-1">Drop</div>
                      <div className="text-sm truncate font-medium">{ride.dropAddress}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>💳 {ride.paymentMethod === 'CASH' ? 'Cash' : 'Online'}</span>
                    <span>📏 {ride.distanceKm?.toFixed(1) || '?'} km</span>
                  </div>

                  <button onClick={() => handleAccept(ride.id)} disabled={loading}
                    className="btn-primary w-full py-3 font-semibold">
                    {loading ? 'Accepting...' : '✅ Accept Ride'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isOnline && !currentRide && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">😴</div>
          <div className="text-gray-400 font-medium">You are offline</div>
          <div className="text-gray-500 text-sm mt-1">Tap "Go Online" to start receiving rides</div>
        </div>
      )}
    </div>
  )
}
