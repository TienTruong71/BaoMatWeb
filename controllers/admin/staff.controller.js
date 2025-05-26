const User = require("../../models/user.model");
const bcrypt = require("bcrypt");

class AdminStaffController {
  async staff(req, res) {
    try {
      const user = req.session.user || null;
      const staffList = await User.find({ role: 2 }).lean();
      console.log("Danh sách khách hàng:", staffList);

      res.render("admin/manage_staff", {
        pageTitle: "Staff Management",
        user,
        staffList
      });
    } catch (err) {
      console.error("Lỗi khi lấy danh sách nhân viên:", err);
      res.send("Đã xảy ra lỗi khi tải danh sách nhân viên.");
    }
  }

  async lock(req, res) {
    try {
      await User.findByIdAndUpdate(req.params.id, { status: "locked" });
      res.redirect("/admin/staff");
    } catch (err) {
      console.error("Lỗi khi khóa tài khoản:", err);
      res.send("Đã xảy ra lỗi khi khóa tài khoản.");
    }
  }

  async unlock(req, res) {
    try {
      await User.findByIdAndUpdate(req.params.id, { status: "active" });
      res.redirect("/admin/staff");
    } catch (err) {
      console.error("Lỗi khi mở khóa tài khoản:", err);
      res.send("Đã xảy ra lỗi khi mở khóa tài khoản.");
    }
  }

  async viewStaff(req, res) {
    try {
      const user = req.session.user || null;
      const staffId = req.params.id;
      const staff = await User.findById(staffId).lean();
      if (!staff) return res.status(404).send("Không tìm thấy nhân viên.");
  
      const formattedDOB = staff.dateOfBirth
        ? new Date(staff.dateOfBirth).toISOString().split("T")[0]
        : "";
      const formattedJoinAt = new Date(staff.joinAt).toLocaleDateString("vi-VN");
  
      res.render("admin/staff_view", {
        user,
        staff,
        formattedDOB,
        formattedJoinAt,
        isActive: staff.status === "active",
      });
    } catch (err) {
      console.error("Lỗi xem chi tiết nhân viên:", err);
      res.status(500).send("Lỗi khi xem chi tiết nhân viên.");
    }
  }
  

  async delete(req, res) {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.redirect("/admin/staff");
    } catch (err) {
      console.error("Lỗi khi xóa tài khoản:", err);
      res.send("Đã xảy ra lỗi khi xóa tài khoản.");
    }
  }

  async editForm(req, res) {
    try {
      const user = req.session.user || null;
      const staffId = req.params.id;
      const staff = await User.findById(staffId).lean();

      if (!staff) {
        return res.status(404).send("Không tìm thấy nhân viên.");
      }

      res.render("admin/staff_edit", { user, staff });
    } catch (err) {
      console.error("Lỗi khi hiển thị form chỉnh sửa:", err);
      res.status(500).send("Đã xảy ra lỗi khi hiển thị form chỉnh sửa.");
    }
  }

  async editSave(req, res) {
    try {
      const staffId = req.params.id;
      const { fullName, emailAddress, phoneNumber, address, gender, dateOfBirth } = req.body;

      const parsedDate = dateOfBirth ? new Date(dateOfBirth) : undefined;
  
      await User.findByIdAndUpdate(staffId, {
        fullName,
        emailAddress,
        phoneNumber,
        address,
        gender: gender ? parseInt(gender) : undefined,
        dateOfBirth: parsedDate,
      });
  
      res.redirect("/admin/staff");
    } catch (err) {
      console.error("Lỗi khi cập nhật nhân viên:", err);
      res.status(500).send("Đã xảy ra lỗi khi lưu thông tin nhân viên.");
    }
  }
  

  async addForm(req, res) {
    try {
      const user = req.session.user || null;
  
      res.render("admin/staff_add", {
        pageTitle: "Thêm nhân viên",
        user,
      });
    } catch (error) {
      console.error("Lỗi hiển thị form thêm nhân viên:", error);
      res.status(500).send("Đã xảy ra lỗi khi hiển thị form thêm nhân viên.");
    }
  }
  

  async addSave(req, res) {
    try {
      const {username, password, fullName, emailAddress, phoneNumber, address, status, gender, dateOfBirth, avatar } = req.body;
      const existing = await User.findOne({ $or: [{ username }, { emailAddress }] });
  
      if (existing) {
        return res.render("admin/staff_add", {
          user: req.session.user,
          errorMessage: "Tên đăng nhập hoặc email đã tồn tại!",
        });
      }

      const newUser = new User({
        username,
        password,
        fullName,
        emailAddress,
        phoneNumber,
        address,
        gender: gender ? parseInt(gender) : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        avatar: avatar || undefined,
        status: status || "active",
        role: 2,
        joinAt: new Date()
      });
      await newUser.save();
      res.redirect("/admin/staff");
    } catch (err) {
      console.error("Lỗi khi thêm nhân viên:", err);
      res.status(500).send("Đã xảy ra lỗi khi thêm nhân viên mới.");
    }
  }
}

module.exports = new AdminStaffController();
