const tolowerService = require('./tolowerkey')
const moment = require('moment');
const path = require('path');

var multiparty = require('multiparty');

// const sharp = require('sharp'); // uninstall

// import imagemin from 'imagemin';
// import imageminJpegtran from 'imagemin-jpegtran';
// import imageminPngquant from 'imagemin-pngquant';


// const imagemin = require('imagemin');
// const imageminJpegtran = require('imagemin-jpegtran');
// const imageminPngquant = require('imagemin-pngquant');



async function compressimage(req, res, next) {

    try {

        console.log(`trigger this function when click compress image !!!`)
        let fileData
        let formData
        const form = new multiparty.Form()
        await new Promise(function (resolve, reject) {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err)
                    return
                }
                formData = fields
                fileData = files
                resolve()
            })
            return
        })

        const imageselect = fileData.image_id ? fileData.image_id : null

        console.log(`this is image ${JSON.stringify(imageselect)}`)


        return res.status(200).send({
            status: 200,
            message: `success compress image !`,
            data: []
        })


    } catch (e) {
        console.error(e);
        return res.status(400).send({
            statsu: 400,
            message: `Fail to compress image : ${e}`
        })
    }
}

// async function generateCoverImages(imageDataArray) {
//     try {
//         const processedImages = [];

//         // Loop through the array of binary image data
//         for (const imageData of imageDataArray) {
//             // Create a Sharp pipeline for each image
//             const pipeline = sharp(imageData);

//             // Define the cover image size and options
//             const coverSize = { width: 300, height: 200, fit: 'cover' };

//             // Generate the cover image as a Buffer
//             const processedImageBuffer = await pipeline.resize(coverSize).toBuffer();

//             // Store the processed image as binary data
//             processedImages.push(processedImageBuffer);
//         }

//         console.log('Cover images generated successfully.');
//         return processedImages;
//     } catch (error) {
//         console.error('Error generating cover images:', error);
//         throw error; // Rethrow the error to handle it at the caller's level if needed
//     }
// }

module.exports.compressimage = compressimage
// module.exports.generateCoverImages = generateCoverImages