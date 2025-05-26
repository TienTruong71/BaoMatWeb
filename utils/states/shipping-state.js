const OrderState = require('./order-state');
const Product = require('../../models/product.model');

/**
 * Trạng thái Shipping (Đang giao hàng)
 */
class ShippingState extends OrderState {
  constructor(order) {
    super(order);
  }

  // Không thể xác nhận đơn hàng đang giao
  async confirm() {
    console.log(`Đơn hàng ${this.order._id} đã được xác nhận và đang giao`);
    return false;
  }

  // Không thể giao đơn hàng đang giao
  async ship() {
    console.log(`Đơn hàng ${this.order._id} đang được giao rồi`);
    return false;
  }

  // Chuyển sang trạng thái Completed
  async complete() {
    try {
      // Cập nhật trạng thái đơn hàng
      this.order.status = 'Completed';
      
      // Cập nhật trạng thái thanh toán
      this.order.paymentStatus = 'Paid';
      
      console.log(`Đơn hàng ${this.order._id} đã hoàn thành và được đánh dấu là đã thanh toán`);
      
      // Lưu thay đổi
      await this.order.save();
      return true;
    } catch (error) {
      console.error(`Lỗi khi hoàn thành đơn hàng ${this.order._id}:`, error);
      return false;
    }
  }

  // Hủy đơn hàng
  async cancel() {
    try {
      // Cập nhật trạng thái đơn hàng
      this.order.status = 'Cancelled';
      console.log(`Đơn hàng ${this.order._id} đã bị hủy`);
      
      // Trả lại sản phẩm vào kho (chuyển từ inactive sang active)
      await this._restoreProducts();
      
      // Lưu thay đổi
      await this.order.save();
      return true;
    } catch (error) {
      console.error(`Lỗi khi hủy đơn hàng ${this.order._id}:`, error);
      return false;
    }
  }

  // Yêu cầu hủy đơn hàng
  async requestCancel() {
    try {
      // Cập nhật trạng thái đơn hàng
      this.order.status = 'RequestCancelled';
      console.log(`Đơn hàng ${this.order._id} đã yêu cầu hủy`);
      
      // Lưu thay đổi
      await this.order.save();
      return true;
    } catch (error) {
      console.error(`Lỗi khi yêu cầu hủy đơn hàng ${this.order._id}:`, error);
      return false;
    }
  }

  // Phương thức hỗ trợ để trả lại sản phẩm vào kho
  async _restoreProducts() {
    try {
      // Duyệt qua từng sản phẩm trong đơn hàng
      for (const item of this.order.items) {
        // Tìm sản phẩm gốc
        const product = await Product.findById(item.productId);
        if (!product) {
          console.error(`Không tìm thấy sản phẩm ${item.productId}`);
          continue;
        }

        // Tìm các sản phẩm có cùng mã import, đang inactive và được bán sau khi đơn hàng được tạo
        const productsToRestore = await Product.find({
          import: product.import,
          active: 'inactive',
          sellDate: { $gte: this.order.orderDate }
        }).limit(item.quantity);

        // Cập nhật trạng thái thành active và xóa ngày bán
        for (const p of productsToRestore) {
          p.active = 'active';
          p.sellDate = null;
          await p.save();
        }

        console.log(`Đã trả ${productsToRestore.length} sản phẩm ${product.title} vào kho`);
      }
    } catch (error) {
      console.error(`Lỗi khi trả sản phẩm vào kho:`, error);
      throw error;
    }
  }

  // Lấy tên trạng thái
  getName() {
    return 'Shipping';
  }
}

module.exports = ShippingState;
