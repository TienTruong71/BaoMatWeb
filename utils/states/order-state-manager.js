const Order = require('../../models/order.model');
const OrderStateFactory = require('./order-state-factory');

/**
 * Lớp quản lý trạng thái đơn hàng sử dụng State Pattern
 */
class OrderStateManager {
  /**
   * Tìm đơn hàng theo ID và trả về đối tượng đã được bọc với State Pattern
   * @param {string} orderId - ID của đơn hàng
   * @returns {Promise<Object>} - Đơn hàng đã được bọc với State Pattern
   */
  static async findById(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return null;
      }
      return this.wrapOrder(order);
    } catch (error) {
      console.error(`Lỗi khi tìm đơn hàng ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Bọc đơn hàng với State Pattern
   * @param {Object} order - Đối tượng đơn hàng
   * @returns {Object} - Đơn hàng đã được bọc với State Pattern
   */
  static wrapOrder(order) {
    // Tạo trạng thái phù hợp
    const state = OrderStateFactory.createState(order);
    
    // Thêm các phương thức State Pattern vào đơn hàng
    order.confirm = async function() {
      return await state.confirm();
    };
    
    order.ship = async function() {
      return await state.ship();
    };
    
    order.complete = async function() {
      return await state.complete();
    };
    
    order.cancel = async function() {
      return await state.cancel();
    };
    
    order.requestCancel = async function() {
      return await state.requestCancel();
    };
    
    order.getState = function() {
      return state;
    };
    
    order.getStateName = function() {
      return state.getName();
    };
    
    return order;
  }

  /**
   * Cập nhật trạng thái đơn hàng
   * @param {string} orderId - ID của đơn hàng
   * @param {string} newStatus - Trạng thái mới
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  static async updateOrderStatus(orderId, newStatus) {
    try {
      const order = await this.findById(orderId);
      if (!order) {
        return { success: false, message: 'Không tìm thấy đơn hàng' };
      }
      
      let result = false;
      
      // Gọi phương thức tương ứng dựa trên trạng thái mới
      switch (newStatus) {
        case 'Confirmed':
          result = await order.confirm();
          break;
        case 'Shipping':
          result = await order.ship();
          break;
        case 'Completed':
          result = await order.complete();
          break;
        case 'Cancelled':
          result = await order.cancel();
          break;
        case 'RequestCancelled':
          result = await order.requestCancel();
          break;
        default:
          return { success: false, message: 'Trạng thái không hợp lệ' };
      }
      
      if (result) {
        return { 
          success: true, 
          message: 'Cập nhật trạng thái thành công', 
          updatedStatus: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount
        };
      } else {
        return { success: false, message: 'Không thể chuyển sang trạng thái này' };
      }
    } catch (error) {
      console.error(`Lỗi khi cập nhật trạng thái đơn hàng ${orderId}:`, error);
      return { success: false, message: 'Lỗi máy chủ' };
    }
  }
  
  /**
   * Xử lý yêu cầu hủy đơn hàng từ phía người dùng
   * @param {string} orderId - ID của đơn hàng
   * @param {string} userId - ID của người dùng yêu cầu hủy
   * @returns {Promise<Object>} - Kết quả xử lý yêu cầu hủy
   */
  static async requestCancelOrder(orderId, userId) {
    try {
      // Kiểm tra đơn hàng có tồn tại và thuộc về người dùng
      const orderDoc = await Order.findOne({ _id: orderId, userId });
      
      if (!orderDoc) {
        return { success: false, message: 'Không tìm thấy đơn hàng hoặc đơn hàng không thuộc về bạn' };
      }
      
      // Sử dụng State Pattern để xử lý yêu cầu hủy
      const order = await this.findById(orderId);
      const result = await order.requestCancel();
      
      if (result) {
        return { 
          success: true, 
          message: 'Đã gửi yêu cầu hủy đơn hàng thành công', 
          updatedStatus: order.status 
        };
      } else {
        return { success: false, message: 'Không thể hủy đơn hàng ở trạng thái này' };
      }
    } catch (error) {
      console.error(`Lỗi khi yêu cầu hủy đơn hàng ${orderId}:`, error);
      return { success: false, message: 'Lỗi máy chủ' };
    }
  }
}

module.exports = OrderStateManager;
