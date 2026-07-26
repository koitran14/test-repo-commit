// Send Gate (BP3): cap outbound emails per processing cycle.
// In-memory counter -> correct on a single container. For multi-container
// scale, swap to a shared rate limiter (see framework state-management rule).

const logger = require('./logger');

class SendGate {
  constructor(maxPerCycle = 2) {
    this.max = maxPerCycle;
    this.count = 0;
  }

  canSend() {
    return this.count < this.max;
  }

  record() {
    this.count += 1;
    if (this.count >= this.max) {
      logger.warn({ msg: 'send_gate_limit_reached', max: this.max });
    }
  }

  reset() {
    this.count = 0;
  }
}

module.exports = { SendGate };
