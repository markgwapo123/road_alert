import { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon, CameraIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const ResolveReportModal = ({ report, onClose, onResolve }) => {
  const [adminFeedback, setAdminFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Camera states
  const [cameraMode, setCameraMode] = useState('idle'); // idle | streaming | captured
  const [cameraError, setCameraError] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup camera on unmount or modal close
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Open camera
  const openCamera = async () => {
    setCameraError('');
    setCapturedBlob(null);
    setCapturedPreview(null);

    try {
      // Request rear camera on mobile, any camera on desktop
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraMode('streaming');

      // Wait for next frame so the video element is rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      });
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setCameraError('Camera is being used by another application. Please close it and try again.');
      } else {
        setCameraError('Could not access camera. Please check your browser settings.');
      }
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to JPEG blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Failed to capture image. Please try again.');
          return;
        }

        if (blob.size > MAX_IMAGE_SIZE) {
          setCameraError(`Image too large (${(blob.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`);
          return;
        }

        // Stop camera stream
        stopCamera();

        setCapturedBlob(blob);
        setCapturedPreview(URL.createObjectURL(blob));
        setCameraMode('captured');
      },
      'image/jpeg',
      0.85 // quality
    );
  };

  // Retake photo
  const retakePhoto = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    setCameraMode('idle');
    // Re-open camera
    openCamera();
  };

  // Remove captured photo
  const removePhoto = () => {
    stopCamera();
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    setCameraMode('idle');
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (adminFeedback.trim().length < 10) {
      setError('Feedback must be at least 10 characters');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('adminFeedback', adminFeedback);

      // Attach captured evidence photo if available
      if (capturedBlob) {
        const fileName = `evidence_${Date.now()}.jpg`;
        formData.append('evidencePhoto', capturedBlob, fileName);
      }

      console.log('🚀 Submitting resolve request for report:', report._id);

      await onResolve(report._id, formData);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('❌ Resolve error:', err);
      const errorMessage = err.response?.data?.error ||
        err.message ||
        'Failed to resolve report. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Handle modal close — cleanup camera
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Report Resolved Successfully!
          </h3>
          <p className="text-gray-600">
            User has been notified about the resolution.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Mark Report as Resolved
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Report Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Report Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Type:</span> {report.type}</p>
              <p><span className="font-medium">Location:</span> {report.barangay}, {report.city}, {report.province}</p>
              {report.description && (
                <p><span className="font-medium">Description:</span> {report.description}</p>
              )}
            </div>
          </div>

          {/* Admin Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Admin Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              value={adminFeedback}
              onChange={(e) => setAdminFeedback(e.target.value)}
              placeholder="Describe what was done to resolve this issue... (minimum 10 characters)"
              rows={4}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This message will be sent to the user who reported the issue.
            </p>
          </div>

          {/* ===== Camera Capture Section ===== */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CameraIcon className="h-5 w-5 text-blue-600" />
              Proof Image (Camera Capture)
            </h3>

            {/* Camera Error */}
            {cameraError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-600">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => { setCameraError(''); setCameraMode('idle'); }}
                  className="mt-1 text-xs text-red-500 underline hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* IDLE — show open camera button */}
            {cameraMode === 'idle' && !capturedBlob && (
              <button
                type="button"
                onClick={openCamera}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 font-medium hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50"
              >
                <CameraIcon className="h-6 w-6" />
                <span>Open Camera to Capture Proof</span>
              </button>
            )}

            {/* STREAMING — live video preview */}
            {cameraMode === 'streaming' && (
              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg"
                    style={{ maxHeight: '320px', objectFit: 'cover' }}
                  />
                  {/* Camera overlay */}
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    LIVE
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <CameraIcon className="h-5 w-5" />
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { stopCamera(); setCameraMode('idle'); }}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* CAPTURED — show preview with retake / remove */}
            {cameraMode === 'captured' && capturedPreview && (
              <div className="space-y-3">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={capturedPreview}
                    alt="Captured proof"
                    className="w-full rounded-lg"
                    style={{ maxHeight: '320px', objectFit: 'contain' }}
                  />
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3" />
                    Captured
                  </div>
                  {capturedBlob && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      {(capturedBlob.size / 1024).toFixed(0)} KB
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={retakePhoto}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Optional — capture a real-time photo as proof of resolution. Gallery uploads are not allowed.
            </p>
          </div>

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || adminFeedback.trim().length < 10}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Resolving...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Mark as Resolved & Notify User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700 font-medium">Processing resolution...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResolveReportModal;
