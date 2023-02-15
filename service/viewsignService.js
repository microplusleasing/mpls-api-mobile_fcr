const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
var multiparty = require('multiparty');
const { result } = require('lodash');

async function getviewsignimage(req, res, next) {
    //  === it clone from  getsignImgbyid api (but change parameter type )===
    let connection;
    try {
        // const id = req.params.id
        const { quotationid } = req.query

        console.log(`req.query : ${JSON.stringify(req.query)}`)

        if (!quotationid) {
            return res.status(404).send({
                status: 404,
                message: 'No id insert for criteria',
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB]
        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
        select * from mpls_consent
        where cons_quo_key_app_id = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (results.rows.length == 0) {
            return res.status(404).send({
                status: 404,
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
                return res.status(400).send({
                    status: 400,
                    message: `Error during build object response data. ; \n message: ${e}`,
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

async function verifyviewsignimage(req, res, next) {
    let connection;
    try {
        
        let { quotationid , userid } = req.query

        console.log(`this is quotationid : ${quotationid}`)
        console.log(`this is userid : ${userid}`)
        

        if (quotationid == '' || quotationid == null || quotationid == undefined || quotationid == 'quotationid') {
            return res.status(400).send({
                status: 400,
                message: `mission parameter (quotationid)`,
                data: []
            })
        }

        if (userid == '' || userid == null || userid == undefined || userid == 'undefined') {
            return res.status(400).send({
                status: 400,
                message: `mission parameter (userid)`,
                data: []
            })
        }

        connection = await oracledb.getConnection(
            config.database
        )

        // update consent verify status and userid
        try {

            const updateverifystatus = await connection.execute(`
                UPDATE MPLS_CONSENT
                SET VERIFY_STATUS = 1,
                    VERIFY_DATETIME = SYSDATE,
                    VERIFY_BY = :userid
                WHERE CONS_QUO_KEY_APP_ID = :quotationid
            `, {
                userid: userid,
                quotationid: quotationid
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true
            })

            //  ==== suscess ======

            console.log(`update success with row affected : ${updateverifystatus.rowsAffected}`)
            if (updateverifystatus.rowsAffected == 1) {
                console.log(`trigger this`)
                return res.status(200).send({
                    status: 200,
                    message: `Update verify status success`,
                    data: []
                })
            } else {
                return res.status(400).send({
                    status: 400,
                    message: `ไม่สามารถอัพเดทสถานะการยืนยันลายเซ็นต์ได้`
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(400).send({
                status: 400,
                message: `ไม่สามารถอัพเดทสถานะการยืนยันลายเซ็นต์ได้`
            })
        }



    } catch (e) {
        console.error(e)
        return next(e)
    } finally {
        if (connection) {
            try {
                await connection.close()
            } catch (e) {
                console.error(e)
                return next(e)
            }
        }
    }
}

module.exports.getviewsignimage = getviewsignimage
module.exports.verifyviewsignimage = verifyviewsignimage