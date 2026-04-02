/**
 * useRideWebSocket — Rider side WebSocket hook
 *
 * Connects to notification-service WebSocket and subscribes to:
 *   /topic/rider/{riderId}  — all ride lifecycle events for this rider
 *
 * On each event, dispatches to Redux store so UI updates instantly
 * without waiting for the next polling cycle.
 *
 * Events handled:
 *   RIDE_REQUESTED    → ride placed, waiting for driver
 *   RIDE_ACCEPTED     → driver found, update with driver info
 *   DRIVER_ARRIVING   → driver is en route
 *   RIDE_STARTED      → OTP verified, ride in progress
 *   RIDE_COMPLETED    → ride done
 *   RIDE_CANCELLED    → ride cancelled
 *   NO_DRIVER_FOUND   → timeout, no driver available
 *   PAYMENT_CONFIRMED → payment done
 */
import { useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentRide, clearCurrentRide } from '../store/slices/rideSlice'
import toast from 'react-hot-toast'

// ✅ Point to notification-service WebSocket endpoint
const WS_BASE = import.meta.env.VITE_WS_URL || 'http://localhost:8086/ws'

let stompClientSingleton = null
let stompConnectPromise  = null

function getStompClient() {
  if (stompClientSingleton && stompClientSingleton.connected) {
    return Promise.resolve(stompClientSingleton)
  }
  if (stompConnectPromise) return stompConnectPromise

  stompConnectPromise = new Promise((resolve, reject) => {
    // Load @stomp/stompjs dynamically (already in node_modules via sockjs-client + stompjs)
    const SockJS  = window.SockJS
    const Stomp   = window.Stomp

    if (!SockJS || !Stomp) {
      reject(new Error('SockJS / Stomp not loaded yet'))
      stompConnectPromise = null
      return
    }

    const socket = new SockJS(WS_BASE)
    const client = Stomp.over(socket)
    client.debug = () => {} // suppress verbose logs

    client.connect({}, () => {
      stompClientSingleton = client
      stompConnectPromise  = null
      resolve(client)
    }, (err) => {
      stompConnectPromise  = null
      reject(err)
    })
  })

  return stompConnectPromise
}

export default function useRideWebSocket(onRideUpdate) {
  const dispatch    = useDispatch()
  const { user }    = useSelector(s => s.auth)
  const subRef      = useRef(null)
  const mountedRef  = useRef(true)

  const handleEvent = useCallback((eventJson) => {
    if (!mountedRef.current) return
    try {
      const event = JSON.parse(eventJson)
      const { type, data } = event

      console.log('[RideWS Rider]', type, data?.status)

      switch (type) {
        case 'RIDE_REQUESTED':
          dispatch(setCurrentRide(data))
          break

        case 'RIDE_ACCEPTED':
          dispatch(setCurrentRide(data))
          toast.success('🚖 Driver found! Check your OTP.')
          break

        case 'DRIVER_ARRIVING':
          dispatch(setCurrentRide(data))
          toast('🏃 Driver is arriving at your location!', { icon: '📍' })
          break

        case 'RIDE_STARTED':
          dispatch(setCurrentRide(data))
          toast.success('🚀 Ride started! Enjoy the journey.')
          break

        case 'RIDE_COMPLETED':
          dispatch(setCurrentRide(data))
          toast.success('🎉 Ride completed!')
          break

        case 'RIDE_CANCELLED':
          dispatch(clearCurrentRide())
          toast.error('❌ Ride was cancelled.')
          break

        case 'NO_DRIVER_FOUND':
          dispatch(clearCurrentRide())
          toast.error('😔 No drivers available right now. Please try again.')
          break

        case 'PAYMENT_CONFIRMED':
          dispatch(setCurrentRide(data))
          toast.success('✅ Payment confirmed!')
          break

        default:
          if (data) dispatch(setCurrentRide(data))
      }

      // ✅ Optional callback for parent component (e.g., to change step)
      if (onRideUpdate) onRideUpdate(type, data)

    } catch (e) {
      console.error('[RideWS] parse error:', e)
    }
  }, [dispatch, onRideUpdate])

  useEffect(() => {
    if (!user?.id) return

    mountedRef.current = true

    // Load SockJS + Stomp scripts if not already loaded
    const loadScripts = () => {
      const promises = []

      if (!window.SockJS) {
        promises.push(new Promise((resolve) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js'
          s.async = true
          s.onload = resolve
          document.head.appendChild(s)
        }))
      }

      if (!window.Stomp) {
        promises.push(new Promise((resolve) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js'
          s.async = true
          s.onload = resolve
          document.head.appendChild(s)
        }))
      }

      return Promise.all(promises)
    }

    loadScripts().then(() => {
      // Small delay for scripts to initialize
      setTimeout(() => {
        if (!mountedRef.current) return
        getStompClient()
          .then(client => {
            if (!mountedRef.current) return
            const destination = `/topic/rider/${user.id}`
            subRef.current = client.subscribe(destination, (frame) => {
              handleEvent(frame.body)
            })
            console.log('[RideWS] ✅ Rider subscribed to', destination)
          })
          .catch(err => console.warn('[RideWS] Connection failed:', err.message))
      }, 500)
    })

    return () => {
      mountedRef.current = false
      if (subRef.current) {
        try { subRef.current.unsubscribe() } catch (_) {}
        subRef.current = null
      }
    }
  }, [user?.id, handleEvent])
}
