import Jimp from 'jimp';
import {
    makeMap,
    getGrib,
    flatten
} from './util';

function makeTemperatureMap(gribFilePath, bbox) {
    return Promise.all([
        getGrib(gribFilePath, { //LAND
            scriptPath: 'grib2json-0.8.0-SNAPSHOT/bin/grib2json',
            names: true, // (default false): Return descriptive names too
            data: true, // (default false): Return data, not just headers
            category: 0, // Grib2 category number, equals to --fc 1
            parameter: 218, // Grib2 parameter number, equals to --fp 7
            surfaceType: 1, // Grib2 surface type, equals to --fs 103
            surfaceValue: 0, // Grib2 surface value, equals to --fv 10
        }),
        getGrib(gribFilePath, { //TEMP
            scriptPath: 'grib2json-0.8.0-SNAPSHOT/bin/grib2json',
            names: true, // (default false): Return descriptive names too
            data: true, // (default false): Return data, not just headers
            category: 0, // Grib2 category number, equals to --fc 1
            parameter: 0, // Grib2 parameter number, equals to --fp 7
            surfaceType: 1, // Grib2 surface type, equals to --fs 103
            surfaceValue: 0, // Grib2 surface value, equals to --fv 10
        })
    ]).then(([landGrib, tempGrib]) => {
        const layers = [{
            grib: tempGrib[0],
            getPixel: function getPixel(value, lon, lat, values, x, y) {
                value -= 272.15;

                let r = 0,
                    g = 0,
                    b = 0;

                if (value < 0) {
                    r = 0;
                    g = 0;
                    b = 100;
                } else if (value <= 20) {
                    r = 97;
                    g = 170;
                    b = 134;
                } else if (value <= 30) {
                    r = 223;
                    g = 165;
                    b = 64;
                } else {
                    r = 207;
                    g = 90;
                    b = 76;
                }
                return [r, g, b, 255];
            }
        }, {
            grib: landGrib[0],
            getPixel: function getPixel(value, lon, lat, values, x, y) {
                let r = 0,
                    g = 0,
                    b = 0,
                    a = 0;

                if (value === 0) {
                    r = 67;
                    g = 165;
                    b = 222;
                    a = 255;
                } else {
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
        {
            grib: tempGrib[0],
            custom: function custom(image, data) {
                return (<any>Jimp).loadFont(Jimp.FONT_SANS_8_WHITE).then(function (font) {
                    const density = 30;
                    [...Array(density)]
                        .map((_, xI) => [...Array(density)]
                            .forEach((_, yI) => {
                                const xLength = image.bitmap.width;
                                const yLength = image.bitmap.height;
                                const xMult = xLength / density;
                                const yMult = yLength / density;
                                const columns = data.slice(Math.floor(xI * xMult), Math.ceil((xI + 1) * xMult));
                                const rows = columns.map(col => col.slice(Math.floor(yI * yMult), Math.ceil((yI + 1) * yMult)));
                                const values = flatten(rows).map(({
                                    value
                                }) => value - 272.15);
                                const avgValue = values.reduce((acc, value) => value + acc, 0) / values.length;

                                const xCellSize = image.bitmap.width / density;
                                const xPos = xCellSize * xI + (xCellSize / 3);

                                const yCellSize = image.bitmap.height / density;
                                const yPos = yCellSize * yI + (yCellSize / 3);

                                image.print(font, xPos, yPos, `${Math.floor(avgValue)}`, xCellSize); // print a message on an image with text wrapped at width
                            }))
                });
            }
        }
        ];

        return makeMap(layers, bbox);
    });
}

export default makeTemperatureMap;