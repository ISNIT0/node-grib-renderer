"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var grib2json_1 = require("grib2json");
function getGrib(gribFilePath, opts) {
    return new Promise(function (resolve, reject) {
        grib2json_1.default(gribFilePath, opts, function (err, json) {
            if (err)
                reject(err);
            else
                resolve(json);
        });
    });
}
exports.getGrib = getGrib;
function flatten(arrArr) {
    return arrArr.reduce(function (acc, arr) { return acc.concat(arr); });
}
exports.flatten = flatten;
