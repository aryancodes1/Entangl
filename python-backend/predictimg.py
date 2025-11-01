import cv2
import numpy as np
import matplotlib.pyplot as plt
import os
import tensorflow as tf
print(f"TensorFlow version: {tf.__version__}")

try:
    import cirq
    import tensorflow_quantum as tfq
    TFQ_AVAILABLE = True
    print("TensorFlow Quantum loaded successfully")
except ImportError as e:
    print(f"TensorFlow Quantum not available: {e}")
    print("Falling back to classical model...")
    TFQ_AVAILABLE = False

import joblib
import torch
import torchvision.transforms as T
from facenet_pytorch import InceptionResnetV1
import random
import sympy

def feature_vector_to_circuit_layers(features, qubits):
    circuit = cirq.Circuit()
    n_qubits = len(qubits)
    n_features = len(features)
    n_layers = n_features // n_qubits  

    for layer_idx in range(n_layers):
        start = layer_idx * n_qubits
        end = start + n_qubits
        chunk = features[start:end]

        for i, val in enumerate(chunk):
            angle = float(val) % (2 * np.pi)  
            circuit.append(cirq.rx(angle)(qubits[i]))
        
        for i in range(n_qubits - 1):
            circuit.append(cirq.CZ(qubits[i], qubits[i+1]))

    return circuit

def batch_features_to_circuits_layers(X, n_qubits=8):
    """
    Convert a batch of feature vectors into circuits with multiple layers.
    """
    qubits = cirq.GridQubit.rect(1, n_qubits)
    circuits = []
    for features in X:
        circuit = feature_vector_to_circuit_layers(features, qubits)
        circuits.append(circuit)
    return circuits, qubits

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def get_facenet_feature_extractor():
    """Load pretrained FaceNet model (512-D embeddings)."""
    model = InceptionResnetV1(pretrained="vggface2").eval()
    return model

# FaceNet transform (expects 160×160 RGB)
facenet_transform = T.Compose([
    T.ToPILImage(),
    T.Resize((160, 160)),
    T.ToTensor(),
    T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

def preprocess_face_color(face, brightness=10, contrast=1.2):
    """Keep face in color, enhance brightness/contrast only."""
    adjusted = cv2.convertScaleAbs(face, alpha=contrast, beta=brightness)
    return adjusted

def augment_face(image):
    """Deepfake-specific augmentation: compression artifacts, blur, color shift, warping."""
    aug = image.copy()

    # --- 1. JPEG Compression Artifacts ---
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY),30]
    _, enc_img = cv2.imencode('.jpg', (aug * 255).astype("uint8"), encode_param)
    aug = cv2.imdecode(enc_img, 1).astype("float32") / 255.0

    # --- 2. Slight Random Blur OR Sharpen ---
    if random.random() < 0.3:
        ksize = random.choice([3, 5])
        aug = cv2.GaussianBlur(aug, (ksize, ksize), 0)
    elif random.random() < 0.3:
        kernel = np.array([[0, -1, 0], [-1, 5,-1], [0, -1, 0]])
        aug = cv2.filter2D(aug, -1, kernel)

    # --- 3. Color Jitter ---
    hsv = cv2.cvtColor((aug * 255).astype("uint8"), cv2.COLOR_BGR2HSV).astype("float32")
    hsv[..., 0] += random.uniform(-5, 5)  # Hue shift
    hsv[..., 1] *= random.uniform(0.9, 1.1)  # Saturation change
    hsv = np.clip(hsv, 0, 255).astype("uint8")
    aug = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR).astype("float32") / 255.0

    # --- 4. Random Small Affine Transform ---
    if random.random() < 0.3:
        rows, cols, ch = aug.shape
        pts1 = np.float32([[0,0], [cols-1,0], [0,rows-1]])
        pts2 = np.float32([
[0 + random.uniform(-5, 5), 0 + random.uniform(-5, 5)],
            [cols-1 + random.uniform(-5, 5), 0 + random.uniform(-5, 5)],
            [0 + random.uniform(-5, 5), rows-1 + random.uniform(-5, 5)]
        ])
        M = cv2.getAffineTransform(pts1, pts2)
        aug = cv2.warpAffine(aug, M, (cols, rows), borderMode=cv2.BORDER_REFLECT_101)

    return aug



