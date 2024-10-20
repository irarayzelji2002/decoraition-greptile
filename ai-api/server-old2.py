from flask import Flask, request, jsonify, send_from_directory, url_for, redirect, send_file
from flask_cors import CORS
from diffusers import DDIMScheduler, PNDMScheduler
from diffusers.pipelines import DiffusionPipeline
from diffusers.utils import load_image
from transformers import CLIPTextModel, GPT2LMHeadModel, GPT2Tokenizer
import torch, PIL, requests
from io import BytesIO
from IPython.display import display
from PIL import Image
import base64
import os
import uuid
import json
import tomesd
import thecolorapi

app = Flask(__name__)
CORS(app)

# Directory
IMAGES_FOLDER = 'static/images'
if not os.path.exists(IMAGES_FOLDER):
    os.makedirs(IMAGES_FOLDER)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['IMAGES_FOLDER'] = IMAGES_FOLDER

# ============== APP GLOBAL VARIABLES ==============
magicprompt_tokenizer = None
magicprompt_model = None
tensorrt_txt2img_pipe = None
tensorrt_img2img_pipe = None
tensorrt_inpaint_pipe = None
edict_pipe = None
model_ids = ["stabilityai/stable-diffusion-2-1-base",          #0
             "stabilityai/stable-diffusion-2-inpainting", #1
             "CompVis/stable-diffusion-v1-4",             #2
             "openai/clip-vit-large-patch14",             #3
             "Gustavosta/MagicPrompt-Stable-Diffusion"]   #4

# ============== APP FUNCTIONS ==============
# Setup the Hugging Face Model/DiffusionPipeline
def setup_pipelines():
    global magicprompt_tokenizer, magicprompt_model, tensorrt_txt2img_pipe, tensorrt_img2img_pipe, tensorrt_inpaint_pipe, edict_pipe

    if torch.cuda.is_available():
        device = "cuda"
        torch_dtype = torch.float16
    else:
        device = "cpu"
        torch_dtype = torch.float32

    # MagicPrompt
    magicprompt_tokenizer = GPT2Tokenizer.from_pretrained(model_ids[4])
    magicprompt_model = GPT2LMHeadModel.from_pretrained(model_ids[4])

    # TensorRT Text2Image Stable Diffusion Pipeline
    ddim_scheduler = DDIMScheduler.from_pretrained(model_ids[0], subfolder="scheduler")
    tensorrt_txt2img_pipe = DiffusionPipeline.from_pretrained(model_ids[0], custom_pipeline="stable_diffusion_tensorrt_txt2img", variant='fp16', torch_dtype=torch_dtype, scheduler=ddim_scheduler)
    tensorrt_txt2img_pipe.set_cached_folder(model_ids[0], variant='fp16')
    tensorrt_txt2img_pipe.to("cuda")
    tensorrt_txt2img_pipe.enable_attention_slicing()
    tensorrt_txt2img_pipe.enable_xformers_memory_efficient_attention()
    tomesd.apply_patch(tensorrt_txt2img_pipe, ratio=0.9, sx=4, sy=4, max_downsample=2)

    # TensorRT Image2Image Stable Diffusion Pipeline
    tensorrt_img2img_pipe = DiffusionPipeline.from_pretrained(model_ids[0], custom_pipeline="stable_diffusion_tensorrt_img2img", variant='fp16', torch_dtype=torch_dtype, scheduler=ddim_scheduler)
    tensorrt_img2img_pipe.set_cached_folder(model_ids[0], variant='fp16')
    tensorrt_img2img_pipe.to("cuda")
    tensorrt_img2img_pipe.enable_attention_slicing()
    tensorrt_img2img_pipe.enable_xformers_memory_efficient_attention()
    tomesd.apply_patch(tensorrt_img2img_pipe, ratio=0.9, sx=4, sy=4, max_downsample=2)

    # TensorRT Inpainting Stable Diffusion Pipeline
    pndm_scheduler = PNDMScheduler.from_pretrained(model_ids[1], subfolder="scheduler")
    tensorrt_inpaint_pipe = DiffusionPipeline.from_pretrained(model_ids[1], custom_pipeline="stable_diffusion_tensorrt_inpaint", variant='fp16', torch_dtype=torch_dtype, scheduler=pndm_scheduler)
    tensorrt_inpaint_pipe.set_cached_folder(model_ids[1], variant='fp16')
    tensorrt_inpaint_pipe.to("cuda")
    tensorrt_inpaint_pipe.enable_attention_slicing()
    tensorrt_inpaint_pipe.enable_xformers_memory_efficient_attention()
    tomesd.apply_patch(tensorrt_inpaint_pipe, ratio=0.9, sx=4, sy=4, max_downsample=2)

    # EDICT Image Editing Pipeline
    edict_scheduler = DDIMScheduler(num_train_timesteps=1000, beta_start=0.00085, beta_end=0.012, beta_schedule="scaled_linear", set_alpha_to_one=False, clip_sample=False)
    edict_text_encoder = CLIPTextModel.from_pretrained(pretrained_model_name_or_path=model_ids[3], torch_dtype=torch_dtype)
    edict_pipe = DiffusionPipeline.from_pretrained(pretrained_model_name_or_path=model_ids[2], custom_pipeline="edict_pipeline", variant="fp16", scheduler=edict_scheduler, text_encoder=edict_text_encoder, leapfrog_steps=True, torch_dtype=torch_dtype)
    edict_pipe.to(device)
    tomesd.apply_patch(edict_pipe, ratio=0.9, sx=4, sy=4, max_downsample=2)

    print("Pipelines loaded successfully.")

