const selfsigned = require('selfsigned');
const fs = require('fs');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

fs.mkdirSync('cert', { recursive: true });
fs.writeFileSync('./cert/key.pem', pems.private);
fs.writeFileSync('./cert/cert.pem', pems.cert);

console.log('Đã tạo xong cert/key.pem và cert/cert.pem');




const https = require('https');
const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();

const privateKey = fs.readFileSync(path.join(__dirname, 'cert', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

const httpsPort = 3443;
const httpPort = 3000;


