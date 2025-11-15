
# Entangl - Quantum-Enhanced Deepfake Detection System

## Overview

Entangl is an advanced deepfake detection system that combines classical machine learning with quantum computing to identify manipulated videos and images. The system leverages **TensorFlow Quantum (TFQ)** to create a hybrid classical-quantum neural network that can detect subtle patterns in facial features that indicate deepfake manipulation.
In addition to deepfake detection, Entangl also includes an integrated **AI Fact Checker** that analyzes textual claims, verifies them against trusted sources, and provides structured truth assessments.

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

* **Qubits**: 8 qubits arranged in a 1D grid
* **Layers**: 12 trainable parameter layers
* **Parameters**: ~96 trainable quantum parameters (θ values)
* **Measurement**: Z-expectation on first qubit
* **Classical Head**: Single dense layer with sigmoid activation

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

   * Express.js API for user management, posts, comments
   * CORS configuration for frontend integration
   * Authentication and social features
   * Integrated fact-checking workflow for post validation

2. **Python Quantum Backend** (`main.py`):

   * FastAPI server for AI/ML predictions
   * Quantum deepfake detection endpoints
   * Image and video processing pipelines

3. **Python Fact Checker Backend** (`entangl-fact-checker/main.py`):

   * FastAPI API for checking text-based claims
   * Returns verdict, confidence score, and evidence

### Key Features

#### Deepfake Detection

* **Video Analysis**: Processes last 6 seconds of video for real-time detection
* **Image Analysis**: Single-frame deepfake detection
* **Batch Processing**: Multiple file analysis
* **URL Support**: Direct analysis from URLs

#### Fact Checking

* Analyzes textual claims in posts
* Searches reliable external information
* Generates a factual verdict (true, false, misleading)
* Produces confidence scores and supporting evidence
* Integrated directly into the social media platform

#### Face Processing Pipeline

1. **Face Detection** using Haar cascades
2. **Image Augmentation**: compression, blur, jitter, affine transforms
3. **Feature Extraction** using FaceNet
4. **Quantum Encoding** into PQC layers
5. **Prediction** using quantum-enhanced binary classification

## 📊 Model Performance

### Advantages of Quantum Approach

1. **Higher Sensitivity**
2. **Reduced False Positives**
3. **Scalability**
4. **Novel Feature Space**

### Detection Capabilities

* Detects FaceSwap, Face2Face, FaceShifter, and more
* Works on low- and high-quality media
* Near real-time detection
* Resilient to noise and compression

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

* `tfq_face_layers_weights.h5`
* `scaler.joblib`

### API Endpoints

#### Video Analysis

```bash
POST /predict
POST /predict-url
```

#### Image Analysis

```bash
POST /predict/image
POST /predict/image-url
```

#### Fact Checking

```bash
POST /fact-check
Body: { "claim": "text to validate" }
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

1. Social media verification
2. News verification
3. Content moderation
4. Digital forensics
5. Educational tools
6. Claim verification for text posts

## 🔮 Future Enhancements

1. More qubits
2. Hybrid architectures
3. Real-time streaming
4. Advanced metrics
5. Multi-modal detection

## 📚 Research Background

This system is based on research in:

* Quantum Machine Learning
* VQE
* PQC
* Hybrid Classical-Quantum Networks
* Deepfake Detection using CNNs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push the branch
5. Open a pull request

## ⚡ Quantum Computing Disclaimer

This system requires TensorFlow Quantum and compatible hardware/simulators. For production deployment, consider:

* Classical fallback
* Hardware limits
* Quantum simulation cost
* Cloud quantum services

---
