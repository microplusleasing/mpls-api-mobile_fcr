const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
// const formidable = require('formidable');
var multiparty = require('multiparty');
const { result } = require('lodash');
const fs = require('fs');
var util = require('util');
const _util = require('./_selfutil');
const e = require('express');


async function attachimagedeliver(req, res, next) {
    let connection;
    try {

        let fileData
        let formData
        // const form = formidable({ multiples: true })
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
                // res.writeHead(200, { 'content-type': 'text/plain' });
                // res.write('received upload:\n\n');
                // res.end(util.inspect({fields: fields, files: files}));
            })
            return
        })

        const quotationid = formData.quotationid[0]
        const dealername = formData.dealername[0]


        // ==== build object or blob image here before send it to create ===

        const firstImage = fileData.firstImage ? fileData.firstImage : null
        const secondImage = fileData.secondImage ? fileData.secondImage : null
        const thirdImage = fileData.thirdImage ? fileData.thirdImage : null
        const forthImage = fileData.forthImage ? fileData.forthImage : null
        const dealerSign = fileData.dealerSign ? fileData.dealerSign : null


        // === reject when dealer sign null === 
        if (!dealerSign) {
            return res.status(201).send({
                status: 201,
                message: `Signature image not found`,
                data: []
            })
        }


        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        var imageData = [];
        const firstImageBuffer = firstImage ? imagetobuffer(firstImage) : null
        const secondImageBuffer = secondImage ? imagetobuffer(secondImage) : null
        const thirdImageBuffer = thirdImage ? imagetobuffer(thirdImage) : null
        const forthImageBuffer = forthImage ? imagetobuffer(forthImage) : null
        const dealerSignBuffer = dealerSign ? imagetobuffer(dealerSign) : null

        createImageInfo = (fileinfo, code) => {
            let image = {}
            const filename = fileinfo[0].fieldName
            const filetype = fileinfo[0].headers['content-type']
            const readfileimage = fs.readFileSync(fileinfo[0].path)
            image.filename = filename
            image.filetype = filetype
            // image.orifilename = orifilename
            image.keyid = uuidv4()
            image.quokeyid = quotationid
            image.status = 0
            image.filedata = readfileimage
            image.code = code
            // console.log(`this is each image : ${JSON.stringify(image)}`)
            imageData.push(image)
        }

        if (firstImageBuffer) await createImageInfo(firstImage, '15');
        if (secondImageBuffer) await createImageInfo(secondImage, '15');
        if (thirdImageBuffer) await createImageInfo(thirdImage, '15');
        if (forthImageBuffer) await createImageInfo(forthImage, '15');
        if (dealerSignBuffer) await createImageInfo(dealerSign, '14');


        connection = await oracledb.getConnection(
            config.database
        )
        // === check duplicate reference record ===
        const resultCheckDup = await connection.execute(`
            select (IMGF_QUO_APP_KEY_ID) as items FROM MPLS_IMAGE_FILE
            WHERE IMGF_QUO_APP_KEY_ID = :quotationid
            AND IMAGE_CODE = '15'
        `, {
            quotationid: quotationid
        })

        if (resultCheckDup.rows.length == 0) {
            // === valid condition === 
            try {

                const sql = `
                    INSERT INTO MPLS_IMAGE_FILE (
                    IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                    IMAGE_CODE, IMAGE_FILE, STATUS)
                    VALUES (:quokeyid, :keyid, :filename, :filetype, 
                        :code, :filedata, :status)
                    `

                const binds = imageData;

                const options = {
                    bindDefs: {
                        quokeyid: { type: oracledb.STRING, maxSize: 50 },
                        keyid: { type: oracledb.STRING, maxSize: 50 },
                        filename: { type: oracledb.STRING, maxSize: 200 },
                        filetype: { type: oracledb.STRING, maxSize: 200 },
                        code: { type: oracledb.STRING, maxSize: 4 },
                        filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                        status: { type: oracledb.NUMBER }
                    }
                }

                const resultCreateRefAttachDeliver = await connection.executeMany(sql, binds, options)
                console.log(`sussecc create deliver attach record : ${resultCreateRefAttachDeliver.rowsAffected}`)

                // === check count of image insert (now 4 infuture should be 5 cause add one more signature image) ====
                // === chage to 2 image atlease (sig image and 1 photo) (02/06/2022) ==== 
                if (resultCreateRefAttachDeliver.rowsAffected >= 2) {
                    try {
                        // === commit all record if all created record success ====
                        const commitall = await connection.commit();
                        try {
                            commitall
                        } catch {
                            console.err(err.message)
                            res.send(404).send(err.message)
                        }
                        console.log(`try last execute`)
                        // ==== stamp dealer signature owner to quotation
                        const resultUpdateQuotation = await connection.execute(`
                        UPDATE MPLS_QUOTATION SET DEALER_SIGNATURE_OWNER = :dealername
                        WHERE QUO_KEY_APP_ID = :quotationid
                    `, {
                            dealername: dealername,
                            quotationid: quotationid
                        },{
                            autoCommit: true
                        })

                        console.log(`result Update Quotaion : ${resultUpdateQuotation}`)
                        console.log(`result Update Quotaion : ${JSON.stringify(resultUpdateQuotation)}`)

                        console.log(`commit success`);
                        // == success create deliver approve === 
                        return res.status(200).send({
                            status: 200,
                            messgae: 'success created deliver approve',
                            data: []
                        })


                    } catch (e) {
                        console.log(`catch last execute`)
                        return res.status(201).send({
                            status: 201,
                            message: `Fail to add dealer owner to quotation`,
                            data: []
                        })
                    }


                } else {
                    // ==== missing some image ====
                    console.log(`wow`)
                    return res.status(201).send({
                        status: 201,
                        message: 'missing image deliver approve',
                        data: []
                    })
                }
            } catch (e) {
                console.log(`Fail to INSERT deliver approve to Database`)
                return res.status(201).send({
                    status: 201,
                    message: `Fail to INSERT deliver approve to Database : ${e}`,
                    data: []
                })
            }
        } else {
            return res.status(201).send({
                status: 201,
                message: 'Duplicate Reference deliver image',
                data: []
            })
        }

    } catch (e) {
        console.log(`error create reference deliver image attach : ${e}`)
        console.error(e);
        // return next(e)
        return res.status(201).send({
            status: 201,
            message: `missing some args : ${e}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return next(e);
            }
        }
    }
}

async function attachimagedeliverandconsent(req, res, next) {
    let connection;
    try {

        let fileData
        let formData
        // const form = formidable({ multiples: true })
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
                // res.writeHead(200, { 'content-type': 'text/plain' });
                // res.write('received upload:\n\n');
                // res.end(util.inspect({fields: fields, files: files}));
            })
            return
        })

        const quotationid = formData.quotationid[0]
        const dealername = formData.dealername[0]

        // === new loyalty consent add value (19/08/2022) ===
        const loyaltyformdata = JSON.parse(formData.loyaltyitem)
        let {
            is_check_sale_sheet_explain,
            is_check_product_detail,
            is_check_payment_rule,
            is_check_contract_explain,
            is_check_total_loss_explain,
            is_check_total_loss_company,
            lalon,
            latitude,
            londtiude,
            // is_check_life_insurance,
            // is_check_l_insur_detail,
            // is_check_l_insur_plan,
            // is_check_l_insur_company,
            // is_check_l_insur_refund,
            // is_check_l_insur_cancle_d

        } = loyaltyformdata


        // ==== build object or blob image here before send it to create ===

        const firstImage = fileData.firstImage ? fileData.firstImage : null
        const secondImage = fileData.secondImage ? fileData.secondImage : null
        const thirdImage = fileData.thirdImage ? fileData.thirdImage : null
        const forthImage = fileData.forthImage ? fileData.forthImage : null
        const dealerSign = fileData.dealerSign ? fileData.dealerSign : null


        // === reject when dealer sign null === 
        if (!dealerSign) {
            return res.status(201).send({
                status: 201,
                message: `Signature image not found`,
                data: []
            })
        }


        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        var imageData = [];
        const firstImageBuffer = firstImage ? imagetobuffer(firstImage) : null
        const secondImageBuffer = secondImage ? imagetobuffer(secondImage) : null
        const thirdImageBuffer = thirdImage ? imagetobuffer(thirdImage) : null
        const forthImageBuffer = forthImage ? imagetobuffer(forthImage) : null
        const dealerSignBuffer = dealerSign ? imagetobuffer(dealerSign) : null

        createImageInfo = (fileinfo, code) => {
            let image = {}
            const filename = fileinfo[0].fieldName
            const filetype = fileinfo[0].headers['content-type']
            const readfileimage = fs.readFileSync(fileinfo[0].path)
            image.filename = filename
            image.filetype = filetype
            // image.orifilename = orifilename
            image.keyid = uuidv4()
            image.quokeyid = quotationid
            image.status = 0
            image.filedata = readfileimage
            image.code = code
            // console.log(`this is each image : ${JSON.stringify(image)}`)
            imageData.push(image)
        }

        if (firstImageBuffer) await createImageInfo(firstImage, '15');
        if (secondImageBuffer) await createImageInfo(secondImage, '15');
        if (thirdImageBuffer) await createImageInfo(thirdImage, '15');
        if (forthImageBuffer) await createImageInfo(forthImage, '15');
        if (dealerSignBuffer) await createImageInfo(dealerSign, '14');


        connection = await oracledb.getConnection(
            config.database
        )
        // === check duplicate reference record ===
        const resultCheckDup = await connection.execute(`
            select (IMGF_QUO_APP_KEY_ID) as items FROM MPLS_IMAGE_FILE
            WHERE IMGF_QUO_APP_KEY_ID = :quotationid
            AND IMAGE_CODE = '15'
        `, {
            quotationid: quotationid
        })

        if (resultCheckDup.rows.length == 0) {
            // === valid condition === 
            try {

                const sql = `
                    INSERT INTO MPLS_IMAGE_FILE (
                    IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                    IMAGE_CODE, IMAGE_FILE, STATUS)
                    VALUES (:quokeyid, :keyid, :filename, :filetype, 
                        :code, :filedata, :status)
                    `

                const binds = imageData;

                const options = {
                    bindDefs: {
                        quokeyid: { type: oracledb.STRING, maxSize: 50 },
                        keyid: { type: oracledb.STRING, maxSize: 50 },
                        filename: { type: oracledb.STRING, maxSize: 200 },
                        filetype: { type: oracledb.STRING, maxSize: 200 },
                        code: { type: oracledb.STRING, maxSize: 4 },
                        filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                        status: { type: oracledb.NUMBER }
                    }
                }

                const resultCreateRefAttachDeliver = await connection.executeMany(sql, binds, options)
                console.log(`sussecc create deliver attach record : ${resultCreateRefAttachDeliver.rowsAffected}`)

                // === save loyalty consent value (19/08/2022) ========

                try {

                    // === update consent loyalty === 
                    let sqlloyalty;
                    let bindparamloyalty;
                        sqlloyalty = `
                        UPDATE MPLS_CONSENT
                        SET IS_CHECK_SALE_SHEET_EXPLAIN = :IS_CHECK_SALE_SHEET_EXPLAIN,
                            IS_CHECK_PRODUCT_DETAIL = :IS_CHECK_PRODUCT_DETAIL,
                            IS_CHECK_PAYMENT_RULE = :IS_CHECK_PAYMENT_RULE,
                            IS_CHECK_CONTRACT_EXPLAIN = :IS_CHECK_CONTRACT_EXPLAIN,
                            IS_CHECK_TOTAL_LOSS_EXPLAIN = :IS_CHECK_TOTAL_LOSS_EXPLAIN,
                            IS_CHECK_TOTAL_LOSS_COMPANY = :IS_CHECK_TOTAL_LOSS_COMPANY
                        WHERE CONS_QUO_KEY_APP_ID = :quotationid
                        `

                        bindparamloyalty = {
                            IS_CHECK_SALE_SHEET_EXPLAIN: is_check_sale_sheet_explain,
                            IS_CHECK_PRODUCT_DETAIL: is_check_product_detail,
                            IS_CHECK_PAYMENT_RULE: is_check_payment_rule,
                            IS_CHECK_CONTRACT_EXPLAIN: is_check_contract_explain,
                            IS_CHECK_TOTAL_LOSS_EXPLAIN: is_check_total_loss_explain,
                            IS_CHECK_TOTAL_LOSS_COMPANY: is_check_total_loss_company,
                            quotationid: quotationid
                        }
                    const update_loyalty_consent = await connection.execute(sqlloyalty, bindparamloyalty, {outFormat: oracledb.OBJECT})

                    console.log(`sussecc update loyalty consent : ${update_loyalty_consent.rowsAffected}`)

                } catch (e) {
                    console.error(e)
                    return res.status(400).send({
                        status: 400,
                        message: `ไม่สามารถอัพเดทข้อมูล loyalty consent ได้`
                    })
                }
                // ====================================================

                // === save la lon place value (19/08/2022) ========

                try {

                    // === update la lon living place  === 
                    let sqllalon;
                    let bindparamlalon;
                        sqllalon = `
                            UPDATE MPLS_LIVING_PLACE
                                SET LALON = :lalon,
                                LATITUDE = :latitude,
                                LONDTIUDE = :londtiude

                                WHERE LIV_QUO_KEY_APP_ID = :quotationid
                        `

                        bindparamlalon = {
                            lalon: lalon,
                            latitude: latitude,
                            londtiude: londtiude,
                            quotationid: quotationid
                        }
                    const update_lalon_consent = await connection.execute(sqllalon, bindparamlalon, {outFormat: oracledb.OBJECT})

                    console.log(`sussecc update lalon consent : ${update_lalon_consent.rowsAffected}`)

                } catch (e) {
                    console.error(e)
                    return res.status(400).send({
                        status: 400,
                        message: `ไม่สามารถอัพเดทข้อมูล lalon living place ได้`
                    })
                }
                // ====================================================

                // === check count of image insert (now 4 infuture should be 5 cause add one more signature image) ====
                // === chage to 2 image atlease (sig image and 1 photo) (02/06/2022) ==== 
                if (resultCreateRefAttachDeliver.rowsAffected >= 2) {
                    try {
                        // === commit all record if all created record success ====
                        const commitall = await connection.commit();
                        try {
                            commitall
                        } catch {
                            console.err(err.message)
                            res.send(404).send(err.message)
                        }
                        console.log(`try last execute`)
                        // ==== stamp dealer signature owner to quotation
                        const resultUpdateQuotation = await connection.execute(`
                        UPDATE MPLS_QUOTATION SET DEALER_SIGNATURE_OWNER = :dealername
                        WHERE QUO_KEY_APP_ID = :quotationid
                    `, {
                            dealername: dealername,
                            quotationid: quotationid
                        },{
                            autoCommit: true
                        })

                        console.log(`result Update Quotaion : ${resultUpdateQuotation}`)
                        console.log(`result Update Quotaion : ${JSON.stringify(resultUpdateQuotation)}`)

                        console.log(`commit success`);
                        // == success create deliver approve === 
                        return res.status(200).send({
                            status: 200,
                            messgae: 'success created deliver approve',
                            data: []
                        })


                    } catch (e) {
                        console.log(`catch last execute`)
                        return res.status(201).send({
                            status: 201,
                            message: `Fail to add dealer owner to quotation`,
                            data: []
                        })
                    }


                } else {
                    // ==== missing some image ====
                    return res.status(201).send({
                        status: 201,
                        message: 'missing image deliver approve',
                        data: []
                    })
                }
            } catch (e) {
                console.log(`Fail to INSERT deliver approve to Database`)
                return res.status(201).send({
                    status: 201,
                    message: `Fail to INSERT deliver approve to Database : ${e}`,
                    data: []
                })
            }
        } else {
            return res.status(201).send({
                status: 201,
                message: 'Duplicate Reference deliver image',
                data: []
            })
        }

    } catch (e) {
        console.log(`error create reference deliver image attach : ${e}`)
        console.error(e);
        // return next(e)
        return res.status(201).send({
            status: 201,
            message: `missing some args : ${e}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return next(e);
            }
        }
    }
}

