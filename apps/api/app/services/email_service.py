# Email Service
# SMTP email service for sending notification emails

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.db.enums import NotificationType

logger = logging.getLogger(__name__)


class EmailService:
    """
    SMTP email service for sending notification emails.

    Uses existing SMTP configuration from settings.
    Gracefully handles missing configuration - notifications
    still work via in-app storage even if email is not configured.
    """

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_tls = settings.SMTP_TLS
        self.from_email = settings.EMAILS_FROM_EMAIL
        self.from_name = settings.EMAILS_FROM_NAME or "SINAG Notifications"

    def is_configured(self) -> bool:
        """
        Check if SMTP is properly configured.

        Returns:
            True if all required SMTP settings are present
        """
        return all(
            [
                self.smtp_host,
                self.smtp_port,
                self.smtp_user,
                self.smtp_password,
                self.from_email,
            ]
        )

    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str | None = None,
    ) -> dict[str, any]:
        """
        Send email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject line
            body_html: HTML email body
            body_text: Plain text fallback (optional)

        Returns:
            Dict with success status and optional error message
        """
        if not self.is_configured():
            logger.warning("SMTP not configured, skipping email send")
            return {"success": False, "error": "SMTP not configured", "skipped": True}

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            # Add plain text part (fallback)
            if body_text:
                part1 = MIMEText(body_text, "plain")
                msg.attach(part1)

            # Add HTML part
            part2 = MIMEText(body_html, "html")
            msg.attach(part2)

            # Send email
            if self.smtp_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)

            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.from_email, to_email, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_email}")
            return {"success": True}

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            return {"success": False, "error": "SMTP authentication failed"}
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return {"success": False, "error": str(e)}

    def build_notification_email(
        self,
        notification_type: NotificationType,
        recipient_name: str,
        context: dict[str, any],
    ) -> tuple[str, str, str]:
        """
        Build email content for a notification.

        Args:
            notification_type: Type of notification
            recipient_name: Name of the recipient
            context: Additional context (barangay_name, assessment_id, etc.)

        Returns:
            Tuple of (subject, html_body, text_body)
        """
        templates = self._get_email_templates()
        template = templates.get(notification_type, templates[NotificationType.NEW_SUBMISSION])

        # Build subject
        subject = template["subject"].format(**context)

        # Build HTML body
        html_body = self._build_html_email(
            recipient_name=recipient_name,
            title=template["title"].format(**context),
            message=template["message"].format(**context),
            cta_text=template.get("cta_text"),
            cta_url=context.get("cta_url"),
        )

        # Build plain text body
        text_body = self._build_text_email(
            recipient_name=recipient_name,
            title=template["title"].format(**context),
            message=template["message"].format(**context),
        )

        return subject, html_body, text_body

    def _get_email_templates(self) -> dict[NotificationType, dict[str, str]]:
        """Get email templates for each notification type."""
        return {
            NotificationType.NEW_SUBMISSION: {
                "subject": "New SGLGB Assessment Submission from {barangay_name}",
                "title": "New Assessment Submission",
                "message": "Barangay {barangay_name} has submitted their SGLGB assessment for review. Please log in to the SINAG platform to begin your assessment.",
                "cta_text": "Review Submission",
            },
            NotificationType.REWORK_REQUESTED: {
                "subject": "Action Required: Your SGLGB Assessment Needs Revision",
                "title": "Assessment Needs Revision",
                "message": "The assessor has reviewed your submission and requested some revisions. Please log in to see the feedback and make the necessary corrections.",
                "cta_text": "View Feedback",
            },
            NotificationType.REWORK_RESUBMITTED: {
                "subject": "Rework Resubmission from {barangay_name}",
                "title": "Rework Resubmission Ready",
                "message": "Barangay {barangay_name} has resubmitted their assessment after addressing the requested revisions. Please review the updated submission.",
                "cta_text": "Review Resubmission",
            },
            NotificationType.READY_FOR_VALIDATION: {
                "subject": "Assessment Ready for Final Validation - {governance_area_name}",
                "title": "Ready for Final Validation",
                "message": "An assessment for {governance_area_name} is ready for your final validation. The assessor has completed their review for Barangay {barangay_name}.",
                "cta_text": "Start Validation",
            },
            NotificationType.CALIBRATION_REQUESTED: {
                "subject": "Calibration Required: Your SGLGB Assessment",
                "title": "Calibration Required",
                "message": "The validator has requested calibration for specific indicators in your assessment. Please log in to see the details and make the necessary corrections.",
                "cta_text": "View Calibration Details",
            },
            NotificationType.CALIBRATION_RESUBMITTED: {
                "subject": "Calibration Resubmission from {barangay_name}",
                "title": "Calibration Resubmission Ready",
                "message": "Barangay {barangay_name} has resubmitted their assessment after calibration. Please review the updated indicators.",
                "cta_text": "Review Calibration",
            },
            NotificationType.SUBMISSION_REMINDER: {
                "subject": "Reminder: Complete Your SGLGB Assessment Submission",
                "title": "Assessment Submission Reminder",
                "message": "This is a friendly reminder from MLGOO-DILG to complete your SGLGB assessment submission. Please log in to the SINAG platform to continue working on your assessment.",
                "cta_text": "Continue Assessment",
            },
        }

    def _build_html_email(
        self,
        recipient_name: str,
        title: str,
        message: str,
        cta_text: str | None = None,
        cta_url: str | None = None,
    ) -> str:
        """Build HTML email body with DILG branding."""
        cta_button = ""
        if cta_text and cta_url:
            cta_button = f'''
            <tr>
              <td style="padding: 20px 30px;">
                <a href="{cta_url}" style="display: inline-block; padding: 12px 24px; background-color: #F5A623; color: #1a1a2e; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  {cta_text}
                </a>
              </td>
            </tr>
            '''

        return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 20px 30px;">
              <h1 style="margin: 0; color: #F5A623; font-size: 24px;">SINAG</h1>
              <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 12px;">SGLGB Assessment Platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 20px;">{title}</h2>
              <p style="margin: 0 0 15px 0; color: #333333; line-height: 1.6;">Dear {recipient_name},</p>
              <p style="margin: 0 0 20px 0; color: #333333; line-height: 1.6;">{message}</p>
            </td>
          </tr>
          <!-- CTA Button -->
          {cta_button}
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 12px; line-height: 1.5;">
                This is an automated notification from SINAG. Please do not reply to this email.
              </p>
              <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 12px;">
                Department of the Interior and Local Government (DILG)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    def _build_text_email(self, recipient_name: str, title: str, message: str) -> str:
        """Build plain text email body."""
        return f"""
SINAG - SGLGB Assessment Platform
================================

{title}

Dear {recipient_name},

{message}

---
This is an automated notification from SINAG. Please do not reply to this email.
Department of the Interior and Local Government (DILG)
"""


# Singleton instance
email_service = EmailService()
