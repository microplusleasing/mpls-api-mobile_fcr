const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const path = require('path');

async function getimagebyid(req, res, next) {
    // const { quotationid } = req.query
    let connection;
    const id = req.params.id

    try {
        console.log(`this is quotation id in path : ${id}`)
        if (!id) {
            return res.status(201).send({
                status: 201,
                message: 'No id insert for criteria',
                data: []
            })
        }
        console.log(`this is quotation id in path : ${id}`)
        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT IMAGE_NAME, IMAGE_TYPE, IMAGE_CODE, IMAGE_FILE 
            FROM MPLS_IMAGE_FILE
            WHERE ACTIVE_STATUS = 'Y'  
            AND IMAGE_CODE NOT IN '11'
            AND IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID  
        `, {
            IMGF_QUO_APP_KEY_ID: id
        },
            {
                outFormat: oracledb.OBJECT
            }
        )

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No Image File Found',
                data: []
            })
        } else {
            try {

                // console.log(results.rows)
                // const blob = results.rows[index][0];
                //     const imagetype = results.rows[index][2];
                //     console.log(`this is image type: ${imagetype}`)
                //     res.set('Content-Type', imagetype); //it can different, depends on the image]
                //     res.end(Buffer.from(blob, 'binary'));

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

                // let returnDatatolowerCase = _.transform(lowerResData, (result, value, key) => {
                //     result[key.toLowerCase()] = value;
                // })
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

async function getimagelistbyid(req, res, next) {
    let connection;
    const id = req.params.id
    try {
        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT IMAGE_CODE FROM MPLS_IMAGE_FILE 
            WHERE IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
        `, {
            IMGF_QUO_APP_KEY_ID: id
        },
            {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No record image Found',
                data: []
            })
        } else {
            try {
                const resData = results.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                return res.status(200).send({
                    status: 200,
                    message: 'success',
                    data: lowerResData
                })

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

async function getattachfile1(req, res, next) {
    let connection;
    let quotationid = req.params.id
    oracledb.fetchAsBuffer = [oracledb.BLOB];

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT CITIZENID_IMAGE FROM MPLS_ATTACH_FILE 
            WHERE APP_KEY_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            fetchInfo: { "B": { type: oracledb.BUFFER } }
        })
        if (results.rows.length === 0) {
            console.error("No results");
            return res.send([])
        }
        else {
            const blob = results.rows[0][0];
            res.set('Content-Type', 'image/jpeg'); //it can different, depends on the image]
            res.end(Buffer.from(blob, 'binary'));
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

async function getsignImgbyid(req, res, next) {
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
        select * from mpls_consent
        where cons_quo_key_app_id = :quotationid
        `, {
            quotationid: id
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

async function getDealerSignaturebyid(req, res, next) {
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
        select * from MPLS_IMAGE_FILE
        where IMGF_QUO_APP_KEY_ID = :quotationid
        and IMAGE_CODE = '14'
        `, {
            quotationid: id
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

module.exports.getimagebyid = getimagebyid
module.exports.getimagelistbyid = getimagelistbyid
module.exports.getattachfile1 = getattachfile1
module.exports.getsignImgbyid = getsignImgbyid
module.exports.getDealerSignaturebyid = getDealerSignaturebyid