def test_pipelines():
    """Test pipelines to ensure everything is working correctly."""
    try:
        if magicprompt_tokenizer is None or magicprompt_model is None or tensorrt_txt2img_pipe is None or tensorrt_img2img_pipe is None or tensorrt_inpaint_pipe is None or edict_pipe is None:
            if magicprompt_tokenizer is None:
                print("magicprompt_tokenizer not loaded correctly (not used yet).")
            if magicprompt_model is None:
                print("magicprompt_model not loaded correctly (not used yet).")
            if tensorrt_txt2img_pipe is None:
                print("tensorrt_txt2img_pipe not loaded correctly.")
            if tensorrt_img2img_pipe is None:
                print("tensorrt_img2img_pipe not loaded correctly.")
            if tensorrt_inpaint_pipe is None:
                print("tensorrt_inpaint_pipe not loaded correctly.")
            if edict_pipe is None:
                print("edict_pipe not loaded correctly.")
        else:
            print("Pipeline setup and testing complete.")
    except Exception as e:
        print(f"Error during pipeline testing: {e}")

# Setup pipeline when the module is loaded
setup_pipelines()
test_pipelines()

# Function to crop images to 512 x 512
def center_crop_and_resize(im):
    width, height = im.size
    d = min(width, height)
    left = (width - d) / 2
    upper = (height - d) / 2
    right = (width + d) / 2
    lower = (height + d) / 2
    return im.crop((left, upper, right, lower)).resize((512, 512))

# Function to enhance prompt using MagicPrompt
def enhance_prompt(prompt, max_tokens=77):
    inputs = magicprompt_tokenizer(prompt, return_tensors="pt")
    outputs = magicprompt_model.generate(**inputs, max_length=max_tokens, num_return_sequences=1)
    enhanced_prompt = magicprompt_tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Truncate to ensure within max_tokens limit (77 for TensorRT)
    tokenized_output = magicprompt_tokenizer(enhanced_prompt, return_tensors="pt")
    if tokenized_output.input_ids.size(1) > max_tokens:
        enhanced_prompt = magicprompt_tokenizer.decode(tokenized_output.input_ids[0][:max_tokens], skip_special_tokens=True)
    
    return enhanced_prompt

# Color name functions using thecolorapi
def thecolorapi_hex_to_color_name(hex_code):
    try:
        color = thecolorapi.color(hex=hex_code)
        return color.name
    except Exception as e:
        print(f"Error retrieving color name: {e}")
        return hex_code  # Return the original hex code if there's an error

def build_prompt_with_color(base_prompt, color_palette):
    try:
        color_names = [thecolorapi_hex_to_color_name(hex_code) for hex_code in color_palette]
        colors_description = ", ".join(color_names)
        return f"{base_prompt} with colors {colors_description}"
    except Exception as e:
        print(f"Error building prompt with color: {e}")
        return base_prompt  # Fallback to base prompt if there's an error

# Filename generation
def generate_image_filename(extension="png"):
    return f"{uuid.uuid4()}.{extension}"

