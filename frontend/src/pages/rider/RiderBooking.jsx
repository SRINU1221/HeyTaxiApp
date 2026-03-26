import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { requestRide, cancelRide, getCurrentRide, setCurrentRide } from '../../store/slices/rideSlice'
import toast from 'react-hot-toast'
import api from '../../services/api'

const VEHICLES = [
  { type: 'BIKE', icon: '🏍️', label: 'HeyBike', desc: 'Fastest & cheapest', baseKm: 8, base: 20, eta: '3-5 min' },
  { type: 'AUTO', icon: '🛺', label: 'HeyAuto', desc: 'Comfortable & smart', baseKm: 12, base: 25, eta: '5-8 min' },
  { type: 'CAR', icon: '🚗', label: 'HeyCar', desc: 'Premium comfort', baseKm: 18, base: 40, eta: '8-12 min' },
]

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    const isReady = () =>
      typeof window !== 'undefined' &&
      typeof window.google?.maps?.Map === 'function' &&
      typeof window.google?.maps?.places?.Autocomplete === 'function'

    if (isReady()) { resolve(); return }

    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      const tick = () => isReady() ? resolve() : setTimeout(tick, 50)
      existingScript.addEventListener('load', () => setTimeout(tick, 50))
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')))
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      const startedAt = Date.now()
      const tick = () => {
        if (isReady()) return resolve()
        if (Date.now() - startedAt > 10000) return reject(new Error('Google Maps did not initialize'))
        setTimeout(tick, 50)
      }
      tick()
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'ONGOING']

