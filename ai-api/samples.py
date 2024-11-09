# ======================================
# HD Painter
import torch
from diffusers import DiffusionPipeline, DDIMScheduler
from diffusers.utils import load_image, make_image_grid

pipe = DiffusionPipeline.from_pretrained(
    "stabilityai/stable-diffusion-2-inpainting",
    custom_pipeline="hd_painter"
)
pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)

prompt = "wooden boat"
init_image = load_image("https://raw.githubusercontent.com/Picsart-AI-Research/HD-Painter/main/__assets__/samples/images/2.jpg")
mask_image = load_image("https://raw.githubusercontent.com/Picsart-AI-Research/HD-Painter/main/__assets__/samples/masks/2.png")

image = pipe(prompt, init_image, mask_image, use_rasg=True, use_painta=True, generator=torch.manual_seed(12345)).images[0]

make_image_grid([init_image, mask_image, image], rows=1, cols=3)

# ======================================
# LLM-grounded Diffusion
import torch
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained(
    "longlian/lmd_plus",
    custom_pipeline="llm_grounded_diffusion",
    custom_revision="main",
    variant="fp16", torch_dtype=torch.float16
)
pipe.enable_model_cpu_offload()

# Generate directly from a text prompt and an LLM response
prompt = "a waterfall and a modern high speed train in a beautiful forest with fall foliage"
phrases, boxes, bg_prompt, neg_prompt = pipe.parse_llm_response("""
[('a waterfall', [71, 105, 148, 258]), ('a modern high speed train', [255, 223, 181, 149])]
Background prompt: A beautiful forest with fall foliage
Negative prompt:
""")

images = pipe(
    prompt=prompt,
    negative_prompt=neg_prompt,
    phrases=phrases,
    boxes=boxes,
    gligen_scheduled_sampling_beta=0.4,
    output_type="pil",
    num_inference_steps=50,
    lmd_guidance_kwargs={}
).images

images[0].save("./lmd_plus_generation.jpg")

# ======================================
# Stable Diffusion Mega
#!/usr/bin/env python3
from diffusers import DiffusionPipeline
import PIL
import requests
from io import BytesIO
import torch


def download_image(url):
    response = requests.get(url)
    return PIL.Image.open(BytesIO(response.content)).convert("RGB")

pipe = DiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5", custom_pipeline="stable_diffusion_mega", torch_dtype=torch.float16, variant="fp16")
pipe.to("cuda")
pipe.enable_attention_slicing()


### Text-to-Image
images = pipe.text2img("An astronaut riding a horse").images

### Image-to-Image
init_image = download_image("https://raw.githubusercontent.com/CompVis/stable-diffusion/main/assets/stable-samples/img2img/sketch-mountains-input.jpg")

prompt = "A fantasy landscape, trending on artstation"

images = pipe.img2img(prompt=prompt, image=init_image, strength=0.75, guidance_scale=7.5).images

### Inpainting
img_url = "https://raw.githubusercontent.com/CompVis/latent-diffusion/main/data/inpainting_examples/overture-creations-5sI6fQgYIuo.png"
mask_url = "https://raw.githubusercontent.com/CompVis/latent-diffusion/main/data/inpainting_examples/overture-creations-5sI6fQgYIuo_mask.png"
init_image = download_image(img_url).resize((512, 512))
mask_image = download_image(mask_url).resize((512, 512))

prompt = "a cat sitting on a bench"
images = pipe.inpaint(prompt=prompt, image=init_image, mask_image=mask_image, strength=0.75).images

# ======================================
# Long Prompt Weighting Stable Diffusion
from diffusers import DiffusionPipeline
import torch

pipe = DiffusionPipeline.from_pretrained(
    'hakurei/waifu-diffusion',
    custom_pipeline="lpw_stable_diffusion",
    torch_dtype=torch.float16
)
pipe = pipe.to("cuda")

