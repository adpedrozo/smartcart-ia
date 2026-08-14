import os
import json
from google.cloud import vision
from google.oauth2 import service_account
from google import genai

# Configure Gemini client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_vision_client():
    """
    Returns a Vision API client.
    Supports both local file and environment variable credentials.
    """
    credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")

    if credentials_json:
        credentials_info = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        return vision.ImageAnnotatorClient(credentials=credentials)
    else:
        return vision.ImageAnnotatorClient()

def process_ticket_image(image_bytes: bytes) -> dict:
    """
    Processes a ticket image and extracts text using Google Vision OCR.
    """
    client = get_vision_client()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise Exception(f"Vision API error: {response.error.message}")

    texts = response.text_annotations
    if not texts:
        return {"raw_text": ""}

    raw_text = texts[0].description

    return {"raw_text": raw_text}

def parse_ticket_with_gemini(raw_text: str) -> dict:
    """
    Uses Gemini to extract products and prices from raw OCR ticket text.
    Returns structured JSON with supermarket, date, items and total.
    """
    prompt = f"""
You are a receipt parser for Argentine supermarket tickets.
Extract the products and prices from this ticket text.

Rules:
- Ignore header info: store name, address, CUIT, phone, date, cashier, receipt numbers
- Ignore barcodes (long sequences of numbers)
- Ignore payment info: VISA, MASTERCARD, total, change, payments
- Ignore discounts and bonifications lines
- Each product has a name and a price in Argentine pesos
- Prices have format like 158.00 or 355,37
- If a product name spans multiple lines, join them into one
- Return ONLY valid JSON, no explanation, no markdown

The available categories are: Almacén, Lácteos, Carnes, Frutas y Verduras, Limpieza, Higiene Personal, Bebidas, Congelados, Panadería, Otros.

Return this exact JSON structure:
{{
  "supermarket": "store name or null",
  "date": "date found or null",
  "items": [
    {{"name": "product name", "price": 0.00, "category": "category from the list above"}},
    {{"name": "product name", "price": 0.00, "category": "category from the list above"}}
  ],
  "total": 0.00
}}

Ticket text:
{raw_text}
"""

    response = gemini_client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt
    )

    text = response.text.strip()

    # Clean markdown if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return json.loads(text)