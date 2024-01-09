const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
// const XLSX = require('xlsx');
const moment = require('moment');
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
                QOUT.*
            FROM
                (
                    SELECT
                        BF.hp_no,
                        BF.reg_status,
                        BF.branch_code,
                        BF.branch_name,
                        BF.IS_PAID40,
                        BF.STAFF_ID,
                        BF.REC_DATE,
                        BTW.GET_EMP_NAME (STAFF_ID) AS STAFF_NAME,
                        BF.RN
                    FROM
                        (
                            SELECT
                                CH1.hp_no,
                                CH1.reg_status,
                                CH1.branch_code,
                                CH1.branch_name,
                                CH1.IS_PAID40,
                                CH1.RN,
                                NEG2.STAFF_ID,
                                NEG2.REC_DATE
                            FROM
                                (
                                    SELECT
                                        T3.hp_no,
                                        T3.first_due,
                                        T3.reg_status,
                                        T3.branch_code,
                                        T3.branch_name,
                                        T3.IS_PAID40,
                                        T3.RN
                                    FROM
                                        (
                                            SELECT
                                                hp_no,
                                                first_due,
                                                reg_status,
                                                branch_code,
                                                branch_name,
                                                NVL (IS_PAID40, 'N') AS IS_PAID40,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        first_due DESC
                                                ) AS RN
                                            FROM
                                                (
                                                    SELECT
                                                        ROWNUM AS LINE_NUMBER,
                                                        T2.*
                                                    FROM
                                                        (
                                                            SELECT
                                                                ROWNUM AS LINE_NUMBER,
                                                                T.*
                                                            FROM
                                                                (
                                                                    SELECT DISTINCT
                                                                        hp_no,
                                                                        first_due,
                                                                        reg_status,
                                                                        branch_code,
                                                                        branch_name,
                                                                        NVL (IS_PAID40, 'N') AS IS_PAID40
                                                                    FROM
                                                                        (
                                                                            SELECT
                                                                                AC_PROVE.hp_no AS hp_no,
                                                                                AC_PROVE.FIRST_DUE,
                                                                                M_RBC_BOOK_CONTROL.STATUS AS REG_STATUS,
                                                                                branch_p.branch_code,
                                                                                branch_p.branch_name,
                                                                                NVL (PS.IS_PAID40, 'N') AS IS_PAID40
                                                                            FROM
                                                                                AC_PROVE,
                                                                                x_cust_mapping_ext,
                                                                                x_cust_mapping,
                                                                                type_p,
                                                                                title_p,
                                                                                X_PRODUCT_DETAIL,
                                                                                X_BRAND_P,
                                                                                X_MODEL_P,
                                                                                X_DEALER_P,
                                                                                BRANCH_P,
                                                                                (
                                                                                    SELECT
                                                                                        hp_no,
                                                                                        DECODE (
                                                                                            (
                                                                                                SELECT DISTINCT
                                                                                                    HP_NO
                                                                                                FROM
                                                                                                    COLL_RECIEPT
                                                                                                WHERE
                                                                                                    PAY_CODE = '40'
                                                                                                    AND NVL (CANCELL, 'F') = 'F'
                                                                                                    AND HP_NO = A.HP_NO
                                                                                            ),
                                                                                            NULL,
                                                                                            'N',
                                                                                            'Y'
                                                                                        ) IS_PAID40
                                                                                    FROM
                                                                                        AC_PROVE A
                                                                                    WHERE
                                                                                        AC_STATUS IN ('C', 'E')
                                                                                ) PS,
                                                                                BTW.M_RBC_BOOK_CONTROL
                                                                            WHERE
                                                                                AC_PROVE.HP_NO = x_cust_mapping_ext.CONTRACT_NO
                                                                                AND x_cust_mapping_ext.LOAN_RESULT = 'Y'
                                                                                AND AC_PROVE.AC_DATE IS NOT NULL
                                                                                AND CANCELL = 'F'
                                                                                AND x_cust_mapping_ext.APPLICATION_NUM = x_cust_mapping.APPLICATION_NUM
                                                                                AND x_cust_mapping.CUST_STATUS = type_p.TYPE_CODE
                                                                                AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                                                                                AND X_PRODUCT_DETAIL.PRODUCT_CODE = X_MODEL_P.PRO_CODE
                                                                                AND X_PRODUCT_DETAIL.BRAND_CODE = X_MODEL_P.BRAND_CODE
                                                                                AND X_PRODUCT_DETAIL.MODELCODE = X_MODEL_P.MODEL_CODE
                                                                                AND X_PRODUCT_DETAIL.BRAND_CODE = X_BRAND_P.BRAND_CODE
                                                                                AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE (+)
                                                                                AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE (+)
                                                                                AND AC_PROVE.HP_NO = PS.HP_NO (+)
                                                                                AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO (+)
                                                                                AND AC_PROVE.AC_STATUS IN ('E', 'C')
                                                                                ${queryhpno}${querybranch}${querypaidstatus}
                                                                            ORDER BY
                                                                                TO_CHAR (TO_DATE (AC_PROVE.FIRST_DUE, 'DD/MM/YYYY'), 'DD') ASC,
                                                                                AC_PROVE.HP_NO ASC
                                                                        )
                                                                ) T
                                                        ) T2
                                                )
                                        ) T3
                                    WHERE
                                        RN = 1
                                ) CH1,
                                (
                                    SELECT
                                        HP_NO,
                                        STAFF_ID,
                                        REC_DATE
                                    FROM
                                        (
                                            SELECT
                                                HP_NO,
                                                STAFF_ID,
                                                REC_DATE,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        REC_DATE DESC
                                                ) AS RNI
                                            FROM
                                                NEGO_INFO NEG
                                            WHERE
                                                NEG.NEG_R_CODE = 'M04'
                                        ) NEG1
                                    WHERE
                                        RNI = 1
                                ) NEG2
                            WHERE
                                CH1.HP_NO = NEG2.HP_NO (+)
                        ) BF
                        ${querysort}
                ) QOUT
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
            querysort = `ORDER BY TERM_REMAIN ASC `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                QOUT.*
            FROM
                (
                    SELECT
                        BF.hp_no,
                        BF.last_due,
                        BF.last_due_date,
                        BF.reg_status,
                        BF.branch_code,
                        BF.branch_name,
                        BF.IS_PAID40,
                        BF.TERM_REMAIN,
                        BF.STAFF_ID,
                        BF.REC_DATE,
                        BTW.GET_EMP_NAME (STAFF_ID) AS STAFF_NAME,
                        BF.RN
                    FROM
                        (
                            SELECT
                                CH1.hp_no,
                                CH1.last_due,
                                CH1.last_due_date,
                                CH1.reg_status,
                                CH1.branch_code,
                                CH1.branch_name,
                                CH1.IS_PAID40,
                                CH1.TERM_REMAIN,
                                CH1.RN,
                                NEG2.STAFF_ID,
                                NEG2.REC_DATE
                            FROM
                                (
                                    SELECT
                                        T3.hp_no,
                                        T3.last_due,
                                        T3.last_due_date,
                                        T3.reg_status,
                                        T3.branch_code,
                                        T3.branch_name,
                                        T3.IS_PAID40,
                                        T3.TERM_REMAIN,
                                        T3.RN
                                    FROM
                                        (
                                            SELECT
                                                hp_no,
                                                last_due,
                                                last_due_date,
                                                reg_status,
                                                branch_code,
                                                branch_name,
                                                NVL (IS_PAID40, 'N') AS IS_PAID40,
                                                TERM_REMAIN,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        last_due DESC
                                                ) AS RN
                                            FROM
                                                (
                                                    SELECT
                                                        ROWNUM AS LINE_NUMBER,
                                                        T2.*
                                                    FROM
                                                        (
                                                            SELECT DISTINCT
                                                                hp_no,
                                                                last_due,
                                                                last_due_date,
                                                                reg_status,
                                                                branch_code,
                                                                branch_name,
                                                                TERM_REMAIN,
                                                                NVL (IS_PAID40, 'N') AS IS_PAID40
                                                            FROM
                                                                (
                                                                    SELECT
                                                                        AC_PROVE.HP_NO AS HP_NO,
                                                                        AC_PROVE.LAST_DUE,
                                                                        TO_DATE (AC_PROVE.LAST_DUE, 'DD/MM/YYYY') AS LAST_DUE_DATE,
                                                                        M_RBC_BOOK_CONTROL.STATUS AS REG_STATUS,
                                                                        BRANCH_P.BRANCH_CODE,
                                                                        BRANCH_P.BRANCH_NAME,
                                                                        NVL (PS.IS_PAID40, 'N') AS IS_PAID40,
                                                                        TR.TERM_REMAIN
                                                                    FROM
                                                                        AC_PROVE,
                                                                        X_CUST_MAPPING_EXT,
                                                                        X_CUST_MAPPING,
                                                                        TYPE_P,
                                                                        X_PRODUCT_DETAIL,
                                                                        X_BRAND_P,
                                                                        X_MODEL_P,
                                                                        X_DEALER_P,
                                                                        BRANCH_P,
                                                                        (
                                                                            SELECT
                                                                                HP_NO,
                                                                                DECODE (
                                                                                    (
                                                                                        SELECT DISTINCT
                                                                                            HP_NO
                                                                                        FROM
                                                                                            COLL_RECIEPT
                                                                                        WHERE
                                                                                            PAY_CODE = '40'
                                                                                            AND NVL (CANCELL, 'F') = 'F'
                                                                                            AND HP_NO = A.HP_NO
                                                                                    ),
                                                                                    NULL,
                                                                                    'N',
                                                                                    'Y'
                                                                                ) IS_PAID40
                                                                            FROM
                                                                                AC_PROVE A
                                                                            WHERE
                                                                                NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                        ) PS,
                                                                        (
                                                                            SELECT
                                                                                *
                                                                            FROM
                                                                                (
                                                                                    SELECT
                                                                                        HP_NO,
                                                                                        TO_NUMBER (A.PERIOD) - TRUNC (
                                                                                            BTW.PKG_MONTH_END.GET_TERM_PAID (
                                                                                                A.HP_NO,
                                                                                                TO_CHAR (SYSDATE, 'DD/MM/YYYY'),
                                                                                                NULL,
                                                                                                'BTW.'
                                                                                            )
                                                                                        ) TERM_REMAIN
                                                                                    FROM
                                                                                        AC_PROVE A
                                                                                    WHERE
                                                                                        NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                                )
                                                                            WHERE
                                                                                TERM_REMAIN IS NOT NULL
                                                                        ) TR,
                                                                        BTW.M_RBC_BOOK_CONTROL
                                                                    WHERE
                                                                        AC_PROVE.HP_NO = X_CUST_MAPPING_EXT.CONTRACT_NO
                                                                        AND X_CUST_MAPPING_EXT.LOAN_RESULT = 'Y'
                                                                        AND AC_PROVE.AC_DATE IS NOT NULL
                                                                        AND CANCELL = 'F'
                                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_CUST_MAPPING.APPLICATION_NUM
                                                                        AND X_CUST_MAPPING.CUST_STATUS = TYPE_P.TYPE_CODE
                                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                                                                        AND X_PRODUCT_DETAIL.PRODUCT_CODE = X_MODEL_P.PRO_CODE
                                                                        AND X_PRODUCT_DETAIL.BRAND_CODE = X_MODEL_P.BRAND_CODE
                                                                        AND X_PRODUCT_DETAIL.MODELCODE = X_MODEL_P.MODEL_CODE
                                                                        AND X_PRODUCT_DETAIL.BRAND_CODE = X_BRAND_P.BRAND_CODE
                                                                        AND X_CUST_MAPPING_EXT.SL_CODE = X_DEALER_P.DL_CODE (+)
                                                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE (+)
                                                                        AND AC_PROVE.HP_NO = PS.HP_NO (+)
                                                                        AND AC_PROVE.HP_NO = TR.HP_NO (+)
                                                                        AND NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                        ${querytermremain}  
                                                                        AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO (+)
                                                                        --ORDER BY TO_CHAR(TO_DATE(AC_PROVE.FIRST_DUE, 'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
                                                                ) T
                                                        ) T2
                                                )
                                        ) T3
                                    WHERE
                                        RN = 1
                                ) CH1,
                                (
                                    SELECT
                                        HP_NO,
                                        STAFF_ID,
                                        REC_DATE
                                    FROM
                                        (
                                            SELECT
                                                HP_NO,
                                                STAFF_ID,
                                                REC_DATE,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        REC_DATE DESC
                                                ) AS RNI
                                            FROM
                                                NEGO_INFO NEG
                                            WHERE
                                                NEG.NEG_R_CODE = 'M04'
                                        ) NEG1
                                    WHERE
                                        RNI = 1
                                ) NEG2
                            WHERE
                                CH1.HP_NO = NEG2.HP_NO (+)
                        ) BF
                        ${querysort}
                ) QOUT
            `

        const sqlcount = ` SELECT COUNT ( LINE_NUMBER ) AS ROWCOUNT FROM (${sqlbase}) `

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

async function getagentlastduelistexcel(req, res, next) {

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
        // const indexstart = (pageno - 1) * 10 + 1
        // const indexend = (pageno * 10)
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
            querysort = `ORDER BY TERM_REMAIN ASC `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                QOUT.*
            FROM
                (
                    SELECT
                        BF.hp_no,
                        BF.contract_no,
                        customer_fullname,
                        create_contract_date,
                        term,
                        monthly,
                        address1,
                        reg_number,
                        BF.last_due,
                        BF.last_due_date,
                        BF.reg_status,
                        BF.branch_code,
                        BF.branch_name,
                        BF.IS_PAID40,
                        BF.TERM_REMAIN,
                        BF.STAFF_ID,
                        BF.REC_DATE,
                        BTW.GET_EMP_NAME (STAFF_ID) AS STAFF_NAME,
                        BF.RN
                    FROM
                        (
                            SELECT
                                CH1.hp_no,
                                CH1.contract_no,
                                customer_fullname,
                                create_contract_date,
                                term,
                                monthly,
                                address1,
                                reg_number,
                                CH1.last_due,
                                CH1.last_due_date,
                                CH1.reg_status,
                                CH1.branch_code,
                                CH1.branch_name,
                                CH1.IS_PAID40,
                                CH1.TERM_REMAIN,
                                CH1.RN,
                                NEG2.STAFF_ID,
                                NEG2.REC_DATE
                            FROM
                                (
                                    SELECT
                                        T3.hp_no,
                                        T3.contract_no,
                                        customer_fullname,
                                        create_contract_date,
                                        term,
                                        monthly,
                                        address1,
                                        reg_number,
                                        T3.last_due,
                                        T3.last_due_date,
                                        T3.reg_status,
                                        T3.branch_code,
                                        T3.branch_name,
                                        T3.IS_PAID40,
                                        T3.TERM_REMAIN,
                                        T3.RN
                                    FROM
                                        (
                                            SELECT
                                                hp_no,
                                                contract_no,
                                                customer_fullname,
                                                create_contract_date,
                                                term,
                                                monthly,
                                                address1,
                                                reg_number,
                                                last_due,
                                                last_due_date,
                                                reg_status,
                                                branch_code,
                                                branch_name,
                                                NVL (IS_PAID40, 'N') AS IS_PAID40,
                                                TERM_REMAIN,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        last_due DESC
                                                ) AS RN
                                            FROM
                                                (
                                                    SELECT
                                                        ROWNUM AS LINE_NUMBER,
                                                        T2.*
                                                    FROM
                                                        (
                                                            SELECT DISTINCT
                                                                hp_no,
                                                                contract_no,
                                                                customer_fullname,
                                                                create_contract_date,
                                                                term,
                                                                monthly,
                                                                address1,
                                                                reg_number,
                                                                last_due,
                                                                last_due_date,
                                                                reg_status,
                                                                branch_code,
                                                                branch_name,
                                                                TERM_REMAIN,
                                                                NVL (IS_PAID40, 'N') AS IS_PAID40
                                                            FROM
                                                                (
                                                                    SELECT
                                                                        AC_PROVE.HP_NO AS HP_NO,
                                                                        X_CUST_MAPPING_EXT.CONTRACT_NO,
                                                                        TITLE_P.TITLE_NAME || ' ' || CUST_INFO.NAME || '  ' || CUST_INFO.SNAME AS CUSTOMER_FULLNAME,
                                                                        X_CUST_MAPPING_EXT.CREATE_CONTRACT_DATE,
                                                                        X_CUST_MAPPING_EXT.TERM,
                                                                        AC_PROVE.MONTHLY,
                                                                        BTW.func_GetCustAddr (
                                                                            X_CUST_MAPPING_EXT.APPLICATION_NUM,
                                                                            CUST_INFO.CUST_NO,
                                                                            '02'
                                                                        ) AS ADDRESS1,
                                                                        AC_PROVE.REG_NO || ' ' || PROVINCE_P.PROV_NAME AS REG_NUMBER,
                                                                        AC_PROVE.LAST_DUE,
                                                                        TO_DATE (AC_PROVE.LAST_DUE, 'DD/MM/YYYY') AS LAST_DUE_DATE,
                                                                        M_RBC_BOOK_CONTROL.STATUS AS REG_STATUS,
                                                                        BRANCH_P.BRANCH_CODE,
                                                                        BRANCH_P.BRANCH_NAME,
                                                                        NVL (PS.IS_PAID40, 'N') AS IS_PAID40,
                                                                        TR.TERM_REMAIN
                                                                    FROM
                                                                        AC_PROVE,
                                                                        X_CUST_MAPPING_EXT,
                                                                        X_CUST_MAPPING,
                                                                        TITLE_P,
                                                                        CUST_INFO,
                                                                        TYPE_P,
                                                                        X_PRODUCT_DETAIL,
                                                                        X_BRAND_P,
                                                                        X_MODEL_P,
                                                                        X_DEALER_P,
                                                                        BRANCH_P,
                                                                        PROVINCE_P,
                                                                        (
                                                                            SELECT
                                                                                HP_NO,
                                                                                DECODE (
                                                                                    (
                                                                                        SELECT DISTINCT
                                                                                            HP_NO
                                                                                        FROM
                                                                                            COLL_RECIEPT
                                                                                        WHERE
                                                                                            PAY_CODE = '40'
                                                                                            AND NVL (CANCELL, 'F') = 'F'
                                                                                            AND HP_NO = A.HP_NO
                                                                                    ),
                                                                                    NULL,
                                                                                    'N',
                                                                                    'Y'
                                                                                ) IS_PAID40
                                                                            FROM
                                                                                AC_PROVE A
                                                                            WHERE
                                                                                NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                        ) PS,
                                                                        (
                                                                            SELECT
                                                                                *
                                                                            FROM
                                                                                (
                                                                                    SELECT
                                                                                        HP_NO,
                                                                                        TO_NUMBER (A.PERIOD) - TRUNC (
                                                                                            BTW.PKG_MONTH_END.GET_TERM_PAID (
                                                                                                A.HP_NO,
                                                                                                TO_CHAR (SYSDATE, 'DD/MM/YYYY'),
                                                                                                NULL,
                                                                                                'BTW.'
                                                                                            )
                                                                                        ) TERM_REMAIN
                                                                                    FROM
                                                                                        AC_PROVE A
                                                                                    WHERE
                                                                                        NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                                )
                                                                            WHERE
                                                                                TERM_REMAIN IS NOT NULL
                                                                        ) TR,
                                                                        BTW.M_RBC_BOOK_CONTROL
                                                                    WHERE
                                                                        AC_PROVE.HP_NO = X_CUST_MAPPING_EXT.CONTRACT_NO
                                                                        AND X_CUST_MAPPING_EXT.LOAN_RESULT = 'Y'
                                                                        AND AC_PROVE.AC_DATE IS NOT NULL
                                                                        AND CANCELL = 'F'
                                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_CUST_MAPPING.APPLICATION_NUM
                                                                        AND X_CUST_MAPPING.CUST_STATUS = TYPE_P.TYPE_CODE
                                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                                                                        AND X_PRODUCT_DETAIL.PRODUCT_CODE = X_MODEL_P.PRO_CODE
                                                                        AND X_PRODUCT_DETAIL.BRAND_CODE = X_MODEL_P.BRAND_CODE
                                                                        AND X_PRODUCT_DETAIL.MODELCODE = X_MODEL_P.MODEL_CODE
                                                                        AND X_PRODUCT_DETAIL.BRAND_CODE = X_BRAND_P.BRAND_CODE
                                                                        AND X_CUST_MAPPING_EXT.SL_CODE = X_DEALER_P.DL_CODE (+)
                                                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE (+)
                                                                        AND AC_PROVE.HP_NO = PS.HP_NO (+)
                                                                        AND AC_PROVE.HP_NO = TR.HP_NO (+)
                                                                        AND NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                        ${querytermremain}  
                                                                        AND TERM_REMAIN = 39
                                                                        AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO (+)
                                                                        AND CUST_INFO.FNAME = TITLE_P.TITLE_ID (+)
                                                                        AND X_CUST_MAPPING.CUST_NO = CUST_INFO.CUST_NO
                                                                        AND AC_PROVE.REG_CITY = PROVINCE_P.PROV_CODE
                                                                        --ORDER BY TO_CHAR(TO_DATE(AC_PROVE.FIRST_DUE, 'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
                                                                ) T
                                                        ) T2
                                                )
                                        ) T3
                                    WHERE
                                        RN = 1
                                ) CH1,
                                (
                                    SELECT
                                        HP_NO,
                                        STAFF_ID,
                                        REC_DATE
                                    FROM
                                        (
                                            SELECT
                                                HP_NO,
                                                STAFF_ID,
                                                REC_DATE,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        REC_DATE DESC
                                                ) AS RNI
                                            FROM
                                                NEGO_INFO NEG
                                            WHERE
                                                NEG.NEG_R_CODE = 'M04'
                                        ) NEG1
                                    WHERE
                                        RNI = 1
                                ) NEG2
                            WHERE
                                CH1.HP_NO = NEG2.HP_NO (+)
                        ) BF
                        ${querysort}
                ) QOUT
            `

        const sqlcount = ` SELECT COUNT ( LINE_NUMBER ) AS ROWCOUNT FROM (${sqlbase}) `

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
                // bindparams.indexstart = indexstart
                // bindparams.indexend = indexend
                // const finishsql = ` SELECT * FROM( ${sqlbase} ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `
                const finishsql = ` SELECT * FROM( ${sqlbase} )`

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
                    // returnData.CurrentPage = Number(pageno)
                    // returnData.pageSize = 10
                    returnData.rowCount = rowCount
                    // returnData.pageCount = Math.ceil(rowCount / 10);

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

