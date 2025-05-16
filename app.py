import os
import sys
import time
import base64
import io
import numpy as np
import cv2
import torch
import tensorflow as tf  # Added missing import

from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

print(">>>> YOLO Object Detection Backend starting <<<<")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

# --- YOLO Model Configuration ---
MODEL_PATH = 'yolov5s.pt'  # Path to YOLOv5 PyTorch model or use a different path if needed
CLASS_NAMES_PATH = 'models/coco.names'  # Path to your class names file 
CONFIDENCE_THRESHOLD = 0.5  # Minimum confidence to consider a detection
NMS_THRESHOLD = 0.4  # Non-Maximum Suppression threshold
INPUT_IMG_SIZE = (640, 640)  # YOLOv5 typically uses 640x640

# Global variables for the model (load once)
detection_model = None
class_names = []

def load_yolo_model():
    """Load the YOLO model and class names at startup"""
    global detection_model, class_names
    
    # Load the model if not already loaded
    if detection_model is None:
        print(f"Loading YOLO model from: {MODEL_PATH}")
        try:
            # Use torch.hub to load YOLOv5 (easier than using TensorFlow for YOLO)
            detection_model = torch.hub.load('ultralytics/yolov5', 'custom', path=MODEL_PATH)
            # For official pretrained model: detection_model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
            
            # Set model parameters
            detection_model.conf = CONFIDENCE_THRESHOLD  # Confidence threshold
            detection_model.iou = NMS_THRESHOLD  # NMS IoU threshold
            detection_model.classes = None  # Filter by class, None = all classes
            detection_model.multi_label = False  # Allow multiple labels per box
            detection_model.max_det = 1000  # Maximum number of detections
            
            print("YOLO model loaded successfully.")
        except Exception as e:
            print(f"Error loading YOLO model: {e}")
            import traceback
            traceback.print_exc()
            detection_model = None  # Ensure it's None if loading failed
            
            # Fallback to local PyTorch model if the hub fails
            try:
                print("Attempting to load local model...")
                detection_model = torch.load(MODEL_PATH)
                print("Local YOLO model loaded successfully.")
            except Exception as e2:
                print(f"Error loading local YOLO model: {e2}")
                return

    # Load class names if not already loaded
    if not class_names:
        try:
            # First try to load from the specified path
            if os.path.exists(CLASS_NAMES_PATH):
                with open(CLASS_NAMES_PATH, 'r') as f:
                    class_names = [line.strip() for line in f.readlines()]
                print(f"Loaded {len(class_names)} class names from file.")
            else:
                # Fallback to COCO class names
                class_names = [
                    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
                    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
                    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
                    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
                    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
                    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
                    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
                    'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
                    'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
                    'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
                ]
                print(f"Using default COCO class names ({len(class_names)} classes).")
        except Exception as e:
            print(f"Error loading class names: {e}")
            class_names = []

def image_pil_from_base64(base64_string):
    """Convert a base64 string to a PIL Image"""
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    try:
        img_bytes = base64.b64decode(base64_string)
        img = Image.open(io.BytesIO(img_bytes))
        return img.convert("RGB")
    except Exception as e:
        print(f"Error decoding base64 image: {e}")
        return None

@app.route('/', methods=['GET'])
def index():
    """Root endpoint to check if the server is running"""
    return jsonify({
        "status": "ok",
        "message": "YOLO Object Detection API is running. Use /api/detect for detection."
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with model status"""
    status_message = "Backend service is running."
    status_code = 200
    
    if detection_model is None:
        status_message = "Backend service is running, BUT YOLO MODEL FAILED TO LOAD."
        status_code = 503  # Service Unavailable
    elif not class_names:
        status_message = "Backend service is running, BUT CLASS NAMES FAILED TO LOAD."
        status_code = 503  # Service Unavailable
        
    return jsonify({
        "status": "ok" if detection_model and class_names else "error", 
        "message": status_message
    }), status_code

@app.route('/api/detect', methods=['POST', 'OPTIONS'])
def detect_objects_api():
    """Main endpoint for object detection"""
    print("🔥 /api/detect (YOLO) was called!")

    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    # Check if model is loaded
    if detection_model is None or not class_names:
        return jsonify({"error": "Model or class names not loaded properly"}), 500

    # Check if request contains image data
    if not request.json or 'image' not in request.json:
        return jsonify({"error": "No image data provided"}), 400

    # Decode base64 image
    pil_image = image_pil_from_base64(request.json['image'])
    if pil_image is None:
        return jsonify({"error": "Invalid image data"}), 400

    print(f"Successfully decoded image: {pil_image.size[0]}x{pil_image.size[1]}")

    # Perform inference with YOLOv5
    start_time = time.time()
    try:
        # PyTorch YOLOv5 takes PIL images directly
        results = detection_model(pil_image)
        
        # Process results
        result_pandas = results.pandas().xyxy[0]  # Get detection results as pandas DataFrame
        
        # Convert to our detection format
        detections = []
        for _, row in result_pandas.iterrows():
            x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])
            width = x2 - x1
            height = y2 - y1
            
            class_name = row['name'] if 'name' in row else class_names[int(row['class'])]
            confidence = float(row['confidence'])
            
            detections.append({
                "class": class_name,
                "confidence": confidence,
                "box": {
                    "x": x1,
                    "y": y1,
                    "width": width,
                    "height": height
                }
            })
    except Exception as e:
        print(f"Error during inference: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Detection failed: {e}"}), 500
    
    inference_time = time.time() - start_time
    print(f"Inference time: {inference_time:.4f} seconds")
    print(f"Returning {len(detections)} detected objects")
    
    return jsonify({
        "detections": detections,
        "inference_time": round(inference_time, 3)
    })

if __name__ == '__main__':
    print("Starting Flask backend server with YOLO object detection...")
    # Load model at startup
    load_yolo_model()
    
    if detection_model and class_names:
        print("YOLO Model and class names are ready.")
    else:
        print("WARNING: YOLO Model or class names FAILED to load.")

    # For development, set debug=True. For production, use a proper WSGI server.
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)