prompt = "best_quality (1girl:1.3) bow bride brown_hair closed_mouth frilled_bow frilled_hair_tubes frills (full_body:1.3) fox_ear hair_bow hair_tubes happy hood japanese_clothes kimono long_sleeves red_bow smile solo tabi uchikake white_kimono wide_sleeves cherry_blossoms"
neg_prompt = "lowres, bad_anatomy, error_body, error_hair, error_arm, error_hands, bad_hands, error_fingers, bad_fingers, missing_fingers, error_legs, bad_legs, multiple_legs, missing_legs, error_lighting, error_shadow, error_reflection, text, error, extra_digit, fewer_digits, cropped, worst_quality, low_quality, normal_quality, jpeg_artifacts, signature, watermark, username, blurry"

pipe.text2img(prompt, negative_prompt=neg_prompt, width=512, height=512, max_embeddings_multiples=3).images[0]

# ======================================
# Stable Diffusion XL Reference
import torch
from PIL import Image
from diffusers.utils import load_image
from diffusers import DiffusionPipeline
from diffusers.schedulers import UniPCMultistepScheduler

input_image = load_image("https://hf.co/datasets/huggingface/documentation-images/resolve/main/diffusers/input_image_vermeer.png")

pipe = DiffusionPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    custom_pipeline="stable_diffusion_xl_reference",
    torch_dtype=torch.float16,
    use_safetensors=True,
    variant="fp16").to('cuda:0')

# pipe = StableDiffusionXLReferencePipeline.from_pretrained(
#     "stabilityai/stable-diffusion-xl-base-1.0",
#     torch_dtype=torch.float16,
#     use_safetensors=True,
#     variant="fp16").to('cuda:0')

pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)

result_img = pipe(ref_image=input_image,
      prompt="1girl",
      num_inference_steps=20,
      reference_attn=True,
      reference_adain=True).images[0]

# Prompt Only (prompt): TensorRT Text2Image Stable Diffusion Pipeline (stabilityai/stable-diffusion-2-1)
# Base Image (prompt, image, strength): TensorRT Image2Image Stable Diffusion Pipeline (stabilityai/stable-diffusion-2-1)
# With Mask Image Editing (prompt, image, mask_image): TensorRT Inpainting Stable Diffusion Pipeline (stable-diffusion-2-inpainting) or HD-Painter (stable-diffusion-2-inpainting)
# Text Only Image Editing with selected image (base_prompt, target_prompt, image): EDICT Image Editing Pipeline (CompVis/stable-diffusion-v1-4)
# Ip Adapter Style ref

# ======================================
# TensorRT Text2Image Stable Diffusion Pipeline
import torch
from diffusers import DDIMScheduler
from diffusers.pipelines import DiffusionPipeline

# Use the DDIMScheduler scheduler here instead
scheduler = DDIMScheduler.from_pretrained("stabilityai/stable-diffusion-2-1", subfolder="scheduler")

pipe = DiffusionPipeline.from_pretrained("stabilityai/stable-diffusion-2-1",
    custom_pipeline="stable_diffusion_tensorrt_txt2img",
    variant='fp16',
    torch_dtype=torch.float16,
    scheduler=scheduler,)

# re-use cached folder to save ONNX models and TensorRT Engines
pipe.set_cached_folder("stabilityai/stable-diffusion-2-1", variant='fp16',)

pipe = pipe.to("cuda")

prompt = "a beautiful photograph of Mt. Fuji during cherry blossom"
image = pipe(prompt).images[0]
image.save('tensorrt_mt_fuji.png')

# ======================================
# TensorRT Image2Image Stable Diffusion Pipeline
import requests
from io import BytesIO
from PIL import Image
import torch
from diffusers import DDIMScheduler
from diffusers import DiffusionPipeline

# Use the DDIMScheduler scheduler here instead
scheduler = DDIMScheduler.from_pretrained("stabilityai/stable-diffusion-2-1",
                                            subfolder="scheduler")

pipe = DiffusionPipeline.from_pretrained("stabilityai/stable-diffusion-2-1",
                                            custom_pipeline="stable_diffusion_tensorrt_img2img",
                                            variant='fp16',
                                            torch_dtype=torch.float16,
                                            scheduler=scheduler,)