export default function RiderBooking() {
  const dispatch = useDispatch()
  const { loading, currentRide } = useSelector(s => s.ride)

  const [step, setStep] = useState('loading')  // 'loading' | 'location' | 'tracking' | 'completed'
  const [pickup, setPickup] = useState({ address: '', lat: null, lng: null })
  const [drop, setDrop] = useState({ address: '', lat: null, lng: null })
  const [selectedType, setSelectedType] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [distance, setDistance] = useState(null)
  const [nearbyDrivers, setNearbyDrivers] = useState([])
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [rated, setRated] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pickupMarkerRef = useRef(null)
  const dropMarkerRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const nearbyMarkersRef = useRef({})
  const directionsRendererRef = useRef(null)
  const pickupInputRef = useRef(null)
  const dropInputRef = useRef(null)
  const pollingRef = useRef(null)
  const autocompleteInitialized = useRef(false)

  // ─── On mount: check if rider has an active ride ───────────────────────────
  useEffect(() => {
    const checkActiveRide = async () => {
      try {
        const res = await dispatch(getCurrentRide())
        if (getCurrentRide.fulfilled.match(res) && res.payload?.success) {
          const ride = res.payload.data
          if (ACTIVE_STATUSES.includes(ride.status)) {
            setStep('tracking')
          } else if (ride.status === 'COMPLETED') {
            setStep('completed')
          } else {
            setStep('location')
          }
        } else {
          setStep('location')
        }
      } catch {
        setStep('location')
      }
    }
    checkActiveRide()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load Google Maps script ───────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return
    loadGoogleMaps(GOOGLE_MAPS_KEY)
      .then(() => setMapLoaded(true))
      .catch(() => console.error('Failed to load Google Maps'))
  }, [])

  // ─── Init map + autocomplete ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || autocompleteInitialized.current || step !== 'location') return
    autocompleteInitialized.current = true

    if (mapRef.current) {
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
    }

    if (pickupInputRef.current) {
      const ac = new window.google.maps.places.Autocomplete(pickupInputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'formatted_address'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (!place.geometry) return
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        setPickup({ address: place.formatted_address, lat, lng })
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng })
          mapInstanceRef.current.setZoom(15)
          placeMarker(pickupMarkerRef, { lat, lng }, '📍')
        }
        fetchNearbyDrivers(lat, lng)
      })
    }

    if (dropInputRef.current) {
      const ac = new window.google.maps.places.Autocomplete(dropInputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'formatted_address'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (!place.geometry) return
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        setDrop({ address: place.formatted_address, lat, lng })
        if (mapInstanceRef.current) placeMarker(dropMarkerRef, { lat, lng }, '🏁')
      })
    }
  }, [mapLoaded, step])

  // ─── Fetch nearby drivers for booking map ────────────────────────────────
  const fetchNearbyDrivers = async (lat, lng) => {
    try {
      const res = await api.get(`/drivers/nearby?lat=${lat}&lng=${lng}`)
      if (res.data.success) {
        setNearbyDrivers(res.data.data || [])
      }
    } catch {
      // ignore
    }
  }

  // Draw nearby drivers on location step
  useEffect(() => {
    if (step !== 'location' || !mapInstanceRef.current || !window.google) return
    
    // Clear old markers
    Object.values(nearbyMarkersRef.current).forEach(m => m.setMap(null))
    nearbyMarkersRef.current = {}

    nearbyDrivers.forEach(driver => {
      if (!driver.currentLatitude || !driver.currentLongitude) return
      const emoji = driver.vehicleType === 'BIKE' ? '🏍️' : driver.vehicleType === 'AUTO' ? '🛺' : '🚗'
      
      const marker = new window.google.maps.Marker({
        position: { lat: driver.currentLatitude, lng: driver.currentLongitude },
        map: mapInstanceRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><text y="24" font-size="20">${emoji}</text></svg>`
          )}`,
          scaledSize: new window.google.maps.Size(30, 30),
        },
      })
      nearbyMarkersRef.current[driver.id] = marker
    })
  }, [nearbyDrivers, step])

  // ─── Draw route when both locations set ───────────────────────────────────
  useEffect(() => {
    if (!pickup.lat || !drop.lat || !window.google) return

    new window.google.maps.DistanceMatrixService().getDistanceMatrix({
      origins: [{ lat: pickup.lat, lng: pickup.lng }],
      destinations: [{ lat: drop.lat, lng: drop.lng }],
      travelMode: 'DRIVING',
    }, (res, status) => {
      if (status === 'OK') setDistance(res.rows[0].elements[0].distance.value / 1000)
    })

    if (mapInstanceRef.current) {
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#FF6B35', strokeWeight: 4 },
        })
      }
      new window.google.maps.DirectionsService().route({
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: drop.lat, lng: drop.lng },
        travelMode: 'DRIVING',
      }, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result)
          const bounds = new window.google.maps.LatLngBounds()
          bounds.extend({ lat: pickup.lat, lng: pickup.lng })
          bounds.extend({ lat: drop.lat, lng: drop.lng })
          mapInstanceRef.current.fitBounds(bounds)
        }
      })
    }
  }, [pickup.lat, drop.lat])

  // ─── Draw route and driver marker on tracking map ────────────────────────
  useEffect(() => {
    if (step !== 'tracking' || !currentRide || !mapInstanceRef.current || !window.google) return

    const { status, pickupLatitude, pickupLongitude, dropLatitude, dropLongitude, driverLatitude, driverLongitude } = currentRide
    
    // Draw driver marker
    if (driverLatitude && driverLongitude) {
      const emoji = currentRide.vehicleType === 'BIKE' ? '🏍️' : currentRide.vehicleType === 'AUTO' ? '🛺' : '🚗'
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: { lat: driverLatitude, lng: driverLongitude },
          map: mapInstanceRef.current,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text y="32" font-size="28">${emoji}</text></svg>`
            )}`,
            scaledSize: new window.google.maps.Size(40, 40),
          },
        })
      } else {
        // Simple animate to new position
        driverMarkerRef.current.setPosition({ lat: driverLatitude, lng: driverLongitude })
      }
    }

    // Draw Route
    if (!pickupLatitude || !dropLatitude) return
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#FF6B35', strokeWeight: 4 },
      })
    }

    let origin, destination
    if (status === 'ACCEPTED' || status === 'DRIVER_ARRIVING') {
      if (!driverLatitude) return // Wait for driver location
      origin = { lat: driverLatitude, lng: driverLongitude }
      destination = { lat: pickupLatitude, lng: pickupLongitude }
      placeMarker(pickupMarkerRef, destination, '📍')
      if (dropMarkerRef.current) dropMarkerRef.current.setMap(null)
    } else if (status === 'ONGOING') {
      origin = { lat: pickupLatitude, lng: pickupLongitude }
      destination = { lat: dropLatitude, lng: dropLongitude }
      placeMarker(pickupMarkerRef, origin, '📍')
      placeMarker(dropMarkerRef, destination, '🏁')
    } else {
      return
    }

    new window.google.maps.DirectionsService().route({
      origin, destination, travelMode: 'DRIVING'
    }, (result, dsStatus) => {
      if (dsStatus === 'OK') {
        directionsRendererRef.current.setDirections(result)
        
        // Auto fit bounds
        const bounds = new window.google.maps.LatLngBounds()
        bounds.extend(origin)
        bounds.extend(destination)
        mapInstanceRef.current.fitBounds(bounds)
      }
    })
    
  }, [currentRide, step, mapLoaded])

  // ─── Polling for ride status updates ──────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      const res = await dispatch(getCurrentRide())
      if (getCurrentRide.fulfilled.match(res) && res.payload?.success) {
        const ride = res.payload.data
        if (ride.status === 'COMPLETED') {
          stopPolling()
          setStep('completed')
          toast.success('Ride completed! 🎉')
        } else if (ride.status === 'CANCELLED') {
          stopPolling()
          setStep('location')
          toast.error('Ride was cancelled')
        }
      }
    }, 5000)
  }, [dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }

  useEffect(() => {
    if (step === 'tracking' && currentRide && ACTIVE_STATUSES.includes(currentRide.status)) {
      startPolling()
    } else if (step !== 'tracking') {
      stopPolling()
    }
    return () => stopPolling()
  }, [step, currentRide?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const placeMarker = (markerRef, position, emoji) => {
    if (markerRef.current) markerRef.current.setMap(null)
    markerRef.current = new window.google.maps.Marker({
      position, map: mapInstanceRef.current,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text y="32" font-size="28">${emoji}</text></svg>`
        )}`,
        scaledSize: new window.google.maps.Size(40, 40),
      },
    })
  }

  const estimateFare = (v) => Math.round(v.base + v.baseKm * (distance || 5))

  const handleBook = async () => {
    if (!pickup.address || !drop.address) { toast.error('Enter pickup and drop locations'); return }
    if (!selectedType) { toast.error('Select a vehicle type'); return }
    if (!pickup.lat || !drop.lat) { toast.error('Please select locations from the dropdown suggestions'); return }

    const result = await dispatch(requestRide({
      pickupAddress: pickup.address,
      pickupLatitude: pickup.lat,
      pickupLongitude: pickup.lng,
      dropAddress: drop.address,
      dropLatitude: drop.lat,
      dropLongitude: drop.lng,
      vehicleType: selectedType,
      paymentMethod,
    }))

    if (requestRide.fulfilled.match(result) && result.payload?.success) {
      toast.success('Ride requested! Finding drivers... 🚖')
      autocompleteInitialized.current = false
      setStep('tracking')
    } else {
      toast.error(result.payload || 'Failed to book ride')
    }
  }

  const handleCancel = async () => {
    if (!currentRide) return
    await dispatch(cancelRide({ rideId: currentRide.id, reason: 'Cancelled by rider' }))
    toast.success('Ride cancelled')
    setStep('location')
  }

  // ─── Load Razorpay ────────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const handleRazorpayPayment = () => {
    if (!currentRide?.razorpayOrderId) { toast.error('Payment order not found'); return }
    new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round((currentRide.actualFare || currentRide.estimatedFare) * 100),
      currency: 'INR',
      name: 'HeyTaxi',
      description: `Ride #${currentRide.id}`,
      order_id: currentRide.razorpayOrderId,
      handler: async (response) => {
        try {
          const res = await api.post(`/rides/${currentRide.id}/verify-payment`, {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          })
          if (res.data.success) {
            toast.success('Payment successful! 🎉')
            dispatch(setCurrentRide(res.data.data))
          } else {
            toast.error('Payment verification failed')
          }
        } catch { toast.error('Payment verification failed') }
      },
      prefill: { name: 'HeyTaxi Rider', email: '' },
      theme: { color: '#FF6B35' },
    }).open()
  }

  const handleRate = async () => {
    if (!rating) { toast.error('Please select a rating'); return }
    try {
      await api.post(`/rides/${currentRide.id}/rate`, { rating, feedback })
      toast.success('Thanks for your feedback! ⭐')
      setRated(true)
    } catch { toast.error('Failed to submit rating') }
  }

  const resetBooking = () => {
    setStep('location')
    setPickup({ address: '', lat: null, lng: null })
    setDrop({ address: '', lat: null, lng: null })
    setDistance(null)
    setSelectedType(null)
    setRating(0)
    setFeedback('')
    setRated(false)
    autocompleteInitialized.current = false
  }

  const STATUS = {
    REQUESTED:       { label: 'Looking for drivers...', icon: '🔍', color: 'text-amber-400', desc: 'Please wait while we find a driver near you' },
    ACCEPTED:        { label: 'Driver assigned!', icon: '✅', color: 'text-emerald-400', desc: 'Share your OTP when driver arrives.' },
    DRIVER_ARRIVING: { label: 'Driver is arriving', icon: '🏃', color: 'text-blue-400', desc: 'Your driver is almost there!' },
    ONGOING:         { label: 'Ride in progress', icon: '🚖', color: 'text-primary-400', desc: 'Sit back and enjoy the ride!' },
    COMPLETED:       { label: 'Ride completed!', icon: '🎉', color: 'text-emerald-400', desc: '' },
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-40 p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-primary-400 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-400 text-sm">Checking ride status...</div>
        </div>
      </div>
    )
  }

  // ─── COMPLETED ────────────────────────────────────────────────────────────
  if (step === 'completed' && currentRide) {
    const needsPayment = currentRide.paymentMethod === 'RAZORPAY' && currentRide.paymentStatus !== 'COMPLETED'
    return (
      <div className="p-6 max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-display font-bold mb-2">Ride Completed!</h1>
          <p className="text-gray-400">Thanks for riding with HeyTaxi</p>
        </div>
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Trip Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-400">📍 Pickup</span><span className="text-right max-w-[60%] text-xs">{currentRide.pickupAddress}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">🏁 Drop</span><span className="text-right max-w-[60%] text-xs">{currentRide.dropAddress}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">📏 Distance</span><span>{Number(currentRide.distanceKm).toFixed(1)} km</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">⏱️ Duration</span><span>{currentRide.durationMinutes} min</span></div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between font-bold text-lg"><span>Total Fare</span><span className="text-primary-400">₹{currentRide.actualFare || currentRide.estimatedFare}</span></div>
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Platform fee</span><span>₹{currentRide.commissionAmount}</span></div>
            </div>
          </div>
        </div>
        {needsPayment && (
          <button onClick={handleRazorpayPayment} className="btn-primary w-full mb-4">
            💳 Pay ₹{currentRide.actualFare || currentRide.estimatedFare} via Razorpay
          </button>
        )}
        {currentRide.paymentStatus === 'COMPLETED' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 mb-4 text-center">
            <span className="text-emerald-400 text-sm font-medium">✅ Payment Completed</span>
          </div>
        )}
        {!rated ? (
          <div className="card mb-4">
            <h3 className="font-semibold mb-3">Rate your driver</h3>
            <div className="flex gap-2 justify-center mb-3">
              {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} className={`text-3xl transition-all ${s <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>)}
            </div>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Any feedback? (optional)" className="input-field text-sm mb-3 resize-none h-20" />
            <button onClick={handleRate} disabled={!rating} className="btn-primary w-full">Submit Rating</button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 mb-4 text-center">
            <span className="text-emerald-400 text-sm">⭐ Thanks for rating!</span>
          </div>
        )}
        <button onClick={resetBooking} className="w-full py-3 rounded-2xl border border-white/10 text-gray-300 hover:border-white/30 transition-all">
          Book Another Ride
        </button>
      </div>
    )
  }

  // ─── TRACKING ─────────────────────────────────────────────────────────────
  if (step === 'tracking' && currentRide && !['COMPLETED', 'CANCELLED'].includes(currentRide.status)) {
    const status = STATUS[currentRide.status] || STATUS.REQUESTED
    return (
      <div className="p-6 max-w-lg mx-auto animate-fade-in flex flex-col h-[calc(100vh-80px)]">
        <h1 className="text-2xl font-display font-bold mb-4 shrink-0">Live Tracking</h1>
        
        {/* Live Map */}
        <div className="rounded-3xl overflow-hidden mb-4 border border-white/5 bg-dark-800 shrink-0" style={{ height: '35vh', minHeight: '220px' }}>
          {mapLoaded ? (
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">Loading map...</div>
          )}
        </div>
        
        <div className="card mb-4 shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-4xl ${status.color}`}>{status.icon}</div>
            <div>
              <div className={`font-bold text-lg ${status.color}`}>{status.label}</div>
              <div className="text-gray-400 text-sm leading-tight">{status.desc}</div>
            </div>
          </div>

          {currentRide.rideOtp && ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING'].includes(currentRide.status) && (
            <div className="bg-primary-400/10 border border-primary-400/30 rounded-2xl p-4 mb-4 text-center">
              <div className="text-xs text-primary-400 font-semibold mb-1 uppercase tracking-wider">🔐 Share this OTP with your driver</div>
              <div className="text-4xl font-bold tracking-[0.5em] text-white">{currentRide.rideOtp}</div>
              <div className="text-xs text-gray-400 mt-1">Driver will enter this to start your ride</div>
            </div>
          )}
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
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
            <div className="text-center"><div className="text-primary-400 font-bold">₹{currentRide.estimatedFare}</div><div className="text-xs text-gray-400">Est. Fare</div></div>
            <div className="text-center"><div className="text-white font-bold">{currentRide.vehicleType}</div><div className="text-xs text-gray-400">Vehicle</div></div>
            <div className="text-center"><div className="text-white font-bold">#{currentRide.id}</div><div className="text-xs text-gray-400">Ride ID</div></div>
          </div>
        </div>
        {['REQUESTED', 'ACCEPTED'].includes(currentRide.status) && (
          <button onClick={handleCancel} className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-medium">
            Cancel Ride
          </button>
        )}
      </div>
    )
  }

  // If we have tracking step but ride is gone/cancelled, reset to location
  if (step === 'tracking' && !currentRide) {
    setStep('location')
  }

  // ─── BOOKING ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-4">Book a Ride</h1>

      {/* Map */}
      <div className="rounded-3xl overflow-hidden mb-4 border border-white/5" style={{ height: 220 }}>
        {mapLoaded ? (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="h-full bg-dark-800 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🗺️</div>
              <div className="text-sm">{GOOGLE_MAPS_KEY ? 'Loading Google Maps...' : '⚠️ Add VITE_GOOGLE_MAPS_KEY to .env'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="card mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary-400 flex-shrink-0" />
            <input ref={pickupInputRef} type="text" placeholder="📍 Enter pickup location"
              value={pickup.address}
              onChange={e => setPickup(p => ({ ...p, address: e.target.value, lat: null, lng: null }))}
              className="input-field text-sm flex-1" autoComplete="off" />
          </div>
          <div className="ml-1.5 w-0.5 h-4 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />
            <input ref={dropInputRef} type="text" placeholder="🏁 Enter drop location"
              value={drop.address}
              onChange={e => setDrop(p => ({ ...p, address: e.target.value, lat: null, lng: null }))}
              className="input-field text-sm flex-1" autoComplete="off" />
          </div>
        </div>
        {distance && (
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400 text-center">
            📏 Distance: ~{distance.toFixed(1)} km via road
          </div>
        )}
      </div>

      {/* Vehicles + Payment + Book */}
      {pickup.address && drop.address && (
        <>
          <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-wider">Choose vehicle</h3>
          <div className="space-y-3 mb-4">
            {VEHICLES.map((v) => (
              <button key={v.type} onClick={() => setSelectedType(v.type)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  selectedType === v.type ? 'border-primary-400 bg-primary-400/10' : 'border-white/8 bg-dark-800 hover:border-white/20'
                }`}>
                <span className="text-3xl">{v.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{v.label}</div>
                  <div className="text-gray-400 text-sm">{v.desc} • {v.eta}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">₹{estimateFare(v)}</div>
                  <div className="text-xs text-gray-500">est. fare</div>
                </div>
              </button>
            ))}
          </div>
          <div className="card mb-4">
            <h3 className="font-semibold text-sm text-gray-400 mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'CASH', icon: '💵', label: 'Cash' }, { value: 'RAZORPAY', icon: '💳', label: 'Online' }].map(m => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2 transition-all ${
                    paymentMethod === m.value ? 'border-primary-400 bg-primary-400/10' : 'border-white/10 bg-dark-700 hover:border-white/20'
                  }`}>
                  <span className="text-xl">{m.icon}</span>
                  <span className="font-medium text-sm">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-dark-700 rounded-2xl p-3 mb-4 border border-white/5">
            <p className="text-xs text-gray-400 text-center">💡 Includes ₹2 platform fee • Fare may vary based on actual distance</p>
          </div>
          <button onClick={handleBook}
            disabled={loading || !pickup.address || !drop.address || !selectedType}
            className="btn-primary w-full text-base py-4">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Booking...
              </span>
            ) : `Book ${selectedType || 'Ride'} 🚖`}
          </button>
        </>
      )}
    </div>
  )
}
