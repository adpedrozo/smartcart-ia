from fastapi import FastAPI, Depends, HTTPException
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
    unit: Optional[str] = None
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
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

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
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}

@app.get("/prices/{product_id}")
def get_prices(product_id: int, db: Session = Depends(get_db)):
    prices = db.query(models.Price).filter(models.Price.product_id == product_id).all()
    return prices

@app.post("/prices")
def create_price(price: PriceCreate, db: Session = Depends(get_db)):
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