//convert to csv
//input file is ./testUsers.json
var fs = require('fs');
var json2csv = require('json2csv');
var fields = ['username', 'password', 'firstname', 'lastname', 'org', 'email', 'role', 'moduleIndex', 'AssessmentIndex'];
var myUsers = require('./testUsers.json');
var csv = json2csv({ data: myUsers, fields: fields });
fs.writeFile('testUsers.csv', csv, function(err) {
    if (err) throw err;
    console.log('file saved');
    }
);