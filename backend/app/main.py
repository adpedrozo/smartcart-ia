from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models
from .database import engine, get_db
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Create tables in database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartCart IA API", version="1.0.0")

# CORS - allows frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas ---
class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    current_stock: Optional[int] = 0
    minimum_stock: Optional[int] = 1

class PriceCreate(BaseModel):
    product_id: int
    supermarket: str
    price: float

# --- Routes ---
@app.get("/")
def root():
    return {"status": "SmartCart IA API running"}

@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return products

@app.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    # Validate category
    if not product.category or product.category.strip() == "":
        raise HTTPException(status_code=422, detail="Category is required")

    # Normalize name - Title Case and trim
    normalized_name = product.name.strip().title()

    # Aggressive comparison - remove spaces and lowercase for duplicate check
    def normalize_for_compare(name: str) -> str:
        return name.lower().replace(" ", "").replace(".", "").replace("-", "")

    normalized_compare = normalize_for_compare(normalized_name)

    # Check all existing products
    existing_products = db.query(models.Product).all()
    for existing in existing_products:
        if normalize_for_compare(existing.name) == normalized_compare:
            raise HTTPException(
                status_code=409,
                detail=f"Similar product already exists: {existing.name}"
            )

    product_data = product.model_dump()
    product_data["name"] = normalized_name
    product_data["unit"] = "unidades"

    db_product = models.Product(**product_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/products/with-prices")
def get_products_with_prices(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    result = []
    for product in products:
        cheapest_price = (
            db.query(models.Price)
            .filter(models.Price.product_id == product.id)
            .order_by(models.Price.price.asc())
            .first()
        )
        result.append({
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "current_stock": product.current_stock,
            "minimum_stock": product.minimum_stock,
            "created_at": product.created_at,
            "latest_price": cheapest_price.price if cheapest_price else None,
            "supermarket": cheapest_price.supermarket if cheapest_price else None,
        })
    return result

@app.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Delete associated prices first
    db.query(models.Price).filter(models.Price.product_id == product_id).delete()
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}

@app.get("/prices/{product_id}")
def get_prices(product_id: int, db: Session = Depends(get_db)):
    prices = db.query(models.Price).filter(models.Price.product_id == product_id).all()
    return prices

@app.post("/prices")
def create_price(price: PriceCreate, db: Session = Depends(get_db)):
    # Check if price already exists for this product and supermarket
    existing = db.query(models.Price).filter(
        models.Price.product_id == price.product_id,
        models.Price.supermarket == price.supermarket
    ).first()

    if existing:
        existing.price = price.price
        from sqlalchemy.sql import func
        existing.recorded_at = func.now()
        db.commit()
        db.refresh(existing)
        return existing

    # Create new price
    db_price = models.Price(**price.model_dump())
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price

@app.get("/shopping-list")
def get_shopping_list(db: Session = Depends(get_db)):
    from .logic import get_shopping_list
    return get_shopping_list(db)

@app.patch("/products/{product_id}/stock")
def update_stock(product_id: int, stock: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.current_stock = stock
    db.commit()
    db.refresh(product)
    return product

@app.get("/prices/{product_id}/alert")
def price_alert(product_id: int, db: Session = Depends(get_db)):
    from .logic import check_price_alert
    return check_price_alert(db, product_id)

@app.post("/tickets/scan")
async def scan_ticket(file: UploadFile = File(...)):
    """
    Receives a ticket image, extracts text with Vision OCR
    and parses products with Gemini.
    """
    from .ocr import process_ticket_image, parse_ticket_with_gemini

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG and WebP are supported."
        )

    # Read image bytes
    image_bytes = await file.read()

    # Step 1: Extract text with Google Vision
    ocr_result = process_ticket_image(image_bytes)
    raw_text = ocr_result["raw_text"]

    if not raw_text:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from image. Try with a clearer photo."
        )

    # Step 2: Parse with Gemini
    parsed = parse_ticket_with_gemini(raw_text)

    return {
        "raw_text": raw_text,
        "supermarket": parsed.get("supermarket"),
        "date": parsed.get("date"),
        "items": parsed.get("items", []),
        "total": parsed.get("total")
    }