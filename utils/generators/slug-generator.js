/**
 * Tạo slug từ chuỗi văn bản
 * @param {string} title - Chuỗi văn bản cần tạo slug
 * @param {Array} existingSlugs - Danh sách các slug đã tồn tại để tránh trùng lặp
 * @returns {string} - Slug đã được tạo
 */
function generateSlug(title, existingSlugs = []) {
  if (!title) return '';
  
  // Chuyển thành chữ thường
  let slug = title.toLowerCase();
  
  // Loại bỏ dấu tiếng Việt
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Loại bỏ các ký tự đặc biệt
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  
  // Thay thế khoảng trắng bằng dấu gạch ngang
  slug = slug.trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  
  // Đảm bảo slug là duy nhất
  let uniqueSlug = slug;
  let counter = 1;
  
  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;
  }
  
  return uniqueSlug;
}

module.exports = generateSlug;
