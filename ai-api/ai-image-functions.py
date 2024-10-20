from diffusers import DiffusionPipeline
import torch
from huggingface_hub import login

# Global variable for the pipeline
pipeline = None

# Setup the Hugging Face Model/DiffusionPipeline based on the availability of CUDA.
def setup_pipeline(model_id="stabilityai/stable-diffusion-2-1-base", access_token="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"):
    global pipeline
    # Log in to Hugging Face Hub
    login(token=access_token)

    try:
        # Load the model with CUDA if available, else CPU
        if torch.cuda.is_available():
            pipeline = DiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16, use_auth_token=access_token)
            device = torch.device("cuda")
        else:
            pipeline = DiffusionPipeline.from_pretrained(model_id, use_auth_token=access_token)
            device = torch.device("cpu")
        
        # Move pipeline to the selected device
        pipeline = pipeline.to(device)
        print(f"========Model loaded successfully. Running on device: {device}========")
    except Exception as e:
        print(f"========Error loading model: {e}========")
        pipeline = None

# Generate image from text
def generate_image(prompt="A room-sized stage design inspired by Dear Evan Hansen ending tree scene"):
    global pipeline
    if pipeline is None:
        print("========Pipeline is not initialized.========")
        return

    try:
        image = pipeline(prompt).images[0]
        image_path = "uploads/generated_image.png"
        image.save(image_path)
        print(f"========Image generated and saved as {image_path}.========")
    
    except Exception as e:
        print(f"========Error generating image: {e}========")

if __name__ == "__main__":
    setup_pipeline()
    if pipeline:
        generate_image()
