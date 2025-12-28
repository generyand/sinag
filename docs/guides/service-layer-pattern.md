# Service Layer Pattern

> **TODO**: Document the "Fat Services, Thin Routers" pattern including:
>
> - Philosophy and benefits
> - Service layer responsibilities
> - Router layer responsibilities
> - Dependency injection
> - Error handling in services vs routers
> - Transaction management
> - Testing services in isolation
> - Common anti-patterns to avoid

## The Pattern

**Fat Services, Thin Routers** - Business logic lives in service classes, not in API route handlers.

### Why This Pattern?

> **TODO**: Explain benefits:
>
> - Testability
> - Reusability
> - Separation of concerns
> - Maintainability

## Service Layer

Services contain all business logic and data access.

```python
# apps/api/app/services/example_service.py

class ExampleService:
    """Service for managing examples."""

    def get_example(self, db: Session, example_id: int) -> Example:
        """
        Get an example by ID.

        Args:
            db: Database session
            example_id: ID of the example

        Returns:
            Example object

        Raises:
            HTTPException: If example not found
        """
        # TODO: Add implementation example
        pass

    def create_example(self, db: Session, data: ExampleCreate) -> Example:
        """Create a new example."""
        # TODO: Add implementation example
        pass

# Singleton instance
example_service = ExampleService()
```

## Router Layer

Routers are thin wrappers that handle HTTP concerns only.

```python
# apps/api/app/api/v1/examples.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.services.example_service import example_service

router = APIRouter()

@router.get("/{example_id}", tags=["examples"])
def get_example(
    example_id: int,
    db: Session = Depends(deps.get_db),
):
    """Get an example by ID."""
    return example_service.get_example(db, example_id)

@router.post("/", tags=["examples"])
def create_example(
    data: ExampleCreate,
    db: Session = Depends(deps.get_db),
):
    """Create a new example."""
    return example_service.create_example(db, data)
```

## Best Practices

> **TODO**: Document best practices

## Anti-Patterns to Avoid

> **TODO**: Document common mistakes

## Testing Services

> **TODO**: Document how to test services in isolation
