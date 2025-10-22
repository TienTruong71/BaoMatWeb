const path = require('path');
const Cart = require('../../models/cart.model');
const Product = require('../../models/product.model');

class CartController {
    async showCart(req, res, next) {
        try {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            const userId = req.session.user._id;

            console.log('Fetching cart for user:', userId);

            const cart = await Cart
                .findOne({ userId })
                .populate('items.productId', 'title sellPrice thumbnail slug')
                .lean();

            console.log('Cart found:', cart ? 'Yes' : 'No');

            if (!cart || !cart.items || cart.items.length === 0) {
                console.log('Cart is empty');
                return res.render('client/pages/shop-cart', {
                    layout: 'main',
                    pageTitle: "Cart",
                    cartItems: [],
                    subtotal: 0,
                    cartCount: 0,
                    user: req.session.user || null,
                    currentPage: "cart"
                });
            }

            console.log('Cart items count:', cart.items.length);

            const cartItems = cart.items.map(item => {
                console.log('Processing item:', item);
                return {
                    _id: item._id,
                    title: item.productId?.title || '—',
                    sellPrice: item.productId?.sellPrice || 0,
                    thumbnail: item.productId?.thumbnail || '',
                    slug: item.productId?.slug || '',
                    quantity: item.quantity,
                    total: item.quantity * (item.productId?.sellPrice || 0)
                };
            });

            const subtotal = cartItems.reduce((total, item) => total + item.total, 0);
            const vat = subtotal * 0.1;
            
            let shippingFee = 30000;
            if (subtotal >= 100000) {
                shippingFee = 0;
            }
            
            const totalAmount = subtotal + vat + shippingFee;
            const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

            console.log('Rendering cart with items:', cartItems.length);

            const user = req.session.user || null;
            res.render('client/pages/shop-cart', {
                layout: 'main',
                pageTitle: "Cart",
                cartItems,
                subtotal,
                cartCount,
                user,
                currentPage: "cart"
            });
        } catch (error) {
            console.error('Error in showCart:', error);
            res.status(500).send('Đã xảy ra lỗi khi hiển thị giỏ hàng');
        }
    }

    async addToCart(req, res) {
        const MAX_RETRIES = 3;
        let retryCount = 0;
        
        try {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            const userId = req.session.user._id;
            const prodId = req.params.productId;
            const qty = parseInt(req.body.qty) || 1;

            console.log('Adding to cart:', { userId, prodId, qty });

            const product = await Product.findById(prodId).lean();
            if (!product) {
                console.log('Product not found');
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm'
                });
            }

            console.log('Product found:', product.title);

            while (retryCount < MAX_RETRIES) {
                try {
                    const stockCount = await Product.countDocuments({
                        import: product.import,
                        status: { $in: ['IN_STOCK', 'ON_SALE'] },
                        active: 'active'
                    });
                    
                    console.log(`Tồn kho hiện tại: ${stockCount} sản phẩm với mã import ${product.import}`);

                    if (stockCount <= 0) {
                        console.log('Product out of stock');
                        return res.status(400).json({
                            success: false,
                            message: 'Sản phẩm đã hết hàng'
                        });
                    }

                    const currentCart = await Cart.findOne({ userId }).lean();
                    let currentQtyInCart = 0;
                    
                    if (currentCart && currentCart.items) {
                        const existingItem = currentCart.items.find(
                            i => i.productId && i.productId.toString() === prodId
                        );
                        if (existingItem) {
                            currentQtyInCart = existingItem.quantity;
                        }
                    }
                    
                    console.log(`Số lượng hiện có trong giỏ: ${currentQtyInCart}`);
                    console.log(`Số lượng yêu cầu thêm: ${qty}`);
                    console.log(`Tổng số lượng sau khi thêm: ${currentQtyInCart + qty}`);
                    
                    if (currentQtyInCart + qty > stockCount) {
                        console.log(`Tổng số lượng yêu cầu (${currentQtyInCart + qty}) vượt quá tồn kho (${stockCount})`);
                        const remainingStock = stockCount - currentQtyInCart;
                        const message = remainingStock > 0 ? 
                            `Chỉ còn ${remainingStock} sản phẩm trong kho có thể thêm vào giỏ hàng` : 
                            `Bạn đã thêm hết số lượng sản phẩm có sẵn vào giỏ hàng`;
                        
                        return res.status(400).json({
                            success: false,
                            message: message,
                            availableStock: remainingStock
                        });
                    }

                    console.log(`Đủ tồn kho để thêm ${qty} sản phẩm vào giỏ hàng`);

                    const result = await Cart.findOneAndUpdate(
                        {
                            userId,
                            'items.productId': prodId
                        },
                        {
                            $inc: { 'items.$.quantity': qty }
                        },
                        {
                            new: true,
                            runValidators: true
                        }
                    );

                    if (result) {
                        console.log('Updated existing item in cart');
                        
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            return res.json({ 
                                success: true, 
                                message: 'Sản phẩm đã được thêm vào giỏ hàng' 
                            });
                        }
                        return res.redirect('/cart');
                    }

                    const addResult = await Cart.findOneAndUpdate(
                        { userId },
                        {
                            $push: {
                                items: {
                                    productId: prodId,
                                    quantity: qty
                                }
                            }
                        },
                        {
                            new: true,
                            upsert: true, 
                            runValidators: true
                        }
                    );

                    if (addResult) {
                        console.log('Added new item to cart');
                        
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            return res.json({ 
                                success: true, 
                                message: 'Sản phẩm đã được thêm vào giỏ hàng' 
                            });
                        }
                        return res.redirect('/cart');
                    }

