const Order = require("../../models/order.model");
const User = require("../../models/user.model");

const { calculateTotalAmount, formatOrder, calculateTotals } = require("../../config/helper");
const OrderStateManager = require('../../utils/states/order-state-manager');



//lấy danh sách đơn hàng 
module.exports.order = async (req, res) => {
  try {
    const user = req.session.user || null;
    let find = {};
      if (req.query.status) {
        find.status = req.query.status;
      }
    const orders = await Order.find(find)
    .populate('userId', 'username emailAddress')
    .lean()
    const ordersWithTotal =   orders.map(order => formatOrder(order));

       res.render("admin/manage_order", {
      pageTitle: "Trang quản lý đơn hàng",
      user,
      orders: ordersWithTotal
    });


  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng:", error);
    res.status(500).send("Lỗi máy chủ");
  }
};


//lấy chi tiết đơn hàng
module.exports.getOrderDetail = async (req, res) => {
  const { id } = req.params;

  try {
    // Lấy order và populate fullName + emailAddress từ userId
    const order = await Order.findById(id)
      .populate('userId', 'fullName emailAddress phoneNumber rank')
      .lean();

    if (!order) {
      return res.status(404).send("Không tìm thấy đơn hàng");
    }

    const formattedOrder = formatOrder(order);
    res.render("admin/order_detail", {
      pageTitle: "Chi tiết đơn hàng",
      order: formattedOrder,
      customerName: order.userId.fullName,
      customerEmail: order.userId.emailAddress
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
    res.status(500).send("Lỗi máy chủ");
  }
};



// API cập nhật trạng thái đơn hàng

module.exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
      // Sử dụng OrderStateManager để cập nhật trạng thái
      const result = await OrderStateManager.updateOrderStatus(id, status);
      
      if (result.success) {
          // Nếu cập nhật thành công, trả về kết quả
          return res.json(result);
      } else {
          // Nếu không thể cập nhật, trả về lỗi
          return res.status(400).json(result);
      }
  } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// API áp dụng hành động bulk cho nhiều đơn hàng
module.exports.applyBulkAction = async (req, res) => {
  const { orderIds, newStatus } = req.body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Danh sách ID đơn hàng không hợp lệ' });
  }

  if (!newStatus || typeof newStatus !== 'string') {
    return res.status(400).json({ success: false, message: 'Trạng thái mới không hợp lệ' });
  }

  try {
    // Sử dụng Promise.all để cập nhật từng đơn hàng riêng biệt sử dụng State Pattern
    const updatePromises = orderIds.map(orderId => 
      OrderStateManager.updateOrderStatus(orderId, newStatus)
    );
    
    const results = await Promise.all(updatePromises);
    
    // Đếm số đơn hàng được cập nhật thành công
    const successCount = results.filter(result => result.success).length;
    
    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái cho ${successCount} đơn hàng và ${newStatus === 'Completed' ? 'đánh dấu là đã thanh toán' : 'đặt lại trạng thái thanh toán thành chưa thanh toán'}`,
      updatedCount: successCount
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật đơn hàng:", error);
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra khi cập nhật trạng thái' });
  }
};
