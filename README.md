# Perception - Your AI Powered Seeing Assistant

A lightweight object detection web application using YOLOv5, Flask, and OpenCV. This project features a React frontend interface integrated with a robust Python backend for real-time object detection using webcam or uploaded images, specifically designed to assist visually impaired individuals.

✨ Features
YOLOv5 Object Detection: Fast and accurate detection of 80+ common objects
React Frontend: Modern, responsive UI built with React components
Flask Backend: Robust API endpoints for processing detection requests
Accessibility Focused: Designed to assist visually impaired users
Text-to-Speech: Auditory descriptions of detected objects
Voice Commands: Hands-free control using speech recognition
Real-time Processing: Live webcam feed object detection
Image Upload: Support for detecting objects in uploaded images
Cross-Platform: Works on Windows, macOS, Linux, and Raspberry Pi
CORS Enabled: Ready for extended frontend development

![Screenshot 2025-05-16 141051](https://github.com/user-attachments/assets/ca029826-49ea-4d90-ab4e-b80b85941914)

🚀 Setup Instructions
1. Clone the repository
2. git clone https://github.com/fi-losopher/perception.git
cd perception
3. Create a virtual environment
bash# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
3. Install dependencies
bashcd backend
pip install -r requirements.txt
4. Run the application
bash python app.py
Your application should now be running at http://127.0.0.1:5000/
🔄 Frontend-Backend Integration
The project uses a simple but effective integration approach:

Frontend: Basic HTML/CSS/JS interface residing in the templates and static folders
API Endpoints:

/detect - POST endpoint for image upload and detection
/video_feed - GET endpoint for streaming webcam with real-time detection



Frontend Features

Simple, intuitive user interface
Webcam toggle button
File upload capability
Real-time detection display
Detection results visualization

Integration Points

JavaScript fetch API for image upload
Server-sent events for real-time updates
HTML5 Video element connected to backend video stream.

📃 License
This project is licensed under the MIT License - see the LICENSE file for details.
📬 Contact
For issues, suggestions, or contributions:

Open an Issue on GitHub
Contact: fionadsouza1337@gmail.com
