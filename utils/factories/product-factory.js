const { v4: uuidv4 } = require("uuid");
const generateSlug = require('../generators/slug-generator');

/**
 * Factory để tạo sản phẩm
 */
class ProductFactory {
  /**
   * Tạo một đối tượng sản phẩm mới
   * @param {Object} data - Dữ liệu sản phẩm
   * @returns {Object} - Đối tượng sản phẩm
   */
  static createProduct(data) {
    return {
      title: data.title || '',
      slug: data.slug || '',
      categoryId: data.categoryId,
      description: data.description || '',
      sellPrice: data.sellPrice || 0,
      mfg: data.mfg || null,
      exp: data.exp || null,
      producer: data.producer || '',
      status: data.status || 'IN_STOCK',
      sellDate: data.sellDate || new Date() ,
      thumbnail: data.thumbnail || '',
      import: data.import, // Phải dùng đúng tên trường 'import' như trong model
      active: 'active',
    };
  }
  
  /**
   * Tạo nhiều sản phẩm cùng lô
   * @param {Object} data - Dữ liệu sản phẩm
   * @param {number} quantity - Số lượng sản phẩm cần tạo
   * @returns {Object} - Đối tượng chứa danh sách sản phẩm và importId
   */
  static createBatchProducts(data, quantity) {
    const products = [];
    const importId = uuidv4(); // Tạo ID cho lô sản phẩm
    const slug = generateSlug(data.title);
    
    console.log("Slug tạo ra:", slug);

    for (let i = 0; i < quantity; i++) {
      products.push(this.createProduct({
        ...data,
        slug,
        import: importId, // Sử dụng đúng tên trường 'import'
      }));
    }
    
    return {
      products,
      importId
    };
  }
}

module.exports = ProductFactory;
