# Node GFS GRIB Renderer

This project is a thin wrapper around [Jimp](https://github.com/oliver-moran/jimp/) and [grib2json](https://github.com/cambecc/grib2json) which simplifies writing GRIB visualisations in pure JS.

There's not much practical use for this, but it's a nice and visual way to get into GRIB processing.

![Example Image Output](./example.png)

## Speed
Because all of the maths and image manipulation happens in JavaScript land, this is not particularly fast. **Jimp** is by design JavaScript only (*ahem* slow). This does however mean the image generation could be done in the browser.

## Interesting Parts
GRIBs are hard, I made this as a way of better understanding how GRIB visualisation tools work and why they are the way they are.

If you're learning about GRIB visualisation, I'd recommend you look at these parts of code: 
```typescript
const newXCoord = ((xCoord + 180) % 360) - 180; 
```
GFS Grib files' Latitudes by default start where we mere mortals might expect to be the center of the map. It's necessary to wrap our co-ordinates if we're to render a normal looking map.

## Usage
```typescript
import { makeMap, getGrib } from 'grib-renderer';

const worldBBox = [-180, 90, 180, -90];

getGrib(gribFilePath, { // LAND
    scriptPath: './gribfile.grib2',
    names: true,
    data: true,
    category: 0,
    parameter: 218,
    surfaceType: 1,
    surfaceValue: 0,
})
    .then(landGrib => {
        const landLayer = {
            grib:landGrib,
            getPixel:(value) => {
                const red = 203;
                const green = 223;
                const blue = 218;
                const alpha = 255;

                return [red, green, blue, alpha];
            }
        };

        return makeMap([landLayer], worldBBox);
    })
    .then((img: Jimp) => {
        img.write('./out.png');
        console.info('Written to file [./out.png]')
    })
    .catch(err => console.error(err));

```

## Example
The example in [`example/example.ts`]() was used to generate the image above ([example.png](./example.png)).
It defines a function called `makeTemperatureMap` which loads two separate parameters from the same GRIB file. Once the files are loaded, 3 layers are defined and passed into `makeMap`.

You can execute the native TypeScript example using [`ts-node`]():
```bash
> ts-node ./example/example.ts
```

## Dependencies
- grib2json (https://github.com/cambecc/grib2json)
- Valid GFS GRIB file
- NodeJS

```bash
> wget GRIB2JSON_SNAPSHOT
> wget GFSGRIB FILE or gfsscraper
> npm i
```

## Building
```bash
> tsc # TypesSript Compiler - you may need to install this
```

## License
[MIT](./LICENSE)
