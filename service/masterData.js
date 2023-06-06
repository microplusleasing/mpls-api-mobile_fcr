const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const path = require('path');
const { result } = require('lodash');


async function getRate(req, res, next) {
    let connection;
    const { pro_code, size_model } = req.query
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
                AND TRUNC(SYSDATE) BETWEEN TRUNC(ST_DATE) AND TRUNC(NVL(EN_DATE,SYSDATE))
                ORDER BY RATE
        `, {
            pro_code: '01', // fix code
            size_model: size_model
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

async function getTerm(req, res, next) {
    let connection;
    const { pro_code, size_model } = req.query
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT TERM
            FROM BTW.TENOR_P 
            WHERE SIZE_CODE = :size_model
            AND PRO_CODE = :pro_code
            AND TRUNC(SYSDATE) BETWEEN TRUNC(ST_DATE) AND TRUNC(NVL(EN_DATE,SYSDATE))
            ORDER BY TERM
        `, {
            pro_code: '01', // fix code
            size_model: size_model
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
            const updatedArray = lowerResData.map(item => {
                // Use Number() to convert the string to a number
                item.term = Number(item.term);
                return item;
            });
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: updatedArray
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

async function getTermNew(req, res, next) {
    let connection;
    const { pro_code, size_model, rate, net_finance } = req.query

    if(!(size_model && rate && net_finance)) {
        return res.satus(400).send({
            status: 5000,
            message: `mission parameter (size_model : ${size_model ? size_model : '-'}, rate : ${rate ? rate : '-'}, net_finance : ${net_finance ? net_finance : '-'})`,
            data: []
        })
    }
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
                SELECT TERM
                FROM BTW.TENOR_P
                WHERE SIZE_CODE = :size_model
                AND PRO_CODE = :pro_code
                AND TRUNC(SYSDATE) BETWEEN TRUNC(ST_DATE) AND NVL(TRUNC(EN_DATE),TRUNC(SYSDATE))
                AND BTW.PKG_CALCULATE.RATE_EFFECTIVE(ROUND(TRUNC(BTW.PKG_CAL_VAT.F_GET_AMOUNT_NO_VAT( :net_finance, BTW.GET_VAT (SYSDATE)),3),2),TERM,ROUND(TRUNC(BTW.PKG_CAL_VAT.F_GET_AMOUNT_NO_VAT(CEIL(round(BTW.pkg_installment.CAL_MONTHLY(:net_finance, TERM , :rate ),2)), BTW.GET_VAT (SYSDATE)),3),2))*12 <= (SELECT RATE FROM BTW.EFF_RATE_P WHERE TYPE_CODE = '1')
                AND TERM >= BTW.GET_MIN_TERM_RATE_P(PRO_CODE,SIZE_CODE,SYSDATE, :rate)
                ORDER BY TERM
        `, {
            size_model: size_model,
            pro_code: '01', // fix code
            rate: rate,
            net_finance: net_finance

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
            const updatedArray = lowerResData.map(item => {
                // Use Number() to convert the string to a number
                item.term = Number(item.term);
                return item;
            });
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: updatedArray
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

async function getPaymentCount(req, res, next) {
    // ==== deprecate (use getTermNew instead) ===
    let connection;
    const { pro_code, brand_code, model_code } = req.query

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT TERM FROM BTW.TENOR_P WHERE SIZE_CODE = 
            BTW.GET_SIZE_MODEL(:P_PRO_CODE,:P_BRAND_CODE,:P_MODEL_CODE) 
            AND PRO_CODE = :P_PRO_CODE ORDER BY TERM
        `, {
            P_PRO_CODE: pro_code,
            P_BRAND_CODE: brand_code,
            P_MODEL_CODE: model_code
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

async function getImageType(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT * FROM MPLS_MASTER_IMAGE_P
            WHERE IMAGE_CODE IN ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10')
        `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No IMAGE TYPE',
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

async function getImageTypeAttach(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT * FROM MPLS_MASTER_IMAGE_P
            WHERE IMAGE_CODE IN ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10')
        `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No IMAGE TYPE',
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
        return res.status(200).send({
            status: 500,
            message: `Error : ${e.message ? e.message : 'No return message'}`
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

async function getTitle(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
            SELECT * FROM BTW.TITLE_P
        `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No TITLE Found',
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

async function getTitletimeout(req, res, next) {
    let connection;
    oracledb.fetchAsString = [];

    try {
        // set a timeout to cancel the request after 5 seconds
        const timeout = setTimeout(() => {
            console.log('Request timed out');
            return res.status(408).send({
                status: 408,
                message: 'Request timed out',
                data: []
            });
        }, 5000);

        connection = await oracledb.getConnection(config.database);

        const results = await connection.execute(`
        SELECT * FROM BTW.TITLE_P
      `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            });

        // clear the timeout if the request completes before it is reached
        clearTimeout(timeout);

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No TITLE Found',
                data: []
            });
        } else {
            const resData = results.rows;
            const lowerResData = tolowerService.arrayobjtolower(resData);
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            });
        }
    } catch (e) {
        console.error(e);
        return next(e);
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

async function getDealer(req, res, next) {

    let connection;
    const { pro_code } = req.query

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
        SELECT DL_CODE ,DL_FNAME||' '||DL_NAME||' '||DL_NAME DL_NAME
                FROM BTW.X_DEALER_P
                WHERE ACTIVE_STATUS = 'Y'
                AND PRODUCT_ITEM = :PRO_CODE
                ORDER BY DL_CODE
        `, {
            PRO_CODE: pro_code
        }, {
            outFormat: oracledb.OBJECT
        })

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: `Not Found Dealer`,
                data: []
            })
        }
        try {
            const resData = results.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        } catch (err) {
            console.log(`Error during build object response data.`)
            return res.status(201).send({
                status: 201,
                message: '`Error during build object response data.',
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

async function getMasterProvince(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
        SELECT PROV_CODE, PROV_NAME FROM BTW.PROVINCE_P
            `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'No master province Found',
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

async function getcarcheckstatus(req, res, next) {
    let connection;
    oracledb.fetchAsString = []
    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
                SELECT DETAILS, STATUS 
                FROM ESTIMATE_REPO_CHECK_MASTER_P EP
                WHERE EP.ON_ACTIVE = '1' ORDER BY STATUS
            `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'No CARCHECK STATUS Found',
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

async function getInsuranceold(req, res, next) {
    let connection;
    const { factory_price } = req.query
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        select  A.INSURER_CODE ,C.INSURER_NAME  ,B.YEARS_INSUR , B.PREMIUM_INSUR,A.INSURANCE_CODE
        from x_INSURANCE A, X_INSURANCE_DETAIL B , X_INSURER_INFO C
        WHERE A.INSURANCE_CODE = B.INSURANCE_CODE
        AND A.INSURER_CODE = C.INSURER_CODE
        AND C.CANCEL_STATUS = 'N'
        AND A.STATUS = 'Y'
        AND A.BUSINESS_CODE = '001'
        AND (:factory_price BETWEEN COVERAGE_INSUR_MIN AND COVERAGE_INSUR_MAX)
        ORDER BY B.YEARS_INSUR,B.PREMIUM_INSUR,A.INSURER_CODE,B.INSURANCE_CODE
        `, {
            factory_price: factory_price,
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

async function getInsuranceold2(req, res, next) {
    let connection;
    let { max_ltv } = req.query
    const max_ltv_n = parseInt(max_ltv)
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        select  A.INSURER_CODE ,C.INSURER_NAME  ,B.YEARS_INSUR , B.PREMIUM_INSUR,A.INSURANCE_CODE
        from x_INSURANCE A, X_INSURANCE_DETAIL B , X_INSURER_INFO C
        WHERE A.INSURANCE_CODE = B.INSURANCE_CODE
        AND A.INSURER_CODE = C.INSURER_CODE
        AND C.CANCEL_STATUS = 'N'
        AND A.STATUS = 'Y'
        AND A.BUSINESS_CODE = '001'
        AND ((case when :p_max_ltv > BTW.GET_MAX_COVERAGE_INSUR(B.INSURANCE_CODE) 
            then BTW.GET_MAX_COVERAGE_INSUR(B.INSURANCE_CODE)
            else  :p_max_ltv end) BETWEEN COVERAGE_INSUR_MIN AND COVERAGE_INSUR_MAX)
        ORDER BY B.YEARS_INSUR,B.PREMIUM_INSUR,A.INSURER_CODE,B.INSURANCE_CODE
        `, {
            p_max_ltv: max_ltv_n,
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No Insurance list',
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

async function getInsurance(req, res, next) {
    let connection;
    // let { max_ltv } = req.query
    // const max_ltv_n = parseInt(max_ltv)

    const reqData = req.query

    try {
        oracledb.fetchAsString = []
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
        AND A.BUSINESS_CODE = '001'
        AND (BTW.GET_COVERAGE_COMPARE_MAX_LTV(
                B.INSURANCE_CODE, 
                TRUNC((:FACTORY_PRICE * BTW.GET_VALUE_NUM_MARKET_SETTING('004', :BUSSI_CODE, '01', :BRAND_CODE, :MODEL_CODE, :DL_CODE, SYSDATE)) / 100)
            ) BETWEEN B.COVERAGE_INSUR_MIN AND B.COVERAGE_INSUR_MAX)
        ORDER BY B.YEARS_INSUR, B.PREMIUM_INSUR, A.INSURER_CODE, B.INSURANCE_CODE 
        `, {
            // p_max_ltv: max_ltv_n,
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
                message: 'No Insurance list',
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

async function getInsurer(req, res, next) {
    let connection;
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT A.INSURER_CODE, A.INSURANCE_CODE ,B.INSURER_NAME
        FROM x_INSURANCE A , X_INSURER_INFO B
        WHERE  A.INSURER_CODE = B.INSURER_CODE
        AND A.STATUS = 'Y'
        AND A.BUSINESS_CODE = '001'
        `, [],
            {
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

async function getInsuranceYear(req, res, next) {
    let connection;
    const { insurer_code } = req.query
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT DISTINCT B.YEARS_INSUR , A.INSURER_CODE , A.INSURANCE_CODE, C.INSURER_NAME  
        from x_INSURANCE A, X_INSURANCE_DETAIL B , X_INSURER_INFO C
        WHERE A.INSURANCE_CODE = B.INSURANCE_CODE
        AND A.INSURER_CODE = C.INSURER_CODE
        AND C.CANCEL_STATUS = 'N'
        AND A.STATUS = 'Y'
        AND A.BUSINESS_CODE = '001'
        AND A.INSURER_CODE = :insurer_code
        ORDER BY B.YEARS_INSUR ASC
        `, {
            insurer_code: insurer_code,
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

async function getSizeModel(req, res, next) {
    let connection;
    const { pro_code, brand_code, model_code, dealer_code, busi_code, factory_price } = req.query

    let datetime = moment().format('DD/MM/YYYY');
    // console.log(`datetime : ${datetime}`)
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT btw.GET_SIZE_MODEL(:pro_code , :brand_code, :model_code, :dealer_code, :busi_code, :factory_price, trunc(sysdate)) "SIZE"
            FROM DUAL
        `, {
            pro_code: pro_code, // fix code
            brand_code: brand_code,
            model_code: model_code,
            dealer_code: dealer_code, // fix code
            busi_code: busi_code, // FIX CODE
            factory_price: factory_price,
            // current_date: datetime,
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

async function getOccupation(req, res, next) {
    let connection;

    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT ALL X_OCCUPA_CATEGORY_P.CAT_CODE, X_OCCUPA_CATEGORY_P.CAT_NAME
        FROM BTW.X_OCCUPA_CATEGORY_P
        `, [], // NO Bind
            {
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

async function getMasterStatus(req, res, next) {
    let connection;

    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT LOAN_RESULT_CODE AS STATUS , 
        LOAN_RESULT_NAME AS STATUSTEXT 
        FROM BTW.X_LOAN_RESULT_P
        `, [], // NO Bind
            {
                outFormat: oracledb.OBJECT
            })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No status',
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

async function getbranch(req, res, next) {
    let connection;

    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        select branch_code, branch_name 
        from btw.branch_p
        order by branch_code asc
        `, [], // NO Bind
            {
                outFormat: oracledb.OBJECT
            })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No status',
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

async function getnegomasterstatus(req, res, next) {
    let connection;

    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
        SELECT * FROM 
        BTW.NEG_RESULT_P
        `, [], // NO Bind
            {
                outFormat: oracledb.OBJECT
            })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No status',
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

async function getRateSheet(req, res, next) {
    let connection;
    const { brand_code, model_code, busi_code, insurance_code, insurance_year, dealer_code } = req.query
    // === default busi_code with 001 ===
    try {
        oracledb.fetchAsString = [oracledb.NUMBER]
        connection = await oracledb.getConnection(
            config.database
        )

        // === build dql ===
        let querySql;
        let bindRef;
        if (model_code) {
            querySql = `SELECT BRAND_CODE||' '||BRAND_NAME BRAND,MODEL_CODE||' '||MODEL MODELNAME,ENGINE_NO,MAX_LTV,PREMIUM_INSUR,RATE, TERM,
            CEIL(round(BTW.pkg_installment.CAL_MONTHLY(MAX_LTV+PREMIUM_INSUR,TERM,RATE ),2)) MONTHLY
            FROM(
            SELECT A.BRAND_CODE,BTW.GET_BRAND_NAME(A.PRO_CODE,A.BRAND_CODE) BRAND_NAME,A.MODEL_CODE,A.MODEL,
            A.DESCRIPTION,A.ENGINE_NO||A.ENGINE_NO_RUNNING ENGINE_NO ,A.PRICE,
            BTW.GET_MAX_LTV_AMOUNT(A.PRICE,BTW.GET_VALUE_NUM_MARKET_SETTING('001', :busi_code, A.PRO_CODE,A.BRAND_CODE,
            A.MODEL_CODE, :dealer_code, SYSDATE)) MAX_LTV,
            B.RATE, C.TERM, BTW.GET_PREMIUM_INSUR('001', :insurance_code ,A.PRICE, :insurance_year)  PREMIUM_INSUR
            FROM BTW.X_MODEL_P A, BTW.RATE_P B, BTW.TENOR_P C
            WHERE A.PRO_CODE =B.PRO_CODE
            AND B.SIZE_CODE = BTW.GET_SIZE_MODEL(a.PRO_CODE ,a.BRAND_CODE,a.MODEL_CODE , :dealer_code, :busi_code ,a.PRICE,sysdate)
            AND A.PRO_CODE = C.PRO_CODE
            AND  C.SIZE_CODE = BTW.GET_SIZE_MODEL(a.PRO_CODE ,a.BRAND_CODE,a.MODEL_CODE , :dealer_code, :busi_code ,a.PRICE,sysdate)
            AND A.BRAND_CODE = :brand_code
            AND A.MODEL_CODE = :model_code
            AND TRUNC(SYSDATE) BETWEEN TRUNC(B.ST_DATE) AND TRUNC(NVL(B.EN_DATE,SYSDATE))
            AND TRUNC(SYSDATE) BETWEEN TRUNC(C.ST_DATE) AND TRUNC(NVL(C.EN_DATE,SYSDATE))
            ORDER BY A.PRO_CODE,A.BRAND_CODE,A.MODEL_CODE,B.RATE ,C.TERM
            )`
            bindRef = {
                busi_code: busi_code,
                dealer_code: dealer_code,
                insurance_code: insurance_code,
                insurance_year: insurance_year,
                brand_code: brand_code,
                model_code: model_code
            }
        } else {
            // ==== no model select ====
            querySql = `SELECT BRAND_CODE||' '||BRAND_NAME BRAND,MODEL_CODE||' '||MODEL MODELNAME,ENGINE_NO,MAX_LTV,PREMIUM_INSUR,RATE, TERM,
            CEIL(round(BTW.pkg_installment.CAL_MONTHLY(MAX_LTV+PREMIUM_INSUR,TERM,RATE ),2)) MONTHLY
            FROM(
            SELECT A.BRAND_CODE,BTW.GET_BRAND_NAME(A.PRO_CODE,A.BRAND_CODE) BRAND_NAME,A.MODEL_CODE,A.MODEL,
            A.DESCRIPTION,A.ENGINE_NO||A.ENGINE_NO_RUNNING ENGINE_NO ,A.PRICE,
            BTW.GET_MAX_LTV_AMOUNT(A.PRICE,BTW.GET_VALUE_NUM_MARKET_SETTING('001', :busi_code, A.PRO_CODE,A.BRAND_CODE,
            A.MODEL_CODE, :dealer_code, SYSDATE)) MAX_LTV,
            B.RATE, C.TERM, BTW.GET_PREMIUM_INSUR('001', :insurance_code ,A.PRICE, :insurance_year)  PREMIUM_INSUR
            FROM BTW.X_MODEL_P A, BTW.RATE_P B, BTW.TENOR_P C
            WHERE A.PRO_CODE =B.PRO_CODE
            AND B.SIZE_CODE = BTW.GET_SIZE_MODEL(a.PRO_CODE ,a.BRAND_CODE,a.MODEL_CODE , :dealer_code, :busi_code ,a.PRICE,sysdate)
            AND A.PRO_CODE = C.PRO_CODE
            AND  C.SIZE_CODE = BTW.GET_SIZE_MODEL(a.PRO_CODE ,a.BRAND_CODE,a.MODEL_CODE , :dealer_code, :busi_code ,a.PRICE,sysdate)
            AND TRUNC(SYSDATE) BETWEEN TRUNC(B.ST_DATE) AND TRUNC(NVL(B.EN_DATE,SYSDATE))
            AND TRUNC(SYSDATE) BETWEEN TRUNC(C.ST_DATE) AND TRUNC(NVL(C.EN_DATE,SYSDATE))
            ORDER BY A.PRO_CODE,A.BRAND_CODE,A.MODEL_CODE,B.RATE ,C.TERM
            )`
            bindRef = {
                busi_code: busi_code,
                dealer_code: dealer_code,
                insurance_code: insurance_code,
                insurance_year: insurance_year
            }
        }

        const results = await connection.execute(`${querySql}`, bindRef, { outFormat: oracledb.OBJECT })

        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No status',
                data: []
            })
        } else {
            console.log(`count rows : ${results.rows.length}`)
            const resData = results.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            lowerResData.forEach(u => {
                u.max_ltv *= 1
                u.premium_insur *= 1
                u.monthly *= 1
                u.term *= 1
                u.rate *= 1
            })

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

async function getMariedStatus(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const resultmariedstatus = await connection.execute(`
                SELECT  CODE,NAME
                FROM BTW.X_MARRIED_STATUS_P 
                WHERE CODE NOT IN('0')
                ORDER BY CODE ASC
        `,
            {}
            , { outFormat: oracledb.OBJECT })

        if (resultmariedstatus.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No X_MARRIED_STATUS_P data',
                data: []
            })
        } else {
            const resData = resultmariedstatus.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
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

async function getHouseType(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const resulthousetype = await connection.execute(`
            SELECT  CODE, NAME
            FROM BTW.X_HOUSE_TYPE_P
            WHERE CODE NOT IN('0')
            ORDER BY CODE ASC
        `, {

        }, {
            outFormat: oracledb.OBJECT
        })

        if (resulthousetype.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No X_HOUSE_TYPE_P data',
                data: []
            })
        } else {
            const resData = resulthousetype.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
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

async function getHouseOwnerType(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                SELECT  STATUS_CODE, STATUS_NAME
                FROM BTW.X_HOUSEOWNERSTATUS_P
                WHERE STATUS_CODE NOT IN('0')
                ORDER BY STATUS_CODE ASC
            `
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No X_HOUSEOWNERSTATUS_P data',
                data: []
            })
        } else {
            const resData = result.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
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

async function MPLS_getbrand(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
             SELECT BRAND_CODE, BRAND_NAME FROM BTW.X_BRAND_P 
             WHERE PRO_CODE = '01'
        `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No Brand Data',
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

async function MPLS_getmodel(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
                SELECT B.BRAND_NAME, B.BRAND_CODE, P.MODEL_CODE,P.MODEL, P.PRICE,
                P.ENGINE_NO, P.ENGINE_NO_RUNNING, P.CHASSIS_NO, P.CHASSIS_NO_RUNNING
                FROM  BTW.X_MODEL_P  P,BTW.X_BRAND_P B
                WHERE P.BRAND_CODE= B.BRAND_CODE
                AND   P.PRO_CODE='01'
        `, [] // NO BINDING DATA PARAM
            , {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No Model Data',
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

async function MPLS_getsecondhandcarbyreg(req, res, next) {

    let connection;
    try {

        const { p_reg_no , p_sl_code } = req.body

        if (!p_reg_no || !p_sl_code || p_reg_no.trim() === '' || p_sl_code.trim() === '') {
            return res.status(200).send({
                status: 400,
                message: 'Bad Request: Invalid parameters',
                data: []
            });
          }

          // === add parameter variable ===
          let bindParams = {}
          let query_p_reg = ''
          let query_p_sl_code = ''


          // === check p_reg_no is not null and not empty string ===
          if (typeof p_reg_no === 'string' && p_reg_no.trim() !== '') {
            query_p_reg = ` AND REG_NO LIKE '%'||:P_REG_NO||'%' `
            bindParams.P_REG_NO = p_reg_no
          }

          // === check p_sl_code is not null and not empty string ===
          if (typeof p_sl_code === 'string' && p_sl_code.trim() !== '') {
            query_p_sl_code = ` AND SL_CODE = :P_SL_CODE `
            bindParams.P_SL_CODE = p_sl_code
          }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
        SELECT  REG_NO,prov_name,  BRAND_NAME,MODEL_NAME,COLOR ,CC ,ENGINE_NUMBER,ENGINE_NO_RUNNING,
                CHASSIS_NUMBER, CHASSIS_NO_RUNNING, REG_DATE,
                PROV_CODE, PRODUC,BRAND_CODE,MODEL_CODE,APPLICATION_NUM , CONTRACT_NO , SL_CODE ,AUCTION_CODE
                FROM(
                SELECT  D.APPLICATION_NUM , D.CONTRACT_NO , D.SL_CODE ,C.AUCTION_CODE , G.REG_NO REG_NO,
                BTW.F_GET_PROVINCE_NAME(E.REG_CITY) AS PROV_NAME, BTW.GET_BRAND_NAME(E.PRODUC ,E.BRAND_CODE) AS BRAND_NAME,
                F.MODEL AS MODEL_NAME,E.COLOR ,F.CC ,G.ENGINE_NUMBER,G.ENGINE_NO_RUNNING,
                G.CHASSIS_NUMBER, G.CHASSIS_NO_RUNNING,
                E.REG_CITY prov_code,E.PRODUC,E.BRAND_CODE,E.MODEL_CODE,TRUNC(G.REG_DATE) AS REG_DATE
                FROM BTW.COLL_RECIEPT A, BTW.X_RECEIVE B, BTW.X_REPOSSESS_AUCTION_P C , BTW.X_CUST_MAPPING_EXT D, BTW.AC_PROVE E, BTW.X_MODEL_P F,
                BTW.X_PRODUCT_DETAIL G
                WHERE A.RECEIPT_NUMBER_PREFIX = B.RECEIPT_NUMBER_PREFIX
                AND A.RECEIPT_NUMBER_POSTFIX = B.RECEIPT_NUMBER_POSTFIX
                AND A.HP_NO = B.CONTRACT_NO
                AND B.AUCTION_CODE = C.AUCTION_CODE
                AND A.HP_NO = D.CONTRACT_NO
                AND E.HP_NO = D.CONTRACT_NO
                AND E.PRODUC = F.PRO_CODE
                AND C.SL_CODE = (SELECT DL_CODE FROM X_DEALER_P WHERE DL_CODE = C.SL_CODE AND ACTIVE_STATUS = 'Y')
                AND E.BRAND_CODE = F.BRAND_CODE
                AND E.MODEL_CODE = F.MODEL_CODE
                AND G.APPLICATION_NUM =D.APPLICATION_NUM
                AND D.BUSSINESS_CODE IN ('001','002')
                AND A.PAY_CODE IN ('80','81')
                AND NVL(A.CANCELL,'F') = 'F'
                AND F_CALCULATE_AGE (TRUNC(G.REG_DATE),TRUNC(SYSDATE)) <= BTW.GET_VALUE_NUM_MARKET_SETTING ('005','002',E.PRODUC ,E.BRAND_CODE ,E.MODEL_CODE ,C.SL_CODE ,TRUNC(SYSDATE))
                AND D.CONTRACT_NO NOT IN (select DISTINCT CONTRACT_REF
                                        from x_product_detail a,x_cust_mapping_ext b
                                        where A.APPLICATION_NUM = B.APPLICATION_NUM
                                        AND  B.BUSSINESS_CODE = '002'
                                        and (B.LOAN_RESULT in ('Y','Z','W') OR B.LOAN_RESULT IS NULL)
                                        and a.REG_NO = G.REG_NO )
                )
                WHERE APPLICATION_NUM IS NOT NULL
                ${query_p_reg} 
                ${query_p_sl_code} 
                GROUP BY APPLICATION_NUM , CONTRACT_NO , SL_CODE ,AUCTION_CODE ,  REG_NO,
                prov_name,  BRAND_NAME,MODEL_NAME,COLOR ,CC ,ENGINE_NUMBER,ENGINE_NO_RUNNING,
                CHASSIS_NUMBER, CHASSIS_NO_RUNNING,
                prov_code,PRODUC,BRAND_CODE,MODEL_CODE, REG_DATE`
            , bindParams, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No data',
                data: []
            })
        } else {
            const resData = result.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
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
                    status: 200,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function getDPD(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
        SELECT * FROM BTW.COLL_GROUP_DPD_VIEW`
            , {
                
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No data',
                data: []
            })
        } else {
            const resData = result.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
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
                    status: 200,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function getStageno(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
        SELECT * FROM BTW.COLL_GROUP_STAGE_NO_VIEW`
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No data',
                data: []
            })
        } else {
            const resData = result.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
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
                    status: 200,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

module.exports.getRate = getRate
module.exports.getPaymentCount = getPaymentCount
module.exports.getImageType = getImageType
module.exports.getImageTypeAttach = getImageTypeAttach
module.exports.getTitle = getTitle
module.exports.getTitletimeout = getTitletimeout
module.exports.getDealer = getDealer
module.exports.getMasterProvince = getMasterProvince
module.exports.getInsuranceold = getInsuranceold
module.exports.getInsuranceold2 = getInsuranceold2
module.exports.getInsurance = getInsurance
module.exports.getInsurer = getInsurer
module.exports.getInsuranceYear = getInsuranceYear
module.exports.getSizeModel = getSizeModel
module.exports.getTerm = getTerm
module.exports.getTermNew = getTermNew
module.exports.getOccupation = getOccupation
module.exports.getMasterStatus = getMasterStatus
module.exports.getnegomasterstatus = getnegomasterstatus
module.exports.getRateSheet = getRateSheet
module.exports.getbranch = getbranch
module.exports.getcarcheckstatus = getcarcheckstatus
module.exports.getMariedStatus = getMariedStatus
module.exports.getHouseType = getHouseType
module.exports.getHouseOwnerType = getHouseOwnerType
module.exports.MPLS_getbrand = MPLS_getbrand
module.exports.MPLS_getmodel = MPLS_getmodel
module.exports.MPLS_getsecondhandcarbyreg = MPLS_getsecondhandcarbyreg
module.exports.getStageno = getStageno
module.exports.getDPD = getDPD