import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff,
  Settings, 
  Eye, 
  AlertTriangle, 
  Info,
  Loader2
} from 'lucide-react';

const SeeingAssistant = () => {
  // State
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [transcription, setTranscription] = useState('');
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [settings, setSettings] = useState({
    detectionFrequency: 2,
    backendUrl: 'http://localhost:5001'
  });
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingInterval = useRef(null);
  const speechSynthesis = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);

  // Initialize camera and speech recognition
  useEffect(() => {
    // Check backend health at startup
    checkBackendHealth();
    
    // Initialize Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        setTranscription(transcript);
        handleVoiceCommand(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        // Restart if we're still supposed to be listening
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    } else {
      console.error("Speech recognition not supported in this browser");
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        speakText("Could not access camera");
      }
    };

    startCamera();
    speakText("Welcome to Perception - Your AI Powered Seeing Assistant! Press start to begin scanning.");

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      clearInterval(processingInterval.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Check backend connectivity
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${settings.backendUrl}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setBackendStatus(data.status);
        console.log('Backend status:', data.message);
      } else {
        setBackendStatus('error');
        console.error('Backend health check failed');
      }
    } catch (error) {
      setBackendStatus('offline');
      console.error('Backend appears to be offline:', error);
    }
  };

  // Handle speech recognition state
  useEffect(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.start();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Text-to-speech function
  const speakText = (text) => {
    if (isMuted || !text) return;
    speechSynthesis.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.current.speak(utterance);
  };

  // Handle voice commands
  const handleVoiceCommand = (command) => {
    if (command.includes('start scan')) {
      if (!isProcessing) toggleProcessing();
    } else if (command.includes('stop scan')) {
      if (isProcessing) toggleProcessing();
    } else if (command.includes('mute')) {
      if (!isMuted) setIsMuted(true);
    } else if (command.includes('unmute')) {
      if (isMuted) setIsMuted(false);
    } else if (command.includes('describe')) {
      describeEnvironment();
    } else if (command.includes('help')) {
      speakHelp();
    }
  };

  // Object detection with backend integration
  const detectObjects = async () => {
    if (backendStatus === 'offline') {
      console.error('Cannot detect objects: Backend is offline');
      speakText('Object detection service is offline. Please check the backend server.');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video || video.readyState !== 4) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send to Flask backend
      const response = await fetch(`${settings.backendUrl}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const { detections } = await response.json();
      
      // Add simulated distance - in a real app, this would come from depth sensors
      const detectionsWithDistance = detections.map(obj => ({
        ...obj,
        distance: `${(Math.random() * 5 + 1).toFixed(1)} meters`
      }));
      
      setDetectedObjects(detectionsWithDistance);
      provideAudioFeedback(detectionsWithDistance);
      
    } catch (error) {
      console.error('Detection failed:', error);
      // Only use fallback if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Using fallback mock data');
        const mockDetections = [
          { 
            class: 'person', 
            confidence: 0.85, 
            box: { x: 100, y: 100, width: 50, height: 100 },
            distance: '2 meters'
          },
          { 
            class: 'chair', 
            confidence: 0.75, 
            box: { x: 200, y: 200, width: 60, height: 60 },
            distance: '1.5 meters'
          }
        ];
        setDetectedObjects(mockDetections);
        provideAudioFeedback(mockDetections);
      } else {
        speakText("Detection service encountered an error. Please try again.");
      }
    }
  };

  // Audio feedback for detections
  const provideAudioFeedback = (detections) => {
    if (isMuted || detections.length === 0) return;
    
    const objectsList = detections.map(obj => 
      `${obj.class} (${Math.floor(obj.confidence * 100)}% confidence)`
    ).join(', ');
    
    speakText(`Detected ${detections.length} objects: ${objectsList}`);
  };

  // Start/stop processing
  const toggleProcessing = () => {
    if (isProcessing) {
      setIsProcessing(false);
      clearInterval(processingInterval.current);
      setDetectedObjects([]);
      speakText("Scanning stopped");
    } else {
      setIsProcessing(true);
      speakText("Starting environment scan");
      // Initial detection
      detectObjects();
      // Set up periodic detection
      processingInterval.current = setInterval(detectObjects, settings.detectionFrequency * 1000);
    }
  };

  // Toggle speech recognition
  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      speakText("Voice commands activated");
    } else {
      speakText("Voice commands deactivated");
    }
  };

  // Describe environment
  const describeEnvironment = () => {
    if (detectedObjects.length === 0) {
      speakText("No objects detected yet");
      return;
    }
    
    const objectsCount = {};
    detectedObjects.forEach(obj => {
      objectsCount[obj.class] = (objectsCount[obj.class] || 0) + 1;
    });
    
    const description = Object.entries(objectsCount)
      .map(([obj, count]) => `${count} ${obj}${count > 1 ? 's' : ''}`)
      .join(', ');
    
    speakText(`Environment contains: ${description}`);
  };

  // Help function
  const speakHelp = () => {
    speakText("Available commands: Start scanning, Stop scanning, Mute, Unmute, Describe surroundings");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Eye size={24} />
            </div>
            <h1 className="text-xl font-bold">Perception - Your AI Powered Seeing Assistant</h1>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
            <button 
              onClick={toggleProcessing} 
              disabled={backendStatus === 'offline'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all ${
                isProcessing 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } ${backendStatus === 'offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera size={20} />
              <span>{isProcessing ? 'Stop Scanning' : 'Start Scanning'}</span>
            </button>
            
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isMuted 
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600' 
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            
            <button 
              onClick={toggleListening} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isListening 
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
              <span>{isListening ? 'Listening' : 'Enable Voice'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Camera Section - Takes up 2/3 of the space on desktop */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-full">
              <div className="relative w-full aspect-video bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Processing indicator */}
                {isProcessing && (
                  <div className="absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-lg animate-pulse flex items-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Scanning...</span>
                  </div>
                )}
                
                {/* Camera overlay when not processing */}
                {!isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="text-center text-white p-6 rounded-xl">
                      <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <Camera size={32} />
                      </div>
                      <p className="text-lg">its still in dev mode--Say "start scanning" or click the Start button</p>
                    </div>
                  </div>
                )}
                
                {/* Backend offline error */}
                {backendStatus === 'offline' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="text-center text-white p-6 rounded-xl bg-red-600 bg-opacity-70">
                      <AlertTriangle size={32} className="mx-auto mb-2" />
                      <p className="text-lg font-medium">Backend service is offline.</p>
                      <p>Check server connection.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Info Panels */}
          <div className="space-y-6">
            {/* Detected Objects Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Info size={18} className="text-indigo-500" />
                  Detected Objects
                </h2>
                <button 
                  onClick={describeEnvironment} 
                  disabled={detectedObjects.length === 0}
                  className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 ${
                    detectedObjects.length === 0 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                  }`}
                >
                  <Info size={14} />
                  Describe
                </button>
              </div>
              
              <div className="p-4 max-h-64 overflow-y-auto">
                {detectedObjects.length > 0 ? (
                  <ul className="space-y-2">
                    {detectedObjects.map((obj, i) => (
                      <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                          <span className="font-medium">{obj.class}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                            {Math.floor(obj.confidence * 100)}%
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">{obj.distance}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No objects detected</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Voice Recognition Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Mic size={18} className="text-indigo-500" />
                  Voice Recognition
                </h2>
              </div>
              
              <div className="p-4">
                {isListening ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="absolute -inset-2 border-2 border-green-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <div>
                      <p className="font-medium text-green-600 dark:text-green-400">Listening...</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{transcription || "Say a command"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <MicOff size={16} />
                    <p>Voice recognition disabled</p>
                  </div>
                )}
                
                <button 
                  onClick={speakHelp}
                  className="mt-4 w-full py-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                >
                  <AlertTriangle size={16} />
                  Help with Commands
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow-inner mt-auto py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p className="font-medium text-gray-600 dark:text-gray-300">Voice commands:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'start scanning',
                'stop scanning',
                'mute',
                'unmute',
                'describe',
                'help'
              ].map((cmd) => (
                <span 
                  key={cmd}
                  className="px-3 py-1 text-sm rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                >
                  {cmd}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SeeingAssistant;