const Order = require("../../models/order.model");
const User = require("../../models/user.model");
const mongoose = require('mongoose');
const { calculateTotalAmount, formatOrder, calculateTotals } = require("../../config/helper");
const OrderStateManager = require('../../utils/states/order-state-manager');



//lấy danh sách đơn hàng 
module.exports.orderStaff = async (req, res) => {
  try {
    const user = req.session.user || null;
    let find = {};
      if (req.query.status) {
        find.status = req.query.status;
      }
    const orders = await Order.find(find)
    .populate('userId', 'username emailAddress')
    .lean()
    const ordersWithTotal = orders.map(order => formatOrder(order));

       res.render("staff/manage_order", {
      pageTitle: "Trang nhân viên quản lý ",
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

  // Kiểm tra id có phải ObjectId hợp lệ không
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send("ID không hợp lệ");
  }

  try {
    const order = await Order.findById(id)
      .populate('userId', 'fullName emailAddress phoneNumber rank')
      .lean();

    if (!order) {
      return res.status(404).send("Không tìm thấy đơn hàng");
    }

    const formattedOrder = formatOrder(order);
    res.render("staff/order_detail", {
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
    let updateData = { status: newStatus };
    
    // Cập nhật paymentStatus dựa trên trạng thái mới
    if (newStatus === 'Completed') {
      updateData.paymentStatus = 'Paid';
      console.log(`Tất cả đơn hàng được chọn sẽ được đánh dấu là đã thanh toán khi hoàn thành`);
    } else {
      updateData.paymentStatus = 'Unpaid';
      console.log(`Tất cả đơn hàng được chọn sẽ được đặt lại trạng thái thanh toán thành chưa thanh toán`);
    }
    
    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Không có đơn hàng nào được cập nhật' });
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái cho ${result.modifiedCount} đơn hàng và ${newStatus === 'Completed' ? 'đánh dấu là đã thanh toán' : 'đặt lại trạng thái thanh toán thành chưa thanh toán'}`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật đơn hàng:", error);
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra khi cập nhật trạng thái' });
  }
};