async function getattachimagedeliverbyid(req, res, next) {
    let connection;

    try {
        const id = req.params.id

        if (!id) {
            return res.status(201).send({
                status: 201,
                message: 'No id insert for criteria',
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB]
        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT IMAGE_NAME, IMAGE_TYPE, IMAGE_CODE, IMAGE_FILE
            FROM MPLS_IMAGE_FILE 
            WHERE IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
            AND IMAGE_CODE IN ( '14','15')
        `, {
            IMGF_QUO_APP_KEY_ID: id
        }, {
            outFormat: oracledb.OBJECT
        })

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: `No image File Found`,
                data: []
            })
        } else {
            try {
                console.log(`Suscess get image record`)
                let resData = results.rows

                const lowerResData = tolowerService.arrayobjtolower(resData)

                let returnData = new Object
                returnData.data = lowerResData
                returnData.status = 200
                returnData.message = 'success'

                let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                    result[key.toLowerCase()] = val;
                });

                return res.status(200).json(returnDatalowerCase)

            } catch (e) {
                console.log(`Error during build object response data.`)
                return res.status(201).send({
                    status: 201,
                    message: '`Error during build object response data.',
                    data: []
                })
            }
        }

    } catch (e) {
        console.error(e);
        return next(e)
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return next(e);
            }
        }
    }

}

module.exports.attachimagedeliver = attachimagedeliver
module.exports.getattachimagedeliverbyid = getattachimagedeliverbyid
module.exports.attachimagedeliverandconsent = attachimagedeliverandconsent