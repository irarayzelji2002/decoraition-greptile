import torch

# Check PyTorch version
print(f"PyTorch version: {torch.__version__}")

# Check CUDA availability
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    # Print CUDA version
    print(f"CUDA version: {torch.version.cuda}")

    # Check if GPU supports float16
    print(f"Supports float16: {torch.cuda.get_device_capability(0)}")

    # Check cuDNN version
    print(f"cuDNN version: {torch.backends.cudnn.version()}")

# Print device information
print(f"Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
