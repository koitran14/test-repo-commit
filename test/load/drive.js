/**
 * Load driver — sinh tải TỔNG HỢP để đo peak RSS (sizing).
 *
 * KHÔNG dùng dữ liệu khách / PII. Toàn bộ email là giả (random).
 * Drive đúng đường nặng của agent: orchestrator.processEmail (Claude loop + tools + Sheets).
 *
 * Dùng cùng lúc với measure_agent.py / docker stats:
 *   LOAD_N=20 LOAD_ROUNDS=3 node test/load/drive.js
 *
 * Chính xác nhất khi chạy với "measurement profile" (test_mode + stub/sandbox creds)
 * để processEmail chạy trọn (LLM + Sheet). Không có creds → nó vẫn nạp SDK + dựng prompt
 * rồi lỗi ở bước gọi API (driver nuốt lỗi) → đo được phần lớn đường nặng, peak hơi thấp hơn thực.
 */

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

let processEmail, SendGate, config;
try {
  ({ processEmail } = require(path.join(ROOT, 'src', 'orchestrator')));
  ({ SendGate } = require(path.join(ROOT, 'src', 'send-gate')));
} catch (e) {
  console.error('Không require được orchestrator/send-gate:', e.message);
  process.exit(1);
}
try {
  const { loadConfig } = require(path.join(ROOT, 'src', 'config'));
  config = loadConfig();
} catch (e) {
  // fallback tối thiểu để driver vẫn chạy được đường nặng
  config = { claude: { model: 'claude-sonnet-4-6', max_tokens: 8192, max_turns: 30 } };
}

const N = parseInt(process.env.LOAD_N || '20', 10);        // email đồng thời (đỉnh)
const ROUNDS = parseInt(process.env.LOAD_ROUNDS || '3', 10);

// ---- dữ liệu GIẢ (no-PII) ----
const rand = (n) => Math.random().toString(36).slice(2, 2 + n);
const PRODUCTS = ['Widget', 'Gadget', 'Module', 'Panel', 'Sensor', 'Kit'];
function fakeEmail(i) {
  const qty = 1 + Math.floor(Math.random() * 500);          // hình dạng: đơn tới 500 sp
  const lines = Array.from({ length: 5 + Math.floor(Math.random() * 15) },
    () => `- ${PRODUCTS[i % PRODUCTS.length]}-${rand(4)} x ${qty}`).join('\n');
  return {
    id: `fake-${Date.now()}-${i}-${rand(5)}`,
    from: `test-${rand(6)}@example.test`,                    // giả, không phải khách thật
    subject: '[Quotation] test synthetic',
    date: new Date().toISOString(),
    body: `Xin báo giá các mặt hàng sau (dữ liệu giả để đo tải):\n${lines}\n${rand(2000)}`,
  };
}

async function main() {
  console.log(`Load: ${N} email đồng thời × ${ROUNDS} vòng (dữ liệu GIẢ, no-PII).`);
  for (let r = 0; r < ROUNDS; r++) {
    const sendGate = new SendGate(config?.send_gate?.max || 2);
    const batch = Array.from({ length: N }, (_, i) =>
      Promise.resolve()
        .then(() => processEmail(fakeEmail(r * N + i), config, sendGate))
        .catch(() => { /* thiếu creds → lỗi API; memory đã cấp phát vẫn được đo */ }),
    );
    await Promise.all(batch);
    console.log(`  vòng ${r + 1}/${ROUNDS} xong`);
  }
  console.log('Load xong. (đọc peak từ measure_agent.py / docker stats)');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
