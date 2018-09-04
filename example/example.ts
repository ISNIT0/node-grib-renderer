import * as Jimp from 'jimp';
import {
    makeMap, Pixel
} from '../lib/lib';
import grib2json from 'grib2json';


function getGrib(gribFilePath, opts) {
    return new Promise((resolve, reject) => {
        grib2json(gribFilePath, opts, function (err, json) {
            if (err) reject(err);
            else resolve(json);
        });
    });
}


import * as path from 'path';

const grib2jsonPath = path.join(__dirname, '../grib2json-0.8.0-SNAPSHOT/bin/grib2json');

function makeTemperatureMap(gribFilePath, bbox) {
    return Promise.all([
        getGrib(gribFilePath, { //LAND
            scriptPath: grib2jsonPath,
            names: true, // (default false): Return descriptive names too
            data: true, // (default false): Return data, not just headers
            category: 0, // Grib2 category number, equals to --fc 1
            parameter: 218, // Grib2 parameter number, equals to --fp 7
            surfaceType: 1, // Grib2 surface type, equals to --fs 103
            surfaceValue: 0, // Grib2 surface value, equals to --fv 10
        }),
        getGrib(gribFilePath, { //TEMP
            scriptPath: grib2jsonPath,
            names: true, // (default false): Return descriptive names too
            data: true, // (default false): Return data, not just headers
            category: 0, // Grib2 category number, equals to --fc 1
            parameter: 0, // Grib2 parameter number, equals to --fp 7
            surfaceType: 1, // Grib2 surface type, equals to --fs 103
            surfaceValue: 0, // Grib2 surface value, equals to --fv 10
        })
    ]).then(([landGrib, tempGrib]) => {
        console.info(`Loaded Gribs`);
        const layers = [{
            grib: tempGrib[0],
            getPixel: function getPixel(value, lon, lat, values, x, y): Pixel {
                value -= 272.15;

                let r = 0,
                    g = 0,
                    b = 0;

                if (value <= -20) {
                    r = 255;
                    g = 255;
                    b = 255;
                } else if (value <= -15) {
                    r = 16;
                    g = 0;
                    b = 94;
                } else if (value <= 0) {
                    r = 32;
                    g = 252;
                    b = 218;
                } else if (value <= 10) {
                    r = 41;
                    g = 178;
                    b = 32;
                } else if (value <= 20) {
                    r = 223;
                    g = 255;
                    b = 10;
                } else if (value <= 26) {
                    r = 250;
                    g = 10;
                    b = 7;
                } else if (value > 26) {
                    r = 141;
                    g = 0;
                    b = 2;
                } else if (value >= 35) {
                    r = 251;
                    g = 1;
                    b = 163;
                }

                return [r, g, b, 255];
            }
        },
        /* Render Land Borders and Sea */
        {
            grib: landGrib[0],
            getPixel: function getPixel(value, lon, lat, values, x, y): Pixel {
                let r = 0,
                    g = 0,
                    b = 0,
                    a = 0;

                if (value === 0) {
                    /* This is commented out to reveal the temperature of the sea. Uncomment to show a block colour for the sea */

                    // r = 203;
                    // g = 223;
                    // b = 218;
                    // a = 255;
                } else {
                    /* Draw Land Borders */
                    const val = values[x][y].value;
                    const neighbourDiffers = !( //TODO: replace
                        ((values[x - 1] || [])[y] || {}).value === val &&
                        ((values[x + 1] || [])[y] || {}).value === val &&
                        ((values[x] || [])[y - 1] || {}).value === val &&
                        ((values[x] || [])[y + 1] || {}).value === val);
                    if (neighbourDiffers) {
                        a = 255;
                    }
                }

                return [r, g, b, a];
            }
        },
            /* Print Numbers */
            // {
            //     grib: tempGrib[0],
            //     custom: function custom(image, data) {
            //         return (<any>Jimp).loadFont(Jimp.FONT_SANS_16_BLACK).then(function (font) {
            //             const density = 30;
            //             Array(density).join(',').split(',')
            //                 .map((_, xI) => Array(density).join(',').split(',')
            //                     .forEach((_, yI) => {
            //                         const xLength = image.bitmap.width;
            //                         const yLength = image.bitmap.height;
            //                         const xMult = xLength / density;
            //                         const yMult = yLength / density;
            //                         const columns = data.slice(Math.floor(xI * xMult), Math.ceil((xI + 1) * xMult));
            //                         const rows = columns.map(col => col.slice(Math.floor(yI * yMult), Math.ceil((yI + 1) * yMult)));
            //                         const values = flatten(rows).map(({
            //                             value
            //                         }) => value - 272.15);
            //                         const avgValue = values.reduce((acc, value) => value + acc, 0) / values.length;

            //                         const xCellSize = image.bitmap.width / density;
            //                         const xPos = xCellSize * xI + (xCellSize / 3);

            //                         const yCellSize = image.bitmap.height / density;
            //                         const yPos = yCellSize * yI + (yCellSize / 3);

            //                         image.print(font, xPos, yPos, `${Math.floor(avgValue)}`, xCellSize); // print a message on an image with text wrapped at width
            //                     }))
            //         });
            //     }
            // }
        ];
        return makeMap(layers, bbox);
    });
}

export default makeTemperatureMap;

console.time('MakeMap');
makeTemperatureMap('./gfs.t06z.pgrb2.0p25.f000', [-180, 90, 180, -90])
    .catch(err => console.error(err))
    .then((img: Jimp) => img.write('./example.png') && console.timeEnd('MakeMap'));
