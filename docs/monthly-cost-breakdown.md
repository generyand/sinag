# SINAG Monthly Cost Breakdown

This document captures the current estimated monthly operating cost for the SINAG application based
on the active setup:

- Supabase Pro
- AWS EC2 `t3.medium`
- Google Gemini free tier

## Current Setup

- The application runs on one AWS EC2 `t3.medium` instance.
- The app database and storage are hosted on Supabase.
- Gemini is currently on the free tier.

## Monthly Cost Summary

### Core Application Cost

| Service                                               | Monthly Cost (USD) | Notes                                                                              |
| ----------------------------------------------------- | -----------------: | ---------------------------------------------------------------------------------- |
| Supabase Pro (project base + current projected usage) |             $33.02 | Based on current projected billing cycle total for 2 databases (production + test) |
| AWS (EC2 + related charges + tax)                     |             $37.98 | Based on February 2026 AWS actual                                                  |
| Gemini API                                            |              $0.00 | Free tier                                                                          |
| **Total**                                             |         **$71.00** | Current practical monthly estimate                                                 |

### AWS Breakdown (February 2026)

| AWS Line Item | Monthly Cost (USD) | Notes                                                |
| ------------- | -----------------: | ---------------------------------------------------- |
| EC2-Instances |             $27.30 | Main compute cost for `t3.medium`                    |
| EC2-Other     |              $3.99 | Typically EBS and related EC2 charges                |
| VPC           |              $2.59 | Typically public IPv4 and related networking charges |
| CloudWatch    |              $0.00 | No material current charge                           |
| Tax           |              $4.10 | Tax on AWS charges                                   |
| **AWS Total** |         **$37.98** | Effective ongoing AWS estimate                       |

## Notes on Supabase

- The Supabase account is on the Pro plan.
- Two databases are currently in use:
  - Production
  - Test
- Current projected Supabase billing cycle total is `$33.02`, which is above the `$25.00` base plan
  because of compute usage across both databases.

## Expected Monthly Range

If infrastructure usage stays stable, the most likely monthly total is:

- `~$65 to $74 per month`

This range accounts for:

- small month-to-month changes in Supabase projected usage
- normal AWS variance
- tax and minor infrastructure charges

## Quick Interpretation

- The largest ongoing costs are Supabase and the EC2 instance.
- The forecasted AWS home widget may be higher than the actual bill; use Cost Explorer and Bills for
  the more reliable monthly figures.

## Maintenance / Consultation Cost

The following rates apply only when the University of Mindanao Digos College IT Team escalates a
request to the project proponents. These are not recurring monthly charges.

### As-Needed Service Rates

| Service Type                                 |               Rate | Notes                                                                                                    |
| -------------------------------------------- | -----------------: | -------------------------------------------------------------------------------------------------------- |
| Consultation / Technical Assessment          |  PHP 500.00 / hour | Includes issue review, codebase assessment, troubleshooting guidance, and implementation recommendations |
| Minor Bug Fixes / Small System Modifications |  PHP 500.00 / hour | Applies to minor changes requested beyond the UMDC IT Team's current capacity                            |
| Major Feature Enhancements / New Modules     | Separate quotation | Subject to scope review, time estimate, and prior approval                                               |

### Cost Interpretation

- `Consultation / Technical Assessment` is billed only when technical review or issue analysis is
  requested.
- `Minor Bug Fixes / Small System Modifications` are billed based on actual hours worked.
- `Major Feature Enhancements / New Modules` are not covered by the hourly rate and must be priced
  separately based on approved scope.
