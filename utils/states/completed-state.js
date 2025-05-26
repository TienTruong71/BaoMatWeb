const OrderState = require('./order-state');

/**
 * Trạng thái Completed (Đã hoàn thành)
 */
class CompletedState extends OrderState {
  constructor(order) {
    super(order);
  }

  // Không thể xác nhận đơn hàng đã hoàn thành
  async confirm() {
    console.log(`Đơn hàng ${this.order._id} đã hoàn thành, không thể xác nhận lại`);
    return false;
  }

  // Không thể giao đơn hàng đã hoàn thành
  async ship() {
    console.log(`Đơn hàng ${this.order._id} đã hoàn thành, không thể giao lại`);
    return false;
  }

  // Không thể hoàn thành đơn hàng đã hoàn thành
  async complete() {
    console.log(`Đơn hàng ${this.order._id} đã hoàn thành rồi`);
    return false;
  }

  // Không thể hủy đơn hàng đã hoàn thành
  async cancel() {
    console.log(`Đơn hàng ${this.order._id} đã hoàn thành, không thể hủy`);
    return false;
  }

  // Không thể yêu cầu hủy đơn hàng đã hoàn thành
  async requestCancel() {
    console.log(`Đơn hàng ${this.order._id} đã hoàn thành, không thể yêu cầu hủy`);
    return false;
  }

  // Lấy tên trạng thái
  getName() {
    return 'Completed';
  }
}

module.exports = CompletedState;