# Allowed File types
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_first_generation_request(data):
    """Validate the first image generation request."""
    try:
        base_image_loaded = None
        style_reference_loaded = None
        
        if request.content_type.startswith('multipart/form-data'):
            print("Multipart form data detected.")
            # Prompt and number of images
            prompt = data.get('prompt', "").strip()
            number_of_images = int(data.get('number_of_images', 0))
            # Color palette
            color_palette_str = data.get('color_palette', '[]')
            try:
                color_palette = json.loads(color_palette_str)
            except json.JSONDecodeError:
                color_palette = []
            # Base image
            base_image = request.files.get('base_image')
            if base_image and allowed_file(base_image.filename):
                print(f"Base image received.")
                base_image_loaded = Image.open(base_image).convert("RGB")
                print(f"Base image successfully loaded.")
            else:
                print(f"No base image received.")
                base_image = None
            # Style reference
            style_reference = request.files.get('style_reference')
            if style_reference and allowed_file(style_reference.filename):
                print(f"Style reference received.")
                style_reference_loaded = Image.open(style_reference).convert("RGB")
                print(f"Style image successfully loaded.")
            else:
                print(f"No style reference received.")
                style_reference_loaded = None
        else:
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
            return None, None, None, None, "Prompt is required"
        
        return prompt, number_of_images, base_image_loaded, style_reference_loaded, color_palette
    except Exception as e:
        print(f"Validation error: {e}")
        return None, None, None, None, f"Validation error: {str(e)}"

def validate_next_generation_request(data):
    """Validate the next image generation request (e.g., with selected area)."""
    try:
        prompt = data.get('prompt', "").strip()
        number_of_images = int(data.get('number_of_images', 0))
        prev_prompt = data.get('prev_prompt', "").strip()
        selected_image = data.get('selected_image', None)
        selected_area = data.get('selected_area', None)
        color_palette = data.get('color_palette', [])
        style_reference = request.files.get('style_reference')
        style_reference_loaded = None
        if style_reference and allowed_file(style_reference.filename):
            print(f"Style reference received.")
            style_reference_loaded = Image.open(style_reference).convert("RGB")
            print(f"Style image successfully loaded.")
        else:
            print(f"No style reference received.")
        
        # Print received data for debugging
        print("========Received Data========")
        print(f"Prompt: {prompt}")
        print(f"Number of Images: {number_of_images}")
        print(f"Color Palette: {color_palette}")
        print(f"Selected Area: {selected_area}")
        print("========Final Prompt========")
        print(f"{prompt}")

        if not prompt:
            print("Empty prompt")
            return None, None, None, None, "Prompt is required"
        
        return prompt, number_of_images, selected_image, selected_area, style_reference_loaded, color_palette
    except Exception as e:
        print(f"Validation error: {e}")
        return None, None, None, None, f"Validation error: {str(e)}"

