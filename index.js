const fs = require('fs');
const grib2json = require('grib2json').default;
const Jimp = require("jimp");

function flatten(arrArr){
    return arrArr.reduce((acc, arr) => acc.concat(arr));
}


// Print the v-component of wind at 10 meters above surface
// Includes header names and data
grib2json('./gfs.t06z.pgrb2.0p25.f038', {
    scriptPath: 'grib2json-0.8.0-SNAPSHOT/bin/grib2json',
    names: true, // (default false): Return descriptive names too
    data: true, // (default false): Return data, not just headers
    category: 0, // Grib2 category number, equals to --fc 1
    parameter: 0, // Grib2 parameter number, equals to --fp 7
    surfaceType: 1, // Grib2 surface type, equals to --fs 103
    surfaceValue: 0, // Grib2 surface value, equals to --fv 10
}, function (err, json) {
    if (err) return console.error(err);
    const header = json[0].header;
    const data = json[0].data;


    const keyedValues = {};
    data.forEach((val, index) => {
        const row = Math.floor(index / header.nx);
        const xCoord = header.lo1 + (header.dx * (index % header.nx))
        const yCoord = header.la1 - (row * header.dy);

        const newXCoord = ((xCoord + 180) % 360) - 180; // Allow for funny 0-360 vs -180-180 conversion

        keyedValues[newXCoord] = keyedValues[newXCoord] || {};
        keyedValues[newXCoord][yCoord] = {
            value: val,
            index: index
        };
    });


    const topLeft = [-34, 44];
    const bottomRight = [54, -45];

    const slicedValues = [];
    Object.keys(keyedValues)
        .map(x => Number(x))
        .filter(x => x >= topLeft[0] && x <= bottomRight[0])
        .sort((a, b) => a == b ? 0 : a > b ? 1 : -1)
        .forEach((xKey, index) => {
            slicedValues[index] = slicedValues[index] || [];
            Object.keys(keyedValues[xKey])
                .map(y => Number(y))
                .filter(y => y <= topLeft[1] && y >= bottomRight[1])
                .sort((a, b) => a == b ? 0 : a < b ? 1 : -1)
                .forEach((yKey) => slicedValues[index].push(keyedValues[xKey][yKey].value));
        });


    const maxVal = flatten(slicedValues).reduce((acc, val) => Math.max(acc, val - 272.15), 0);
    const minVal = flatten(slicedValues).reduce((acc, val) => Math.min(acc, val - 272.15), 0);
    const range = Math.abs(minVal - maxVal);
    const mod = 200 / range;
    console.log('maxVal', maxVal);
    console.log('minVal', minVal);

    const image = new Jimp(slicedValues.length, slicedValues[0].length, function (err, image) {
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            // var red = this.bitmap.data[idx + 0];
            // var green = this.bitmap.data[idx + 1];
            // var blue = this.bitmap.data[idx + 2];
            // var alpha = this.bitmap.data[idx + 3];

            this.bitmap.data[idx + 3] = 255;
            
            const value = slicedValues[x][y];
            // this.bitmap.data[idx + 0] = Math.abs(range + ((data[dataIndex] - 272.15) * mod));
            this.bitmap.data[idx + 0] = Math.abs(range + ((value - 272.15) * mod));
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;
            // }


            // console.log('coords: ', [((lon + 180) % 360) - 180, header.la1 - (y * header.dy)]);

            if (x == image.bitmap.width - 1 &&
                y == image.bitmap.height - 1) {

                image.write('./tmp.' + image.getExtension());
            }
        });
    });
});