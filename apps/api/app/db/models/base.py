from pydantic import BaseModel


class ApiResponse(BaseModel):
    """Standard API response format"""

    message: str
    status: str = "success"
    data: dict | None = None
