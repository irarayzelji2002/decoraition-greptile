from flask import Flask, request, jsonify, send_file, send_from_directory, url_for, render_template, redirect
from flask_cors import CORS
from diffusers import StableDiffusionPipeline
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image
from diffusers.utils import load_image, make_image_grid
from transformers import CLIPTextModel
import torch
import tomesd
from huggingface_hub import login
import uuid
import os
import webcolors
import math
import json
import thecolorapi
from PIL import Image
import requests
import io
import numpy as np
import cv2

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Directory
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
IMAGES_FOLDER = 'static/images'
if not os.path.exists(IMAGES_FOLDER):
    os.makedirs(IMAGES_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['IMAGES_FOLDER'] = IMAGES_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# ============== APP GLOBAL VARIABLES ==============
# stable_diffusion_pipeline = None
pipeline_text2image = None
pipeline_image2image = None
torch_generator = None
controlnet_conditioning_scale = 1.0  
negative_prompt = 'deformed, ugly, wrong proportion, longbody, low res, lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality'

# ============== APP FUNCTIONS ==============
def check_model_attributes(model):
    # List all available attributes and methods
    attributes = dir(model)
    print("Available attributes and methods:")
    # for attr in attributes:
    #     print(attr)

    # Check if specific attribute exists
    if 'image_projection_layers' in attributes:
        print("Attribute 'image_projection_layers' exists.")
    else:
        print("Attribute 'image_projection_layers' does not exist.")

def modify_weights(weights_path):
    try:
        state_dict = torch.load(weights_path, map_location="cuda:0")
    except Exception as e:
        print(f"Error loading weights: {e}")
        return {}
    modified_state_dict = {}
    for key, value in state_dict.items():
        if isinstance(value, torch.Tensor):
            print(f"Original shape of {key}: {value.shape}")
            # Handling decreased size (e.g., from 1024 to 768)
            if value.shape == torch.Size([320, 768]):
                factor = 1024 / 768  # Multiply by this factor to match expected shape
                modified_state_dict[key] = value * factor
            # Handling increased size (e.g., from 320x1024 to 640x2048)
            elif value.shape == torch.Size([640, 2048]):
                factor = 2  # Divide by this factor to reduce the size
                modified_state_dict[key] = value / factor
            else:
                modified_state_dict[key] = value  # No change for non-mismatched shapes
            print(f"Modified shape of {key}: {modified_state_dict[key].shape}")
    return modified_state_dict

def apply_local_patch_weights(pipeline, weight_path):
    # Load the patch weights
    patch_weights = torch.load(weight_path, map_location="cuda:0")
    unet = pipeline.unet
    
    # Apply the patch weights to the model
    for name, param in patch_weights.items():
        if name in dict(unet.named_parameters()):
            print(f"Applying weight to {name}")
            unet.state_dict()[name].copy_(param)
        else:
            print(f"Weight {name} not found in the model")

# Setup the Hugging Face Model/DiffusionPipeline based on the availability of CUDA.
# stabilityai/stable-diffusion-2-1-base, stabilityai/stable-diffusion-xl-base-1.0, CompVis/stable-diffusion-v1-4
def setup_pipeline(model_ids=["stabilityai/stable-diffusion-2-1-base", "h94/IP-Adapter"], access_token="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"):
    global pipeline_text2image
    global pipeline_image2image
    global torch_generator
    login(token=access_token)

    try:
        if torch.cuda.is_available():
            # Load the base Stable Diffusion model
            # stable_diffusion_pipeline = StableDiffusionPipeline.from_pretrained(model_ids[0], torch_dtype=torch.float16, use_auth_token=access_token)
            pipeline_text2image = AutoPipelineForText2Image.from_pretrained(
                model_ids[0], torch_dtype=torch.float16, variant="fp16", use_safetensors=True,
            ).to("cuda")
            pipeline_image2image = AutoPipelineForImage2Image.from_pipe(pipeline_text2image).to("cuda")
            print("=====save patch weights")
            # Load the IP Adapter weights manually, Modify the specific weights
            
            print("=====before ip adapter")
            ip_adapter_path = r"C:\Users\Ira\.cache\huggingface\hub\models--h94--IP-Adapter\snapshots\018e402774aeeddd60609b4ecdb7e298259dc729\sdxl_models\ip-adapter-plus_sdxl_vit-h.bin" #ip-adapter-plus_sdxl_vit-h.bin
            print("=====before ip adapter modify weights")
            modified_weights = modify_weights(ip_adapter_path)
            print("=====after ip adapter modify weights")
            pipeline_image2image.unet.load_state_dict(modified_weights, strict=False)
            print("=====after ip adapter load")
            # pipeline_image2image.load_ip_adapter(model_ids[1], subfolder="sdxl_models", weight_name="ip-adapter-plus_sdxl_vit-h.bin")
            pipeline_image2image.set_ip_adapter_scale(0.6)
            apply_local_patch_weights(pipeline_image2image, ip_adapter_path)
            print("=====after patch weight")
            # pipeline_image2image.unet.encoder_hid_proj = None
            torch_generator = torch.Generator(device="cpu").manual_seed(4)
            device = torch.device("cuda")
            
            # Apply ToMe
            torch.cuda.empty_cache()
            tomesd.apply_patch(pipeline_text2image, ratio=0.5, sx=4, sy=4, max_downsample=2)
            tomesd.apply_patch(pipeline_image2image, ratio=0.5, sx=4, sy=4, max_downsample=2)
        else:
            pipeline_text2image = AutoPipelineForText2Image.from_pretrained(
                model_ids[0], torch_dtype=torch.float16, variant="fp16", use_safetensors=True, ignore_mismatched_sizes=True
            ).to("cpu")
            pipeline_image2image = AutoPipelineForImage2Image.from_pipe(pipeline_text2image).to("cpu")
            device = torch.device("cpu")
    
        print(f"========Model loaded successfully. Running on device: {device}========")
        
    except Exception as e:
        print(f"========Error loading model: {e}========")
        pipeline_text2image = None
        pipeline_image2image = None

def test_pipelines():
    if pipeline_text2image is None or pipeline_image2image is None or torch_generator is None:
        if pipeline_text2image is None:
            print("pipeline_text2image not loaded correctly.")
        if pipeline_image2image is None:
            print("pipeline_image2image not loaded correctly.")
        if torch_generator is None:
            print("torch_generator not loaded correctly.")
    else:
        print(f"========pipeline_image2image attributes: {dir(pipeline_image2image)}")
        if hasattr(pipeline_image2image, 'unet'):
            print(f"========unet attributes: {dir(pipeline_image2image.unet)}")
            if hasattr(pipeline_image2image.unet, 'encoder_hid_proj'):
                print(f"========encoder_hid_proj attributes: {dir(pipeline_image2image.unet.encoder_hid_proj)}")
        print("======TEXT 2 IMAGE")
        check_model_attributes(pipeline_text2image)
        print("======IMAGE 2 IMAGE")
        check_model_attributes(pipeline_image2image)
        print("Pipelines loaded successfully.")

# Initialize pipeline when the module is loaded
setup_pipeline()
test_pipelines()

# Color name functions (color api)
def thecolorapi_hex_to_color_name (hex_code):
    try:
        color = thecolorapi.color(hex_code)
        color_name = color.name
        return color_name
    except Exception as e:
        print(f"Error: {e}")
        return hex_code  

def build_prompt_with_color(base_prompt, color_palette):
    color_names = [thecolorapi_hex_to_color_name(hex_code) for hex_code in color_palette]
    colors_description = ", ".join(color_names)
    return f"{base_prompt} with colors {colors_description}"

# Filename generation
def generate_image_filename(extension="png"):
    return f"{uuid.uuid4()}.{extension}"

# Allowed File types
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    try:
        styled_image_paths = []
        if style_image:
            base_image_path = image_path
            base_image = Image.open(base_image_path).convert("RGB")
            # Convert images to the appropriate format for the pipeline
            base_image_bytes = io.BytesIO()
            base_image.save(base_image_bytes, format='PNG')
            base_image_bytes.seek(0)
            style_image_bytes = io.BytesIO()
            style_image.save(style_image_bytes, format='PNG')
            style_image_bytes.seek(0)
            for i, image in enumerate(images):
                # Use the pipeline to apply the style
                styled_image = control_net_pipeline(
                    prompt="Apply style from reference image",
                    negative_prompt=negative_prompt,
                    image=style_image,
                    controlnet_conditioning_scale=controlnet_conditioning_scale,
                    width=1024,
                    height=1024,
                    num_inference_steps=30,
                ).images[0]
                # Save the styled image
                styled_image_filename = generate_image_filename()
                styled_image_path = os.path.join("static/images", styled_image_filename)
                styled_image.save(styled_image_path)
                styled_image_paths.append(url_for('image_file', filename=styled_image_filename, _external=True))
                print(f"========Styled Image {i+1} generated and saved as {styled_image_path}.========")
                # Return the paths or URLs to the saved styled images
                return jsonify({"image_paths": styled_image_path}), 200
    
    except Exception as e:
        print(f"========Error applying style: {e}========")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# ============== APP ROUTES ==============
@app.route('/decoraition/generate-image', methods=['POST'])
def generate_image():
    # Initialize variables
    base_image_loaded = None
    style_reference_loaded = None
    # Get data from formdata/json
    if request.content_type.startswith('multipart/form-data'):
        print("Multipart form data detected.")
        # Prompt and number of images
        prompt = request.form.get('prompt', "").strip()
        number_of_images = int(request.form.get('number_of_images', 0))
        # Color palette
        color_palette_str = request.form.get('color_palette', '[]')
        try:
            color_palette = json.loads(color_palette_str)  # Parse the color palette JSON string into a list
        except json.JSONDecodeError:
            color_palette = []
        # Base image
        base_image = request.files.get('base_image')  # Optional file upload
        if base_image and allowed_file(base_image.filename):
            print(f"Base image received.")
            base_image_loaded = Image.open(base_image).convert("RGB")
            print(f"Base image successfully loaded.")
        else:
            print(f"No base image received.")
            base_image = None
        # Style reference
        style_reference = request.files.get('style_reference')  # Optional file upload
        if style_reference and allowed_file(style_reference.filename):
            print(f"Style reference received.")
            style_reference_loaded = Image.open(style_reference).convert("RGB")
            print(f"Style image successfully loaded.")
        else:
            print(f"No style reference received.")
            style_reference_loaded = None
    else:
        data = request.json
        prompt = data.get('prompt', "").strip()
        number_of_images = data.get("number_of_images", 0)
        color_palette = data.get('color_palette', [])
        base_image_loaded = None
        style_reference_loaded = None
    
    # Print received data for debugging
    print("========Received Data========")
    print(f"Prompt: {prompt}")
    print(f"Number of Images: {number_of_images}")
    print(f"Color Palette: {color_palette}")
    print("========Final Prompt========")
    print(f"{prompt}")
    
    if not prompt:
        print("Empty prompt")
        return jsonify({"error": "Prompt is required"}), 400

    if color_palette:
        prompt = build_prompt_with_color(prompt, color_palette)

    try:
        if pipeline_text2image is None:
            raise RuntimeError("Pipeline not initialized")

        # Generate multiple images
        # if base_image_loaded:
        #     images = pipeline_image2image(
        #         prompt = prompt, 
        #         num_images_per_prompt = number_of_images, 
        #         image = [base_image_loaded] * number_of_images, 
        #         strength = 0.8, guidance_scale = 10.5,
        #         height = 512, width = 512,
        #         ip_adapter_image_embeds = None
        #     ).images
        # else:
        #     images = pipeline_text2image(
        #         prompt = [prompt], 
        #         num_images_per_prompt = number_of_images,
        #         ip_adapter_image_embeds = None
        #     ).images

        # Save each image
        # image_paths = []
        # for i, image in enumerate(images):
        #     image_filename = generate_image_filename()
        #     image_path = os.path.join("static/images", image_filename)
        #     image.save(image_path)
        #     image_paths.append(url_for('image_file', filename=image_filename, _external=True)) # image_paths.append(image_path)
        #     print(f"========Image {i+1} generated and saved as {image_path}.========")
        
        # Apply style reference
        image_paths = ['http://irarayzelji.pagekite.me/decoraition/images/c9d96552-9daa-4686-987c-c05761e57d61.png']
        print("image_paths:")
        print(image_paths)
        if style_reference_loaded:
            if pipeline_image2image is None or not hasattr(pipeline_image2image, 'image_projection_layers'):
                print(f"========IP Adapter is not properly initialized========")
                # return jsonify({"error": "IP Adapter is not properly initialized."}), 500
            new_image_paths = []
            for i, image_url in enumerate(image_paths):
                # Convert the URL back to the local file path
                image_filename = os.path.basename(image_url)
                generated_image_path = os.path.join("static/images", image_filename)
                generated_image = Image.open(generated_image_path).convert("RGB")
                print("=========generated_image_path:")
                print(generated_image_path)
                new_images = pipeline_image2image(
                    prompt = "best quality, high quality", 
                    image = generated_image,
                    ip_adapter_image = style_reference_loaded,
                    ip_adapter_image_embeds = None,
                    negative_prompt = negative_prompt,
                    generator = torch_generator,
                    strength = 0.6,
                    height = 512, width = 512
                ).images
                print("=========image generated")
                # Save the newly generated images
                for j, image in enumerate(new_images):
                    new_image_filename = generate_image_filename()
                    new_image_path = os.path.join("static/images", new_image_filename)
                    image.save(new_image_path)
                    new_image_paths.append(url_for('image_file', filename=new_image_filename, _external=True))
                    print(f"========New Image {j+1} generated and saved as {new_image_path}.========")

            return jsonify({"image_paths": new_image_paths}), 200

        # Return the paths or URLs to the saved images
        return jsonify({"image_paths": image_paths}), 200
    
    except Exception as e:
        print(f"========Error generating image: {e}========")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/decoraition/images/<filename>')
def image_file(filename):
    return redirect(url_for('static', filename='images/'+filename), code=301)

@app.route('/', methods=['GET'])
@app.route('/decoraition/test', methods=['GET'])
def show_test_page():
    return send_from_directory('templates', 'index.html')
    # return render_template('index.html')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080)
