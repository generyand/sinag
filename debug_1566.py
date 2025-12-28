
import sys
import os

# Add the project root to the python path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

from unittest.mock import MagicMock
sys.modules["redis"] = MagicMock()

from app.db.base import SessionLocal
from app.db.models.assessment import MOVFile
from app.services.storage_service import storage_service
from urllib.parse import unquote

def debug_mov_file(file_id):
    db = SessionLocal()
    try:
        mov_file = db.query(MOVFile).filter(MOVFile.id == file_id).first()
        if not mov_file:
            print(f"File {file_id} not found")
            return

        print(f"--- Debugging MOVFile {file_id} ---")
        print(f"File Name: {mov_file.file_name}")
        print(f"File URL:  {mov_file.file_url}")
        
        # Test extraction
        bucket = "mov-files"
        if f"/{bucket}/" in mov_file.file_url:
            encoded_path = mov_file.file_url.split(f"/{bucket}/")[1]
            decoded_path = unquote(encoded_path)
            print(f"Extracted Encoded Path: {encoded_path}")
            print(f"Decoded Path: {decoded_path}")
            
            # Try to generate signed URL (dry run if possible, or real)
            try:
                # This requires Supabase credentials in env
                print("Attempting to generate signed URL...")
                signed = storage_service.get_signed_url(mov_file.file_url)
                print(f"Refreshed Signed URL: {signed[:50]}...")
            except Exception as e:
                print(f"Error generating signed URL: {e}")
                print(f"Exception Type: {type(e)}")
        else:
            print("URL mismatch with bucket")
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_mov_file(1566)