# -------------------
# Face detection (upper-half)
# -------------------
def detect_faces_upper_half(frame):
    """Detect faces only in the upper half of the frame."""
    h, w = frame.shape[:2]
    upper_half = frame[0:h//2, :]
    gray = cv2.cvtColor(upper_half, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=7,
        minSize=(80, 80),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) == 0:
        return []

    center_x, center_y = w // 2, h // 4

    def face_score(face):
        x, y, fw, fh = face
        size = fw * fh
        cx, cy = x + fw // 2, y + fh // 2
        dist = np.sqrt((cx - center_x) ** 2 + (cy - center_y) ** 2)
        return -size + 0.5 * dist

    faces_sorted = sorted(faces, key=face_score)
    best_face = faces_sorted[0]
    x, y, fw, fh = best_face
    return [(x, y, fw, fh)]

# -------------------
# Main prediction pipeline
# -------------------
def predict_video_consistent(
    video_path,
    model,
    scaler,
    embedder_model,
    n_qubits=8,
    max_faces_per_video=5,
    seconds_range=6,
    device="cpu"
):
    """
    Predict deepfake probability for a video using FaceNet embeddings + TFQ layered encoding.
    Matches training encoding exactly.
    """
    if not TFQ_AVAILABLE:
        print("TensorFlow Quantum not available. Cannot perform quantum prediction.")
        raise Exception("tfq_unavailable")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception("Could not open video file")
        
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    start_frame = max(0, frame_count - int(seconds_range * fps))
    end_frame = frame_count
    step = max(1, int((end_frame - start_frame) / (max_faces_per_video * 2)))

    face_embeddings = []
    faces_collected = 0

    with torch.no_grad():
        for frame_no in range(start_frame, end_frame, step):
            if faces_collected >= max_faces_per_video:
                break

            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
            ret, frame = cap.read()
            if not ret:
                continue

            faces = detect_faces_upper_half(frame)
            for (x, y, w, h) in faces:
                face_crop = frame[y:y+h, x:x+w]
                if face_crop.size == 0:
                    continue

                # --- Face augmentation ---
                face_aug = augment_face(face_crop)

                # --- Skip visualization for API ---
                # plt.figure(figsize=(2, 2))
                # plt.imshow(cv2.cvtColor(face_aug, cv2.COLOR_BGR2RGB))
                # plt.axis("off")
                # plt.title(f"Face {faces_collected + 1} (aug)")
                # plt.show()

                # --- FaceNet embedding ---
                face_t = facenet_transform(face_aug).unsqueeze(0).to(device)
                feat = embedder_model(face_t)
                feat = feat.view(-1).cpu().numpy()  # shape (512,)
                face_embeddings.append(feat)
                faces_collected += 1

                if faces_collected >= max_faces_per_video:
                    break

    cap.release()

    if not face_embeddings:
        raise Exception("no_face_detected")

    X_scaled = scaler.transform(face_embeddings)

    circuits, _ = batch_features_to_circuits_layers(X_scaled, n_qubits)
    tfq_tensor = tfq.convert_to_tensor(circuits)

    probs = model.predict(tfq_tensor, verbose=0).flatten()
    print("Probabilities per face:", probs)
    avg_prob = float(np.mean(probs))

    # --- Majority voting ---
    num_fake = np.sum(probs > 0.5)
    label = "fake" if avg_prob > 0.5 else "real"

    return avg_prob, label

# Detect available device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

def build_pqc_circuit_layers(qubits, n_layers=1):
    """
    Build a parameterized quantum circuit (ansatz) for multiple layers.
    Each qubit has a trainable theta per layer.
    """
    circuit = cirq.Circuit()
    symbols = []

    for l in range(n_layers):
        for i, q in enumerate(qubits):
            theta = sympy.Symbol(f'theta_{l}_{i}')
            circuit.append(cirq.rx(theta)(q))
            symbols.append(theta)
        # Add entanglement (CZ) after each layer
        for i in range(len(qubits)-1):
            circuit.append(cirq.CZ(qubits[i], qubits[i+1]))
    return circuit, symbols

def create_tfq_model_layers(n_qubits=8, n_layers=64, learning_rate=1e-3):
    """
    Rebuild the same architecture as in training (for inference).
    """
    # Qubit layout
    qubits = [cirq.GridQubit(0, i) for i in range(n_qubits)]
    pqc_circuit, symbols = build_pqc_circuit_layers(qubits, n_layers)
    readout = cirq.Z(qubits[0])

    # Functional API (must match)
    inputs = tf.keras.Input(shape=(), dtype=tf.string)
    x = tfq.layers.PQC(pqc_circuit, readout)(inputs)
    outputs = tf.keras.layers.Dense(
        1,
        activation="sigmoid",
        kernel_initializer="glorot_uniform",
        bias_initializer="zeros"
    )(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs)

    # Compile (same optimizer and loss)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )
    return model

try:
    scaler = joblib.load("/Users/arunkaul/Desktop/MyFiles/Entangl/python-backend/scaler.joblib")
    embedder_model = get_facenet_feature_extractor().to(device)
    
    if TFQ_AVAILABLE:
        model = create_tfq_model_layers(n_qubits=8, n_layers=12, learning_rate=1e-3)
        model.load_weights("/Users/arunkaul/Desktop/MyFiles/Entangl/python-backend/tfq_face_layers_weights.h5")
        print("TFQ model loaded successfully")
    else:
        model = None
        print("Skipping TFQ model loading due to compatibility issues")
    
    print("Models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")
    if TFQ_AVAILABLE:
        print("Try installing compatible versions: pip install tensorflow==2.8.0 tensorflow-quantum==0.7.2")
    exit(1)

"""if TFQ_AVAILABLE and model is not None:
    video_path = "/Users/arunkaul/Desktop/MyFiles/Entangl/python-backend/01__hugging_happy.mp4"

    prob, label = predict_video_consistent(
        video_path=video_path,
        model=model,
        scaler=scaler,
        embedder_model=embedder_model,
        n_qubits=8,
        max_faces_per_video=20,
        seconds_range=6,
        device=device
    )

    print(f"Prediction: {label} (prob={prob:.4f})")
else:
    print("Cannot run prediction without TensorFlow Quantum. Please fix compatibility issues.")"""

def detect_faces_in_image(image):
    """Detect faces in a single image."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply CLAHE and blur for better detection
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=7,
        minSize=(80, 80),
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    
    if len(faces) == 0:
        return []
    
    # Sort faces by size (largest first)
    faces_sorted = sorted(faces, key=lambda face: face[2] * face[3], reverse=True)
    return faces_sorted

def predict_image_deepfake_single(
    image_path,
    model,
    scaler,
    embedder_model,
    n_qubits=8,
    max_faces=5,
    device="cpu"
):
    """
    Predict deepfake probability for a single image using FaceNet embeddings + TFQ layered encoding.
    """
    if not TFQ_AVAILABLE:
        print("TensorFlow Quantum not available. Cannot perform quantum prediction.")
        raise Exception("tfq_unavailable")
    
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        raise Exception("Could not load image file")
    
    # Detect faces
    faces = detect_faces_in_image(image)
    
    if not faces:
        raise Exception("no_face_detected")
    
    face_embeddings = []
    faces_processed = 0
    
    with torch.no_grad():
        for (x, y, w, h) in faces[:max_faces]:  # Limit to max_faces
            face_crop = image[y:y+h, x:x+w]
            if face_crop.size == 0:
                continue
            
            # --- Face augmentation ---
            face_aug = augment_face(face_crop)
            
            # --- FaceNet embedding ---
            face_t = facenet_transform(face_aug).unsqueeze(0).to(device)
            feat = embedder_model(face_t)
            feat = feat.view(-1).cpu().numpy()  # shape (512,)
            face_embeddings.append(feat)
            faces_processed += 1
    
    if not face_embeddings:
        raise Exception("no_face_detected")
    
    # Scale features
    X_scaled = scaler.transform(face_embeddings)
    
    # Convert to quantum circuits
    circuits, _ = batch_features_to_circuits_layers(X_scaled, n_qubits)
    tfq_tensor = tfq.convert_to_tensor(circuits)
    
    # Predict
    probs = model.predict(tfq_tensor, verbose=0).flatten()
    print("Probabilities per face:", probs)
    avg_prob = float(np.mean(probs))
    
    # Determine label
    label = "fake" if avg_prob > 0.5 else "real"
    
    return avg_prob, label, faces_processed