from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import base64
from io import BytesIO

app = FastAPI()

SD_URL = "http://127.0.0.1:7860"  # SD Web UI URL

class ImageRequest(BaseModel):
    prompt: str

@app.post("/generate_image_with_prompt")
def generate_image(image_request: ImageRequest):
    txt2img_payload = {
        "prompt": image_request.prompt,
        "steps": 30,
        "sampler_name": "DPM++ 2M SDE",
        "cfg_scale": 6,
        "width": 512,
        "height": 512,
        "seed": -1
    }

    response = requests.post(f"{SD_URL}/sdapi/v1/txt2img", json=txt2img_payload)

    if response.status_code == 200:
        return response.json()
    # if response.status_code == 200:
    #     image_data = response.json()["images"][0]
    #     image_bytes = base64.b64decode(image_data)

    #     return StreamingResponse(BytesIO(image_bytes), media_type="image/png")
    else:
        raise HTTPException(status_code=response.status_code, detail=response.text)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8080)

# uvicorn server-test:app --reload --port 8080
# Invoke-WebRequest -Uri "http://127.0.0.1:8080/generate_image_with_prompt" -Method Post -Body '{"prompt": "A futuristic cityscape at sunset"}' -ContentType "application/json
