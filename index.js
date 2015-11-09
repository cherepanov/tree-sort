#!/usr/bin/env node


"use strict";


var express = require("express");
var faker = require('faker');
let babelify = require('express-babelify-middleware');
//FIXME: submit watchify fix
let open = require('open');

faker.locale = 'ru';

var app = express();

//FIXME: sourcemaps
app.use('/widget/widget.js', babelify('./html/widget/widget.js', {cache: 'dynamic', extensions: ['.js', '.json', '.es6'], debug: true}));
//app.use('/widget/WidgetCtl.js', babelify('./html/widget/WidgetCtl.js', {cache: 'dynamic'}));
app.use(express.static('./html'));

app.get('/data', function (req, res, next) {
	let content = '',
		cats = Number.parseInt(req.query.c) || 100,
		items = Number.parseInt(req.query.i) || 1000,
		i;

	content += '{ "sections" : [';
	//res.write(content);

	i = cats + 1;
	while(--i) {
		content += `{"id":"${i}","title":"${faker.fake('{{commerce.color}}')}"}${i > 1 ? ',' : ''}`;
		//res.write(content);
	}

	content += '],"topics":[';
	//res.write(content);

	i = items + 1;
	while(--i) {
		content += `{"id":"${i}",
		"section":"${Math.ceil(Math.random() * cats)}",
		 "title":"${faker.fake('{{commerce.department}}')}"}${i > 1 ? ',' : ''}`;
		//res.write(content);
	}

	content += ']}';

	res.end(content);
	next();
});

app.listen(8282);
open('http://localhost:8282/');