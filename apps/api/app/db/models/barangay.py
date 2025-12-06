# 🏘️ Barangay Database Model
# SQLAlchemy model for the barangays table

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Barangay(Base):
    """
    Barangay table model for database storage.

    This represents a barangay within a municipality.
    """

    __tablename__ = "barangays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)

    users = relationship("User", back_populates="barangay")
    deadline_overrides = relationship("DeadlineOverride", back_populates="barangay")
