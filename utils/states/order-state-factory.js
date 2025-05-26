const PendingState = require('./pending-state');
const ConfirmedState = require('./confirmed-state');
const ShippingState = require('./shipping-state');
const CompletedState = require('./completed-state');
const RequestCancelledState = require('./request-cancelled-state');
const CancelledState = require('./cancelled-state');

/**
 * Factory để tạo đối tượng trạng thái phù hợp dựa trên trạng thái hiện tại của đơn hàng
 */
class OrderStateFactory {
  /**
   * Tạo đối tượng trạng thái phù hợp
   * @param {Object} order - Đối tượng đơn hàng
   * @returns {OrderState} - Đối tượng trạng thái phù hợp
   */
  static createState(order) {
    switch (order.status) {
      case 'Pending':
        return new PendingState(order);
      case 'Confirmed':
        return new ConfirmedState(order);
      case 'Shipping':
        return new ShippingState(order);
      case 'Completed':
        return new CompletedState(order);
      case 'RequestCancelled':
        return new RequestCancelledState(order);
      case 'Cancelled':
        return new CancelledState(order);
      default:
        console.error(`Trạng thái không hợp lệ: ${order.status}`);
        return new PendingState(order); // Mặc định trả về PendingState
    }
  }
}

module.exports = OrderStateFactory;
