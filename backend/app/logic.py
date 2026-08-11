from sqlalchemy.orm import Session
from . import models
from datetime import datetime, timezone

def calculate_stock_status(current_stock: int, minimum_stock: int) -> str:
    """
    Returns stock priority level based on current vs minimum stock.
    """
    if current_stock <= 0:
        return "critical"
    elif current_stock <= minimum_stock * 0.5:
        return "urgent"
    elif current_stock <= minimum_stock:
        return "low"
    else:
        return "ok"

def get_shopping_list(db: Session) -> list:
    """
    Generates a prioritized shopping list based on stock levels.
    Priority order: critical > urgent > low > opportunity
    """
    products = db.query(models.Product).all()
    shopping_list = []

    for product in products:
        status = calculate_stock_status(product.current_stock, product.minimum_stock)

        if status == "ok":
            continue  # No need to buy

        # Get latest price for this product
        latest_price = (
            db.query(models.Price)
            .filter(models.Price.product_id == product.id)
            .order_by(models.Price.recorded_at.desc())
            .first()
        )

        item = {
            "product_id": product.id,
            "name": product.name,
            "category": product.category,
            "unit": product.unit,
            "current_stock": product.current_stock,
            "minimum_stock": product.minimum_stock,
            "status": status,
            "latest_price": latest_price.price if latest_price else None,
            "supermarket": latest_price.supermarket if latest_price else None,
        }
        shopping_list.append(item)

    # Sort by priority
    priority_order = {"critical": 0, "urgent": 1, "low": 2}
    shopping_list.sort(key=lambda x: priority_order.get(x["status"], 99))

    return shopping_list

def check_price_alert(db: Session, product_id: int, threshold: float = 0.10) -> dict:
    """
    Checks if the latest price increased more than threshold (default 10%)
    compared to the average of previous prices.
    """
    prices = (
        db.query(models.Price)
        .filter(models.Price.product_id == product_id)
        .order_by(models.Price.recorded_at.desc())
        .all()
    )

    if len(prices) < 2:
        return {"alert": False, "message": "Not enough price history"}

    latest_price = prices[0].price
    previous_prices = [p.price for p in prices[1:]]
    average_price = sum(previous_prices) / len(previous_prices)
    variation = (latest_price - average_price) / average_price

    if variation >= threshold:
        return {
            "alert": True,
            "product_id": product_id,
            "latest_price": latest_price,
            "average_price": round(average_price, 2),
            "variation_percent": round(variation * 100, 2),
            "message": f"Price increased {round(variation * 100, 2)}% above average"
        }

    return {
        "alert": False,
        "latest_price": latest_price,
        "average_price": round(average_price, 2),
        "variation_percent": round(variation * 100, 2),
        "message": "Price within normal range"
    }