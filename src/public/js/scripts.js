(function() {
    function validateObjectId(id) {
        if (typeof id !== 'string') return false;
        const objectIdRegex = /^[a-f\d]{24}$/i;
        return objectIdRegex.test(id);
    }

    function sanitizeId(id) {
        if (typeof id !== 'string') return '';
        return id.replace(/[^a-zA-Z0-9\-_]/g, '');
    }

    function escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function sanitizeNumber(num) {
        const parsed = parseFloat(num);
        return isNaN(parsed) ? 0 : parsed;
    }

    window.addEventListener('DOMContentLoaded', event => {
        const sidebarToggle = document.body.querySelector('#sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', event => {
                event.preventDefault();
                document.body.classList.toggle('sb-sidenav-toggled');
                localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
            });
        }
    });

    document.addEventListener('DOMContentLoaded', function () {

        const buttonsStatus = document.querySelectorAll("[data-status]");
        if (buttonsStatus.length > 0) {
            const url = new URL(window.location.href); 
            const currentStatus = url.searchParams.get("status") || "";

            buttonsStatus.forEach(button => {
                button.classList.remove("active");
                const buttonStatus = sanitizeId(button.getAttribute("data-status") || '');
                if (buttonStatus === currentStatus) {
                    button.classList.add("active");
                }
                
                button.addEventListener("click", function () {
                    const status = sanitizeId(button.getAttribute("data-status") || '');
                    const newUrl = new URL(window.location.href);
                    if (status) {
                        newUrl.searchParams.set("status", status);
                    } else {
                        newUrl.searchParams.delete("status");
                    }
                    window.location.href = newUrl.href;
                });
            });
        }

        document.addEventListener('click', async function (event) {
            const updateButton = event.target.closest('.btn-update-status');
            if (updateButton) {
                const orderId = updateButton.dataset.id;
                const newStatus = updateButton.dataset.status;

                if (!orderId || !validateObjectId(orderId)) {
                    alert('ID đơn hàng không hợp lệ');
                    console.warn('Invalid order ID:', orderId);
                    return;
                }

                const sanitizedStatus = sanitizeId(newStatus || '');
                if (!sanitizedStatus) {
                    alert('Trạng thái không hợp lệ');
                    return;
                }

                const escapedStatus = escapeHtml(sanitizedStatus);
                if (!confirm(`Bạn có chắc muốn cập nhật trạng thái đơn hàng sang "${escapedStatus}" không?`)) {
                    return;
                }

                try {
                    const response = await fetch(`/admin/order/${orderId}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: sanitizedStatus })
                    });
                    
                    const data = await response.json();

                    if (data.success) {
                        alert('Cập nhật trạng thái thành công!');
                        window.location.replace('/admin/order');         
                    } else {
                        const safeMessage = escapeHtml(data.message || 'Có lỗi xảy ra');
                        alert('Lỗi: ' + safeMessage);
                    }
                } catch (err) {
                    console.error('Update status error:', err);
                    alert('Đã xảy ra lỗi khi cập nhật trạng thái.');
                }
                return; 
            }

            const detailButton = event.target.closest('.btn-order-detail');
            if (detailButton) {
                const orderId = detailButton.getAttribute('data-id');
                
                console.log('Detail button clicked, Order ID:', orderId);
                
                if (!orderId) {
                    alert('Không tìm thấy ID đơn hàng');
                    console.warn('No order ID found');
                    return;
                }

                if (!validateObjectId(orderId)) {
                    alert('ID đơn hàng không hợp lệ: ' + orderId);
                    console.warn('Invalid order ID format:', orderId);
                    return;
                }

                console.log('Redirecting to:', `/admin/order/${orderId}`);
                window.location.href = `/admin/order/${orderId}`;
            }
        });

        const applyBulkButton = document.getElementById('applyBulkAction');
        if (applyBulkButton) {
            applyBulkButton.addEventListener('click', async function() {
                const checkboxes = document.querySelectorAll('.order-checkbox:checked');
                const selectedOrders = Array.from(checkboxes).map(checkbox => checkbox.value);
                const bulkActionSelect = document.getElementById('bulkAction');
                
                if (!bulkActionSelect) {
                    console.error('Bulk action select not found');
                    return;
                }
                
                const newStatus = bulkActionSelect.value;

                if (selectedOrders.length === 0) {
                    alert('Vui lòng chọn ít nhất một đơn hàng');
                    return;
                }

                const invalidIds = selectedOrders.filter(id => !validateObjectId(id));
                if (invalidIds.length > 0) {
                    alert('Một số ID đơn hàng không hợp lệ');
                    console.warn('Invalid order IDs:', invalidIds);
                    return;
                }

                const sanitizedStatus = sanitizeId(newStatus);
                if (!sanitizedStatus) {
                    alert('Trạng thái không hợp lệ');
                    return;
                }

                try {
                    const response = await fetch('/admin/order/apply-bulk-action', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            orderIds: selectedOrders, 
                            newStatus: sanitizedStatus 
                        })
                    });

                    const data = await response.json();
                    if (response.ok) {
                        const safeCount = sanitizeNumber(data.updatedCount);
                        alert(`Đã cập nhật trạng thái cho ${safeCount} đơn hàng.`);
                        window.location.replace('/admin/order');         
                    } else {
                        const safeMessage = escapeHtml(data.message || 'Đã có lỗi xảy ra');
                        alert(safeMessage);
                    }
                } catch (error) {
                    console.error('Bulk action error:', error);
                    alert('Đã có lỗi xảy ra khi gửi yêu cầu');
                }
            });
        }
    });
})();