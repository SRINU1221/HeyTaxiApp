/**
 * useDriverWebSocket — Driver side WebSocket hook
 *
 * Connects to notification-service and subscribes to TWO topics:
 *   1. /topic/driver/{driverId}     — personal events (ride assigned, cancelled, etc.)
 *   2. /topic/driver/all-rides      — new ride requests broadcast to all online drivers
 *
 * On new ride request → plays audio alert + triggers onNewRide callback
 * On ride events      → triggers onRideEvent callback
 */
import { useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'

const WS_BASE = import.meta.env.VITE_WS_URL || 'http://localhost:8086/ws'

let driverStompClient  = null
let driverConnectPromise = null

function getDriverStompClient() {
  if (driverStompClient && driverStompClient.connected) {
    return Promise.resolve(driverStompClient)
  }
  if (driverConnectPromise) return driverConnectPromise

  driverConnectPromise = new Promise((resolve, reject) => {
    const SockJS = window.SockJS
    const Stomp  = window.Stomp
    if (!SockJS || !Stomp) {
      driverConnectPromise = null
      reject(new Error('SockJS / Stomp not loaded'))
      return
    }
    const socket = new SockJS(WS_BASE)
    const client = Stomp.over(socket)
    client.debug = () => {}
    client.connect({}, () => {
      driverStompClient   = client
      driverConnectPromise = null
      resolve(client)
    }, err => {
      driverConnectPromise = null
      reject(err)
    })
  })

  return driverConnectPromise
}

// ✅ Plays a subtle notification sound via Web Audio API
function playAlertSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch (_) {}
}

export default function useDriverWebSocket({
  isOnline,
  driverId,
  vehicleType,
  onNewRide,
  onRideEvent,
}) {
  const subPersonalRef  = useRef(null)
  const subAllRidesRef  = useRef(null)
  const mountedRef      = useRef(true)

  const handleAllRidesEvent = useCallback((body) => {
    if (!mountedRef.current || !isOnline) return
    try {
      const event = JSON.parse(body)
      if (event.type === 'NEW_RIDE_REQUEST' && event.data) {
        const ride = event.data
        // ✅ Only show rides matching driver's vehicle type
        if (!vehicleType || ride.vehicleType === vehicleType) {
          playAlertSound()
          if (onNewRide) onNewRide(ride)
        }
      }
    } catch (e) {
      console.error('[DriverWS] parse error:', e)
    }
  }, [isOnline, vehicleType, onNewRide])

  const handlePersonalEvent = useCallback((body) => {
    if (!mountedRef.current) return
    try {
      const event = JSON.parse(body)
      console.log('[DriverWS Personal]', event.type)
      if (onRideEvent) onRideEvent(event.type, event.data)
    } catch (e) {
      console.error('[DriverWS] parse error:', e)
    }
  }, [onRideEvent])

  useEffect(() => {
    if (!driverId || !isOnline) return

    mountedRef.current = true

    const loadScripts = () => {
      const promises = []
      if (!window.SockJS) {
        promises.push(new Promise(resolve => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js'
          s.async = true; s.onload = resolve
          document.head.appendChild(s)
        }))
      }
      if (!window.Stomp) {
        promises.push(new Promise(resolve => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js'
          s.async = true; s.onload = resolve
          document.head.appendChild(s)
        }))
      }
      return Promise.all(promises)
    }

    loadScripts().then(() => {
      setTimeout(() => {
        if (!mountedRef.current) return
        getDriverStompClient()
          .then(client => {
            if (!mountedRef.current) return

            // Subscribe to personal driver channel
            subPersonalRef.current = client.subscribe(
              `/topic/driver/${driverId}`,
              (frame) => handlePersonalEvent(frame.body)
            )

            // Subscribe to the all-drivers broadcast channel
            subAllRidesRef.current = client.subscribe(
              '/topic/driver/all-rides',
              (frame) => handleAllRidesEvent(frame.body)
            )

            console.log('[DriverWS] ✅ Driver subscribed to personal + all-rides channels')
          })
          .catch(err => console.warn('[DriverWS] Connection failed:', err.message))
      }, 500)
    })

    return () => {
      mountedRef.current = false
      try { subPersonalRef.current?.unsubscribe() } catch (_) {}
      try { subAllRidesRef.current?.unsubscribe() }  catch (_) {}
      subPersonalRef.current = null
      subAllRidesRef.current = null
    }
  }, [driverId, isOnline, handleAllRidesEvent, handlePersonalEvent])
}
