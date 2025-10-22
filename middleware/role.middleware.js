module.exports = {
    checkAdminRole: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect("/login");
        }

        const user = req.session.user;
        if (user.role !== 3) {
            return res.status(403).render("error", { message: "Truy cập bị từ chối." });
        }

        next();
    },

    checkStaffRole: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect("/login");
        }

        const user = req.session.user;
        if (![2, 3].includes(user.role)) {
            return res.status(403).render("error", { message: "Truy cập bị từ chối." });
        }

        next();
    },

    checkUserLogin: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect("/login");
        }
        next();
    }
};
