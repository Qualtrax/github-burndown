var express = require('express');
var app = module.exports = express();

app.use(express.static(__dirname + '/static'));