import * as Jimp from 'jimp';

function keyDataByCoordinates(header, data) { // TODO: consider only storing coordinates within BBOX
    const keyedValues = {};
    data.forEach((val, index) => {
        const row = Math.floor(index / header.nx);
        const xCoord = header.lo1 + (header.dx * (index % header.nx))
        const yCoord = header.la1 - (row * header.dy);

        const newXCoord = ((xCoord + 180) % 360) - 180; // Allow for funny 0-360 vs -180-180 conversion

        keyedValues[newXCoord] = keyedValues[newXCoord] || {};
        keyedValues[newXCoord][yCoord] = {
            value: val,
            index: index,
            lon: newXCoord,
            lat: yCoord
        };
    });
    return keyedValues;
}

function getValuesForBBox(coordinateData: CoordinateData, bbox: BBox): PixelValues {
    const [xMin, yMax, xMax, yMin] = bbox;
    const slicedValues: PixelValues = [];
    Object.keys(coordinateData)
        .map(x => Number(x))
        .filter(x => x >= xMin && x <= xMax)
        .sort((a, b) => a == b ? 0 : a > b ? 1 : -1)
        .forEach((xKey, index) => {
            slicedValues[index] = slicedValues[index] || [];
            Object.keys(coordinateData[xKey])
                .map(y => Number(y))
                .filter(y => y <= yMax && y >= yMin)
                .sort((a, b) => a == b ? 0 : a < b ? 1 : -1)
                .forEach((yKey) => slicedValues[index].push(coordinateData[xKey][yKey]));
        });
    return slicedValues;
}

function makeLayer(layer: Layer, bbox: BBox, {
    width,
    height,
    sizeMult
}: MakeLayerOpts = <MakeLayerOpts>{}): Promise<Jimp> {
    return new Promise((resolve, reject) => {
        const grib = layer.grib;
        const header = grib.header;
        const data = grib.data;

        const coordinateData = keyDataByCoordinates(header, data);

        const pixelValues = getValuesForBBox(coordinateData, bbox);

        const actualWidth = width || pixelValues.length * (sizeMult || 1);
        const actualHeight = height || pixelValues[0].length * (sizeMult || 1);
        new (<any>Jimp)(actualWidth, actualHeight,
            function (err, image: Jimp) {
                if (err) return reject(err);
                if (layer['custom']) {
                    layer['custom'](image, pixelValues)
                        .then(() => resolve(image));
                } else {
                    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                        // var red = this.bitmap.data[idx + 0];
                        // var green = this.bitmap.data[idx + 1];
                        // var blue = this.bitmap.data[idx + 2];
                        // var alpha = this.bitmap.data[idx + 3];

                        const valueX = Math.min(x * pixelValues.length / image.bitmap.width, pixelValues.length - 1);
                        const valueY = Math.min(y * pixelValues[0].length / image.bitmap.height, pixelValues[0].length - 1);

                        const {
                            value,
                            lon,
                            lat
                        } = pixelValues[Math.floor(valueX)][Math.floor(valueY)];

                        const [r, g, b, a] = layer['getPixel'](value, lon, lat, pixelValues, valueX, valueY);
                        this.bitmap.data[idx + 0] = r;
                        this.bitmap.data[idx + 1] = g;
                        this.bitmap.data[idx + 2] = b;
                        this.bitmap.data[idx + 3] = a;


                        if (x == image.bitmap.width - 1 &&
                            y == image.bitmap.height - 1) {
                            resolve(image);
                        }
                    });
                }
            });
    });
}

export function makeMap(layers: Layer[], bbox: BBox, opts: MakeLayerOpts = <MakeLayerOpts>{}) {
    return Promise.all<Jimp>(
        layers.map(layer => makeLayer(layer, bbox, opts))
    )
        .then((imageLayers) => {
            const largestXY = imageLayers.reduce((acc, image) => {
                return [
                    Math.max(acc[0], image.bitmap.width),
                    Math.max(acc[1], image.bitmap.height)
                ];
            }, [0, 0]);

            const [width, height] = [opts.width || largestXY[0] * (opts.sizeMult || 1), opts.height || largestXY[1] * (opts.sizeMult || 1)];
            return new Promise((resolve, reject) => {
                new (<any>Jimp)(width, height, function (err: Error, outputImage: Jimp) {
                    if (err) return reject(err);
                    imageLayers.forEach((layer) => {
                        layer.scaleToFit(width, height);
                        outputImage.composite(layer, 0, 0);
                    });
                    resolve(outputImage);
                });
            });
        });
}






/* Types */
export type BBox = [number, number, number, number];
export type Pixel = [number, number, number, number];
export type Grib = {
    header: any,
    data: number[]
}
export type Layer = PixelLayer | CustomLayer;
export type PixelLayer = {
    grib: Grib,
    getPixel: (value: number, lon: number, lat: number, pixelValues: PixelValues, valueX: number, valueY: number) => Pixel
};
export type CustomLayer = {
    grib: Grib,
    custom: (image: Jimp, pixelValues: PixelValues) => Promise<Jimp>
}
export type MakeLayerOpts = {
    width: number | void,
    height: number | void,
    sizeMult: number | void
}
export type PixelData = {
    value: number,
    index: number,
    lon: number,
    lat: number
}
export type PixelValues = PixelData[][];

type CoordinateData = {
    [x: number]: {
        [y: number]: PixelData
    }
}