# re-use cached folder to save ONNX models and TensorRT Engines
pipe.set_cached_folder("stabilityai/stable-diffusion-2-1", variant='fp16',)

pipe = pipe.to("cuda")

url = "https://pajoca.com/wp-content/uploads/2022/09/tekito-yamakawa-1.png"
response = requests.get(url)
input_image = Image.open(BytesIO(response.content)).convert("RGB")
prompt = "photorealistic new zealand hills"
image = pipe(prompt, image=input_image, strength=0.75,).images[0]
image.save('tensorrt_img2img_new_zealand_hills.png')

# ======================================
# TensorRT Inpainting Stable Diffusion Pipeline
import requests
from io import BytesIO
from PIL import Image
import torch
from diffusers import PNDMScheduler
from diffusers.pipelines import DiffusionPipeline

# Use the PNDMScheduler scheduler here instead
scheduler = PNDMScheduler.from_pretrained("stabilityai/stable-diffusion-2-inpainting", subfolder="scheduler")

pipe = DiffusionPipeline.from_pretrained("stabilityai/stable-diffusion-2-inpainting",
    custom_pipeline="stable_diffusion_tensorrt_inpaint",
    variant='fp16',
    torch_dtype=torch.float16,
    scheduler=scheduler,
    )

# re-use cached folder to save ONNX models and TensorRT Engines
pipe.set_cached_folder("stabilityai/stable-diffusion-2-inpainting", variant='fp16',)

pipe = pipe.to("cuda")

url = "https://raw.githubusercontent.com/CompVis/latent-diffusion/main/data/inpainting_examples/overture-creations-5sI6fQgYIuo.png"
response = requests.get(url)
input_image = Image.open(BytesIO(response.content)).convert("RGB")

mask_url = "https://raw.githubusercontent.com/CompVis/latent-diffusion/main/data/inpainting_examples/overture-creations-5sI6fQgYIuo_mask.png"
response = requests.get(mask_url)
mask_image = Image.open(BytesIO(response.content)).convert("RGB")

prompt = "a mecha robot sitting on a bench"
image = pipe(prompt, image=input_image, mask_image=mask_image, strength=0.75,).images[0]
image.save('tensorrt_inpaint_mecha_robot.png')

# ======================================
# EDICT Image Editing Pipeline
from diffusers import DiffusionPipeline, DDIMScheduler
from transformers import CLIPTextModel
import torch, PIL, requests
from io import BytesIO
from IPython.display import display

def center_crop_and_resize(im):

    width, height = im.size
    d = min(width, height)
    left = (width - d) / 2
    upper = (height - d) / 2
    right = (width + d) / 2
    lower = (height + d) / 2

    return im.crop((left, upper, right, lower)).resize((512, 512))

torch_dtype = torch.float16
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# scheduler and text_encoder param values as in the paper
scheduler = DDIMScheduler(
        num_train_timesteps=1000,
        beta_start=0.00085,
        beta_end=0.012,
        beta_schedule="scaled_linear",
        set_alpha_to_one=False,
        clip_sample=False,
)

text_encoder = CLIPTextModel.from_pretrained(
    pretrained_model_name_or_path="openai/clip-vit-large-patch14",
    torch_dtype=torch_dtype,
)

# initialize pipeline
pipeline = DiffusionPipeline.from_pretrained(
    pretrained_model_name_or_path="CompVis/stable-diffusion-v1-4",
    custom_pipeline="edict_pipeline",
    variant="fp16",
    scheduler=scheduler,
    text_encoder=text_encoder,
    leapfrog_steps=True,
    torch_dtype=torch_dtype,
).to(device)

# download image
image_url = "https://huggingface.co/datasets/Joqsan/images/resolve/main/imagenet_dog_1.jpeg"
response = requests.get(image_url)
image = PIL.Image.open(BytesIO(response.content))

# preprocess it
cropped_image = center_crop_and_resize(image)

# define the prompts
base_prompt = "A dog"
target_prompt = "A golden retriever"

# run the pipeline
result_image = pipeline(
      base_prompt=base_prompt,
      target_prompt=target_prompt,
      image=cropped_image,
)

display(result_image)