const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')

async function getMaxLtv(req, res, next) {
    let connection;
    const { factory_price, bussi_code, pro_code, brand_code, model_code, dl_code } = req.query
    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        select TRUNC((:factory_price*BTW.GET_VALUE_NUM_MARKET_SETTING('001',:bussi_code,:pro_code,:brand_code,:model_code,:dl_code,SYSDATE))/100)
         maxltv from dual
        `, {
            factory_price: factory_price,
            bussi_code: bussi_code,
            pro_code: pro_code,
            brand_code: brand_code,
            model_code: model_code,
            dl_code: dl_code
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No Payment count',
                data: []
            })
        } else {
            const resData = results.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
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

async function getcoverageTotalloss(req, res, next) {
    let connection;
    const { p_insurance_code, p_max_ltv } = req.query
    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT BTW.GET_COVERAGE_COMPARE_MAX_LTV(:P_INSURANCE_CODE,:P_MAX_LTV) AS COVERAGE_TOTAL_LOSS FROM DUAL
        `, {
            P_INSURANCE_CODE: p_insurance_code,
            P_MAX_LTV: p_max_ltv
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: `can't get coverage total loss value`,
                data: []
            })
        } else {
            const resData = results.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
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

async function getpaymentValue(req, res, next) {
    let connection;
    const { net_finance, term, rate } = req.query
    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT CEIL(round(btw.pkg_installment.CAL_MONTHLY(NVL(:net_finance,0),NVL(TO_NUMBER(:term),0),
        NVL(TO_NUMBER(:rate),0)),2)) as value FROM DUAL
        `, {
            net_finance: net_finance,
            term: term,
            rate: rate
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No Payment value',
                data: []
            })
        } else {
            const resData = results.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            lowerResData.forEach(u => u.value *= 1)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
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

async function getagefrombirthdate(req, res, next) {
    let connection;
    try {

        const { birthdate } = req.query
        // console.log(`birthdate : ${birthdate}`)
        connection = await oracledb.getConnection(config.database)
        const resultage = await connection.execute(`
                SELECT to_number(to_char(SYSDATE ,'yyyy'))- to_number(to_char(BTW.BUDDHIST_TO_CHRIS_F(to_date(:birthdate, 'dd/mm/yyyy')),'yyyy')) age_year FROM DUAL
       `, {
            birthdate: birthdate
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultage.rows.length == 0) {
            return res.status(201).send({
                status: 200,
                message: 'No age return',
                data: []
            })
        } else {
            const resData = resultage.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            lowerResData.forEach(u => u.value *= 1)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
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

async function getoracleoutstand(req, res, next) {
    let connection;
    try {

        const { application_num } = req.query
        connection = await oracledb.getConnection(config.database)
        const resultost = await connection.execute(`
                SELECT TERM, MONTHLY, (TERM*MONTHLY) AS OUT_STAND FROM BTW.X_CUST_MAPPING_EXT
                WHERE APPLICATION_NUM = :APPLICATION_NUM
       `, {
                APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultost.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'No OUT STAND return',
                data: []
            })
        } else {
            const resData = resultost.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            lowerResData.forEach(u => u.value *= 1)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
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

module.exports.getMaxLtv = getMaxLtv
module.exports.getcoverageTotalloss = getcoverageTotalloss
module.exports.getpaymentValue = getpaymentValue
module.exports.getagefrombirthdate = getagefrombirthdate
module.exports.getoracleoutstand = getoracleoutstand
