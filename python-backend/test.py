import os
import warnings

# Suppress warnings first
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore')

print("Testing TensorFlow installation...")
try:
    print("Attempting to import TensorFlow...")
    import tensorflow as tf
    print(f"✓ SUCCESS: TensorFlow version {tf.__version__}")
    
    # Check build info to verify it's the Mac version
    build_info = tf.sysconfig.get_build_info()
    print(f"✓ Build info: {build_info}")
    
    # Check if it's specifically tensorflow-macos
    import pkg_resources
    installed_packages = [pkg.project_name for pkg in pkg_resources.working_set]
    if 'tensorflow-macos' in installed_packages:
        print("✓ Using tensorflow-macos")
    elif 'tensorflow' in installed_packages:
        print("⚠️ Using regular tensorflow (not tensorflow-macos)")
    
    # Test basic operation
    print("Testing basic TensorFlow operation...")
    x = tf.constant([[1.0, 2.0], [3.0, 4.0]])
    print(f"✓ SUCCESS: Created tensor {x.shape}")
    
except ImportError as e:
    print(f"❌ IMPORT ERROR: {e}")
    
except Exception as e:
    print(f"❌ GENERAL ERROR: {e}")

print("Test complete.")