const fs = require('fs');
const grib2json = require('grib2json').default;
const Jimp = require("jimp");

const proj4 = require('proj4');







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
        const xCoord = header.lo1 + (header.dx * (index % header.nx)) - (header.lo2 / 2);
        const yCoord = header.la1 - (row * header.dy);

        keyedValues[xCoord] = keyedValues[xCoord] || {};
        keyedValues[xCoord][yCoord] = {
            value: val,
            index: index
        };
    });
    // console.log(acc);
    const bottomLeft = [-121.6350, 9.9904];
    const topRight = [-84.2884, 35.5851];

    const slicedIndexes = [];
    const sliced = Object.keys(keyedValues).filter(xKey => {
        const x = Number(xKey);
        return x > bottomLeft[0] && x < topRight[0];
    }).reduce((acc, xKey, index) => {
        slicedIndexes[index] = slicedIndexes[index] || [];
        acc[xKey] = Object.keys(keyedValues[xKey])
            .filter(yKey => {
                const y = Number(yKey);
                return y < topRight[1] && y > bottomLeft[1];
            }).reduce((acc, yKey) => {
                acc[yKey] = keyedValues[xKey][yKey];
                slicedIndexes[index].push(acc[yKey].index);
                return acc;
            }, {});
        return acc;
    }, {});

    console.log(sliced, slicedIndexes);

    // const grid = data.

    // console.log(json);

    // const lonIndex = Math.abs(Math.round(((targetLon - header.lo1) / header.dx)));
    // const latIndex = Math.abs(Math.round(((targetLat - header.la1) / header.dy)));

    // let bestIndex = latIndex * header.nx;
    // bestIndex += lonIndex;

    // console.log(`Got index [${bestIndex}] for total length [${json[0].data.length}]`);

    // console.log(`Val might be: `, json[0].data[bestIndex]);

    const maxVal = json[0].data.reduce((acc, val) => Math.max(acc, val - 272.15), 0);
    const minVal = json[0].data.reduce((acc, val) => Math.min(acc, val - 272.15), 0);
    const range = Math.abs(minVal - maxVal);
    const mod = 256 / range;
    console.log('maxVal', maxVal);
    console.log('minVal', minVal);
    // console.log(header);

    // fs.writeFileSync('./tmp.json', JSON.stringify(acc), 'utf8');

    // console.log(`Header:`, header);
    // console.log(`CoordData:`, coordData);



    const image = new Jimp(header.nx, header.ny, function (err, image) {
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            // var red = this.bitmap.data[idx + 0];
            // var green = this.bitmap.data[idx + 1];
            // var blue = this.bitmap.data[idx + 2];
            // var alpha = this.bitmap.data[idx + 3];

            this.bitmap.data[idx + 3] = 200;
            const dataIndex = x + (y * header.nx);

            this.bitmap.data[idx + 0] = Math.abs(range + ((data[dataIndex] - 272.15) * mod));
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;

            if (x == image.bitmap.width - 1 &&
                y == image.bitmap.height - 1) {

                image.write('./tmp.' + image.getExtension());
            }
        });
    });
});