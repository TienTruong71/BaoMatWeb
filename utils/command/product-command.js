const Product = require("../../models/product.model");

class ProductCommand {
  constructor(importId) {
    this.importId = importId;
  }
  async executelock() {
    if (!this.importId) {
      throw new Error("Thiếu importId.");
    }
    const result = await Product.updateMany({ import: this.importId },{ active: "inactive" });
    console.log(`Đã ngừng bán ${result.modifiedCount} sản phẩm của import: ${this.importId}`);
    return result;
  }
  async executeunlock() {
    if (!this.importId) {
      throw new Error("Thiếu importId.");
    }
    const result = await Product.updateMany({ import: this.importId },{ active: "active" });
    console.log(`Đã mở bán ${result.modifiedCount} sản phẩm của import: ${this.importId}`);
    return result;
  }

}

module.exports = ProductCommand;
