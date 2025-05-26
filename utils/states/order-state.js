/**
 * Interface cho các trạng thái đơn hàng
 * Mỗi trạng thái cụ thể sẽ implement interface này
 */
class OrderState {
  constructor(order) {
    this.order = order;
  }

  // Các phương thức chuyển trạng thái
  confirm() {
    throw new Error("Phương thức confirm() phải được implement");
  }

  ship() {
    throw new Error("Phương thức ship() phải được implement");
  }

  complete() {
    throw new Error("Phương thức complete() phải được implement");
  }

  cancel() {
    throw new Error("Phương thức cancel() phải được implement");
  }

  requestCancel() {
    throw new Error("Phương thức requestCancel() phải được implement");
  }

  // Phương thức lấy tên trạng thái
  getName() {
    throw new Error("Phương thức getName() phải được implement");
  }
}

module.exports = OrderState;
