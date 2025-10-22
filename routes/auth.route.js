const express = require("express");
const router = express.Router();
// const csrf = require("csurf");
const AuthController = require("../controllers/auth.controller");

// const csrfProtection = csrf({ cookie: true });

// Render trang login có token
router.get("/login", (req, res) => {
    const message = req.session.message || null;
    const isSuccess = req.session.isSuccess || null;
    req.session.isSuccess = null;
    req.session.message = null;

    res.render("login", {
        message,
        isSuccess,
        // csrfToken: req.csrfToken() // truyền token ra view
    });
});

// Xử lý đăng nhập
router.post("/login", AuthController.login);

// Xử lý đăng ký
router.post("/signup", AuthController.signup);

router.get("/logout", AuthController.logout);

module.exports = router;
