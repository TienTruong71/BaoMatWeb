const OrderState = require('./order-state');

/**
 * Trạng thái Cancelled (Đã hủy)
 */
class CancelledState extends OrderState {
  constructor(order) {
    super(order);
  }

  // Không thể xác nhận đơn hàng đã hủy
  async confirm() {
    console.log(`Đơn hàng ${this.order._id} đã bị hủy, không thể xác nhận`);
    return false;
  }

  // Không thể giao đơn hàng đã hủy
  async ship() {
    console.log(`Đơn hàng ${this.order._id} đã bị hủy, không thể giao`);
    return false;
  }

  // Không thể hoàn thành đơn hàng đã hủy
  async complete() {
    console.log(`Đơn hàng ${this.order._id} đã bị hủy, không thể hoàn thành`);
    return false;
  }

  // Không thể hủy đơn hàng đã hủy
  async cancel() {
    console.log(`Đơn hàng ${this.order._id} đã bị hủy rồi`);
    return false;
  }

  // Không thể yêu cầu hủy đơn hàng đã hủy
  async requestCancel() {
    console.log(`Đơn hàng ${this.order._id} đã bị hủy rồi, không thể yêu cầu hủy`);
    return false;
  }

  // Lấy tên trạng thái
  getName() {
    return 'Cancelled';
  }
}

module.exports = CancelledState;
