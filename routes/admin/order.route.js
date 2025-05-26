const express = require ("express");
const router = express.Router();
const AdminOrdercontroller =  require ("../../controllers/admin/order.controller")

router.get("/", AdminOrdercontroller.order)
router.post("/:id/status", AdminOrdercontroller.updateOrderStatus)
// Thêm regex để chỉ nhận các ID hợp lệ của MongoDB (24 ký tự hex)
router.get("/:id([0-9a-fA-F]{24})", AdminOrdercontroller.getOrderDetail)
router.post("/apply-bulk-action", AdminOrdercontroller.applyBulkAction);

module.exports = router;
