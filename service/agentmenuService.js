const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
const _util = require('./_selfutil');


async function getagentwaitingpaymentlist(req, res, next) {

    let connection;
    try {

        const { pageno, hp_no, branch, paid_status, sort_type, sort_field } = req.body


        // if (!(pageno && due && holder)) {
        if (!(pageno)) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters`,
                data: []
            })
        }
        const indexstart = (pageno - 1) * 10 + 1
        const indexend = (pageno * 10)
        let rowCount;

        let bindparams = {};
        let queryhpno = ''
        let querybranch = ''
        let querypaidstatus = ''
        let querysort = ''




        if (hp_no) {
            queryhpno = ` AND AC_PROVE.HP_NO = :hp_no  `
            bindparams.hp_no = hp_no
        }

        if (branch) {

            if (branch !== 0 && branch !== '0') {
                // querybranch = ` AND PV.PROV_CODE = :branch `
                querybranch = ` AND branch_p.branch_code = :branch `
                bindparams.branch = branch
            }
        }


        if (paid_status) {
            querypaidstatus = ` AND NVL(PS.IS_PAID40,'N') = :paid_status `
            bindparams.paid_status = paid_status
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                BF.*
            FROM
                (
                    SELECT
                        *
                    FROM
                        (
                            SELECT
                                T.*
                            FROM
                                (
                                    SELECT
                                        hp_no,
                                        title_name,
                                        name,
                                        sname,
                                        first_due,
                                        reg_status,
                                        branch_code,
                                        branch_name,
                                        NVL(IS_PAID40,'N') AS IS_PAID40,
                                        ROW_NUMBER() OVER (
                                            PARTITION BY HP_NO
                                            ORDER BY
                                                first_due DESC
                                        ) AS rn
                                    FROM
                                        (
                                            SELECT
                                                ROWNUM AS LINE_NUMBER,
                                                T.*
                                            FROM
                                                (
                                                    SELECT
                                                        DISTINCT    hp_no,
                                                                    title_name,
                                                                    name,
                                                                    sname,
                                                                    first_due,
                                                                    reg_status,
                                                                    branch_code,
                                                                    branch_name,
                                                                   NVL(IS_PAID40,'N') AS IS_PAID40
                                                    FROM
            (
                                                        SELECT AC_PROVE.hp_no AS  hp_no,

                                                                title_p.title_name,
                                                                CUST_INFO.name,
                                                                CUST_INFO.sname,
                                                                AC_PROVE.FIRST_DUE,
                                                                M_RBC_BOOK_CONTROL.STATUS AS REG_STATUS, 
                                                                branch_p.branch_code,
                                                                branch_p.branch_name,
                                                                NVL(PS.IS_PAID40,'N') AS IS_PAID40
                                                        FROM    AC_PROVE,
                                                                x_cust_mapping_ext,
                                                                x_cust_mapping,
                                                                type_p,
                                                                CUST_INFO,
                                                                title_p,
                                                                X_PRODUCT_DETAIL,
                                                                X_BRAND_P,
                                                                X_MODEL_P,
                                                                X_DEALER_P,
                                                                BRANCH_P,
                                                                (
                                                                    SELECT hp_no,
                                                                    DECODE((SELECT DISTINCT HP_NO FROM COLL_RECIEPT WHERE PAY_CODE = '40' AND NVL(CANCELL,'F') = 'F' AND HP_NO = A.HP_NO),NULL,'N','Y') IS_PAID40
                                                                    FROM AC_PROVE A
                                                                    WHERE AC_STATUS IN ('C','E')
                                                                ) PS,
                                                                NEGO_INFO,
                                                                CALL_TRACK_INFO, 
                                                                BTW.M_RBC_BOOK_CONTROL 
                                                        WHERE   AC_PROVE.HP_NO = x_cust_mapping_ext.CONTRACT_NO
                                                        AND    x_cust_mapping_ext.LOAN_RESULT='Y'
                                                        AND    AC_PROVE.AC_DATE IS NOT NULL
                                                        AND CANCELL = 'F'
                                                        AND  x_cust_mapping_ext.APPLICATION_NUM = x_cust_mapping.APPLICATION_NUM
                                                        AND x_cust_mapping.CUST_STATUS  = type_p.TYPE_CODE
                                                        AND  x_cust_mapping.CUST_NO = CUST_INFO.CUST_NO
                                                        AND CUST_INFO.FNAME=title_p.TITLE_ID
                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                                                        AND  X_PRODUCT_DETAIL.PRODUCT_CODE  = X_MODEL_P.PRO_CODE
                                                        AND  X_PRODUCT_DETAIL.BRAND_CODE  =  X_MODEL_P.BRAND_CODE
                                                        AND  X_PRODUCT_DETAIL.MODELCODE =  X_MODEL_P.MODEL_CODE
                                                        AND  X_PRODUCT_DETAIL.BRAND_CODE = X_BRAND_P.BRAND_CODE
                                                        AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE(+)
                                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                                                        AND AC_PROVE.HP_NO = PS.HP_NO(+)
                                                        AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO(+)
                                                        AND AC_PROVE.AC_STATUS IN ('E', 'C')
                                                        AND AC_PROVE.HP_NO = NEGO_INFO.HP_NO
                                                        AND TO_CHAR(CALL_TRACK_INFO.REC_DAY, 'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NEGO_INFO.REC_DATE(+), 'dd/mm/yyyy hh24:mi:ss')
                                                        AND NEGO_INFO.NEG_R_CODE = 'M04'
                                                        ${queryhpno}${querybranch}${querypaidstatus} 
                                                        ORDER BY TO_CHAR (TO_DATE(AC_PROVE.FIRST_DUE,'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
                                                        )   
                                                ) T
                                        )
                                ) T
                            WHERE
                                rn = 1
                                ${querysort} 
                        )
                ) BF
            `

        const sqlcount = ` SELECT COUNT ( LINE_NUMBER ) AS ROWCOUNT FROM (${sqlbase}) `

        // console.log(`sqlstr: ${sqlcount}`)

        const resultCount = await connection.execute(sqlcount, bindparams, { outFormat: oracledb.OBJECT })

        // console.log(`result count : ${JSON.stringify(resultCount.rows)}`)

        if (resultCount.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'NO RECORD FOUND',
                data: []
            })
        } else {

            try {
                rowCount = resultCount.rows[0].ROWCOUNT
                bindparams.indexstart = indexstart
                bindparams.indexend = indexend
                const finishsql = ` SELECT * FROM( ${sqlbase} ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `

                const resultSelect = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

                if (resultSelect.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No agent assign record ',
                        data: []
                    })
                } else {

                    let resData = resultSelect.rows

                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 10
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 10);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }
            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 400,
                    mesasage: `error during get list data of colletion : ${e.message}`,
                    data: []
                })
            }

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

