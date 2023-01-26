const tolowerService = require('./tolowerkey')
const moment = require('moment');
const path = require('path');

var multiparty = require('multiparty');

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

module.exports.compressimage = compressimage