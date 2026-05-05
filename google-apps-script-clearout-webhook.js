/**
 * Clearout YYC v19 Google Sheet webhook.
 *
 * Setup:
 * 1. Create a Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Paste this file.
 * 4. Project Settings -> Script Properties:
 *    - WEBHOOK_SECRET = same value as GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel
 *    - NOTIFY_EMAIL = your receiving email, optional
 * 5. Deploy -> New deployment -> Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL into Vercel env: GOOGLE_SHEETS_WEBHOOK_URL
 */

const SHEET_CONFIG = {
  customer_lead: {
    sheetName: 'Customer Leads',
    columns: [
      'submitted_at',
      'lead_id',
      'customer_name',
      'customer_phone',
      'customer_email',
      'community_slug',
      'community_or_postal',
      'area',
      'timing',
      'rough_amount',
      'item_location',
      'request_categories',
      'regular_special_items',
      'blocked_or_hazardous_items',
      'dispatch_eligible',
      'lead_grade',
      'required_vehicle_level',
      'required_crew_size',
      'request_description',
      'consent_contact_share',
      'consent_real_request',
      'phone_verified',
      'verification_method',
      'source_url',
      'raw_json',
    ],
  },
  provider_application: {
    sheetName: 'Provider Applications',
    columns: [
      'submitted_at',
      'application_id',
      'provider_display_name',
      'contact_name',
      'phone',
      'email',
      'service_areas',
      'services_accepted',
      'vehicle_capabilities',
      'max_vehicle_level',
      'crew_capacity',
      'preferred_notification',
      'daily_lead_limit',
      'available_days',
      'available_time_windows',
      'accepts_same_day',
      'sms_consent_confirmed',
      'legal_operation_confirmed',
      'no_illegal_dumping_confirmed',
      'terms_confirmed',
      'source_url',
      'raw_json',
    ],
  },
}

function jsonResponse(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify({ statusCode: statusCode || 200, ...payload }))
    .setMimeType(ContentService.MimeType.JSON)
}

function getOrCreateSheet_(name, columns) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(name)
  if (!sheet) sheet = spreadsheet.insertSheet(name)

  const firstRow = sheet.getRange(1, 1, 1, Math.max(columns.length, 1)).getValues()[0]
  const hasHeaders = firstRow.some(Boolean)
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns])
    sheet.setFrozenRows(1)
  }
  return sheet
}

function maybeSendNotification_(kind, row) {
  const email = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL')
  if (!email) return

  const subject = kind === 'customer_lead'
    ? `New Clearout YYC request — ${row.community_or_postal || 'Calgary'}`
    : `New Clearout YYC provider beta signup — ${row.provider_display_name || 'Provider'}`

  const body = Object.keys(row).map(key => `${key}: ${row[key]}`).join('\n')
  MailApp.sendEmail(email, subject, body)
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET') || ''
    if (expectedSecret && payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
    }

    const config = SHEET_CONFIG[payload.kind]
    if (!config) return jsonResponse({ ok: false, error: 'Unknown kind' }, 400)

    const row = payload.row || {}
    const sheet = getOrCreateSheet_(config.sheetName, config.columns)
    sheet.appendRow(config.columns.map(key => row[key] || ''))
    maybeSendNotification_(payload.kind, row)

    return jsonResponse({ ok: true, kind: payload.kind }, 200)
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 500)
  }
}
