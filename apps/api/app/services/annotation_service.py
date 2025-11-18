"""
🎨 Annotation Service
Service layer for managing MOV annotations (PDF and image highlights with comments).
"""

from datetime import datetime
from typing import List

from app.db.models.assessment import MOVAnnotation
from app.schemas.assessor import AnnotationCreate, AnnotationUpdate
from sqlalchemy.orm import Session


class AnnotationService:
    """Service for managing MOV annotations."""

    def create_annotation(
        self,
        db: Session,
        annotation_data: AnnotationCreate,
        assessor_id: int
    ) -> MOVAnnotation:
        """
        Create a new annotation on a MOV file.

        Args:
            db: Database session
            annotation_data: Annotation creation data
            assessor_id: ID of the assessor creating the annotation

        Returns:
            Created annotation entity
        """
        annotation = MOVAnnotation(
            mov_file_id=annotation_data.mov_file_id,
            assessor_id=assessor_id,
            annotation_type=annotation_data.annotation_type,
            page=annotation_data.page,
            rect=annotation_data.rect.model_dump(),
            rects=[r.model_dump() for r in annotation_data.rects] if annotation_data.rects else None,
            comment=annotation_data.comment,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(annotation)
        db.commit()
        db.refresh(annotation)

        return annotation

    def get_annotations_for_mov(
        self,
        db: Session,
        mov_file_id: int
    ) -> List[MOVAnnotation]:
        """
        Get all annotations for a specific MOV file.

        Args:
            db: Database session
            mov_file_id: ID of the MOV file

        Returns:
            List of annotations for the MOV file
        """
        return db.query(MOVAnnotation).filter(
            MOVAnnotation.mov_file_id == mov_file_id
        ).order_by(MOVAnnotation.created_at).all()

    def get_annotations_for_assessment(
        self,
        db: Session,
        assessment_id: int
    ) -> List[MOVAnnotation]:
        """
        Get all annotations for all MOV files in an assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            List of annotations for all MOVs in the assessment
        """
        from app.db.models.assessment import MOVFile

        return db.query(MOVAnnotation).join(
            MOVFile, MOVAnnotation.mov_file_id == MOVFile.id
        ).filter(
            MOVFile.assessment_id == assessment_id
        ).order_by(MOVAnnotation.created_at).all()

    def update_annotation(
        self,
        db: Session,
        annotation_id: int,
        annotation_data: AnnotationUpdate,
        assessor_id: int
    ) -> MOVAnnotation | None:
        """
        Update an existing annotation.

        Args:
            db: Database session
            annotation_id: ID of the annotation to update
            annotation_data: Updated annotation data
            assessor_id: ID of the assessor updating the annotation

        Returns:
            Updated annotation entity or None if not found or not authorized
        """
        annotation = db.query(MOVAnnotation).filter(
            MOVAnnotation.id == annotation_id,
            MOVAnnotation.assessor_id == assessor_id  # Only allow updating own annotations
        ).first()

        if not annotation:
            return None

        if annotation_data.comment is not None:
            annotation.comment = annotation_data.comment

        annotation.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(annotation)

        return annotation

    def delete_annotation(
        self,
        db: Session,
        annotation_id: int,
        assessor_id: int
    ) -> bool:
        """
        Delete an annotation.

        Args:
            db: Database session
            annotation_id: ID of the annotation to delete
            assessor_id: ID of the assessor deleting the annotation

        Returns:
            True if deleted, False if not found or not authorized
        """
        annotation = db.query(MOVAnnotation).filter(
            MOVAnnotation.id == annotation_id,
            MOVAnnotation.assessor_id == assessor_id  # Only allow deleting own annotations
        ).first()

        if not annotation:
            return False

        db.delete(annotation)
        db.commit()

        return True


# Singleton instance
annotation_service = AnnotationService()
