module.exports = {
    checkAdminRole: (req, res, next) => {
        const user = req.session.user;
   
         if (!req.session || !req.session.user) {
            return res.redirect("/login");
        }
        if (!user || (user.role !== 3)) {
            return res.status(403).render("error", { message: "Truy cập bị từ chối." });
        }
        next(); 
    },

    checkStaffRole: (req, res, next) => {

        if (!req.session || !req.session.user) {
            return res.redirect("/login");
        }
        const user = req.session.user;
        
        if (!user || (user.role !== 2 && user.role !== 3) ) {
            return res.status(403).render("error", { message: "Truy cập bị từ chối." });
        }
        next(); 
    },

    checkUserLogin : (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    next();
    }
};

