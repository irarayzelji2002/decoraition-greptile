import onnx.version
import pycuda.driver as cuda
import pycuda.autoinit  # Automatically initializes CUDA driver
import pycuda.tools as tools
import torch
import tensorrt
import xformers
import onnx
import onnxruntime

print(f"PyTorch version: {torch.__version__}")
print(f"PyTorch CUDA available: {torch.cuda.is_available()}")
print(f"PyTorch CUDA version: {torch.version.cuda}")
print(f"PyTorch cuDNN available: {torch.backends.cudnn.enabled}")

# Print CUDA version
print(f"Device CUDA Version: {cuda.get_version()}")

# Check CUDA device properties
device = cuda.Device(0)
print(f"Device name: {device.name()}")
print(f"Device compute capability: {device.compute_capability()}")

# Example of accessing device properties
# props = device.get_attributes()
# print("Device properties:", props)

print(f"onnx version: {onnx.version}")
print(f"onnxruntime version: {onnxruntime.__version__}")
print(f"TensorRT version: {tensorrt.__version__}")
print(f"xformers version: {xformers.__version__}")