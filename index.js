const {
    makeMap,
    getGrib
} = require('./util');

const bbox = [-34, 44, 54, -45];

Promise.all([
    getGrib('./gfs.t06z.pgrb2.0p25.f038', { //LAND
        scriptPath: 'grib2json-0.8.0-SNAPSHOT/bin/grib2json',
        names: true, // (default false): Return descriptive names too
        data: true, // (default false): Return data, not just headers
        category: 0, // Grib2 category number, equals to --fc 1
        parameter: 218, // Grib2 parameter number, equals to --fp 7
        surfaceType: 1, // Grib2 surface type, equals to --fs 103
        surfaceValue: 0, // Grib2 surface value, equals to --fv 10
    }),
    getGrib('./gfs.t06z.pgrb2.0p25.f038', { //TEMP
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
        grib: landGrib[0],
        getPixel: function getPixel(value, lon, lat) {
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

            }

            return [r, g, b, a];
        }
    }, {
        grib: tempGrib[0],
        getPixel: function getPixel(value, lon, lat) {
            value -= 272.15;

            let r = 0,
                g = 0,
                b = 0;

            if (value < 0) {
                b = 100;
                r = 0;
                g = 0;
            } else if (value < 20) {
                b = 100;
                r = 100;
                g = 0;
            } else if (value < 30) {
                b = 100;
                r = 0;
                g = 100;
            } else {
                b = 0;
                r = 200;
                g = 0;
            }
            return [r, g, b, 50];
        }
    }];


    makeMap(layers, bbox)
        .then(image => {
            image.write('./tmp.' + image.getExtension());
        })
        .catch(err => {
            console.error(err);
        });

});