async function getagentlastduelistexceldownload(req, res, next) {

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
        // const indexstart = (pageno - 1) * 10 + 1
        // const indexend = (pageno * 10)
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
            querysort = `ORDER BY TERM_REMAIN ASC `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                QOUT.*
            FROM
                (
                    SELECT
                        BF.hp_no,
                        BF.contract_no,
                        customer_fullname,
                        create_contract_date,
                        term,
                        monthly,
                        address1,
                        reg_number,
                        BF.last_due,
                        BF.last_due_date,
                        BF.reg_status,
                        BF.branch_code,
                        BF.branch_name,
                        BF.IS_PAID40,
                        BF.TERM_REMAIN,
                        BF.STAFF_ID,
                        BF.REC_DATE,
                        BTW.GET_EMP_NAME (STAFF_ID) AS STAFF_NAME,
                        BF.RN
                    FROM
                        (
                            SELECT
                                CH1.hp_no,
                                CH1.contract_no,
                                customer_fullname,
                                create_contract_date,
                                term,
                                monthly,
                                address1,
                                reg_number,
                                CH1.last_due,
                                CH1.last_due_date,
                                CH1.reg_status,
                                CH1.branch_code,
                                CH1.branch_name,
                                CH1.IS_PAID40,
                                CH1.TERM_REMAIN,
                                CH1.RN,
                                NEG2.STAFF_ID,
                                NEG2.REC_DATE
                            FROM
                                (
                                    SELECT
                                        T3.hp_no,
                                        T3.contract_no,
                                        customer_fullname,
                                        create_contract_date,
                                        term,
                                        monthly,
                                        address1,
                                        reg_number,
                                        T3.last_due,
                                        T3.last_due_date,
                                        T3.reg_status,
                                        T3.branch_code,
                                        T3.branch_name,
                                        T3.IS_PAID40,
                                        T3.TERM_REMAIN,
                                        T3.RN
                                    FROM
                                        (
                                            SELECT
                                                hp_no,
                                                contract_no,
                                                customer_fullname,
                                                create_contract_date,
                                                term,
                                                monthly,
                                                address1,
                                                reg_number,
                                                last_due,
                                                last_due_date,
                                                reg_status,
                                                branch_code,
                                                branch_name,
                                                NVL (IS_PAID40, 'N') AS IS_PAID40,
                                                TERM_REMAIN,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        last_due DESC
                                                ) AS RN
                                            FROM
                                                (
                                                    SELECT
                                                        ROWNUM AS LINE_NUMBER,
                                                        T2.*
                                                    FROM
                                                        (
                                                            SELECT DISTINCT
                                                                hp_no,
                                                                contract_no,
                                                                customer_fullname,
                                                                create_contract_date,
                                                                term,
                                                                monthly,
                                                                address1,
                                                                reg_number,
                                                                last_due,
                                                                last_due_date,
                                                                reg_status,
                                                                branch_code,
                                                                branch_name,
                                                                TERM_REMAIN,
                                                                NVL (IS_PAID40, 'N') AS IS_PAID40
                                                            FROM
                                                                (
                                                                    SELECT
                                                                        AC_PROVE.HP_NO AS HP_NO,
                                                                        X_CUST_MAPPING_EXT.CONTRACT_NO,
                                                                        TITLE_P.TITLE_NAME || ' ' || CUST_INFO.NAME || '  ' || CUST_INFO.SNAME AS CUSTOMER_FULLNAME,
                                                                        X_CUST_MAPPING_EXT.CREATE_CONTRACT_DATE,
                                                                        X_CUST_MAPPING_EXT.TERM,
                                                                        AC_PROVE.MONTHLY,
                                                                        BTW.func_GetCustAddr (
                                                                            X_CUST_MAPPING_EXT.APPLICATION_NUM,
                                                                            CUST_INFO.CUST_NO,
                                                                            '02'
                                                                        ) AS ADDRESS1,
                                                                        AC_PROVE.REG_NO || ' ' || PROVINCE_P.PROV_NAME AS REG_NUMBER,
                                                                        AC_PROVE.LAST_DUE,
                                                                        TO_DATE (AC_PROVE.LAST_DUE, 'DD/MM/YYYY') AS LAST_DUE_DATE,
                                                                        M_RBC_BOOK_CONTROL.STATUS AS REG_STATUS,
                                                                        BRANCH_P.BRANCH_CODE,
                                                                        BRANCH_P.BRANCH_NAME,
                                                                        NVL (PS.IS_PAID40, 'N') AS IS_PAID40,
                                                                        TR.TERM_REMAIN
                                                                    FROM
                                                                        AC_PROVE,
                                                                        X_CUST_MAPPING_EXT,
                                                                        X_CUST_MAPPING,
                                                                        TITLE_P,
                                                                        CUST_INFO,
                                                                        TYPE_P,
                                                                        X_PRODUCT_DETAIL,
                                                                        X_BRAND_P,
                                                                        X_MODEL_P,
                                                                        X_DEALER_P,
                                                                        BRANCH_P,
                                                                        PROVINCE_P,
                                                                        (
                                                                            SELECT
                                                                                HP_NO,
                                                                                DECODE (
                                                                                    (
                                                                                        SELECT DISTINCT
                                                                                            HP_NO
                                                                                        FROM
                                                                                            COLL_RECIEPT
                                                                                        WHERE
                                                                                            PAY_CODE = '40'
                                                                                            AND NVL (CANCELL, 'F') = 'F'
                                                                                            AND HP_NO = A.HP_NO
                                                                                    ),
                                                                                    NULL,
                                                                                    'N',
                                                                                    'Y'
                                                                                ) IS_PAID40
                                                                            FROM
                                                                                AC_PROVE A
                                                                            WHERE
                                                                                NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                        ) PS,
                                                                        (
                                                                            SELECT
                                                                                *
                                                                            FROM
                                                                                (
                                                                                    SELECT
                                                                                        HP_NO,
                                                                                        TO_NUMBER (A.PERIOD) - TRUNC (
                                                                                            BTW.PKG_MONTH_END.GET_TERM_PAID (
                                                                                                A.HP_NO,
                                                                                                TO_CHAR (SYSDATE, 'DD/MM/YYYY'),
                                                                                                NULL,
                                                                                                'BTW.'
                                                                                            )
                                                                                        ) TERM_REMAIN
                                                                                    FROM
                                                                                        AC_PROVE A
                                                                                    WHERE
                                                                                        NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                                )
                                                                            WHERE
                                                                                TERM_REMAIN IS NOT NULL
                                                                        ) TR,
                                                                        BTW.M_RBC_BOOK_CONTROL
                                                                    WHERE
                                                                        AC_PROVE.HP_NO = X_CUST_MAPPING_EXT.CONTRACT_NO
                                                                        AND X_CUST_MAPPING_EXT.LOAN_RESULT = 'Y'
                                                                        AND AC_PROVE.AC_DATE IS NOT NULL
                                                                        AND CANCELL = 'F'
                                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_CUST_MAPPING.APPLICATION_NUM
                                                                        AND X_CUST_MAPPING.CUST_STATUS = TYPE_P.TYPE_CODE
                                                                        AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                                                                        AND X_PRODUCT_DETAIL.PRODUCT_CODE = X_MODEL_P.PRO_CODE
                                                                        AND X_PRODUCT_DETAIL.BRAND_CODE = X_MODEL_P.BRAND_CODE
                                                                        AND X_PRODUCT_DETAIL.MODELCODE = X_MODEL_P.MODEL_CODE
                                                                        AND X_PRODUCT_DETAIL.BRAND_CODE = X_BRAND_P.BRAND_CODE
                                                                        AND X_CUST_MAPPING_EXT.SL_CODE = X_DEALER_P.DL_CODE (+)
                                                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE (+)
                                                                        AND AC_PROVE.HP_NO = PS.HP_NO (+)
                                                                        AND AC_PROVE.HP_NO = TR.HP_NO (+)
                                                                        AND NVL (AC_STATUS, 'XXX') NOT IN ('E', 'C')
                                                                        ${querytermremain}  
                                                                        AND TERM_REMAIN = 39
                                                                        AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO (+)
                                                                        AND CUST_INFO.FNAME = TITLE_P.TITLE_ID (+)
                                                                        AND X_CUST_MAPPING.CUST_NO = CUST_INFO.CUST_NO
                                                                        AND AC_PROVE.REG_CITY = PROVINCE_P.PROV_CODE
                                                                        --ORDER BY TO_CHAR(TO_DATE(AC_PROVE.FIRST_DUE, 'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
                                                                ) T
                                                        ) T2
                                                )
                                        ) T3
                                    WHERE
                                        RN = 1
                                ) CH1,
                                (
                                    SELECT
                                        HP_NO,
                                        STAFF_ID,
                                        REC_DATE
                                    FROM
                                        (
                                            SELECT
                                                HP_NO,
                                                STAFF_ID,
                                                REC_DATE,
                                                ROW_NUMBER() OVER (
                                                    PARTITION BY
                                                        HP_NO
                                                    ORDER BY
                                                        REC_DATE DESC
                                                ) AS RNI
                                            FROM
                                                NEGO_INFO NEG
                                            WHERE
                                                NEG.NEG_R_CODE = 'M04'
                                        ) NEG1
                                    WHERE
                                        RNI = 1
                                ) NEG2
                            WHERE
                                CH1.HP_NO = NEG2.HP_NO (+)
                        ) BF
                        ${querysort}
                ) QOUT
            `

        const sqlcount = ` SELECT COUNT ( LINE_NUMBER ) AS ROWCOUNT FROM (${sqlbase}) `

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
                // bindparams.indexstart = indexstart
                // bindparams.indexend = indexend
                // const finishsql = ` SELECT * FROM( ${sqlbase} ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `
                const finishsql = ` SELECT * FROM( ${sqlbase} )`

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

                    const jsonData = mapAndRenameKeys(lowerResData)


                    // try to create excel 

                    try {

                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.json_to_sheet(jsonData);
                        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

                        // Generate a Blob containing the Excel file
                        // const excelBlob = XLSX.write(wb, { bookType: 'xlsx', type: 'blob' });
                        // const excelBlob = XLSX.writeFile(wb, "Presidents.xlsx");
                        const excelBlob = XLSX.writeFile(wb, 'test1', { bookType: 'xlsx'});

                        console.log(`ho`)
                        // Stage 2: Send the file to the client
                        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                        res.setHeader('Content-Disposition', 'attachment; filename=test1.xlsx');

                        excelBlob.arrayBuffer().then((buffer) => {
                            // Stream the buffer to the response
                            res.end(Buffer.from(buffer));
                        });


                    } catch (e) {
                        console.error(e)
                        return res.status(200).send({
                            status: 400,
                            message: `Fail during export to excel via api : ${e.message ? e.message : `no msg`}`,
                            data: []
                        })
                    }


                    // let returnData = new Object
                    // returnData.data = lowerResData
                    // returnData.status = 200
                    // returnData.message = 'success'
                    // returnData.rowCount = rowCount

                    // // === tran all upperCase to lowerCase === 
                    // let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                    //     result[key.toLowerCase()] = val;
                    // });

                    // // res.status(200).json(results.rows[0]);
                    // res.status(200).json(returnDatalowerCase);
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

// line_number: number
// hp_no: string
// contract_no: string
// customer_fullname: string
// create_contract_date: string
// term: number
// monthly: string
// address1: string
// reg_number: string
// last_due: string
// last_due_date: string
// reg_status?: string
// branch_code?: string
// branch_name?: string
// is_paid40: string
// term_remain: number
// staff_id?: string
// rec_date?: string
// staff_name?: string
// reg_status_client: string
// is_paid40_client: string

// Function to map and rename keys
function mapAndRenameKeys(data) {
    return data.map(item => {
        return {
            'ชื่อ-นามสกุล': item.customer_fullname,
            'หมายเลขทะเบียนรถ': item.reg_number,
            'เลขที่สัญญา': item.customer_fullname,
            'สาขาที่ทำสัญญา': item.branch_name,
            'วันที่ทำสัญญา': moment(item.create_contract_date).format('DD/MM/YYYY'),
            'จำนวนงวดที่ผ่อนชำระทั้งหมด': item.term,
            'ค่างวดต่อเดือน': item.monthly,
            'ที่อยู่ตามสัญญาลูกค้า': item.address1
            // Add more key mappings as needed
        };
    });
}

module.exports.getagentwaitingpaymentlist = getagentwaitingpaymentlist
module.exports.getagentlastduelist = getagentlastduelist
module.exports.getagentlastduelistexcel = getagentlastduelistexcel
module.exports.getagentlastduelistexceldownload = getagentlastduelistexceldownload