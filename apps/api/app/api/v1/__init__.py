# 🚀 API v1 Package
# Version 1 of the SINAG API endpoints

# 📋 API V1 Router
# Combines all individual routers into a single V1 API router

# 📦 Imports
from fastapi import APIRouter

from . import admin, analytics, assessments, assessor, auth, bbis, blgu_dashboard, external_analytics, indicators, lookups, movs, notifications, system, users

# Create the main API router for V1
api_router = APIRouter()

# Include all individual routers with their prefixes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(
    assessments.router, prefix="/assessments", tags=["assessments"]
)
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(lookups.router, prefix="/lookups", tags=["lookups"])
api_router.include_router(assessor.router, prefix="/assessor", tags=["assessor"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(indicators.router, prefix="/indicators", tags=["indicators"])
api_router.include_router(bbis.router, prefix="/bbis", tags=["bbis"])
api_router.include_router(blgu_dashboard.router, prefix="/blgu-dashboard", tags=["blgu-dashboard"])
api_router.include_router(movs.router, prefix="/movs", tags=["movs"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(external_analytics.router)  # Prefix already included in router definition
