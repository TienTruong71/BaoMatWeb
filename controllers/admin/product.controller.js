const Product = require("../../models/product.model");
const ProductFactory = require("../../utils/factories/product-factory");
const generateSlug = require('../../utils/generators/slug-generator');
const ProductCommand = require("../../utils/command/product-command");
class AdminProductController {
  async showAddForm(req, res) {
    try {
      const user = req.session.user || null;
      const categoryId = req.query.categoryId;
      res.render("admin/product_add", {
        pageTitle: "Add Product",
        user,
        categoryId
      });
    } catch (err) {
      console.error("Error showing product form:", err);
      res.send("Error loading product form.");
    }
  }
  async addProduct(req, res) {
    try {
      const { title, categoryId, description, sellPrice, mfg, exp, producer, status, sellDate, thumbnail, quantity } = req.body;
      const quantityNumber = parseInt(quantity);

      // Sử dụng ProductFactory để tạo sản phẩm
      const result = ProductFactory.createBatchProducts({
        title,
        categoryId,
        description,
        sellPrice,
        mfg,
        exp,
        producer,
        status,
        sellDate,
        thumbnail
      }, quantityNumber);

      console.log("Dữ liệu sản phẩm chuẩn bị lưu:", result.products);
      await Product.insertMany(result.products);

      console.log(`Đã thêm ${quantityNumber} sản phẩm ${title}`);
      res.redirect(`/admin/category/view/${categoryId}`);
    } catch (err) {
      console.error("Lỗi khi thêm sản phẩm:", err);
      res.send("Đã xảy ra lỗi khi thêm sản phẩm.");
    }
  }

  async lockByImport(req, res) {
    try {
      const importId = req.params.importId;
      const command = new ProductCommand(importId);
      await command.executelock();
      res.redirect(req.get("Referrer") || "/");

    } catch (error) {
      console.error("Error locking products:", error);
      res.status(500).send("Internal server error");
    }
  }

  async unlockByImport(req, res) {
    try {
      const importId = req.params.importId;
      const command = new ProductCommand(importId);
      await command.executeunlock();
      res.redirect(req.get("Referrer") || "/");

    } catch (error) {
      console.error("Error unlocking products:", error);
      res.status(500).send("Internal server error");
    }
  }

  async deleteByImport(req, res) {
    try {
      const importId = req.params.importId;
      await Product.deleteMany({ import: importId });
      res.redirect(req.get("Referrer") || "/admin/category");
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm theo import:", error);
      res.status(500).send("Internal server error");
    }
  }

  async showEditForm(req, res) {
    try {
      const user = req.session.user || null;
      const importId = req.params.importId;
      const product = await Product.findOne({ import: importId }).lean(); // chỉ lấy đại diện

      if (!product) {
        return res.status(404).send("Không tìm thấy sản phẩm");
      }

      res.render("admin/product_edit", {
        pageTitle: "Edit Product",
        user,
        product,
      });
    } catch (error) {
      console.error("Lỗi hiển thị form chỉnh sửa:", error);
      res.status(500).send("Server error");
    }
  }

  async updateByImport(req, res) {
    try {
      const importId = req.params.importId;
      const { title, description, sellPrice, mfg, exp, producer, thumbnail, categoryId } = req.body;
      const slug = generateSlug(title)
      
      // Sử dụng ProductFactory để tạo slug
      const productData = {
        title,
        description,
        sellPrice,
        mfg,
        exp,
        producer,
        thumbnail,
        import: importId
      };
      
      await Product.updateMany(
        { import: importId },
        {
          $set: {
            title,
            slug: slug,
            description,
            sellPrice,
            mfg,
            exp,
            producer,
            thumbnail,
          },
        }
      );

      res.redirect(`/admin/category/view/${categoryId}`);
    } catch (error) {
      console.error("Lỗi cập nhật sản phẩm:", error);
      res.status(500).send("Server error");
    }
  }
}

module.exports = new AdminProductController();
