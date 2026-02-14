import { useState, useRef, useCallback, useEffect } from 'react';
import { XMarkIcon, PhotoIcon, CheckCircleIcon, CameraIcon } from '@heroicons/react/24/outline';

const ResolveReportModal = ({ report, onClose, onResolve }) => {
  const [adminFeedback, setAdminFeedback] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraMode, setCameraMode] = useState(true); // true for camera, false for file upload
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      setShowCamera(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = 'Unable to access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser settings and refresh the page.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += 'Please check your camera settings.';
      }
      
      setError(errorMessage);
      setShowCamera(false);
      // Automatically switch to file upload mode on camera error
      setCameraMode(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create file from blob
        const file = new File([blob], `evidence-${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });
        
        setEvidencePhoto(file);
        setEvidencePreview(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  // File upload functions
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }

      setEvidencePhoto(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setEvidencePhoto(null);
    setEvidencePreview(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleCameraMode = () => {
    setCameraMode(!cameraMode);
    setError('');
    stopCamera();
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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
      
      if (evidencePhoto) {
        formData.append('evidencePhoto', evidencePhoto);
      }

      console.log('🚀 Submitting resolve request for report:', report._id);
      console.log('📝 Feedback:', adminFeedback);
      console.log('📸 Has photo:', !!evidencePhoto);

      await onResolve(report._id, formData);
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('❌ Resolve error:', err);
      console.error('❌ Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Failed to resolve report. The backend may still be deploying. Please wait a few minutes and try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Mark Report as Resolved
          </h2>
          <button
            onClick={onClose}
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

          {/* Evidence Photo Capture/Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900">
                Evidence Photo <span className="text-gray-500">(Optional)</span>
              </label>
              
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={toggleCameraMode}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    cameraMode 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📷 Camera
                </button>
                <button
                  type="button"
                  onClick={toggleCameraMode}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    !cameraMode 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📁 Upload
                </button>
              </div>
            </div>
            
            {/* Camera Mode */}
            {cameraMode && !evidencePreview && !showCamera && (
              <div
                onClick={startCamera}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <CameraIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to capture photo showing the resolved issue
                </p>
                <p className="text-xs text-gray-500">
                  Uses device camera
                </p>
              </div>
            )}

            {/* File Upload Mode */}
            {!cameraMode && !evidencePreview && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to upload photo showing the resolved issue
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isLoading}
                  className="hidden"
                />
              </div>
            )}

            {/* Camera Preview */}
            {showCamera && (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Camera Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <CameraIcon className="h-5 w-5" />
                    Capture
                  </button>
                </div>
              </div>
            )}

            {/* Photo Preview */}
            {evidencePreview && (
              <div className="relative">
                <img
                  src={evidencePreview}
                  alt="Evidence preview"
                  className="w-full h-64 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={isLoading}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                  {cameraMode ? 'Captured Photo' : 'Uploaded Photo'}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              
              {/* Camera Permission Help */}
              {error.includes('camera permissions') && (
                <div className="text-xs text-red-500">
                  <p className="font-medium mb-1">How to enable camera access:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Chrome:</strong> Click the camera icon in address bar → Allow</li>
                    <li><strong>Firefox:</strong> Click shield icon → Turn off blocking</li>
                    <li><strong>Safari:</strong> Safari menu → Settings → Websites → Camera</li>
                    <li>Or try using the "📁 Upload" option instead</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
