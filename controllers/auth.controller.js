const { default: Swal } = require("sweetalert2");
const User = require("../models/user.model");
const sanitize = require("mongo-sanitize"); // ✅ thêm dòng này

class AuthController {

    async signup(req, res) {
        try {
            const emailAddress = sanitize(req.body.emailAddress);
            const fullName = sanitize(req.body.fullName);
            const password = sanitize(req.body.password);

            const username = emailAddress.split("@")[0];

            const existingUser = await User.findOne({
                $or: [{ username }, { emailAddress }]
            });

            if (existingUser) {
                return res.render("login", { 
                    message: "Username hoặc Email đã được sử dụng.",
                    isSuccess: false
                });
            }

            const user = new User({
                username,
                emailAddress,
                fullName,
                password
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
            const emailAddress = sanitize(req.body.emailAddress);
            const password = sanitize(req.body.password);

            const user = await User.findOne({ emailAddress });
            if (!user) {
                return res.render("login", { 
                    message: "Email hoặc mật khẩu không đúng.",
                    isSuccess: false
                });
            }

            if (user.status === "locked") {
                return res.render("login", {
                    message: "Tài khoản của bạn đã bị khóa.",
                    isSuccess: false
                });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.render("login", { 
                    message: "Email hoặc mật khẩu không đúng.",
                    isSuccess: false
                });
            }

            req.session.user = {
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                emailAddress: user.emailAddress,
                role: user.role
            };

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
            req.session.destroy((err) => {
                if (err) console.error("Lỗi khi xóa session:", err);
                res.redirect("/");
            });
        } catch (error) {
            res.status(500).json({ message: "Lỗi server.", error });
        }
    }
}

module.exports = new AuthController();
