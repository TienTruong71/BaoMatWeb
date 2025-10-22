const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
// const csrf = require('csurf');
const helmet = require('helmet');
const moment = require('moment');
const hbs = require('express-handlebars');

// Controllers / Routes
const catalogRouter = require('./routes/client/catalog.route');
const routeClient = require("./routes/client/index.route");
const routeAdmin = require("./routes/admin/index.route");
const routeStaff = require("./routes/staff/index.route");
const authRoute = require("./routes/auth.route");
const waitingRoute = require("./routes/waiting.route");
const forgotRoute = require("./routes/forgot.route");
const loadCatalogList = require('./middleware/catalog.middleware.js');
const Cart = require('./models/cart.model');
const database = require("./config/database.js");
const systemConfig = require("./config/system.js");
const crypto = require("crypto");

// Server
const app = express();
const httpPort = 3000;
const httpsPort = 3443;

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

// SSL Certificates
const privateKey = fs.readFileSync(path.join(__dirname, 'cert', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };




// app.use((req, res, next) => {
//   res.locals.nonce = crypto.randomBytes(16).toString("base64");
//   next();
// });

app.use(
  helmet({
    frameguard: { action: "sameorigin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
      },
    },
    xPoweredBy: false,
  })
);



app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  next();
});

app.disable('etag'); // tắt ETag
app.use((req, res, next) => {
  res.removeHeader("Last-Modified"); // xoá Last-Modified
  next();
});

app.use(express.static(path.join(__dirname, 'src', 'public'), {
  etag: false,              // tắt ETag
  lastModified: false,      // tắt Last-Modified
  cacheControl: false,
  setHeaders: (res, path) => {
    res.removeHeader('Date');
    res.removeHeader('Last-Modified');
    res.removeHeader('ETag');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));


app.use((req, res, next) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function (key, value) {
    if (
      ['date', 'last-modified', 'etag'].includes(key.toLowerCase())
    ) return;
    originalSetHeader.call(this, key, value);
  };
  next();
});

app.use(loadCatalogList);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: "ThanhTien2004",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      httpOnly: true, 
      secure: false, // ⚠️ bật lại true khi deploy production có HTTPS thật
      sameSite: 'Lax' // ✅ cho phép cookie gửi khi redirect nội bộ
    },
  })
);


// CSRF Protection
// const csrfProtection = csrf({ cookie: true });

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src/resources/views'));
app.engine('hbs', hbs.engine({
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'src/resources/views/client/layouts'),
  partialsDir: path.join(__dirname, 'src/resources/views/client/partials'),
  defaultLayout: false,
  helpers: {
    eq: (a, b) => a === b,
    notEq: (a, b) => a !== b,
    formatCurrency: (number) => number ? number.toLocaleString("vi-VN") + 'đ' : '0',
    multiply: (a, b) => a * b,
    formatDate: (date, format) => moment(date).format(typeof format === 'string' ? format : 'DD/MM/YYYY'),
    range: (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i),
    isActive: (page, currentPage) => page === currentPage ? 'active' : '',
  },
}));


app.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      const cart = await Cart.findOne({ userId: req.session.user._id }).lean();
      res.locals.cartCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    } else {
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

https.createServer(credentials, app).listen(httpsPort, () => {
  console.log(`HTTPS Server running at https://localhost:${httpsPort}`);
});


http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://${req.headers.host.split(':')[0]}:${httpsPort}${req.url}` });
  res.end();
}).listen(httpPort, () => {
  console.log(`HTTP redirect server running on port ${httpPort}`);
});
