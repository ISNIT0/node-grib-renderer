const fs = require('fs');
const grib2json = require('grib2json').default;
const Jimp = require("jimp");

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

        const newXCoord = ((xCoord + 180) % 360) - 180;

        keyedValues[newXCoord] = keyedValues[newXCoord] || {};
        keyedValues[newXCoord][yCoord] = {
            value: val,
            index: index
        };
    });


    const topLeft = [-34, 44];
    const bottomRight = [54, -45];

    const slicedValues = [];
    const sliced = Object.keys(keyedValues)
        .map(x => Number(x))
        .filter(x => {
            return x >= topLeft[0] && x <= bottomRight[0];
        })
        .sort((a, b) => a == b ? 0 : a > b ? 1 : -1)
        .reduce((acc, xKey, index) => {
            slicedValues[index] = slicedValues[index] || [];
            acc[xKey] = Object.keys(keyedValues[xKey])
                .map(y => Number(y))
                .filter(y => {
                    return y <= topLeft[1] && y >= bottomRight[1];
                })
                .sort((a, b) => a == b ? 0 : a < b ? 1 : -1)
                .reduce((acc, yKey) => {
                    acc[yKey] = keyedValues[xKey][yKey];
                    slicedValues[index].push(acc[yKey].value);
                    return acc;
                }, {});
            return acc;
        }, {});

    const grid = [...Array(header.ny)].map((_, index) => data.slice(index * header.nx, (index + 1) * header.nx));

    const xIndex = Math.round(Math.abs(topLeft[0] - header.lo1) / header.dx);
    const yIndex = Math.round(Math.abs(topLeft[1] - header.la1) / header.dy);

    const xIndex2 = Math.round(Math.abs(bottomRight[0] - header.lo1) / header.dx);
    const yIndex2 = Math.round(Math.abs(bottomRight[1] - header.la1) / header.dy);

    console.log(`xIndex: ${xIndex}, yIndex: ${yIndex}`);

    const newGrid = grid.slice(yIndex, yIndex2).map(r => r.slice(xIndex, xIndex2));

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

    // console.log(`xlength: ${newGrid[0].length}/${header.nx} ylength: ${newGrid.length}/${header.ny}`);

    // const image = new Jimp(slicedIndexes.length, slicedIndexes[0].length, function (err, image) {
    const image = new Jimp(slicedValues.length, slicedValues[0].length, function (err, image) {
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            // var red = this.bitmap.data[idx + 0];
            // var green = this.bitmap.data[idx + 1];
            // var blue = this.bitmap.data[idx + 2];
            // var alpha = this.bitmap.data[idx + 3];

            if (this.bitmap.data[idx + 3] === 200) {
                console.log('already have value:', this.bitmap.data[idx + 3]);
            }

            this.bitmap.data[idx + 3] = 200;
            // const dataIndex = slicedIndexes[x][y];
            // const dataIndex = x + (y * header.nx);

            // const rawLon = header.lo1 + (header.dx * (x % header.nx));

            // const lon = ((rawLon + 180) % 360) - 180;
            // const lat = header.la1 - (y * header.dy);

            // if (lon >= topLeft[0] && lon <= bottomRight[0] && lat <= topLeft[1] && lat >= bottomRight[1]) {
            // const value = keyedValues[lon][lat].value;
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