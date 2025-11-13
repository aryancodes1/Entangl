# Entangl - Quantum-Enhanced Deepfake Detection System

## Overview

Entangl is an advanced deepfake detection system that combines classical machine learning with quantum computing to identify manipulated videos and images. The system leverages **TensorFlow Quantum (TFQ)** to create a hybrid classical-quantum neural network that can detect subtle patterns in facial features that indicate deepfake manipulation.

## 🧬 Quantum Model Architecture

### Core Innovation: Quantum Feature Encoding

Our quantum model transforms classical facial embeddings into quantum states through a novel multi-layer encoding scheme:

1. **Feature Extraction**: Uses FaceNet (InceptionResnetV1) to extract 512-dimensional facial embeddings
2. **Quantum Encoding**: Maps scaled features to quantum rotation gates across multiple circuit layers
3. **Quantum Processing**: Applies parameterized quantum circuits (PQC) with entanglement
4. **Classical Output**: Measures quantum states and feeds into a classical dense layer for binary classification

### Quantum Circuit Design

```
Input: 512D FaceNet embeddings → Scaling → Quantum Encoding

Quantum Circuit Layers:
┌─────────────────────────────────────────────────────────────┐
│  Layer 0: RX(θ₀₀) RX(θ₀₁) ... RX(θ₀₇)  [8 qubits]          │
│           └─CZ──┘  └─CZ──┘   └─CZ──┘                        │
│                                                             │
│  Layer 1: RX(θ₁₀) RX(θ₁₁) ... RX(θ₁₇)                      │
│           └─CZ──┘  └─CZ──┘   └─CZ──┘                        │
│                                                             │
│  ... (12 layers total)                                     │
│                                                             │
│  Measurement: ⟨Z₀⟩ → Dense(1, sigmoid) → P(deepfake)       │
└─────────────────────────────────────────────────────────────┘
```

### Why Quantum Computing for Deepfake Detection?

1. **Exponential State Space**: 8 qubits can represent 2⁸ = 256 quantum states simultaneously
2. **Entanglement Benefits**: Captures complex correlations between facial features
3. **Interference Patterns**: Quantum interference helps detect subtle manipulation artifacts
4. **Feature Compression**: Efficiently encodes high-dimensional facial data

## 🔬 Technical Details

### Quantum Encoding Process

```python
def feature_vector_to_circuit_layers(features, qubits):
    """
    Encodes 512D facial features into quantum circuits with multiple layers
    """
    circuit = cirq.Circuit()
    n_qubits = len(qubits)  # 8 qubits
    n_features = len(features)  # 512 features
    n_layers = n_features // n_qubits  # ~64 encoding layers

    for layer_idx in range(n_layers):
        # Map features to rotation angles
        start = layer_idx * n_qubits
        end = start + n_qubits
        chunk = features[start:end]

        # Apply RX rotations
        for i, val in enumerate(chunk):
            angle = float(val) % (2 * np.pi)
            circuit.append(cirq.rx(angle)(qubits[i]))
        
        # Add entanglement
        for i in range(n_qubits - 1):
            circuit.append(cirq.CZ(qubits[i], qubits[i+1]))

    return circuit
```

### Model Architecture

- **Qubits**: 8 qubits arranged in a 1D grid
- **Layers**: 12 trainable parameter layers
- **Parameters**: ~96 trainable quantum parameters (θ values)
- **Measurement**: Z-expectation on first qubit
- **Classical Head**: Single dense layer with sigmoid activation

### Training Configuration

```python
model = create_tfq_model_layers(
    n_qubits=8,
    n_layers=12,
    learning_rate=1e-3
)

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)
```

## 🚀 System Components

### Backend Services

1. **Node.js Backend** (`server.js`):
   - Express.js API for user management, posts, comments
   - CORS configuration for frontend integration
   - Authentication and social features

2. **Python Quantum Backend** (`main.py`):
   - FastAPI server for AI/ML predictions
   - Quantum deepfake detection endpoints
   - Image and video processing pipelines

### Key Features

