const fs = require('fs');
const NetCDFReader = require('netcdfjs');

var file = './030.netcdf';

const data = fs.readFileSync(file);

var reader = new NetCDFReader(data);
reader.getDataVariable('wmoId');