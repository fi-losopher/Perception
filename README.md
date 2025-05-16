# Perception - Your AI Powered Seeing Assistant

A lightweight object detection web application using YOLOv5, Flask, and OpenCV. This project features a React frontend interface integrated with a robust Python backend for real-time object detection using webcam or uploaded images, specifically designed to assist visually impaired individuals.

✨ Features<br>
YOLOv5 Object Detection: Fast and accurate detection of 80+ common objects<br>
React Frontend: Modern, responsive UI built with React components<br>
Flask Backend: Robust API endpoints for processing detection requests<br>
Accessibility Focused: Designed to assist visually impaired users<br>
Text-to-Speech: Auditory descriptions of detected objects<br>
Voice Commands: Hands-free control using speech recognition<br>
Real-time Processing: Live webcam feed object detection<br>
CORS Enabled: Ready for extended frontend development

![Screenshot 2025-05-16 141051](https://github.com/user-attachments/assets/ca029826-49ea-4d90-ab4e-b80b85941914)

# 🚀 Setup Instructions<br>
git clone https://github.com/fi-losopher/Perception.git<br>
cd Perception
# Backend Setup (Flask)
a. Create a virtual environment<br>

Windows<br>
python -m venv venv<br>
venv\Scripts\activate
<br>
# macOS/Linux<br>
python3 -m venv venv<br>
source venv/bin/activate<br>
b. Install dependencies<br>

pip install numpy opencv-python torch flask flask-cors pillow tensorflow<br>
c. Clone YOLOv5 (if not using torch.hub)<br>

git clone https://github.com/ultralytics/yolov5<br>
cd yolov5<br>
pip install -r requirements.txt<br>
cd ..<br>
d. Run the Flask server<br>

cd backend<br>
python app.py<br>
🔹 3. Frontend Setup (React)<br>
a. Create React App (if not already)<br>
If you're just starting:<br>


npx create-react-app frontend<br>
cd perception<br>
b. Start the React development server<br>
b
npm install<br>
npm start<br>
This runs the React app at http://localhost:3000.<br>

4. Run the application<br>
 python app.py<br>
 
Your application should now be running at http://127.0.0.1:5000/<br>


# 🔄 Frontend-Backend Integration<br>
The project uses a simple but effective integration approach:<br>

Frontend: Basic HTML/CSS/JS interface residing in the templates and static folders<br>
API Endpoints:
<br>
/detect - POST endpoint for image upload and detection
<br>/video_feed - GET endpoint for streaming webcam with real-time detection



# Frontend Features

Simple, intuitive user interface<br>
Webcam toggle button<br>
Real-time detection display<br>
Detection results visualization<br>

# Integration Points

JavaScript fetch API for image upload<br>
Server-sent events for real-time updates<br>
HTML5 Video element connected to backend video stream.<br>

📃 License
This project is licensed under the MIT License - see the LICENSE file for details.<br>
📬 Contact<br>
For issues, suggestions, or contributions:<br>

Open an Issue on GitHub<br>
Contact: fionadsouza1337@gmail.com<br>
