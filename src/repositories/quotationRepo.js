// Quotation repository (Data Access Layer).
// The ONLY place that knows how a quotation maps to a Sheet row.
// Tools/orchestrator never touch the Sheet directly (Repository Pattern).

const sheetsService = require('../services/sheets');
const logger = require('../logger');

// Column order MUST match the Sheet header row (see README / SKILL.md):
// Ngay nhan | Ten KH | Email KH | San pham | So luong | Don gia | Thanh tien | Trang thai | Message ID
function toRow(data) {
  const qty = Number(data.quantity) || 0;
  const price = Number(data.unit_price) || 0;
  const total =
    data.total !== undefined && data.total !== null && data.total !== ''
      ? Number(data.total)
      : qty * price;

  return [
    data.received_date || new Date().toISOString(),
    data.customer_name || '',
    data.customer_email || '',
    data.product || '',
    qty,
    price,
    total,
    data.status || 'Da xu ly',
    data.message_id || '',
  ];
}

async function saveQuotation(config, data) {
  const sheetCfg = config.tools.sheets.sheets.quotations;
  const row = toRow(data);
  const testMode = config.test_mode && config.test_mode.enabled;
  const dryRun = testMode && config.test_mode.sheets && config.test_mode.sheets.dry_run;

  if (dryRun) {
    logger.info({ msg: '[TEST MODE] sheet_dry_run', tab: sheetCfg.tab, row });
    return { dryRun: true, row };
  }

  await sheetsService.appendRow(config, sheetCfg.id, sheetCfg.tab, row);
  logger.info({ msg: 'quotation_saved', customer: data.customer_name, product: data.product });
  return { saved: true, row };
}

// Read quotations for the dashboard. Maps rows back to objects using the
// known column order. Skips the header row.
async function listQuotations(config, limit = 500) {
  const cfg = config.tools.sheets.sheets.quotations;
  const rows = await sheetsService.readRows(config, cfg.id, cfg.tab, 'A:I');
  const body = rows.slice(1); // drop header
  const mapped = body
    // keep only real data rows: must have a product AND a numeric quantity
    // (skips the template's note row and blank rows)
    .filter((r) => r && r[3] && r[4] !== undefined && r[4] !== '' && !isNaN(Number(r[4])))
    .map((r) => ({
      received_date: r[0] || '',
      customer_name: r[1] || '',
      customer_email: r[2] || '',
      product: r[3] || '',
      quantity: r[4] || '',
      unit_price: r[5] || '',
      total: r[6] || '',
      status: r[7] || '',
      message_id: r[8] || '',
    }));
  // newest last in sheet -> reverse for newest-first, then cap
  return mapped.reverse().slice(0, limit);
}

module.exports = { saveQuotation, listQuotations };
