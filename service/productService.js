const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
const { result } = require('lodash')

async function getmotocyclebrand(req, res, next) {

    let connection;
    try {
        connection = await oracledb.getConnection(
            config.database
        )

        const resultBrand = await connection.execute(`
            SELECT BRAND_CODE, BRAND_NAME FROM BTW.X_BRAND_P WHERE PRO_CODE='01'
       `, [], // no bind
            {
                outFormat: oracledb.OBJECT
            }
        )

        if (resultBrand.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `No Brand Data`
            })
        } else {
            // == set format to return Data ===
            let resData = resultBrand.rows
            if (resData == undefined) {
                return next(err)
            } else {
                const lowerResData = tolowerService.arrayobjtolower(resData)
                res.status(200).json(lowerResData)
            }
        }

    } catch (e) {
        return res.status(400).send({
            status: 400,
            message: `Error to get Motocycle Brand with message : ${e.message ?? 'No return message'}`
        })
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

async function getmotocyclemodel(req, res, next) {
    let connection;
    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const resultModel = await connection.execute(`
                SELECT B.BRAND_NAME, B.BRAND_CODE, P.MODEL_CODE,P.MODEL, P.PRICE,
                        P.ENGINE_NO, P.ENGINE_NO_RUNNING, P.CHASSIS_NO, P.CHASSIS_NO_RUNNING
                        FROM  BTW.X_MODEL_P  P,BTW.X_BRAND_P B
                        WHERE P.BRAND_CODE= B.BRAND_CODE
                        AND   P.PRO_CODE='01'
            `, [], // no bind 
            {
                outFormat: oracledb.OBJECT
            })

        if (resultModel.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `No Model Data`,
                data: []
            })
        } else {
            // == set format to return Data ===
            let resData = resultModel.rows
            if (resData == undefined) {
                return next(err)
            } else {
                const lowerResData = tolowerService.arrayobjtolower(resData)
                res.status(200).json(lowerResData)
            }
        }
    } catch (e) {
        return res.status(400).send({
            status: 400,
            message: `Error to get Motocycle Brand with message : ${e.message ?? 'No return message'}`
        })
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

module.exports.getbrand = getmotocyclebrand
module.exports.getmodel = getmotocyclemodel