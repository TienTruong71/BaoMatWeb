const { default: Swal } = require("sweetalert2");
const User = require("../models/user.model")
const bcrypt = require("bcrypt");
class AuthController {

    async signup(req, res) {
        try {
            const { emailAddress, fullName, password } = req.body;

            if (fullName.length > 100 || emailAddress.length > 100 || password.length > 64)
            return res.render("login", { message: "Dữ liệu vượt quá giới hạn cho phép.", isSuccess: false });

            if (!emailAddress || !fullName || !password) {
                return res.render("login", {
                    message: "Vui lòng nhập đầy đủ thông tin.",
                    isSuccess: false
                });
            }

            
            if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
                return res.render("login", {
                    message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số.",
                    isSuccess: false
                });
            }    

            // Tạo username tự động từ emailAddress
            const username = emailAddress.split("@")[0];



            // Kiểm tra nếu email hoặc username đã tồn tại
            const existingUser = await User.findOne({ $or: [{ username }, { emailAddress }] });
            if (existingUser) {
                return res.render("login", { 
                    message: "Username hoặc Email đã được sử dụng.",
                    isSuccess: false
                });
            }

            
            const hashedPassword = await bcrypt.hash(password, 10);



            const user = new User({
                username,
                emailAddress,
                fullName,
                password : hashedPassword
            });

            await user.save();

            res.render("login", {
                message: "Đăng ký thành công.",
                isSuccess: true
            });
        } catch (error) {
            res.render("login", {
                message: "Lỗi server. Vui lòng thử lại sau.",
                isSuccess: false
            });
        }
    }

    async login(req, res) {
        try {
            const { emailAddress, password } = req.body;

            // Tìm người dùng theo email
            const user = await User.findOne({ emailAddress });
            if (!user) {
                return res.render("login", { 
                    message: "Email hoặc mật khẩu không đúng.",
                    isSuccess: false
                });
            }

            // Kiểm tra trạng thái tài khoản
            if (user.status === "locked") {
                return res.render("login", {
                    message: "Tài khoản của bạn đã bị khóa.",
                    isSuccess: false
                });
            }

            // Kiểm tra mật khẩu
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render("login", { 
                    message: "Email hoặc mật khẩu không đúng.",
                    isSuccess: false
                });
            }

            // Lưu thông tin người dùng vào session
            req.session.user = {
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                emailAddress: user.emailAddress,
                role: user.role
            };

            // Chuyển hướng đến trang chủ
            res.redirect("/waiting");
        } catch (error) {
            return res.render("login", { 
                message: "Email hoặc mật khẩu không đúng.", 
                isSuccess: false
            });
        }
    }

    async logout(req, res) {
        try {
            // Xóa thông tin người dùng khỏi session
            req.session.destroy((err) => {
                if (err) {
                    console.error("Lỗi khi xóa session:", err);
                }

                // Chuyển hướng về trang đăng nhập
                res.redirect("/");
            });
        } catch (error) {
            res.status(500).json({ message: "Lỗi server.", error });
        }
    }
}

module.exports = new AuthController();