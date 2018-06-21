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
            index: index
        };
    });
    return keyedValues;
}

function getValuesForBBox(coordinateData, bbox) {
    const [xMin, yMax, xMax, yMin] = bbox;
    const slicedValues = [];
    Object.keys(coordinateData)
        .map(x => Number(x))
        .filter(x => x >= topLeft[0] && x <= bottomRight[0])
        .sort((a, b) => a == b ? 0 : a > b ? 1 : -1)
        .forEach((xKey, index) => {
            slicedValues[index] = slicedValues[index] || [];
            Object.keys(coordinateData[xKey])
                .map(y => Number(y))
                .filter(y => y <= topLeft[1] && y >= bottomRight[1])
                .sort((a, b) => a == b ? 0 : a < b ? 1 : -1)
                .forEach((yKey) => slicedValues[index].push(coordinateData[xKey][yKey].value));
        });
    return slicedValues;
}

function makeLayer(layer, bbox) {
    return new Promise((resolve, reject) => {
        const grib = layer.grib;
        const header = grib.header;
        const data = grib.data;

        const coordinateData = keyDataByCoordinates(header, data);

        const pixelValues = getValuesForBBox(coordinateData, bbox);

        new Jimp(pixelValues.length, pixelValues[0].length, function (err, image) {
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                // var red = this.bitmap.data[idx + 0];
                // var green = this.bitmap.data[idx + 1];
                // var blue = this.bitmap.data[idx + 2];
                // var alpha = this.bitmap.data[idx + 3];

                const gribValue = pixelValues[x][y];
                const [r, g, b, a] = layer.getPixel(gribValue);
                this.bitmap.data[idx + 0] = r;
                this.bitmap.data[idx + 1] = g;
                this.bitmap.data[idx + 2] = b;
                this.bitmap.data[idx + 3] = a;


                if (x == image.bitmap.width - 1 &&
                    y == image.bitmap.height - 1) {
                    resolve(image);
                }
            });
        });
    });
}


function makeMap(layers, bbox) {
    return Promise.all(
            layers.sort((a, b) => a.order > b.order ? 1 : -1)
            .map(layer => makeLayer(layer, bbox))
        )
        .then((layers) => {
            const [largestX, largestY] = layers.reduce(([largestX, largestY], image) => {
                return [
                    Math.max(largestX, image.bitmap.width),
                    Math.max(largestY, image.bitmap.height)
                ];
            });

            const outputImage = new Jimp(largestX, largestY);
            layers.forEach((layer) => {
                layer.scaleToFit(largestX, largestY);
                outputImage.composite(layer, 0, 0)
            });
            return outputImage;
        });
}



module.exports = {
    makeMap: makeMap
};