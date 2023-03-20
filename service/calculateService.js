const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const { outFormat } = require('oracledb');

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

async function getcoverageTotallossold(req, res, next) {
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

async function getcoverageTotalloss(req, res, next) {
    let connection;
    const reqData = req.query
    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT BTW.GET_COVERAGE_COMPARE_MAX_LTV(:INSURANCE_CODE,TRUNC((:FACTORY_PRICE*BTW.GET_VALUE_NUM_MARKET_SETTING('004',:BUSSI_CODE,'01',:BRAND_CODE,:MODEL_CODE,:DL_CODE,SYSDATE))/100)) AS COVERAGE_TOTAL_LOSS FROM DUAL
        `, {
            INSURANCE_CODE: reqData.insurance_code,
            FACTORY_PRICE: reqData.factory_price,
            BUSSI_CODE: reqData.bussi_code,
            BRAND_CODE: reqData.brand_code,
            MODEL_CODE: reqData.model_code,
            DL_CODE: reqData.dl_code
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

async function calculateage(req, res, next) {
    try {

        // function calculateAge(birthdateString) {

        const birthdate_str = req.body.birthdate

        const birthdate_date = moment(birthdate_str, 'DD/MM/YYYY').toDate();

        // console.log(`birthdate_date : ${birthdate_date}`)

        const today = new Date();
        let age = today.getFullYear() - birthdate_date.getFullYear();
        const monthDiff = today.getMonth() - birthdate_date.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate_date.getDate())) {
            age--;
        }

        // return age;
        return res.status(200).send({
            status: 200,
            message: `success`,
            data: {
                age_year: age
            }
        })

    } catch (e) {
        return res.status(200).send({
            status: 400,
            message: `Error : ${e.message ? e.message : `No return msg`}`,
            data: []
        })
    }
}

async function calculateage_db(req, res, next) {
    let connection;
    try {

        const birthdate  = req.body.birthdate
        console.log(`birthdate: ${birthdate}`)
        connection = await oracledb.getConnection(config.database)

        try {
            const date_c = await connection.execute(`
        SELECT BTW.BUDDHIST_TO_CHRIS_F(to_date(:birthdate, 'dd/mm/yyyy')) as date_c FROM DUAL
        `, {
                birthdate: birthdate
            }, { outFormat: oracledb.OBJECT })

            if (date_c.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถแปลงค่า format date ได้`,
                    data: []
                })

            } else {
                // === success ===
                const date_str = date_c.rows[0].DATE_C
                const resultage = await connection.execute(`
                    SELECT BTW.F_CALCULATE_AGE(:birthdate , sysdate) as age_year FROM DUAL
                `, {
                    birthdate: date_str
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultage.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
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

            }
        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error generate Christ years : ${e.message ? e.message : 'No return msg'}`,
                data: []
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
module.exports.getcoverageTotallossold = getcoverageTotallossold
module.exports.getpaymentValue = getpaymentValue
module.exports.getagefrombirthdate = getagefrombirthdate
module.exports.getoracleoutstand = getoracleoutstand
module.exports.calculateage = calculateage
module.exports.calculateage_db = calculateage_db
