import * as path from 'path';
import { makeMap } from '../';
import grib2json from 'grib2json';
import * as Jimp from 'jimp';

const worldBBox = <any>[-180, 90, 180, -90];
const grib2jsonPath = path.join(__dirname, '../grib2json-0.8.0-SNAPSHOT/bin/grib2json');

grib2json('./gfs.t06z.pgrb2.0p25.f000', { // LAND
    scriptPath: grib2jsonPath,
    names: true,
    data: true,
    category: 0,
    parameter: 218,
    surfaceType: 1,
    surfaceValue: 0,
}, function (err, landGrib) {
    if (err) return console.error(err);
    else {
        const landLayer = <any>{
            grib: landGrib[0],
            getPixel: (value) => {
                let red = 0,
                    green = 0,
                    blue = 0,
                    alpha = 255;

                if (value === 0) { // Sea
                    red = 203;
                    green = 223;
                    blue = 218;
                    alpha = 255;
                }

                return [red, green, blue, alpha];
            }
        };

        makeMap([landLayer], worldBBox)
            .then((img: Jimp) => {
                img.write('./out.png');
                console.info('Written to file [./out.png]')
            })
            .catch(err => console.error(err));
    }
});