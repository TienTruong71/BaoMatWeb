const path = require('path');
const express = require('express');
const session = require('express-session');
const moment = require('moment');
const Swal = require('sweetalert2');
const catalogRouter = require('./routes/client/catalog.route');
require('dotenv').config();
const Cart = require('./models/cart.model');
const database = require("./config/database.js");
const app = express();

const helmet = require('helmet');
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://cdn.example.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const hbs = require('express-handlebars');
const routeClient = require("./routes/client/index.route");
const routeAdmin = require("./routes/admin/index.route");
const routeStaff = require("./routes/staff/index.route")
const authRoute = require("./routes/auth.route");
const waitingRoute = require("./routes/waiting.route");
const forgotRoute = require("./routes/forgot.route");
const systemConfig = require("./config/system.js")
const loadCatalogList = require('./middleware/catalog.middleware.js');

// Thêm phần bảo vệ CSRF
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// đọc chứng chỉ SSL
const https = require('https');  
const http = require('http');    
const fs = require('fs');
const privateKey = fs.readFileSync(path.join(__dirname, 'cert', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };


// const port = process.env.PORT

const httpPort = 3000;   
const httpsPort = 3443;  


app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(loadCatalogList);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // Mỗi IP tối đa 100 yêu cầu mỗi phút
  message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
});

app.use(limiter);
app.use(cookieParser());

app.use(session({
  secret: "ThanhTien2004", 
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, secure: true, sameSite: 'Strict' }
}));

const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);


app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'src/resources/views'));


//Template engine
app.engine('hbs', hbs.engine({
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'src/resources/views/client/layouts'),
  partialsDir: path.join(__dirname, 'src/resources/views/client/partials'),
  defaultLayout: false,
  helpers: {
    eq: (a, b) => a === b,
    notEq: (a, b) => a !== b,
    formatCurrency: (number) => {
      if (!number) return '0';
      return number.toLocaleString("vi-VN") + 'đ';
    },
    multiply: (a, b) => a * b,
    formatDate: (date, format) => {
      const safeFormat = typeof format === 'string' ? format : 'DD/MM/YYYY';
      return moment(date).format(safeFormat);
    },
    range: (start, end) => {
      const range = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      return range;
    },
    isActive: (page, currentPage) => (page === currentPage ? 'active' : ''),
  },
}));


// Middleware tính cartCount
app.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      // Tìm giỏ hàng của user hiện tại
      const cart = await Cart.findOne({ userId: req.session.user._id }).lean();

      // Nếu có cart, tính tổng quantity; nếu không có, set về 0
      res.locals.cartCount = cart
        ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
        : 0;
    } else {
      // Chưa login => không có item
      res.locals.cartCount = 0;
    }
  } catch (err) {
    console.error('Error in cartCount middleware:', err);
    res.locals.cartCount = 0;
  }
  next();
});

routeAdmin(app);
routeStaff(app);
routeClient(app);
app.use("/", authRoute);
app.use("/", waitingRoute);
app.use("/", forgotRoute);
app.use('/', catalogRouter);

app.locals.prefixAdmin = systemConfig.prefixAdmin;

database.connect();

// app.use((req, res, next) => {
//   res.setHeader(
//     "Content-Security-Policy",
//     "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https://cdn.example.com; font-src 'self' https://fonts.gstatic.com; form-action 'self'; frame-ancestors 'none';"
//   );
//   next();
// });

app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

https.createServer(credentials, app).listen(httpsPort, () => {
  console.log(`HTTPS Server running at https://localhost:${httpsPort}`);
});

http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://${req.headers.host.split(':')[0]}:${httpsPort}${req.url}` });
  res.end();
}).listen(httpPort, () => {
  console.log(`HTTP redirect server running on port ${httpPort}`);
});