import * as Jimp from 'jimp';
export declare function makeMap(layers: Layer[], bbox: BBox, opts?: MakeLayerOpts): Promise<{}>;
export declare function getGrib(gribFilePath: any, opts: any): Promise<{}>;
export declare function flatten(arrArr: any): any;
export declare type BBox = [number, number, number, number];
export declare type Pixel = [number, number, number, number];
export declare type Grib = {
    header: any;
    data: number[];
};
export declare type Layer = PixelLayer | CustomLayer;
export declare type PixelLayer = {
    grib: Grib;
    getPixel: (value: number, lon: number, lat: number, pixelValues: PixelValues, valueX: number, valueY: number) => Pixel;
};
export declare type CustomLayer = {
    grib: Grib;
    custom: (image: Jimp, pixelValues: PixelValues) => Promise<Jimp>;
};
export declare type MakeLayerOpts = {
    width: number | void;
    height: number | void;
    sizeMult: number | void;
};
export declare type PixelData = {
    value: number;
    index: number;
    lon: number;
    lat: number;
};
export declare type PixelValues = PixelData[][];
