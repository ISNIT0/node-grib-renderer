import grib2json from 'grib2json';

export function getGrib(gribFilePath, opts) {
    return new Promise((resolve, reject) => {
        grib2json(gribFilePath, opts, function (err, json) {
            if (err) reject(err);
            else resolve(json);
        });
    });
}

export function flatten(arrArr) {
    return arrArr.reduce((acc, arr) => acc.concat(arr));
}