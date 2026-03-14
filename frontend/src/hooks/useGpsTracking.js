// src/hooks/useGpsTracking.js
// Driver uses this hook to continuously send their GPS to the backend
import { useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

/**
 * useGpsTracking
 * 
 * When active=true:
 *   1. Requests browser location permission
 *   2. Sends lat/lng to /rides/location every 4 seconds
 *   3. Stops automatically when active=false or component unmounts
 * 
 * Usage in DriverDashboard:
 *   useGpsTracking(isOnline)
 */
export function useGpsTracking(active) {
  const intervalRef = useRef(null)
  const watchRef = useRef(null)
  const latestPositionRef = useRef(null)

  const sendLocation = useCallback(async () => {
    if (!latestPositionRef.current) return
    const { latitude, longitude } = latestPositionRef.current
    try {
      await api.patch('/rides/location', { latitude, longitude })
    } catch (err) {
      // Silently fail — GPS updates are best-effort
      console.debug('[GPS] send failed:', err.message)
    }
  }, [])

  useEffect(() => {
    if (!active) {
      // Stop everything
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
      latestPositionRef.current = null
      return
    }

    if (!navigator.geolocation) {
      console.warn('[GPS] Geolocation not supported in this browser')
      return
    }

    // Start watching position — updates latestPositionRef whenever device moves
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPositionRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }
      },
      (err) => {
        console.warn('[GPS] Position error:', err.message)
        // If permission denied, try one-shot fallback
        if (err.code === 1) {
          console.warn('[GPS] Location permission denied — using fallback coords')
          // Hyderabad center as fallback for testing
          latestPositionRef.current = { latitude: 17.3850, longitude: 78.4867 }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,       // accept positions up to 5s old
        timeout: 10000,         // give up after 10s
      }
    )

    // Send to backend every 4 seconds (same rate as Rapido/Uber)
    sendLocation() // immediate first send
    intervalRef.current = setInterval(sendLocation, 4000)

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    }
  }, [active, sendLocation])
}
