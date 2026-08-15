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

@app.patch("/products/{product_id}/stock")
def update_stock(product_id: int, stock: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.current_stock = stock
    db.commit()
    db.refresh(product)
    return product

@app.patch("/products/{product_id}/name")
def update_product_name(product_id: int, name: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Normalize name
    normalized_name = name.strip().title()
    
    product.name = normalized_name
    db.commit()
    db.refresh(product)
    return product

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
    prices = (
        db.query(models.Price)
        .filter(models.Price.product_id == product_id)
        .order_by(models.Price.recorded_at.desc())
        .all()
    )
    return prices

@app.post("/prices")
def create_price(price: PriceCreate, db: Session = Depends(get_db)):
    db_price = models.Price(**price.model_dump())
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price

@app.delete("/prices/{price_id}")
def delete_price(price_id: int, db: Session = Depends(get_db)):
    price = db.query(models.Price).filter(models.Price.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")
    db.delete(price)
    db.commit()
    return {"message": "Price deleted"}

@app.get("/prices/{product_id}/alert")
def price_alert(product_id: int, db: Session = Depends(get_db)):
    from .logic import check_price_alert
    return check_price_alert(db, product_id)

@app.get("/shopping-list")
def get_shopping_list(db: Session = Depends(get_db)):
    from .logic import get_shopping_list
    return get_shopping_list(db)

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

@app.post("/tickets/analyze")
async def analyze_ticket(file: UploadFile = File(...)):
    """
    Full agent pipeline:
    1. OCR with Google Vision
    2. Parse with Gemini
    3. Analyze products against inventory and price history
    """
    from .ocr import process_ticket_image, parse_ticket_with_gemini
    from .agent import analyze_ticket_products

    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG and WebP are supported."
        )

    image_bytes = await file.read()

    # Step 1: OCR
    ocr_result = process_ticket_image(image_bytes)
    raw_text = ocr_result["raw_text"]

    if not raw_text:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from image. Try with a clearer photo."
        )

    # Step 2: Parse with Gemini
    try:
        parsed = parse_ticket_with_gemini(raw_text)
    except Exception as e:
        error_msg = str(e)
        if '503' in error_msg or 'UNAVAILABLE' in error_msg or 'high demand' in error_msg:
            raise HTTPException(status_code=503, detail="El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.")
        raise HTTPException(status_code=422, detail="No se pudo leer el ticket. Asegurate de que la foto sea clara.")

    # Step 3: Agent analysis
    from .database import SessionLocal
    db = SessionLocal()
    try:
        analysis = analyze_ticket_products(parsed.get("items", []), db)
    except Exception as e:
        db.close()
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        db.close()

    return {
        "supermarket": parsed.get("supermarket"),
        "date": parsed.get("date"),
        "total": parsed.get("total"),
        "raw_text": raw_text,
        "items": analysis["items"],
        "alerts": analysis["alerts"],
        "suggestions": analysis["suggestions"],
    }