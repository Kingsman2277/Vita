import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function CameraModal({ open, onClose, onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  useEffect(() => {
    if (open) {
      startCamera()
    }
    return () => stopCamera()
  }, [open, facingMode])

  const startCamera = async () => {
    setReady(false)
    setError(null)
    stopCamera()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setReady(true)
        }
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError('Could not access camera. Try uploading a photo instead.')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setReady(false)
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
    stopCamera()
    onCapture(base64)
  }

  const toggleCamera = () => {
    setFacingMode(f => f === 'environment' ? 'user' : 'environment')
  }

  if (!open) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Close button — safe area aware */}
      <button
        onClick={() => { stopCamera(); onClose() }}
        style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top, 0px))', left: 16, zIndex: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Flip camera button */}
      <button
        onClick={toggleCamera}
        style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: 16, zIndex: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>

      {error ? (
        <div style={{ textAlign: 'center', padding: '0 32px' }}>
          <p style={{ color: '#fff', fontSize: 14, marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => { stopCamera(); onClose() }}
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Loading overlay */}
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <div style={{ width: 32, height: 32, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {/* Capture button — safe area aware */}
          {ready && (
            <div style={{ position: 'absolute', bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleCapture}
                style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid #fff', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s ease' }}
              >
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff' }} />
              </button>
            </div>
          )}
        </>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>,
    document.body
  )
}
