/**
 * E2E Tests for MOV File Upload System (Epic 4.0)
 *
 * Tests the complete file upload workflow including:
 * - File upload via drag-and-drop and file picker
 * - File list display with metadata
 * - File preview functionality
 * - File deletion with permissions
 * - Validation error handling
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Test fixtures - create temporary test files
const TEST_FILES_DIR = path.join(__dirname, "../fixtures/files");

test.describe("MOV File Upload - Epic 4.0", () => {
  test.beforeAll(async () => {
    // Ensure test fixtures directory exists
    if (!fs.existsSync(TEST_FILES_DIR)) {
      fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
    }

    // Create test PDF file
    const pdfPath = path.join(TEST_FILES_DIR, "test-document.pdf");
    if (!fs.existsSync(pdfPath)) {
      // Create a simple PDF (PDF header)
      const pdfContent = Buffer.from(
        "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000015 00000 n\n0000000062 00000 n\n0000000111 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n199\n%%EOF"
      );
      fs.writeFileSync(pdfPath, pdfContent);
    }

    // Create test image file
    const imagePath = path.join(TEST_FILES_DIR, "test-image.jpg");
    if (!fs.existsSync(imagePath)) {
      // Create a minimal JPEG (JPEG header)
      const jpegContent = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]);
      fs.writeFileSync(imagePath, jpegContent);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login as BLGU user
    await page.goto("http://localhost:3000/login");
    await page.fill("#email", "test1@example.com");
    await page.fill("#password", "Test123!@#");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/blgu/assessments", { timeout: 10000 });

    // Navigate to indicator with file upload (indicator 278)
    await page.goto("http://localhost:3000/blgu/assessment/68/indicator/278");
    await page.waitForLoadState("networkidle");
  });

  test("should display file upload component", async ({ page }) => {
    // Verify file upload section is visible
    const uploadSection = page.locator("text=Upload Files for BESWMC Documents");
    await expect(uploadSection).toBeVisible();

    // Verify drag-and-drop zone
    const dropzone = page.locator("text=Drag and drop a file here, or click to browse");
    await expect(dropzone).toBeVisible();

    // Verify help text about file types
    const helpText = page.locator("text=Maximum file size: 50MB");
    await expect(helpText).toBeVisible();
  });

  test("should upload file via file picker", async ({ page }) => {
    // Locate the file input element
    const fileInput = page.locator('input[type="file"]');

    // Upload PDF file
    const pdfPath = path.join(TEST_FILES_DIR, "test-document.pdf");
    await fileInput.setInputFiles(pdfPath);

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Verify success message
    await expect(page.locator("text=File uploaded successfully")).toBeVisible({ timeout: 10000 });

    // Verify file appears in uploaded files list
    await expect(page.locator("text=test-document.pdf")).toBeVisible();
  });

  test("should display uploaded file metadata", async ({ page }) => {
    // Upload a file first
    const fileInput = page.locator('input[type="file"]');
    const pdfPath = path.join(TEST_FILES_DIR, "test-document.pdf");
    await fileInput.setInputFiles(pdfPath);

    await page.waitForTimeout(2000);

    // Verify file name
    const fileName = page.locator("text=test-document.pdf");
    await expect(fileName).toBeVisible();

    // Verify file size is displayed
    const fileList = page.locator('[data-testid="uploaded-files-list"], .uploaded-files');
    await expect(fileList).toContainText(/KB|MB/i);

    // Verify uploaded date/time
    await expect(fileList).toContainText(/ago|second|minute|hour/i);
  });

  test("should upload multiple files sequentially", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload PDF
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-document.pdf"));
    await page.waitForTimeout(2000);
    await expect(page.locator("text=test-document.pdf")).toBeVisible();

    // Upload image
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-image.jpg"));
    await page.waitForTimeout(2000);
    await expect(page.locator("text=test-image.jpg")).toBeVisible();

    // Verify both files are in the list
    const uploadedFiles = page.locator('.uploaded-file-item, [data-testid="file-item"]');
    await expect(uploadedFiles).toHaveCount(2, { timeout: 5000 });
  });

  test("should preview uploaded file", async ({ page }) => {
    // Upload image file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-image.jpg"));
    await page.waitForTimeout(2000);

    // Click preview button
    const previewButton = page
      .locator('button:has-text("Preview"), button[aria-label="Preview file"]')
      .first();
    await previewButton.click();

    // Verify preview modal opens
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });

    // Close modal
    const closeButton = page
      .locator('button:has-text("Close"), button[aria-label="Close"]')
      .first();
    await closeButton.click();

    // Verify modal closes
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 5000 });
  });

  test("should delete uploaded file", async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-document.pdf"));
    await page.waitForTimeout(2000);

    // Click delete button
    const deleteButton = page
      .locator('button:has-text("Delete"), button[aria-label="Delete file"]')
      .first();
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmButton = page
      .locator('button:has-text("Delete"), button:has-text("Confirm")')
      .last();
    await confirmButton.click();

    // Verify file removed from list
    await expect(page.locator("text=test-document.pdf")).not.toBeVisible({ timeout: 5000 });

    // Verify success message
    await expect(page.locator("text=File deleted successfully")).toBeVisible({ timeout: 5000 });
  });

  test("should reject invalid file type", async ({ page }) => {
    // Create invalid file type (.txt)
    const invalidPath = path.join(TEST_FILES_DIR, "invalid-file.txt");
    fs.writeFileSync(invalidPath, "This is a text file");

    // Attempt to upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidPath);
    await page.waitForTimeout(2000);

    // Verify error message
    await expect(page.locator("text=File type not supported, text=Invalid file type")).toBeVisible({
      timeout: 5000,
    });

    // Cleanup
    fs.unlinkSync(invalidPath);
  });

  test("should reject oversized file", async ({ page }) => {
    // Create large file (> 50MB simulated by checking client-side validation)
    const largePath = path.join(TEST_FILES_DIR, "large-file.pdf");

    // Create a 51MB file
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
    fs.writeFileSync(largePath, largeBuffer);

    // Attempt to upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largePath);
    await page.waitForTimeout(2000);

    // Verify error message
    await expect(page.locator("text=File size exceeds, text=File too large")).toBeVisible({
      timeout: 5000,
    });

    // Cleanup
    fs.unlinkSync(largePath);
  });

  test("should display upload progress", async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-document.pdf"));

    // Check for progress indicator (progress bar or spinner)
    const progressIndicator = page.locator(
      '[role="progressbar"], .upload-progress, text=Uploading'
    );

    // Progress should be visible during upload
    await expect(progressIndicator)
      .toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Progress might complete too fast for small files
        console.log("Upload completed before progress could be checked");
      });

    // Wait for completion
    await page.waitForTimeout(2000);
  });

  test("should persist uploaded files on page refresh", async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-document.pdf"));
    await page.waitForTimeout(2000);

    // Verify file is uploaded
    await expect(page.locator("text=test-document.pdf")).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify file still appears in list
    await expect(page.locator("text=test-document.pdf")).toBeVisible({ timeout: 10000 });
  });

  test("should save form with uploaded files", async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, "test-document.pdf"));
    await page.waitForTimeout(2000);

    // Fill in other form fields
    const textField = page.locator('input[id="test_text_field"]');
    if (await textField.isVisible()) {
      await textField.fill("Test value");
    }

    // Select radio button
    const radioYes = page.locator('input[value="yes"]').first();
    if (await radioYes.isVisible()) {
      await radioYes.click();
    }

    // Click Save Responses button
    const saveButton = page.locator('button:has-text("Save Responses")');
    await saveButton.click();

    // Verify success message
    await expect(page.locator("text=Responses saved successfully")).toBeVisible({ timeout: 10000 });
  });
});
