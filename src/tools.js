// Tool registry = "switchboard" only (framework C3).
// NO data-shaping or API calls here. Every case passes `input` straight down
// to a repository or service. Tool names MUST match SKILL.md (G8).

const quotationRepo = require('./repositories/quotationRepo');
const gmailService = require('./services/gmail');
const { truncate } = require('./utils');
const logger = require('./logger');

const TOOL_DEFINITIONS = [
  {
    name: 'record_quotation',
    description:
      'Ghi mot dong bao gia da trich xuat vao Google Sheet. Chi goi khi da co du: ten khach hang, san pham, so luong, don gia. Neu thieu bat ky truong nao, KHONG goi tool nay ma dung send_reply de hoi lai.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Ten khach hang' },
        customer_email: { type: 'string', description: 'Email khach hang (nguoi gui)' },
        product: { type: 'string', description: 'Ten san pham / dich vu' },
        quantity: { type: 'number', description: 'So luong' },
        unit_price: { type: 'number', description: 'Don gia' },
        total: { type: 'number', description: 'Thanh tien (tuy chon; neu bo trong se tu tinh = so luong x don gia)' },
      },
      required: ['customer_name', 'product', 'quantity', 'unit_price'],
    },
  },
  {
    name: 'send_reply',
    description:
      'Gui email tra loi trong cung luong hoi thoai voi khach. Dung de xac nhan da nhan bao gia, HOAC de hoi lai khi thieu thong tin. Body bang tieng Viet.',
    input_schema: {
      type: 'object',
      properties: {
        body: { type: 'string', description: 'Noi dung email tra loi (tieng Viet)' },
      },
      required: ['body'],
    },
  },
];

async function executeTool(name, input, ctx) {
  const { config, sendGate, email } = ctx;

  switch (name) {
    case 'record_quotation': {
      const result = await quotationRepo.saveQuotation(config, {
        ...input,
        customer_email: input.customer_email || gmailService.extractEmail(email.from),
        received_date: email.date || new Date().toISOString(),
        message_id: email.id,
        status: 'Da xu ly',
      });
      return truncate({ ok: true, ...result });
    }

    case 'send_reply': {
      // BP3: enforce send gate
      if (!sendGate.canSend()) {
        logger.warn({ msg: 'send_blocked_by_gate', thread_id: email.threadId });
        return truncate({ ok: false, blocked: 'send limit reached (max per cycle)' });
      }

      // Recipient & threading derived from source email (not from the model).
      let to = gmailService.extractEmail(email.from);
      const testMode = config.test_mode && config.test_mode.enabled;
      if (testMode && config.test_mode.email && config.test_mode.email.redirect_to) {
        to = config.test_mode.email.redirect_to;
      }
      const body = testMode ? `[TEST MODE]\n\n${input.body}` : input.body;

      await gmailService.sendReply(config, {
        threadId: email.threadId,
        to,
        subject: email.subject,
        inReplyTo: email.messageIdHeader,
        references: email.references
          ? `${email.references} ${email.messageIdHeader}`
          : email.messageIdHeader,
        body,
      });
      sendGate.record();
      return truncate({ ok: true, sent_to: to });
    }

    default:
      return truncate({ ok: false, error: `unknown tool: ${name}` });
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
