const Order = require('../../models/order.model');
const Cart = require('../../models/cart.model');
const User = require('../../models/user.model');
const Product = require('../../models/product.model');
const { calculateTotals } = require('../../config/helper');
const OrderStateManager = require('../../utils/states/order-state-manager');

class OrderController {
    // Hiển thị trang thanh toán
    async showCheckout(req, res) {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            const userId = req.session.user._id;
            console.log('User ID:', userId);
            
            try {
                // Lấy thông tin giỏ hàng
                const cart = await Cart
                    .findOne({ userId })
                    .populate('items.productId', 'title sellPrice thumbnail')
                    .lean();
                
                console.log('Cart found:', cart ? 'Yes' : 'No');
                
                if (!cart || !cart.items || cart.items.length === 0) {
                    return res.redirect('/cart');
                }
                
                // Tính toán tổng tiền
                const cartItems = cart.items.map(item => ({
                    _id: item._id,
                    title: item.productId?.title || '—',
                    sellPrice: item.productId?.sellPrice || 0,
                    thumbnail: item.productId?.thumbnail || '',
                    quantity: item.quantity,
                    total: item.quantity * (item.productId?.sellPrice || 0)
                }));
                
                const subtotal = cartItems.reduce((sum, i) => sum + i.total, 0);
                const vat = subtotal * 0.1; // 10% VAT
            
                // Miễn phí vận chuyển cho đơn hàng từ 100.000đ
                let shippingFee = 30000; // Phí vận chuyển mặc định
                if (subtotal >= 100000) {
                    shippingFee = 0; // Miễn phí vận chuyển
                }
                
                const totalAmount = subtotal + vat + shippingFee;
                
                // Lấy thông tin người dùng từ database thay vì từ session
                const userDoc = await User.findById(userId);
                
                if (!userDoc) {
                    console.error('User not found in database');
                    return res.redirect('/login');
                }
                
                // Chuyển đổi Mongoose document thành JavaScript object
                const userInfo = userDoc.toObject();
                
                console.log('User info from DB:', {
                    fullName: userInfo.fullName,
                    phoneNumber: userInfo.phoneNumber,
                    address: userInfo.address
                });
                
                console.log('Rendering pay-order with:', {
                    cartItems: cartItems.length,
                    subtotal,
                    totalAmount,
                    userInfo: {
                        fullName: userInfo.fullName,
                        phoneNumber: userInfo.phoneNumber,
                        address: userInfo.address
                    }
                });
                
                res.render('client/pages/pay-order', {
                    layout: 'main',
                    pageTitle: "Thanh toán",
                    cartItems,
                    subtotal,
                    vat,
                    shippingFee,
                    totalAmount,
                    user: req.session.user,
                    userInfo,
                    currentPage: "cart"
                });
            } catch (err) {
                console.error('Error processing cart:', err);
                return res.status(500).send('Đã xảy ra lỗi khi xử lý giỏ hàng');
            }
        } catch (error) {
            console.error('Lỗi khi hiển thị trang thanh toán:', error);
            res.status(500).send('Đã xảy ra lỗi khi xử lý thanh toán');
        }
    }
    
    // Xử lý đặt hàng
    async placeOrder(req, res) {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            const userId = req.session.user._id;
            console.log('Processing order for user:', userId);
            console.log('Form data:', req.body);
            
            // Kiểm tra dữ liệu form
            if (!req.body || !req.body.receiverName || !req.body.phoneNumber || !req.body.address) {
                console.error('Missing required form data');
                return res.status(400).send('Vui lòng điền đầy đủ thông tin giao hàng');
            }
            
            try {
                // Lấy thông tin giỏ hàng
                const cart = await Cart
                    .findOne({ userId })
                    .populate('items.productId')
                    .lean();
                
                console.log('Cart found:', cart ? 'Yes' : 'No');
                
                if (!cart || !cart.items || cart.items.length === 0) {
                    return res.redirect('/cart');
                }
                
                // Chuyển đổi items từ cart sang định dạng OrderItemSchema
                const orderItems = cart.items.map(item => ({
                    productId: item.productId._id,
                    name: item.productId.title,
                    quantity: item.quantity,
                    price: item.productId.sellPrice,
                    thumbnail: item.productId.thumbnail,
                    slug: item.productId.slug, // Thêm slug để có thể liên kết đến trang chi tiết sản phẩm
                    total: item.quantity * item.productId.sellPrice
                }));
                
                console.log('Order items:', orderItems.length);
                
                // Tính toán các giá trị
                const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
                const vat = subtotal * 0.1; // 10% VAT
                
                // Lấy thông tin shipping từ form
                let shippingFee = req.body.shippingMethod === 'Express' ? 50000 : 30000;
            
                // Miễn phí vận chuyển cho đơn hàng từ 100.000đ
                if (subtotal >= 100000) {
                    shippingFee = 0; // Miễn phí vận chuyển
                }
                
                const shipping = {
                    address: req.body.address,
                    receiverName: req.body.receiverName,
                    phoneNumber: req.body.phoneNumber,
                    shippingMethod: req.body.shippingMethod || 'Standard',
                    shippingFee: shippingFee
                };
                
                console.log('Shipping info:', shipping);
                
                // Tạo đơn hàng mới
                const newOrder = new Order({
                    userId,
                    items: orderItems,
                    shipping,
                    vat,
                    note: req.body.note,
                    subtotal,
                    totalAmount: subtotal + vat + shipping.shippingFee,
                    paymentMethod: req.body.paymentMethod || 'COD'
                });
                
                // Tính toán tổng tiền
                calculateTotals(newOrder);
                
                console.log('New order created:', {
                    userId: newOrder.userId,
                    items: newOrder.items.length,
                    subtotal: newOrder.subtotal,
                    totalAmount: newOrder.totalAmount
                });
                
                // Lưu đơn hàng
                const savedOrder = await newOrder.save();
                console.log('Order saved to database with ID:', savedOrder._id);
                
                // Xóa giỏ hàng
                console.log('Clearing cart for user:', userId);
                await Cart.updateOne({ userId }, { items: [] });
                
                // Cập nhật trạng thái sản phẩm thành SOLD
                console.log('Updating product status to SOLD');
                for (const item of newOrder.items) {
                    try {
                        const product = await Product.findById(item.productId);
                        if (product) {
                            // Tìm tất cả sản phẩm có cùng mã import và đang còn hàng
                            const productsToUpdate = await Product.find({
                                import: product.import,
                                status: { $in: ['IN_STOCK', 'ON_SALE'] }
                            }).limit(item.quantity);
                            
                            // Cập nhật trạng thái thành SOLD và thêm ngày bán
                            const updatePromises = productsToUpdate.map(p => {
                                return Product.updateOne(
                                    { _id: p._id },
                                    { 
                                        $set: { 
                                            status: 'SOLD',
                                            sellDate: new Date() 
                                        } 
                                    }
                                );
                            });
                            
                            const updateResults = await Promise.all(updatePromises);
                            const updatedCount = updateResults.reduce((sum, result) => sum + result.modifiedCount, 0);
                            
                            console.log(`Updated ${updatedCount} products with import code ${product.import} to SOLD`);
                        }
                    } catch (err) {
                        console.error(`Error updating product status for item ${item.productId}:`, err);
                        // Tiếp tục với các sản phẩm khác
                    }
                }
                
                // Chuyển hướng đến trang chi tiết đơn hàng
                console.log('Redirecting to order detail page');
                return res.redirect(`/order/detail/${savedOrder._id}`);
            } catch (err) {
                console.error('Error processing order:', err);
                return res.status(500).send('Đã xảy ra lỗi khi xử lý đơn hàng: ' + err.message);
            }
        } catch (error) {
            console.error('Lỗi khi đặt hàng:', error);
            res.status(500).send('Đã xảy ra lỗi khi xử lý đơn hàng');
        }
    }
    
    // Hiển thị chi tiết đơn hàng
    async showOrderDetail(req, res) {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            const userId = req.session.user._id;
            const orderId = req.params.orderId;
            
            // Lấy thông tin đơn hàng
            const order = await Order.findOne({ _id: orderId, userId }).lean();
            
            if (!order) {
                return res.status(404).send('Không tìm thấy đơn hàng');
            }
            
            // Lấy thông tin slug của sản phẩm từ database
            if (order.items && order.items.length > 0) {
                for (let i = 0; i < order.items.length; i++) {
                    const item = order.items[i];
                    if (item.productId) {
                        try {
                            const product = await Product.findById(item.productId).lean();
                            if (product) {
                                order.items[i].slug = product.slug;
                            }
                        } catch (err) {
                            console.error(`Lỗi khi lấy thông tin sản phẩm ${item.productId}:`, err);
                        }
                    }
                }
            }
            
            res.render('client/pages/order-detail', {
                layout: 'main',
                pageTitle: "Chi tiết đơn hàng",
                order,
                user: req.session.user,
                currentPage: "order"
            });
        } catch (error) {
            console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
            res.status(500).send('Đã xảy ra lỗi khi xử lý yêu cầu');
        }
    }
    
    // Hiển thị lịch sử đơn hàng
    async showOrderHistory(req, res) {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            const userId = req.session.user._id;
            
            // Lấy trạng thái từ query parameter
            const status = req.query.status;
            
            // Lấy tham số trang hiện tại, mặc định là 1
            const page = parseInt(req.query.page) || 1;
            const limit = 10; // Số đơn hàng mỗi trang
            const skip = (page - 1) * limit;
            
            // Tạo điều kiện tìm kiếm
            const findCondition = { userId };
            
            // Nếu có trạng thái, thêm vào điều kiện tìm kiếm
            if (status) {
                findCondition.status = status;
            }
            
            console.log('Tìm đơn hàng với điều kiện:', findCondition);
            
            // Đếm tổng số đơn hàng phù hợp với điều kiện
            const totalOrders = await Order.countDocuments(findCondition);
            
            // Tính tổng số trang
            const totalPages = Math.ceil(totalOrders / limit);
            
            // Lấy danh sách đơn hàng theo điều kiện, có phân trang
            const orders = await Order.find(findCondition)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
            
            console.log(`Tìm thấy ${totalOrders} đơn hàng${status ? ` với trạng thái ${status}` : ''}, hiển thị trang ${page}/${totalPages}`);
            
            // Tạo mảng các trang để hiển thị phân trang
            const pages = [];
            for (let i = 1; i <= totalPages; i++) {
                pages.push({
                    number: i,
                    active: i === page,
                    url: `/order/history?${status ? `status=${status}&` : ''}page=${i}`
                });
            }
            
            // Tạo URL cho nút trang trước và trang sau
            const prevPage = page > 1 ? `/order/history?${status ? `status=${status}&` : ''}page=${page - 1}` : null;
            const nextPage = page < totalPages ? `/order/history?${status ? `status=${status}&` : ''}page=${page + 1}` : null;
            
            res.render('client/pages/order-history', {
                layout: 'main',
                pageTitle: "Lịch sử đơn hàng",
                orders,
                status, // Truyền trạng thái hiện tại vào view
                pagination: {
                    page,
                    totalPages,
                    totalOrders,
                    pages,
                    prevPage,
                    nextPage
                },
                user: req.session.user,
                currentPage: "cart"
            });
        } catch (error) {
            console.error('Lỗi khi hiển thị lịch sử đơn hàng:', error);
            res.status(500).send('Đã xảy ra lỗi khi xử lý yêu cầu');
        }
    }
    
    // Hủy đơn hàng
    async cancelOrder(req, res) {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            const userId = req.session.user._id;
            const orderId = req.params.orderId;
            
            // Sử dụng OrderStateManager để yêu cầu hủy đơn hàng
            const result = await OrderStateManager.requestCancelOrder(orderId, userId);
            
            if (!result.success) {
                return res.status(400).send(result.message || 'Không thể hủy đơn hàng');
            }
            
            console.log(`Đơn hàng ${orderId} đã yêu cầu hủy bởi người dùng ${userId}`);
            
            // Khôi phục trạng thái sản phẩm
            // Lưu ý: Việc khôi phục trạng thái sản phẩm có thể được chuyển vào OrderStateManager
            // hoặc giữ nguyên ở đây nếu cần xử lý đặc biệt
            const order = await Order.findOne({ _id: orderId, userId });
            console.log('Restoring product status');
            for (const item of order.items) {
                try {
                    // Tìm sản phẩm gốc
                    const product = await Product.findById(item.productId);
                    if (product) {
                        // Tìm các sản phẩm có cùng mã import, đang SOLD và được bán sau khi đơn hàng được tạo
                        const productsToRestore = await Product.find({
                            import: product.import,
                            status: 'SOLD',
                            sellDate: { $gte: order.createdAt }
                        }).limit(item.quantity);
                        
                        // Cập nhật trạng thái thành IN_STOCK và xóa ngày bán
                        const updatePromises = productsToRestore.map(p => {
                            return Product.updateOne(
                                { _id: p._id },
                                { 
                                    $set: { 
                                        status: 'IN_STOCK',
                                        sellDate: null 
                                    } 
                                }
                            );
                        });
                        
                        const updateResults = await Promise.all(updatePromises);
                        const restoredCount = updateResults.reduce((sum, result) => sum + result.modifiedCount, 0);
                        
                        console.log(`Restored ${restoredCount} products with import code ${product.import} to IN_STOCK`);
                    }
                } catch (err) {
                    console.error(`Error restoring product status for item ${item.productId}:`, err);
                    // Tiếp tục với các sản phẩm khác
                }
            }
            
            // Chuyển hướng đến trang chi tiết đơn hàng
            res.redirect(`/order/detail/${orderId}`);
        } catch (error) {
            console.error('Lỗi khi hủy đơn hàng:', error);
            res.status(500).send('Đã xảy ra lỗi khi xử lý yêu cầu');
        }
    }
}

module.exports = new OrderController();