#### Deepfake Detection
- **Video Analysis**: Processes last 6 seconds of video for real-time detection
- **Image Analysis**: Single-frame deepfake detection
- **Batch Processing**: Multiple file analysis
- **URL Support**: Direct analysis from URLs

#### Face Processing Pipeline
1. **Face Detection**: Haar cascade classifiers with CLAHE enhancement
2. **Face Augmentation**: JPEG compression, blur, color jitter, affine transforms
3. **Feature Extraction**: FaceNet embeddings (512D)
4. **Quantum Encoding**: Multi-layer quantum circuit representation
5. **Prediction**: Quantum-enhanced binary classification

## 📊 Model Performance

### Advantages of Quantum Approach

1. **Higher Sensitivity**: Detects subtle manipulation artifacts
2. **Reduced False Positives**: Quantum interference patterns help distinguish real vs fake
3. **Scalability**: Quantum parallelism for batch processing
4. **Novel Feature Space**: Explores quantum superposition states

### Detection Capabilities

- **DeepFake Methods**: Detects FaceSwap, Face2Face, FaceShifter, etc.
- **Quality Range**: Works on both high and low-quality manipulations
- **Real-time**: Optimized for near real-time video analysis
- **Robustness**: Handles compression, lighting variations

## 🔧 Installation & Usage

### Prerequisites

```bash
# Core dependencies
pip install tensorflow==2.8.0
pip install tensorflow-quantum==0.7.2
pip install cirq
pip install facenet-pytorch
pip install fastapi uvicorn
pip install opencv-python
pip install joblib scikit-learn

# Node.js dependencies
npm install express cors dotenv
```

### Model Files Required

- `tfq_face_layers_weights.h5` - Trained quantum model weights
- `scaler.joblib` - Feature scaling parameters

### API Endpoints

#### Video Analysis
```bash
POST /predict
Content-Type: multipart/form-data
Body: video file + parameters

POST /predict-url
Content-Type: application/json
Body: {"url": "video_url", "max_faces": 20, "seconds_range": 6}
```

#### Image Analysis
```bash
POST /predict/image
Content-Type: multipart/form-data
Body: image file + parameters

POST /predict/image-url
Content-Type: application/json
Body: {"url": "image_url", "max_faces": 5}
```

### Example Response

```json
{
  "filename": "video.mp4",
  "prediction": {
    "label": "fake",
    "is_deepfake": true,
    "deepfake_probability": 0.8234
  },
  "analysis_parameters": {
    "max_faces_analyzed": 20,
    "seconds_analyzed": 6,
    "quantum_enhanced": true,
    "device_used": "cpu"
  },
  "status": "success"
}
```

## 🎯 Use Cases

1. **Social Media Verification**: Detect manipulated content in posts
2. **News Verification**: Authenticate video evidence
3. **Content Moderation**: Automated deepfake filtering
4. **Digital Forensics**: Investigation of multimedia evidence
5. **Educational Tools**: Demonstrate quantum ML applications

## 🔮 Future Enhancements

1. **More Qubits**: Scale to 16+ qubits for higher capacity
2. **Hybrid Architectures**: Combine multiple quantum circuits
3. **Real-time Streaming**: Live video analysis
4. **Advanced Metrics**: Confidence scores, localization
5. **Multi-modal**: Audio-visual deepfake detection

## 📚 Research Background

This system is based on research in:
- Quantum Machine Learning (QML)
- Variational Quantum Eigensolvers (VQE)
- Parameterized Quantum Circuits (PQC)
- Hybrid Classical-Quantum Neural Networks
- Deepfake Detection using CNNs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/quantum-enhancement`)
3. Commit changes (`git commit -am 'Add quantum enhancement'`)
4. Push to branch (`git push origin feature/quantum-enhancement`)
5. Create Pull Request


## ⚡ Quantum Computing Disclaimer

This system requires TensorFlow Quantum and compatible hardware/simulators. For production deployment, consider:
- Classical fallback modes
- Hardware requirements
- Quantum simulation overhead
- Cloud quantum services integration

---

