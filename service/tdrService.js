const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')


async function tdrcalculate(req, res, next) {

    let connection;
    const reqData = req.body
    try {


        /* ... check parameter ... */
        if (!reqData.contract_no) {
            return res.status(200).send({
                status: 500,
                message: `missing parameter contract_no`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
                DECLARE 
                    contract_no VARCHAR2(30);
                    summary_tdr NUMBER;
                BEGIN 
                    BTW.PKG_TDR.CAL_NET_FIN_TDR(:contract_no, :summary_tdr);
                END;          
            `
            , {
                contract_no: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: reqData.contract_no },
                summary_tdr: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            }, {
            outFormat: oracledb.OBJECT
        })

        /* ... return value ... */
        const summary_tdr_value = result.outBinds.summary_tdr.toFixed(2)

        return res.status(200).send({
            status: 200,
            message: `Success`,
            data: {
                summary_tdr: +summary_tdr_value
            }
        })

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function tdrdetailbycontractno(req, res, next) {

    let connection;
    const reqData = req.body
    try {

        /* ... check parameter contract_no ... */

        if (!(reqData.contract_no)) {
            return res.status(200).send({
                status: 500,
                message: `missing parameter contract_no`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
                SELECT AC.HP_NO, TP.TITLE_NAME, CI.NAME, CI.SNAME, AC.BRAND_CODE, XBP.BRAND_NAME, AC.MODEL_CODE, XMP.MODEL AS MODEL_NAME, AC.COLOR, AC.CASI_NO AS CHASSIC_NO, AC.ENGI_NO AS ENGINE_NO, 
                XPD.MOTOR_NUMBER, AC.PRODUC AS PRODUCT_CODE, XCME.SL_CODE, XMP.PRICE AS FACTORY_PRICE, XMP.MODEL_YEAR,
                BTW.GET_SIZE_MODEL(AC.PRODUC , AC.BRAND_CODE, AC.MODEL_CODE, XCME.SL_CODE, '004', XMP.PRICE, trunc(sysdate), XMP.MODEL_YEAR) AS SIZE_MODEL, 
                BTW.PKG_MONTH_END.GET_OUTSTAND_BALANCE('N', :contract_no, TO_CHAR(SYSDATE,'DD/MM/YYYY'),NULL,'BTW.') AS BEFORE_RE_TDR
                FROM BTW.AC_PROVE AC, BTW.X_BRAND_P XBP, BTW.X_MODEL_P XMP, BTW.X_PRODUCT_DETAIL XPD, BTW.X_CUST_MAPPING_EXT XCME, BTW.CUST_INFO CI, BTW.TITLE_P TP
                WHERE AC.HP_NO = :contract_no
                AND AC.BRAND_CODE = XBP.BRAND_CODE
                AND AC.MODEL_CODE = XMP.MODEL_CODE
                AND AC.HP_NO = XCME.CONTRACT_NO
                AND XCME.APPLICATION_NUM = XPD.APPLICATION_NUM
                AND AC.CUST_NO_0 = CI.CUST_NO
                AND CI.FNAME = TP.TITLE_ID
            `, {
            contract_no: reqData.contract_no
        }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                messgae: `no record found`,
                data: []
            })
        } else {
            const resData = result.rows[0]
            const lowerResData = tolowerService.objtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function ratetdr(req, res, next) {
    let connection;
    const reqData = req.body
    try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
                SELECT  RATE
                FROM BTW.RATE_P 
                WHERE SIZE_CODE = :size_model 
                AND PRO_CODE = :pro_code 
                AND BUSI_CODE = :bussiness_code
                AND TRUNC(SYSDATE) BETWEEN TRUNC(ST_DATE) AND TRUNC(NVL(EN_DATE,SYSDATE))
                ORDER BY RATE
        `, {
            size_model: reqData.size_model,
            pro_code: reqData.pro_code,
            bussiness_code: reqData.bussiness_code
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'Not Found Rate',
                data: []
            })
        } else {
            const resData = results.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            lowerResData.forEach(u => u.rate *= 1)
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

async function insurancetdr(req, res, next) {
    let connection;
    const reqData = req.body

    /* ... check parameters ... */

    if (!(reqData.factory_price && reqData.bussiness_code && reqData.brand_code && reqData.model_code && reqData.dl_code)) {
        return res.status(200).send({
            status: 500,
            message: `missing parameters \n
            factory_price : ${reqData.factory_price ? reqData.factory_price : '-'}, \n
            bussiness_code : ${reqData.bussiness_code ? reqData.bussiness_code : '-'}, \n
            brand_code : ${reqData.brand_code ? reqData.brand_code : '-'}, \n
            reqData.model_name : ${reqData.model_name ? reqData.model_name : '-'}, \n
            dl_code : ${reqData.dl_code ? reqData.dl_code : '-'}`
        })
    }
    try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT A.INSURER_CODE, C.INSURER_NAME, B.YEARS_INSUR, B.PREMIUM_INSUR, A.INSURANCE_CODE
            FROM X_INSURANCE A
            JOIN X_INSURANCE_DETAIL B ON A.INSURANCE_CODE = B.INSURANCE_CODE
            JOIN X_INSURER_INFO C ON A.INSURER_CODE = C.INSURER_CODE
            WHERE C.CANCEL_STATUS = 'N'
            AND A.STATUS = 'Y'
            AND A.BUSINESS_CODE = :bussiness_code 
            AND (BTW.GET_COVERAGE_COMPARE_MAX_LTV(
                    B.INSURANCE_CODE, 
                    TRUNC((:factory_price * BTW.GET_VALUE_NUM_MARKET_SETTING('004', :bussiness_code, '01', :brand_code, :model_code, :dl_code, SYSDATE)) / 100)
                ) BETWEEN B.COVERAGE_INSUR_MIN AND B.COVERAGE_INSUR_MAX)
            ORDER BY B.YEARS_INSUR, B.PREMIUM_INSUR, A.INSURER_CODE, B.INSURANCE_CODE 
        `, {
            factory_price: reqData.factory_price,
            bussiness_code: reqData.bussiness_code,
            brand_code: reqData.brand_code,
            model_code: reqData.model_code,
            dl_code: reqData.dl_code
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'Not Found Insurance',
                data: []
            })
        } else {
            const resData = results.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
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

async function paymentvaluetdr(req, res, next) {

    let connection;
    const reqData = req.body
    try {

        /* ... check parameter contract_no ... */

        if (!(reqData.net_finance && reqData.term && reqData.rate)) {
            return res.status(200).send({
                status: 500,
                message: `missing parameter \n 
                net_finance : ${reqData.net_finance ? reqData.net_finance : `-`} , term : ${reqData.term ? reqData.term : `-`} , rate : ${reqData.rate ? reqData.rate : `-`}`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
                SELECT CEIL(round(btw.pkg_installment.CAL_MONTHLY(NVL(:net_finance,0),NVL(TO_NUMBER(:term),0),
                NVL(TO_NUMBER(:rate),0)),2)) as payment FROM DUAL
            `
            , {
                net_finance: reqData.net_finance,
                term: reqData.term,
                rate: reqData.rate
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No data',
                data: []
            })
        } else {
            const resData = result.rows[0]
            const lowerResData = tolowerService.objtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function termtdr(req, res, next) {
    let connection;
    const reqData = req.body

    if (!(reqData.size_model && reqData.rate && reqData.net_finance && reqData.pro_code)) {
        return res.satus(400).send({
            status: 5000,
            message: `mission parameter (size_model : ${reqData.size_model ? reqData.size_model : '-'}, rate : ${reqData.rate ? reqData.rate : '-'}, net_finance : ${reqData.net_finance ? reqData.net_finance : '-'}), pro_code : ${reqData.pro_code ? reqData.pro_code : '-'}`,
            data: []
        })
    }
    try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(
            `
                SELECT TERM
                FROM BTW.TENOR_P
                WHERE SIZE_CODE = :size_model
                AND PRO_CODE = :pro_code
                AND BUSI_CODE = :bussiness_code
                AND TRUNC(SYSDATE) BETWEEN TRUNC(ST_DATE) AND NVL(TRUNC(EN_DATE),TRUNC(SYSDATE))
                AND BTW.PKG_CALCULATE.RATE_EFFECTIVE(ROUND(TRUNC(BTW.PKG_CAL_VAT.F_GET_AMOUNT_NO_VAT( :net_finance, BTW.GET_VAT (SYSDATE)),3),2),TERM,ROUND(TRUNC(BTW.PKG_CAL_VAT.F_GET_AMOUNT_NO_VAT(CEIL(round(BTW.pkg_installment.CAL_MONTHLY(:net_finance, TERM , :rate ),2)), BTW.GET_VAT (SYSDATE)),3),2))*12 <= (SELECT RATE FROM BTW.EFF_RATE_P WHERE TYPE_CODE = '1')
                AND TERM >= BTW.GET_MIN_TERM_RATE_P(PRO_CODE,SIZE_CODE,SYSDATE, :rate, :bussiness_code)
                ORDER BY TERM
            `, {
            size_model: reqData.size_model,
            pro_code: reqData.pro_code,
            rate: reqData.rate,
            net_finance: reqData.net_finance,
            bussiness_code: reqData.bussiness_code
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'Not Found Term',
                data: []
            })
        } else {
            const resData = results.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
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

async function coveragetotallosstdr(req, res, next) {
    let connection;
    const reqData = req.body

    if (!(reqData.insurance_code && reqData.factory_price && reqData.bussi_code && reqData.brand_code && reqData.model_code && reqData.dl_code)) {
        return res.satus(400).send({
            status: 5000,
            message: `mission parameter (insurance_code : ${reqData.insurance_code ? reqData.insurance_code : '-'}, factory_price : ${reqData.factory_price ? reqData.factory_price : '-'}, bussi_code : ${reqData.bussi_code ? reqData.bussi_code : '-'}, brand_code : ${reqData.brand_code ? reqData.brand_code : '-'}, model_code : ${reqData.model_code ? reqData.model_code : '-'}, dl_code : ${reqData.dl_code ? reqData.dl_code : '-'})`,
            data: []
        })
    }
    try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(
            `
                SELECT TO_NUMBER(BTW.GET_COVERAGE_COMPARE_MAX_LTV(:INSURANCE_CODE,TRUNC((:FACTORY_PRICE*BTW.GET_VALUE_NUM_MARKET_SETTING('004',:BUSSI_CODE,'01',:BRAND_CODE,:MODEL_CODE,:DL_CODE,SYSDATE))/100))) AS COVERAGE_TOTAL_LOSS FROM DUAL
            `,
            {
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
            return res.status(200).send({
                status: 500,
                message: 'Not Found Coverage TotalLoss value',
                data: []
            })
        } else {
            const resData = results.rows[0]
            let lowerResData = tolowerService.objtolower(resData)
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



module.exports.tdrcalculate = tdrcalculate
module.exports.tdrdetailbycontractno = tdrdetailbycontractno
module.exports.ratetdr = ratetdr
module.exports.insurancetdr = insurancetdr
module.exports.paymentvaluetdr = paymentvaluetdr
module.exports.termtdr = termtdr
module.exports.coveragetotallosstdr = coveragetotallosstdr