                    throw new Error('Failed to update cart');

                } catch (updateError) {
                    retryCount++;
                    console.log(`Retry ${retryCount}/${MAX_RETRIES} due to:`, updateError.message);
                    
                    if (retryCount >= MAX_RETRIES) {
                        throw updateError;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
                }
            }

        } catch (error) {
            console.error('Error in addToCart:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng',
                error: error.message
            });
        }
    }

    async removeItem(req, res) {
        try {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            const userId = req.session.user._id;
            const { itemId } = req.params;

            console.log('Removing item from cart:', { userId, itemId });

            const cart = await Cart.findOne({ userId });
            if (cart) {
                cart.items = cart.items.filter(i => !i._id.equals(itemId));
                await cart.save();
                console.log('Item removed successfully');
            } else {
                console.log('Cart not found');
            }
            res.redirect('/cart');
        } catch (error) {
            console.error('Error in removeItem:', error);
            res.status(500).send('Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng');
        }
    }

    async getCartCount(req, res) {
        try {
            if (!req.session.user) {
                return res.json({ count: 0 });
            }

            const userId = req.session.user._id;
            const cart = await Cart.findOne({ userId }).lean();

            const count = cart && cart.items ?
                cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

            console.log('Cart count for user', userId, ':', count);
            res.json({ count });
        } catch (error) {
            console.error('Error in getCartCount:', error);
            res.json({ count: 0, error: 'Đã xảy ra lỗi khi lấy số lượng sản phẩm trong giỏ hàng' });
        }
    }

    async updateItemQuantity(req, res) {
        const MAX_RETRIES = 3;
        let retryCount = 0;
        
        try {
            if (!req.session.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Bạn cần đăng nhập' 
                });
            }

            const userId = req.session.user._id;
            const { itemId } = req.params;
            const { quantity } = req.body;

            const qty = parseInt(quantity);
            if (isNaN(qty) || qty < 1) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Số lượng không hợp lệ' 
                });
            }

            console.log('Updating cart item quantity:', { userId, itemId, qty });

            const cart = await Cart.findOne({ userId });
            if (!cart) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Không tìm thấy giỏ hàng' 
                });
            }

            const item = cart.items.find(i => i._id.toString() === itemId);
            if (!item) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Không tìm thấy sản phẩm trong giỏ hàng' 
                });
            }

            const product = await Product.findById(item.productId).lean();
            if (!product) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Không tìm thấy thông tin sản phẩm' 
                });
            }

            while (retryCount < MAX_RETRIES) {
                try {
                    const stockCount = await Product.countDocuments({
                        import: product.import,
                        status: { $in: ['IN_STOCK', 'ON_SALE'] },
                        active: 'active'
                    });
                    
                    console.log(`Tồn kho hiện tại: ${stockCount} sản phẩm với mã import ${product.import}`);

                    if (stockCount <= 0) {
                        return res.status(400).json({ 
                            success: false, 
                            message: 'Sản phẩm đã hết hàng' 
                        });
                    }

                    if (qty > stockCount) {
                        return res.status(400).json({
                            success: false,
                            message: `Chỉ còn ${stockCount} sản phẩm trong kho`,
                            availableStock: stockCount
                        });
                    }

                    const result = await Cart.findOneAndUpdate(
                        {
                            userId,
                            'items._id': itemId
                        },
                        {
                            $set: { 'items.$.quantity': qty }
                        },
                        {
                            new: true,
                            runValidators: true
                        }
                    );

                    if (!result) {
                        throw new Error('Failed to update cart');
                    }

                    console.log('Updated cart item quantity successfully');

                    const total = qty * (product?.sellPrice || 0);

                    let subtotal = 0;
                    for (const cartItem of result.items) {
                        const prod = await Product.findById(cartItem.productId).lean();
                        subtotal += cartItem.quantity * (prod?.sellPrice || 0);
                    }

                    const cartCount = result.items.reduce(
                        (total, cartItem) => total + cartItem.quantity, 0
                    );

                    return res.json({
                        success: true,
                        message: 'Cập nhật số lượng thành công',
                        itemTotal: total,
                        subtotal: subtotal,
                        cartCount: cartCount
                    });

                } catch (updateError) {
                    retryCount++;
                    console.log(`Retry ${retryCount}/${MAX_RETRIES} due to:`, updateError.message);
                    
                    if (retryCount >= MAX_RETRIES) {
                        throw updateError;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
                }
            }

        } catch (error) {
            console.error('Error in updateItemQuantity:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật số lượng',
                error: error.message
            });
        }
    }
}

module.exports = new CartController();