async function getagentlastduelist(req, res, next) {

    let connection;
    try {

        const { pageno, term_remain, sort_type, sort_field } = req.body


        // if (!(pageno && due && holder)) {
        if (!(pageno)) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters`,
                data: []
            })
        }
        const indexstart = (pageno - 1) * 10 + 1
        const indexend = (pageno * 10)
        let rowCount;

        let bindparams = {};
        let querytermremain = ''
        let querysort = ''




        if (term_remain) {
            querytermremain = ` AND TR.TERM_REMAIN = :term_remain  `
            bindparams.term_remain = term_remain
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                BF.*
            FROM
                (
                    SELECT
                        *
                    FROM
                        (
                            SELECT
                                T.*
                            FROM
                                (
                                    SELECT
                                        hp_no,
                                        title_name,
                                        name,
                                        sname,
                                        last_due,
                                        reg_status,
                                        branch_code,
                                        branch_name,
                                        NVL(IS_PAID40,'N') AS IS_PAID40,
                                        ROW_NUMBER() OVER (
                                            PARTITION BY HP_NO
                                            ORDER BY
                                                last_due DESC
                                        ) AS rn
                                    FROM
                                        (
                                            SELECT
                                                ROWNUM AS LINE_NUMBER,
                                                T.*
                                            FROM
                                                (
                                                    SELECT
                                                        DISTINCT    hp_no,
                                                                    title_name,
                                                                    name,
                                                                    sname,
                                                                    last_due,
                                                                    reg_status,
                                                                    branch_code,
                                                                    branch_name,
                                                                   NVL(IS_PAID40,'N') AS IS_PAID40
                                                    FROM
            (
                                                        SELECT AC_PROVE.HP_NO AS HP_NO, 
                                                            TITLE_P.TITLE_NAME,
                                                            CUST_INFO.NAME,
                                                            CUST_INFO.SNAME,
                                                            AC_PROVE.LAST_DUE,
                                                            M_RBC_BOOK_CONTROL.STATUS AS REG_STATUS,
                                                            BRANCH_P.BRANCH_CODE,
                                                            BRANCH_P.BRANCH_NAME,
                                                            NVL(PS.IS_PAID40, 'N') AS IS_PAID40,
                                                            TR.TERM_REMAIN
                                                        FROM AC_PROVE,
                                                            X_CUST_MAPPING_EXT,
                                                            X_CUST_MAPPING,
                                                            TYPE_P,
                                                            CUST_INFO,
                                                            TITLE_P,
                                                            X_PRODUCT_DETAIL,
                                                            X_BRAND_P,
                                                            X_MODEL_P,
                                                            X_DEALER_P,
                                                            BRANCH_P,
                                                            (
                                                                SELECT HP_NO,
                                                                    DECODE((SELECT DISTINCT HP_NO FROM COLL_RECIEPT WHERE PAY_CODE = '40' AND NVL(CANCELL, 'F') = 'F' AND HP_NO = A.HP_NO), NULL, 'N', 'Y') IS_PAID40
                                                                FROM AC_PROVE A
                                                                WHERE AC_STATUS IN ('C', 'E')
                                                            ) PS,
                                                            (
                                                                SELECT * 
                                                                FROM
                                                                (
                                                                    SELECT HP_NO,
                                                                    TO_NUMBER(A.PERIOD) - TRUNC(BTW.PKG_MONTH_END.GET_TERM_PAID(A.HP_NO, TO_CHAR(SYSDATE, 'DD/MM/YYYY'), NULL, 'BTW.')) TERM_REMAIN
                                                                    FROM AC_PROVE A
                                                                    WHERE NVL(AC_STATUS, 'XXX') NOT IN ('E','C')
                                                                )
                                                                WHERE TERM_REMAIN IS NOT NULL
                                                            ) TR,
                                                            NEGO_INFO,
                                                            CALL_TRACK_INFO,
                                                            BTW.M_RBC_BOOK_CONTROL  
                                                        WHERE AC_PROVE.HP_NO = X_CUST_MAPPING_EXT.CONTRACT_NO
                                                            AND X_CUST_MAPPING_EXT.LOAN_RESULT = 'Y'
                                                            AND AC_PROVE.AC_DATE IS NOT NULL
                                                            AND CANCELL = 'F'
                                                            AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_CUST_MAPPING.APPLICATION_NUM
                                                            AND X_CUST_MAPPING.CUST_STATUS = TYPE_P.TYPE_CODE
                                                            AND X_CUST_MAPPING.CUST_NO = CUST_INFO.CUST_NO
                                                            AND CUST_INFO.FNAME = TITLE_P.TITLE_ID
                                                            AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                                                            AND X_PRODUCT_DETAIL.PRODUCT_CODE = X_MODEL_P.PRO_CODE
                                                            AND X_PRODUCT_DETAIL.BRAND_CODE = X_MODEL_P.BRAND_CODE
                                                            AND X_PRODUCT_DETAIL.MODELCODE = X_MODEL_P.MODEL_CODE
                                                            AND X_PRODUCT_DETAIL.BRAND_CODE = X_BRAND_P.BRAND_CODE
                                                            AND X_CUST_MAPPING_EXT.SL_CODE = X_DEALER_P.DL_CODE(+)
                                                            AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                                                            AND AC_PROVE.HP_NO = PS.HP_NO(+)
                                                            AND AC_PROVE.HP_NO = TR.HP_NO(+)
                                                            ${querytermremain}  
                                                            AND AC_PROVE.HP_NO = NEGO_INFO.HP_NO
                                                            AND TO_CHAR(CALL_TRACK_INFO.REC_DAY, 'DD/MM/YYYY HH24:MI:SS') = TO_CHAR(NEGO_INFO.REC_DATE(+), 'DD/MM/YYYY HH24:MI:SS') 
                                                            AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO(+)
                                                            AND NEGO_INFO.NEG_R_CODE = 'M04'
                                                        ORDER BY TO_CHAR(TO_DATE(AC_PROVE.FIRST_DUE, 'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
                                                        )    
                                                ) T
                                        )
                                ) T
                            WHERE
                                rn = 1
                                ${querysort} 
                        )
                ) BF
            `

        const sqlcount = ` SELECT COUNT ( LINE_NUMBER ) AS ROWCOUNT FROM (${sqlbase}) `

        // console.log(`sqlstr: ${sqlcount}`)

        const resultCount = await connection.execute(sqlcount, bindparams, { outFormat: oracledb.OBJECT })

        // console.log(`result count : ${JSON.stringify(resultCount.rows)}`)

        if (resultCount.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'NO RECORD FOUND',
                data: []
            })
        } else {

            try {
                rowCount = resultCount.rows[0].ROWCOUNT
                bindparams.indexstart = indexstart
                bindparams.indexend = indexend
                const finishsql = ` SELECT * FROM( ${sqlbase} ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `

                const resultSelect = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

                if (resultSelect.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No agent assign record ',
                        data: []
                    })
                } else {

                    let resData = resultSelect.rows

                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 10
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 10);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }
            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 400,
                    mesasage: `error during get list data of colletion : ${e.message}`,
                    data: []
                })
            }

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

module.exports.getagentwaitingpaymentlist = getagentwaitingpaymentlist
module.exports.getagentlastduelist = getagentlastduelist