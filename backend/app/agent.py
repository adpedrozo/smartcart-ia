import os
import json
from google import genai
from sqlalchemy.orm import Session
from . import models

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_ticket_products(raw_items: list, db: Session) -> dict:
    """
    Agent that analyzes detected ticket products and:
    1. Checks if each product already exists in inventory
    2. Compares prices with historical data
    3. Generates contextual suggestions using Gemini
    Returns enriched analysis for the frontend.
    """
    enriched_items = []
    alerts = []

    for item in raw_items:
        name = item.get("name", "")
        price = item.get("price")
        category = item.get("category", "Almacén")

        # Check if product exists in inventory (normalized comparison)
        def normalize(s):
            return s.lower().replace(" ", "").replace(".", "").replace("-", "")

        existing_product = None
        all_products = db.query(models.Product).all()
        for p in all_products:
            if normalize(p.name) == normalize(name):
                existing_product = p
                break

        # Check price history if product exists
        price_change = None
        last_price = None
        last_supermarket = None

        if existing_product and price:
            last_price_record = (
                db.query(models.Price)
                .filter(models.Price.product_id == existing_product.id)
                .order_by(models.Price.recorded_at.desc())
                .first()
            )
            if last_price_record:
                last_price = last_price_record.price
                last_supermarket = last_price_record.supermarket
                variation = (price - last_price) / last_price * 100
                price_change = round(variation, 1)

                if abs(price_change) >= 5:
                    direction = "subio" if price_change > 0 else "bajo"
                    alerts.append({
                        "product": name,
                        "direction": direction,
                        "percent": abs(price_change),
                        "old_price": last_price,
                        "new_price": price,
                    })

        enriched_items.append({
            "name": name,
            "price": price,
            "category": category,
            "exists_in_inventory": existing_product is not None,
            "existing_product_id": existing_product.id if existing_product else None,
            "price_change_percent": price_change,
            "last_price": last_price,
            "last_supermarket": last_supermarket,
        })

    # Generate suggestions with Gemini if there are alerts
    suggestions = []
    if alerts:
        prompt = f"""
Sos un asistente de compras inteligente para el hogar argentino.
Analizá estos cambios de precio detectados en un ticket de supermercado
y generá sugerencias breves y útiles en español para el usuario.
Máximo 2 oraciones por sugerencia. Sé directo y práctico.

Cambios detectados:
{json.dumps(alerts, ensure_ascii=False)}

Devolvé SOLO un array JSON con strings, sin explicaciones ni markdown.
Ejemplo: ["El aceite subió 18%, conviene stockearse si tenés presupuesto.", "El azúcar bajó 12%, buen momento para comprar más."]
"""
        try:
            response = gemini_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt
            )
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            suggestions = json.loads(text)
        except Exception as e:
            print(f"Gemini suggestion error: {e}")
            suggestions = []

    return {
        "items": enriched_items,
        "alerts": alerts,
        "suggestions": suggestions,
    }