def generate_image(prompt, number_of_images, base_image=None, prev_prompt=None, selected_image=None, selected_area=None, style_reference=None, color_palette=None):
    """Generate images using the Stable Diffusion model."""
    try:
        images = []
        
        if color_palette is not None:
            # Logic for incorporating the color palette into the prompt
            prompt_with_colors = build_prompt_with_color(prompt, color_palette)
        else:
            prompt_with_colors = prompt
        
        # Enhance prompt using LLM and LPW
        enhanced_prompt = enhance_prompt(prompt_with_colors)

        # Flow 1: First generation
        if not selected_image:
            if base_image and not style_reference:
                # Case 1: Image-to-image generation using the base image
                print("========tensorrt_img2img_pipe (with base_image)========")
                images = tensorrt_img2img_pipe(
                    prompt=enhanced_prompt,
                    num_images_per_prompt=number_of_images,
                    image=base_image,
                    strength=0.75,     # High strength to adhere to base image structure
                    guidance_scale=3.0 # Lower guidance_scale to focus more on the base image structure
                ).images
            elif style_reference and not base_image:
                # Case 2: Image-to-image generation using the style reference
                print("========tensorrt_img2img_pipe (with style_reference)========")
                images = tensorrt_img2img_pipe(
                    prompt=enhanced_prompt,
                    num_images_per_prompt=number_of_images,
                    image=style_reference,
                    strength=0.25,     # Lower strength to maintain base image structure
                    guidance_scale=7.5 # Higher guidance_scale to follow the style reference image
                ).images
            elif base_image and style_reference:
                # Case 3: Image-to-image generation using the base image and style reference
                print("========pipe (with base_image & style_reference)========")
                print("Not yet working")
            else:
                # Case 4: Text-to_image generation
                print("========tensorrt_txt2img_pipe-=======")
                images = tensorrt_txt2img_pipe(
                    prompt=enhanced_prompt,
                    num_images_per_prompt=number_of_images,
                ).images

        # Flow 2: Next generation
        else:
            if selected_area and not style_reference:
                # Case 1: Inpainting the selected area
                print("========tensorrt_inpaint_pipe (refine with selected_area)========")
                images = tensorrt_inpaint_pipe(
                    prompt=enhanced_prompt, 
                    num_images_per_prompt=number_of_images,
                    image=selected_image, 
                    mask_image=selected_area, 
                    strength=0.75
                ).images
                
                # images = []
                # for i in range(number_of_images):
                #     image = tensorrt_inpaint_pipe(prompt=enhanced_prompt, image=selected_image, mask_image=selected_area, strength=0.75).images[0]
                #     images.append(image)
            elif style_reference and not selected_area:
                # Case 2: Image-to-image generation using the style reference
                print("========pipe (refine with style_reference & not selected area========")
                print("Not yet working")
                # how can i do this?
            elif selected_area and style_reference:
                # Case 3: Image-to-image generation using the base image and style reference
                print("========pipe (refine with selected_area & style_reference)========")
                print("Not yet working")
                # how can i do this?
            else:
                # Case 4: Refinement without a mask
                print("========edict_pipe (refine with no selected_area)========")
                cropped_image = center_crop_and_resize(selected_image)
                images = []
                for i in range(number_of_images):
                    image = edict_pipe(
                        base_prompt=prev_prompt,
                        target_prompt=enhanced_prompt,
                        image=cropped_image,
                    )
                    images.append(image)
        return images
    except Exception as e:
        print(f"Error generating images: {e}")
        raise

@app.route('/generate-image', methods=['POST'])
def generate_image_route():
    """Route for generating the first set of images."""
    try:
        data = request.form if request.content_type.startswith('multipart/form-data') else request.json
        prompt, number_of_images, base_image_loaded, style_reference_loaded, color_palette = validate_first_generation_request(data)

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        images = generate_image(
            prompt, number_of_images, base_image=base_image_loaded, 
            prev_prompt=None, selected_image=None, selected_area=None, 
            style_reference=style_reference_loaded, color_palette=color_palette)
        
        image_paths = []
        for i, image in enumerate(images):
            image_filename = generate_image_filename()
            image_path = os.path.join(IMAGES_FOLDER, image_filename)
            image.save(image_path)
            image_paths.append(url_for('image_file', filename=image_filename, _external=True))
            print(f"Image {i+1} generated and saved as {image_path}.")

        return jsonify({"image_paths": image_paths}), 200
    except Exception as e:
        print(f"Error generating image: {e}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/generate-next-image', methods=['POST'])
def generate_next_image_route():
    """Route for generating the next set of images using a selected area."""
    try:
        data = request.form if request.content_type.startswith('multipart/form-data') else request.json
        prompt, number_of_images, prev_prompt, selected_image, selected_area, style_reference_loaded, color_palette = validate_next_generation_request(data)

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        images = generate_image(
            prompt, number_of_images, base_image=None, 
            prev_prompt=prev_prompt, selected_image=selected_image, selected_area=selected_area, 
            style_reference=style_reference_loaded, color_palette=color_palette)

        image_paths = []
        for i, image in enumerate(images):
            image_filename = generate_image_filename()
            image_path = os.path.join(IMAGES_FOLDER, image_filename)
            image.save(image_path)
            image_paths.append(url_for('image_file', filename=image_filename, _external=True))
            print(f"Image {i+1} generated and saved as {image_path}.")

        return jsonify({"image_paths": image_paths}), 200
    except Exception as e:
        print(f"Error generating image: {e}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/images/<filename>')
def image_file(filename):
    """Serve the generated image files."""
    return redirect(url_for('static', filename='images/'+filename), code=301)
    # return send_file(os.path.join(IMAGES_FOLDER, filename))

@app.route('/', methods=['GET'])
@app.route('/test', methods=['GET'])
def show_test_page():
    return send_from_directory('templates', 'first-geenration.html')
    # return render_template('index.html')

@app.route('/', methods=['GET'])
@app.route('/test/next-generation', methods=['GET'])
def show_test_page():
    return send_from_directory('templates', 'next-generation.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
