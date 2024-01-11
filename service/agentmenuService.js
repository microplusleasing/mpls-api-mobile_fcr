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
                                                                        AC_PROVE.REG_NO || ' ' ||    (
                                                                            SELECT PROV_NAME
                                                                            FROM PROVINCE_P
                                                                            WHERE PROV_CODE =  AC_PROVE.REG_CITY 
                                                                            
                                                                        ) AS REG_NUMBER,
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
                                                                        AND AC_PROVE.HP_NO = M_RBC_BOOK_CONTROL.CONTRACT_NO (+)
                                                                        AND CUST_INFO.FNAME = TITLE_P.TITLE_ID (+)
                                                                        AND X_CUST_MAPPING.CUST_NO = CUST_INFO.CUST_NO
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
                        const excelBlob = XLSX.writeFile(wb, 'test1', { bookType: 'xlsx' });

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

async function getprefirstduelist(req, res, next) {

    let connection;
    try {

        const { pageno, approve_month, approve_year, branch_code, sort_type, sort_field } = req.body


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

        let query_approve_month = ''
        let query_approve_year = ''
        let query_branch_code = ''
        let querysort = ''



        if (approve_month) {
            query_approve_month = ` AND EXTRACT(MONTH FROM XCME.APPROVE_DATE) = :approve_month `
            bindparams.approve_month = approve_month
        } else {
            query_approve_month = ` AND EXTRACT(MONTH FROM XCME.APPROVE_DATE) = EXTRACT(MONTH FROM SYSDATE) `
        }

        if (approve_year) {
            query_approve_year = ` AND EXTRACT(YEAR FROM XCME.APPROVE_DATE) = :approve_year `
            bindparams.approve_year = approve_year
        } else {
            query_approve_year = ` AND EXTRACT(YEAR FROM XCME.APPROVE_DATE) = EXTRACT(YEAR FROM SYSDATE) `
        }

        if (branch_code) {
            if (branch_code !== '0') {                
                query_branch_code = ` AND DL.DL_BRANCH = :branch_code `
                bindparams.branch_code = branch_code
            } else {
                query_branch_code = ``
            }
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` ORDER BY APPROVE_DATE ASC `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `
            SELECT 
                ROWNUM AS LINE_NUMBER,
                PREFD.*
            FROM    
            (
                SELECT
                    XCME.CONTRACT_NO,
                    CI.NAME AS CUSTOMER_NAME,
                    CI.SNAME AS CUSTOMER_SURNAME,
                    TP.TITLE_NAME || ' ' || CI.NAME || '  ' || CI.SNAME AS CUSTOMER_FULLNAME,
                    DL.DL_BRANCH AS BRANCH_CODE, 
                    XSC.FIRST_DUE,
                    TO_DATE(TO_CHAR(XSC.FIRST_DUE,'DD')||'/'||TO_CHAR(sysdate,'MM')||'/'||TO_CHAR(sysdate,'YYYY'),'dd/mm/yyyy') AS NEXT_DUE, 
                    XCME.APPROVE_DATE, 
                    BTW.GET_BRANCH_SL_BY_HP_NO(XCME.CONTRACT_NO) AS BRANCH_NAME,
                    AP.BILL,
                    AP.BILL_SUB,
                    AP.MONTHLY,
                    NI.STATUS_RECALL
                FROM 
                    X_CUST_MAPPING_EXT XCME,
                    X_CUST_MAPPING XCM,
                    AC_PROVE AP,
                    TITLE_P TP,
                    CUST_INFO CI,
                    PROVINCE_P PP,
                    X_DEALER_P DL,
                    BTW.X_SAMM_CONTRACT XSC,
                    (
                        SELECT HP_NO,
                            CASE WHEN MAX(CASE WHEN neg_r_code = 'X01' THEN 1 ELSE 0 END) = 1 THEN 'ติดต่อแล้ว' ELSE 'รอการติดต่อ' END AS STATUS_RECALL
                        FROM 
                            NEGO_INFO
                        GROUP BY HP_NO
                    ) NI
                WHERE 
                    XCME.APPLICATION_NUM = XCM.APPLICATION_NUM
                    AND XCME.CONTRACT_NO = AP.HP_NO
                    AND XCM.CUST_STATUS = '0'
                    AND XCME.LOAN_RESULT = 'Y'
                    AND CI.FNAME = TP.TITLE_ID (+)
                    AND XCM.CUST_NO = CI.CUST_NO
                    AND NI.HP_NO = AP.HP_NO
                    AND XCME.SL_CODE = DL.DL_CODE
                    AND DL.DL_BRANCH = PP.PROV_CODE
                    AND XCME.APPLICATION_NUM = XSC.APPLICATION_NUM
                    ${query_approve_month}
                    ${query_approve_year}
                    ${query_branch_code}
                ${querysort}
            ) PREFD
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

async function getprefirstdueyearlist(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
                SELECT DISTINCT
                    YEAR_VALUE
                FROM (
                    SELECT
                        TO_CHAR(EXTRACT(YEAR FROM XCME.APPROVE_DATE)) AS YEAR_VALUE
                    FROM 
                        X_CUST_MAPPING_EXT XCME,
                        X_CUST_MAPPING XCM,
                        AC_PROVE AP,
                        TITLE_P TP,
                        CUST_INFO CI,
                        PROVINCE_P PP,
                        X_DEALER_P DL,
                        BTW.X_SAMM_CONTRACT XSC,
                        (
                            SELECT HP_NO,
                                CASE WHEN MAX(CASE WHEN neg_r_code = 'X01' THEN 1 ELSE 0 END) = 1 THEN 'ติดต่อแล้ว' ELSE 'รอการติดต่อ' END AS STATUS_RECALL
                            FROM 
                                NEGO_INFO
                            GROUP BY HP_NO
                        ) NI
                    WHERE 
                        XCME.APPLICATION_NUM = XCM.APPLICATION_NUM
                        AND XCME.CONTRACT_NO = AP.HP_NO
                        AND XCM.CUST_STATUS = '0'
                        AND XCME.LOAN_RESULT = 'Y'
                        AND CI.FNAME = TP.TITLE_ID (+)
                        AND XCM.CUST_NO = CI.CUST_NO
                        AND AP.REG_CITY = PP.PROV_CODE
                        AND NI.HP_NO = AP.HP_NO
                        AND XCME.SL_CODE = DL.DL_CODE
                        AND DL.DL_BRANCH = PP.PROV_CODE
                        AND XCME.APPLICATION_NUM = XSC.APPLICATION_NUM
                )
                ORDER BY YEAR_VALUE ASC
            `
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
                    status: 500,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function getcollectordetailbyid(req, res, next) {

    let connection;
    try {

        // === get param from query ===

        const { applicationid } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const result = await connection.execute(
            `
            SELECT
                XCME.CONTRACT_NO AS HP_NO,
                TP.TITLE_NAME,
                CI.NAME AS NAME,
                CI.SNAME AS SNAME,
                TP.TITLE_NAME || ' ' || CI.NAME || '  ' || CI.SNAME AS CUSTOMER_FULLNAME,
                CI.BIRTH_DATE,
                DL.DL_BRANCH AS BRANCH_CODE,
                BTW.GET_BRANCH_SL_BY_HP_NO(XCME.CONTRACT_NO) AS BRANCH_NAME,
                XCME.BUSSINESS_CODE,
                XCME.CREATE_CONTRACT_DATE,
                CI.CUST_NO,
                CI.IDCARD_NUM,
                TO_DATE(TO_CHAR(XSC.FIRST_DUE,'DD')||'/'||TO_CHAR(sysdate,'MM')||'/'||TO_CHAR(sysdate,'YYYY'),'dd/mm/yyyy') AS PAYMENTDATE,
                XCME.TERM,
                XCM.CUST_STATUS AS TYPE_CODE,
                TYP.TYPE_NAME AS TYPE_NAME,
                XCME.DL_CODE,
                XSC.FIRST_DUE,
                XCME.APPROVE_DATE, 
                AP.MONTHLY,
                DL.DL_BRANCH
            FROM 
                X_CUST_MAPPING_EXT XCME,
                X_CUST_MAPPING XCM,
                AC_PROVE AP,
                TITLE_P TP,
                CUST_INFO CI,
                PROVINCE_P PP,
                X_DEALER_P DL,
                BTW.X_SAMM_CONTRACT XSC,
                BTW.TYPE_P TYP
            WHERE 
                XCME.APPLICATION_NUM = XCM.APPLICATION_NUM
                AND XCME.APPLICATION_NUM = XSC.APPLICATION_NUM
                AND XCME.CONTRACT_NO = AP.HP_NO
                AND XCM.CUST_STATUS = '0'
                AND XCME.LOAN_RESULT = 'Y'
                AND CI.FNAME = TP.TITLE_ID (+)
                AND XCM.CUST_NO = CI.CUST_NO
                AND XCME.SL_CODE = DL.DL_CODE
                AND DL.DL_BRANCH = PP.PROV_CODE
                AND TYP.TYPE_CODE = XCM.CUST_STATUS
                AND XCME.CONTRACT_NO = :applicationid
            `
            , {
                applicationid: applicationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'ไม่เจอรายการสัญญาที่เลือก',
                data: []
            })
        } else {
            // ==== return success data ==== 

            const resData = result.rows
            
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'Success',
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
module.exports.getprefirstduelist = getprefirstduelist
module.exports.getprefirstdueyearlist = getprefirstdueyearlist
module.exports.getcollectordetailbyid = getcollectordetailbyid