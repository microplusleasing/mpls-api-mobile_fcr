const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
// const formidable = require('formidable');
var multiparty = require('multiparty');
const { result } = require('lodash');
const fs = require('fs');
var util = require('util');
const _util = require('./_selfutil');
const log4js = require("log4js");
// const e = require('express');

log4js.configure({
    appenders: {
        view: { type: "file", filename: "quotation.log" },
        create: { type: "file", filename: "quotation.log" },
        update: { type: "file", filename: "quotation.log" },
        cancle: { type: "file", filename: "quotation.log" }
    },
    categories: {
        default: { appenders: ["view"], level: "info" },
        create: { appenders: ["create"], level: "info" },
        update: { appenders: ["update"], level: "info" },
        cancle: { appenders: ["cancle"], level: "info" }
    }
});

async function getquotationlist(req, res, next) {
    let connection;
    try {
        const decoded = jwt_decode(req.headers.authorization)


        const {
            pageno,
            status,
            searchname,
            searchidcardnum,
            searchrefpaynum,
            searchpaystatus
        } = req.query


        // const userid = decoded.ID
        const indexstart = (pageno - 1) * 10 + 1
        const indexend = (pageno * 10)
        let rowCount;

        // === GETUSER ID AND CHANNAL_TYPE (25/05/2022) ===
        const token = req.user
        const userid = token.ID
        const channal = token.channal

        // === for hadle enqiry (26/05/2022) === 
        const radmin = token.radmin
        // console.log(`radmin value : ${radmin}`)
        // console.log(`status value : ${status}`)
        let channalstamp = ''

        console.log(`token is : ${token.channal}`)
        if (channal) {
            switch (token.channal) {
                case 'checker': {
                    channalstamp = 'C'
                }
                    break;
                case 'dealer': {
                    channalstamp = 'S'
                }
            }
        }


        // === prepare query === 
        let queryCondition;
        let bindData = {};
        if (status) {
            if (radmin == 'Y' || radmin == 'FI') {

                let sqlname = ''
                let sqlidcardnum = ''
                let sqlstatus = ''
                let sqlpaystatus = ''
                if (searchname) {
                    sqlname = ` AND QUO.FIRST_NAME LIKE :name `
                    bindData.name = `${searchname}%`
                }
                if (searchidcardnum) {
                    // if (!searchname) {
                    //     sqlidcardnum = `WHERE IDCARD_NUM = :idcardnum`
                    // } else {
                    //     sqlidcardnum = `AND IDCARD_NUM = :idcardnum`
                    // }
                    sqlidcardnum = ` AND QUO.IDCARD_NUM = :idcardnum `
                    bindData.idcardnum = searchidcardnum
                }

                if (status) {
                    sqlstatus = ' AND QUO.LOAN_RESULT = :status '
                    bindData.status = status
                }

                switch (searchpaystatus) {
                    case 'N':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = '0'
                        break;
                    case 'Y':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = '1'
                        break;

                    default:
                        break;
                }

                queryCondition = `SELECT COUNT(QUO_KEY_APP_ID) AS COUNT
                FROM MPLS_QUOTATION QUO
                LEFT JOIN CONTRACT_INSURANCE CN
                ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                WHERE (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                ${sqlname}
                ${sqlidcardnum}
                ${sqlstatus}
                ${sqlpaystatus}`

                console.log(`quireyCondition : ${queryCondition}`)
                bindData.status = status



                // queryCondition = `
                // SELECT COUNT(QUO_KEY_APP_ID) AS COUNT
                // FROM MPLS_QUOTATION
                // WHERE LOAN_RESULT = :status
                // `
                // bindData = {
                //     status: status
                // }
            } else {

                let sqlname = ''
                let sqlidcardnum = ''
                let sqlstatus = ''
                let sqlpaystatus = ''

                bindData.userid = userid
                bindData.status = status
                bindData.channalstamp = channalstamp

                if (searchname) {
                    sqlname = `AND QUO.FIRST_NAME LIKE :name`
                    bindData.name = `${searchname}%`
                }
                if (searchidcardnum) {

                    sqlidcardnum = `AND QUO.IDCARD_NUM = :idcardnum`
                    bindData.idcardnum = searchidcardnum
                }

                if (status) {
                    sqlstatus = ' AND QUO.LOAN_RESULT = :status '
                    bindData.status = status
                }


                switch (searchpaystatus) {
                    case 'N':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = '0'
                        break;
                    case 'Y':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = '1'
                        break;

                    default:
                        break;
                }


                queryCondition = `
                SELECT COUNT(QUO_KEY_APP_ID) AS COUNT
                FROM MPLS_QUOTATION QUO
                LEFT JOIN CONTRACT_INSURANCE CN
                ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                WHERE USER_ID = :userid
                AND QUO.CHANNAL_TYPE = :channalstamp
                AND (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                ${sqlname}
                ${sqlidcardnum}
                ${sqlstatus}
                ${sqlpaystatus}
                `
                // bindData = {
                //     userid: userid,
                //     status: status,
                //     channalstamp: channalstamp
                // }
            }

        } else {
            // console.log(`no status`)
            if (radmin == 'Y' || radmin == 'FI') {

                let sqlname = ''
                let sqlidcardnum = ''
                let sqlpaystatus = ''
                if (searchname) {
                    // sqlname = `WHERE FIRST_NAME LIKE :name`
                    sqlname = `AND QUO.FIRST_NAME LIKE :name`
                    bindData.name = `${searchname}%`
                }

                if (searchidcardnum) {
                    // if (!searchname) {
                    //     sqlidcardnum = `WHERE IDCARD_NUM = :idcardnum`
                    // } else {
                    //     sqlidcardnum = `AND IDCARD_NUM = :idcardnum`
                    // }
                    sqlidcardnum = `AND QUO.IDCARD_NUM = :idcardnum`
                    bindData.idcardnum = searchidcardnum
                }

                switch (searchpaystatus) {
                    case 'N':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = 0
                        break;
                    case 'Y':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = 1
                        break;

                    default:
                        break;
                }

                queryCondition = `
                SELECT COUNT(QUO_KEY_APP_ID) AS COUNT
                FROM MPLS_QUOTATION QUO
                LEFT JOIN CONTRACT_INSURANCE CN
                ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                WHERE (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                ${sqlname}
                ${sqlidcardnum}
                ${sqlpaystatus}`


            } else {

                // === standard flow === 
                let sqlname = ''
                let sqlidcardnum = ''
                let sqlpaystatus = ''

                bindData.userid = userid
                bindData.channalstamp = channalstamp

                if (searchname) {

                    sqlname = ` AND QUO.FIRST_NAME LIKE :name `
                    bindData.name = `${searchname}%`
                }

                if (searchidcardnum) {

                    sqlidcardnum = ` AND QUO.IDCARD_NUM = :idcardnum`
                    bindData.idcardnum = searchidcardnum
                }

                switch (searchpaystatus) {
                    case 'N':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = 0
                        break;
                    case 'Y':
                        sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                        bindData.pay_status = 1
                        break;

                    default:
                        break;
                }

                queryCondition = `
                SELECT COUNT(QUO_KEY_APP_ID) AS COUNT
                FROM MPLS_QUOTATION QUO
                LEFT JOIN CONTRACT_INSURANCE CN
                ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                WHERE USER_ID = :userid
                AND CHANNAL_TYPE = :channalstamp
                AND (QUO_STATUS<>3 OR QUO_STATUS IS NULL)
                ${sqlname}
                ${sqlidcardnum}
                ${sqlpaystatus}
                `
                // bindData = {
                //     userid: userid,
                //     channalstamp: channalstamp
                // }
            }
        }
        connection = await oracledb.getConnection(
            config.database
        )

        // console.log(`queryCondition : ${queryCondition}`)
        // console.log(`bindata : ${JSON.stringify(bindData)}`)

        const results = await connection.execute(
            queryCondition,
            bindData.length !== 0 ? bindData : {},
            {
                outFormat: oracledb.OBJECT
            })

        console.log(`this is results.rows.length : ${results.rows.length}`)
        // console.log(`results.rows : ${JSON.stringify(results.rows)}`)

        if (results.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 200,
                message: 'ไม่พบรายการใบคำขอ',
                data: []
            })
        } else {
            rowCount = results.rows[0].COUNT
            // console.log(`this is row Count : ${rowCount}`)

            // === call quotation service === 
            try {
                let results2;
                let sqlqueryresult;
                let bindparamsresult = {};
                if (status) {

                    // === have status ===
                    // ** admin **
                    if (radmin == 'Y' || radmin == 'FI') {

                        let sqlname = ''
                        let sqlidcardnum = ''
                        let sqlstatus = ''
                        let sqlrefpaynum = ''
                        let sqlpaystatus = ''

                        if (searchname) {
                            sqlname = ` AND QUO.FIRST_NAME LIKE :name `
                            bindparamsresult.name = `${searchname}%`
                        }

                        if (searchidcardnum) {
                            sqlidcardnum = ` AND QUO.IDCARD_NUM = :idcardnum `
                            bindparamsresult.idcardnum = searchidcardnum
                        }

                        if (status) {
                            sqlstatus = ` AND QUO.LOAN_RESULT = :status `
                            bindparamsresult.status = status
                        }

                        if (searchrefpaynum) {
                            sqlrefpaynum = ` AND CME.REF_PAY_NUM = :ref_pay_num `
                            bindparamsresult.ref_pay_num = searchrefpaynum
                        }

                        switch (searchpaystatus) {
                            case 'N':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '0'
                                break;
                            case 'Y':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '1'
                                break;

                            default:
                                break;
                        }

                        bindparamsresult.indexstart = indexstart
                        bindparamsresult.indexend = indexend

                        sqlqueryresult = `SELECT 
                        QUO_ID, QUO.IDCARD_NUM, QUO.PHONE_NUMBER, QUO.TITLE_CODE, QUO.TITLE_NAME, QUO.
                        FIRST_NAME, QUO.LAST_NAME, QUO.BIRTH_DATE, QUO.CIZ_ISSUED_DATE, QUO.CIZ_EXPIRED_DATE, QUO.
                        CIZ_ADDRESS, QUO.CIZ_SUB_DISTRICT, QUO.CIZ_DISTRICT, QUO.CIZ_PROVINCE_NAME, QUO.CIZ_PROVINCE_CODE, QUO.
                        QUO_STATUS, QUO.QUO_LIVING_PLACE_ID, QUO.QUO_CONTRACT_PLACE_ID, QUO.QUO_WORKING_PLACE_ID, QUO.QUO_CREDIT_ID, QUO.
                        USER_ID, QUO.CREATED_TIME, QUO.LAST_UPDATED_TIME, QUO.QUO_KEY_APP_ID, QUO.CIZ_POSTAL_CODE, QUO.
                        APPLICATION_NUM, QUO.CIZ_ISSUED_PLACE, QUO.SL_CODE, QUO.CHECKER_CODE, QUO.CHANNAL_TYPE, QUO.
                        EMAIL, QUO.CIZ_AGE, QUO.CIZ_GENDER, QUO.DIPCHIP_UUID, QUO.CIZ_NICKNAME, QUO.
                        CIZ_HOUSE_TYPE, QUO.CIZ_HOUSE_OWNER_TYPE, QUO.CIZ_STAYED_YEAR, QUO.CIZ_STAYED_MONTH, QUO.CIZ_MARIED_STATUS, QUO.
                        QUO_APP_REF_NO, QUO.QUO_ECONSENT_FLAG, QUO.CIZ_PHONE_VALID_STATUS, QUO.OTP_PHONE_VERIFY, QUO.QUO_DOPA_STATUS, QUO.
                        QUO_FACE_COMPARE_VERIFY, QUO.IS_DIPCHIP_CHANNAL, QUO.QUO_HOUSE_REGIS_PLACE_ID, 
                        GET_SL_NAME(QUO.SL_CODE) AS DL_NAME, LR.LR_STATUSTEXT, CME.REF_PAY_NUM, CN.PAY_STATUS, PV.PROV_NAME AS BRANCH_NAME,
                        ROW_NUMBER() OVER (ORDER BY QUO.CREATED_TIME DESC) LINE_NUMBER
                        FROM MPLS_QUOTATION QUO 
                        LEFT JOIN (SELECT LOAN_RESULT_CODE AS LR_STATUS , 
                        LOAN_RESULT_NAME AS LR_STATUSTEXT 
                        FROM BTW.X_LOAN_RESULT_P) LR
                        ON QUO.LOAN_RESULT = LR.LR_STATUS
                        LEFT JOIN BTW.X_CUST_MAPPING_EXT CME
                        ON QUO.APPLICATION_NUM = CME.APPLICATION_NUM
                        LEFT JOIN CONTRACT_INSURANCE CN
                        ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                        LEFT JOIN BTW.X_DEALER_P DL
                        ON QUO.SL_CODE = DL.DL_CODE
                        LEFT JOIN BTW.PROVINCE_P PV
                        ON DL.DL_BRANCH = PV.PROV_CODE
                        WHERE (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                        ${sqlname}
                        ${sqlidcardnum}
                        ${sqlstatus}
                        ${sqlrefpaynum}
                        ${sqlpaystatus}
                        ORDER BY QUO.CREATED_TIME DESC
                        `

                        results2 = await connection.execute(`
                            SELECT * FROM (
                            ${sqlqueryresult}
                          ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend 
                        `,
                            bindparamsresult.length !== 0 ? bindparamsresult : {},
                            {
                                outFormat: oracledb.OBJECT
                            })
                    } else {


                        let sqlname = ''
                        let sqlidcardnum = ''
                        let sqlstatus = ''
                        let sqlpaystatus = ''

                        if (searchname) {
                            sqlname = `AND QUO.FIRST_NAME LIKE :name`
                            bindparamsresult.name = `${searchname}%`
                        }

                        if (searchidcardnum) {
                            sqlidcardnum = `AND QUO.IDCARD_NUM = :idcardnum`
                            bindparamsresult.idcardnum = searchidcardnum
                        }

                        if (status) {
                            sqlstatus = ` AND QUO.LOAN_RESULT = :status `
                            bindparamsresult.status = status
                        }

                        switch (searchpaystatus) {
                            case 'N':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '0'
                                break;
                            case 'Y':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '1'
                                break;

                            default:
                                break;
                        }

                        bindparamsresult.userid = userid
                        bindparamsresult.channalstamp = channalstamp
                        bindparamsresult.indexstart = indexstart
                        bindparamsresult.indexend = indexend

                        sqlqueryresult = `SELECT 
                        QUO_ID, QUO.IDCARD_NUM, QUO.PHONE_NUMBER, QUO.TITLE_CODE, QUO.TITLE_NAME, QUO.
                        FIRST_NAME, QUO.LAST_NAME, QUO.BIRTH_DATE, QUO.CIZ_ISSUED_DATE, QUO.CIZ_EXPIRED_DATE, QUO.
                        CIZ_ADDRESS, QUO.CIZ_SUB_DISTRICT, QUO.CIZ_DISTRICT, QUO.CIZ_PROVINCE_NAME, QUO.CIZ_PROVINCE_CODE, QUO.
                        QUO_STATUS, QUO.QUO_LIVING_PLACE_ID, QUO.QUO_CONTRACT_PLACE_ID, QUO.QUO_WORKING_PLACE_ID, QUO.QUO_CREDIT_ID, QUO.
                        USER_ID, QUO.CREATED_TIME, QUO.LAST_UPDATED_TIME, QUO.QUO_KEY_APP_ID, QUO.CIZ_POSTAL_CODE, QUO.
                        APPLICATION_NUM, QUO.CIZ_ISSUED_PLACE, QUO.SL_CODE, QUO.CHECKER_CODE, QUO.CHANNAL_TYPE, QUO.
                        EMAIL, QUO.CIZ_AGE, QUO.CIZ_GENDER, QUO.DIPCHIP_UUID, QUO.CIZ_NICKNAME, QUO.
                        CIZ_HOUSE_TYPE, QUO.CIZ_HOUSE_OWNER_TYPE, QUO.CIZ_STAYED_YEAR, QUO.CIZ_STAYED_MONTH, QUO.CIZ_MARIED_STATUS, QUO.
                        QUO_APP_REF_NO, QUO.QUO_ECONSENT_FLAG, QUO.CIZ_PHONE_VALID_STATUS, QUO.OTP_PHONE_VERIFY, QUO.QUO_DOPA_STATUS, QUO.
                        QUO_FACE_COMPARE_VERIFY, QUO.IS_DIPCHIP_CHANNAL, QUO.QUO_HOUSE_REGIS_PLACE_ID, 
                        GET_SL_NAME(QUO.SL_CODE) AS DL_NAME, LR.LR_STATUSTEXT, CN.PAY_STATUS, PV.PROV_NAME AS BRANCH_NAME,
                        ROW_NUMBER() OVER (ORDER BY QUO.CREATED_TIME DESC) LINE_NUMBER
                        FROM MPLS_QUOTATION QUO
                        LEFT JOIN (SELECT LOAN_RESULT_CODE AS LR_STATUS , 
                        LOAN_RESULT_NAME AS LR_STATUSTEXT 
                        FROM BTW.X_LOAN_RESULT_P) LR
                        ON QUO.LOAN_RESULT = LR.LR_STATUS
                        LEFT JOIN CONTRACT_INSURANCE CN
                        ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                        LEFT JOIN BTW.X_DEALER_P DL
                        ON QUO.SL_CODE = DL.DL_CODE
                        LEFT JOIN BTW.PROVINCE_P PV
                        ON DL.DL_BRANCH = PV.PROV_CODE
                        WHERE QUO.USER_ID = :userid
                        AND (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                        AND QUO.CHANNAL_TYPE = :channalstamp
                        ${sqlname}
                        ${sqlidcardnum}
                        ${sqlstatus}
                        ${sqlpaystatus}
                        ORDER BY QUO.CREATED_TIME DESC
                        `

                        console.log(`sqlqueryresult : ${sqlqueryresult}`)
                        console.log(`bindparamsresult : ${JSON.stringify(bindparamsresult)}`)

                        results2 = await connection.execute(`
                            SELECT * FROM (
                            ${sqlqueryresult}
                          ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend 
                        `,
                            bindparamsresult.length !== 0 ? bindparamsresult : {},
                            {
                                outFormat: oracledb.OBJECT
                            })
                    }
                } else {
                    // == no status ==
                    // ** admin **
                    if (radmin == 'Y' || radmin == 'FI') {

                        let sqlname = ''
                        let sqlidcardnum = ''
                        let sqlrefpaynum = ''
                        let sqlpaystatus = ''

                        if (searchname) {
                            sqlname = ` AND QUO.FIRST_NAME LIKE :name `
                            bindparamsresult.name = `${searchname}%`
                        }

                        if (searchidcardnum) {
                            sqlidcardnum = ` AND QUO.IDCARD_NUM = :idcardnum `
                            bindparamsresult.idcardnum = searchidcardnum
                        }

                        if (searchrefpaynum) {
                            sqlrefpaynum = ` AND CME.REF_PAY_NUM = :ref_pay_num `
                            bindparamsresult.ref_pay_num = searchrefpaynum
                        }


                        switch (searchpaystatus) {
                            case 'N':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '0'
                                break;
                            case 'Y':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '1'
                                break;

                            default:
                                break;
                        }

                        bindparamsresult.indexstart = indexstart
                        bindparamsresult.indexend = indexend
                        sqlqueryresult = `SELECT 
                        QUO_ID, QUO.IDCARD_NUM, QUO.PHONE_NUMBER, QUO.TITLE_CODE, QUO.TITLE_NAME, QUO.
                        FIRST_NAME, QUO.LAST_NAME, QUO.BIRTH_DATE, QUO.CIZ_ISSUED_DATE, QUO.CIZ_EXPIRED_DATE, QUO.
                        CIZ_ADDRESS, QUO.CIZ_SUB_DISTRICT, QUO.CIZ_DISTRICT, QUO.CIZ_PROVINCE_NAME, QUO.CIZ_PROVINCE_CODE, QUO.
                        QUO_STATUS, QUO.QUO_LIVING_PLACE_ID, QUO.QUO_CONTRACT_PLACE_ID, QUO.QUO_WORKING_PLACE_ID, QUO.QUO_CREDIT_ID, QUO.
                        USER_ID, QUO.CREATED_TIME, QUO.LAST_UPDATED_TIME, QUO.QUO_KEY_APP_ID, QUO.CIZ_POSTAL_CODE, QUO.
                        APPLICATION_NUM, QUO.CIZ_ISSUED_PLACE, QUO.SL_CODE, QUO.CHECKER_CODE, QUO.CHANNAL_TYPE, QUO.
                        EMAIL, QUO.CIZ_AGE, QUO.CIZ_GENDER, QUO.DIPCHIP_UUID, QUO.CIZ_NICKNAME, QUO.
                        CIZ_HOUSE_TYPE, QUO.CIZ_HOUSE_OWNER_TYPE, QUO.CIZ_STAYED_YEAR, QUO.CIZ_STAYED_MONTH, QUO.CIZ_MARIED_STATUS, QUO.
                        QUO_APP_REF_NO, QUO.QUO_ECONSENT_FLAG, QUO.CIZ_PHONE_VALID_STATUS, QUO.OTP_PHONE_VERIFY, QUO.QUO_DOPA_STATUS, QUO.
                        QUO_FACE_COMPARE_VERIFY, QUO.IS_DIPCHIP_CHANNAL, QUO.QUO_HOUSE_REGIS_PLACE_ID, 
                        GET_SL_NAME(QUO.SL_CODE) AS DL_NAME, LR.LR_STATUSTEXT, CME.REF_PAY_NUM, CN.PAY_STATUS, PV.PROV_NAME AS BRANCH_NAME,
                        ROW_NUMBER() OVER (ORDER BY QUO.CREATED_TIME DESC) LINE_NUMBER
                        FROM MPLS_QUOTATION QUO 
                        LEFT JOIN (SELECT LOAN_RESULT_CODE AS LR_STATUS , 
                        LOAN_RESULT_NAME AS LR_STATUSTEXT 
                        FROM BTW.X_LOAN_RESULT_P) LR
                        ON QUO.LOAN_RESULT = LR.LR_STATUS
                        LEFT JOIN BTW.X_CUST_MAPPING_EXT CME
                        ON QUO.APPLICATION_NUM = CME.APPLICATION_NUM
                        LEFT JOIN CONTRACT_INSURANCE CN
                        ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                        LEFT JOIN BTW.X_DEALER_P DL
                        ON QUO.SL_CODE = DL.DL_CODE
                        LEFT JOIN BTW.PROVINCE_P PV
                        ON DL.DL_BRANCH = PV.PROV_CODE
                        WHERE (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                        ${sqlname}
                        ${sqlidcardnum}
                        ${sqlrefpaynum}
                        ${sqlpaystatus}
                        ORDER BY QUO.CREATED_TIME DESC
                        `


                        // console.log(`sqlqueryresult: ${sqlqueryresult}`)
                        console.log(`bindparamresult: ${JSON.stringify(bindparamsresult)}`)

                        results2 = await connection.execute(`
                        SELECT * FROM (
                            ${sqlqueryresult} 
                          ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
                        `,
                            bindparamsresult.length !== 0 ? bindparamsresult : {},
                            {
                                outFormat: oracledb.OBJECT
                            })
                    } else {

                        // ** user (checker) **
                        // === standard flow ===
                        let sqlname = ''
                        let sqlidcardnum = ''
                        let sqlpaystatus = ''

                        if (searchname) {
                            sqlname = `AND QUO.FIRST_NAME LIKE :name`
                            bindparamsresult.name = `${searchname}%`
                        }

                        if (searchidcardnum) {

                            sqlidcardnum = `AND QUO.IDCARD_NUM = :idcardnum`
                            bindparamsresult.idcardnum = searchidcardnum
                        }

                        switch (searchpaystatus) {
                            case 'N':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '0'
                                break;
                            case 'Y':
                                sqlpaystatus = ' AND CN.PAY_STATUS = :pay_status '
                                bindparamsresult.pay_status = '1'
                                break;

                            default:
                                break;
                        }

                        bindparamsresult.userid = userid
                        bindparamsresult.channalstamp = channalstamp
                        bindparamsresult.indexstart = indexstart
                        bindparamsresult.indexend = indexend
                        sqlqueryresult = `SELECT 
                        QUO_ID, QUO.IDCARD_NUM, QUO.PHONE_NUMBER, QUO.TITLE_CODE, QUO.TITLE_NAME, QUO.
                        FIRST_NAME, QUO.LAST_NAME, QUO.BIRTH_DATE, QUO.CIZ_ISSUED_DATE, QUO.CIZ_EXPIRED_DATE, QUO.
                        CIZ_ADDRESS, QUO.CIZ_SUB_DISTRICT, QUO.CIZ_DISTRICT, QUO.CIZ_PROVINCE_NAME, QUO.CIZ_PROVINCE_CODE, QUO.
                        QUO_STATUS, QUO.QUO_LIVING_PLACE_ID, QUO.QUO_CONTRACT_PLACE_ID, QUO.QUO_WORKING_PLACE_ID, QUO.QUO_CREDIT_ID, QUO.
                        USER_ID, QUO.CREATED_TIME, QUO.LAST_UPDATED_TIME, QUO.QUO_KEY_APP_ID, QUO.CIZ_POSTAL_CODE, QUO.
                        APPLICATION_NUM, QUO.CIZ_ISSUED_PLACE, QUO.SL_CODE, QUO.CHECKER_CODE, QUO.CHANNAL_TYPE, QUO.
                        EMAIL, QUO.CIZ_AGE, QUO.CIZ_GENDER, QUO.DIPCHIP_UUID, QUO.CIZ_NICKNAME, QUO.
                        CIZ_HOUSE_TYPE, QUO.CIZ_HOUSE_OWNER_TYPE, QUO.CIZ_STAYED_YEAR, QUO.CIZ_STAYED_MONTH, QUO.CIZ_MARIED_STATUS, QUO.
                        QUO_APP_REF_NO, QUO.QUO_ECONSENT_FLAG, QUO.CIZ_PHONE_VALID_STATUS, QUO.OTP_PHONE_VERIFY, QUO.QUO_DOPA_STATUS, QUO.
                        QUO_FACE_COMPARE_VERIFY, QUO.IS_DIPCHIP_CHANNAL, QUO.QUO_HOUSE_REGIS_PLACE_ID, 
                        GET_SL_NAME(QUO.SL_CODE) AS DL_NAME, LR.LR_STATUSTEXT, CN.PAY_STATUS, PV.PROV_NAME AS BRANCH_NAME, 
                        ROW_NUMBER() OVER (ORDER BY QUO.CREATED_TIME DESC) LINE_NUMBER
                        FROM MPLS_QUOTATION QUO
                        LEFT JOIN (SELECT LOAN_RESULT_CODE AS LR_STATUS , 
                        LOAN_RESULT_NAME AS LR_STATUSTEXT 
                        FROM BTW.X_LOAN_RESULT_P) LR
                        ON QUO.LOAN_RESULT = LR.LR_STATUS
                        LEFT JOIN CONTRACT_INSURANCE CN
                        ON QUO.QUO_KEY_APP_ID = CN.QUOTATION_ID
                        LEFT JOIN BTW.X_DEALER_P DL
                        ON QUO.SL_CODE = DL.DL_CODE
                        LEFT JOIN BTW.PROVINCE_P PV
                        ON DL.DL_BRANCH = PV.PROV_CODE
                        WHERE QUO.USER_ID = :userid
                        AND (QUO.QUO_STATUS<>3 OR QUO.QUO_STATUS IS NULL)
                        AND QUO.CHANNAL_TYPE = :channalstamp
                        ${sqlname}
                        ${sqlidcardnum}
                        ${sqlpaystatus}
                        ORDER BY QUO.CREATED_TIME DESC
                        `

                        results2 = await connection.execute(`
                        SELECT * FROM (
                            ${sqlqueryresult} 
                          ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend 
                        `,
                            bindparamsresult.length !== 0 ? bindparamsresult : {},
                            {
                                outFormat: oracledb.OBJECT
                            })
                    }
                }

                if (results2.rows.length == 0) {
                    return res.status(201).send({
                        status: 201,
                        message: 'No quotation Record 2',
                        data: []
                    })
                } else {

                    const resData = results2.rows
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
                console.error(e);
                return next(e)
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

async function createQuotation(req, res, next) {

    // === already log4js ===

    let connection;
    const logger = log4js.getLogger("create")
    try {

        const token = req.user
        const userid = token.ID

        // === check userid token === 

        logger.error(`No userid contain in token`)
        if (!userid) {
            return res.status(400).send({
                status: 400,
                message: `No userid contain in token`,
                data: []
            })
        }

        // === chaanal type (25/05/2022) === 
        const channal = token.channal
        let channalstamp = ''

        if (channal) {
            switch (token.channal) {
                case 'checker': {
                    channalstamp = 'C'
                }
                    break;
                case 'dealer': {
                    channalstamp = 'S'
                }
            }
        }

        // === Get data on multipart/form-data === 
        let fileData
        let formData
        // const form = formidable({ multiples: true })
        const form = new multiparty.Form()
        await new Promise(function (resolve, reject) {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err)
                    return
                }
                formData = fields
                fileData = files
                resolve()
                // res.writeHead(200, { 'content-type': 'text/plain' });
                // res.write('received upload:\n\n');
                // res.end(util.inspect({fields: fields, files: files}));
            })
            return
        })

        // console.log(`get to the file use filedata.<filename> eg. fileData.citizenid_image : ${fileData.citizenid_image}`)

        // === set image param === 

        const citizenid_image = fileData.citizenid_image ? fileData.citizenid_image : null
        const houseregis_image = fileData.houseregis_image ? fileData.houseregis_image : null
        const face_image = fileData.face_image ? fileData.face_image : null
        const house_image = fileData.house_image ? fileData.house_image : null
        const store_image = fileData.store_image ? fileData.store_image : null
        const salarycertificate_image = fileData.salarycertificate_image ? fileData.salarycertificate_image : null
        const workcertificate_image = fileData.workcertificate_image ? fileData.workcertificate_image : null
        const salarypayment_image = fileData.salarypayment_image ? fileData.salarypayment_image : null
        const bookbank_image = fileData.bookbank_image ? fileData.bookbank_image : null
        const motocyclelicense_image = fileData.motocyclelicense_image ? fileData.motocyclelicense_image : null
        const signature_image = fileData.signature_image ? fileData.signature_image : null
        const witness_image = fileData.witness_image ? fileData.witness_image : null
        const iapp_face_image = fileData.iap_face_buffer ? fileData.iap_face_buffer : null

        // console.log('citizenid_image : ' + citizenid_image)

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        var imageData = [];
        // var citienidBuffer = fs.readFileSync(citizenid_image[0].path);
        const cititzenBuffer = citizenid_image ? imagetobuffer(citizenid_image) : null
        const houseregisBuffer = houseregis_image ? imagetobuffer(houseregis_image) : null
        const faceBuffer = face_image ? imagetobuffer(face_image) : null
        const hosueBuffer = house_image ? imagetobuffer(house_image) : null
        const storeBuffer = store_image ? imagetobuffer(store_image) : null
        const salarycertificateBuffer = salarycertificate_image ? imagetobuffer(salarycertificate_image) : null
        const workcertificateBuffer = workcertificate_image ? imagetobuffer(workcertificate_image) : null
        const salarypaymentBuffer = salarypayment_image ? imagetobuffer(salarypayment_image) : null
        const bookbankBuffer = bookbank_image ? imagetobuffer(bookbank_image) : null
        const motocyclelicenseBuffer = motocyclelicense_image ? imagetobuffer(motocyclelicense_image) : null
        const signatureBuffer = signature_image ? imagetobuffer(signature_image) : null
        const witnessBuffer = witness_image ? imagetobuffer(witness_image) : null
        const iappfaceBuffer = iapp_face_image ? imagetobuffer(iapp_face_image) : null

        createImageInfo = (fileinfo, file, code) => {
            let image = {}
            const filename = fileinfo[0].fieldName
            const filetype = fileinfo[0].headers['content-type']
            const orifilename = fileinfo[0].originalFilename
            const readfileimage = fs.readFileSync(fileinfo[0].path)
            image.filename = filename
            image.filetype = filetype
            // image.orifilename = orifilename
            image.keyid = uuidv4()
            image.quokeyid = quotationKeyid
            image.status = 0
            image.filedata = readfileimage
            image.code = code
            // console.log(`this is each image : ${JSON.stringify(image)}`)
            imageData.push(image)
        }

        // === create uuid for quotation record === 
        const quotationKeyid = uuidv4()

        if (cititzenBuffer) await createImageInfo(citizenid_image, cititzenBuffer, '01');
        if (houseregisBuffer) await createImageInfo(houseregis_image, houseregisBuffer, '02');
        if (faceBuffer) await createImageInfo(face_image, faceBuffer, '03');
        if (hosueBuffer) await createImageInfo(house_image, hosueBuffer, '04');
        if (storeBuffer) await createImageInfo(store_image, storeBuffer, '05');
        if (salarycertificateBuffer) await createImageInfo(salarycertificate_image, salarycertificateBuffer, '06');
        if (workcertificateBuffer) await createImageInfo(workcertificate_image, workcertificateBuffer, '07');
        if (salarypaymentBuffer) await createImageInfo(salarypayment_image, salarypaymentBuffer, '08');
        if (bookbankBuffer) await createImageInfo(bookbank_image, bookbankBuffer, '09');
        if (motocyclelicenseBuffer) await createImageInfo(motocyclelicense_image, motocyclelicenseBuffer, '10');

        // console.log(`this is all image info : ${JSON.stringify(imageData)}`)

        // const fs = require('fs').promises;
        // const testUploadImage = async (path) =>{
        //     const data = await fs.readFile(path, "binary");
        //     return Buffer.from(data);
        // }
        // const bufferImage = await testUploadImage(citizenid_image[0].path)
        // console.log(`this is buffer await : ${bufferImage}`)

        // var fileBuffer
        // if (citizenid_image) {
        //     fileBuffer = new Buffer.from(citizenid_image, 'binary');
        // }
        // console.log(`this is file buffer : ${fileBuffer}`)

        // ============================================

        // === step  manage all parameter form request body ==== 
        const parseFormdata = JSON.parse(formData.item)
        let { lalon, la, lon, idcard_num, phone_number, ciz_email, title_code, title_name, first_name, birth_date,
            last_name, birth_date_thai, birth_date_eng, ciz_issued_date, ciz_expired_date,
            ciz_issued_date_text, ciz_expired_date_text, ciz_issued_place, ciz_address,
            ciz_sub_district, ciz_district, ciz_province_name, ciz_province_code, ciz_postal_code, quo_status,
            liv_address, liv_sub_district, liv_district, liv_province_name, liv_province_code, liv_postal_code,
            cont_address, cont_sub_district, cont_district, cont_province_name, cont_province_code, cont_postal_code,
            work_address, work_sub_district, work_district, work_province_name, work_province_code, work_postal_code,
            brand_code, brand_name, model_code, model_name, color_code, color_name, loan_amount,
            product_value, down_payment, interest_rate, payment_value, payment_round_count,
            main_career_name, main_career_code, main_workplace_name, main_position, main_department,
            main_experience_year, main_experience_month, main_salary_per_month, main_salary_per_day,
            main_leader_name, main_work_per_week, is_sub_career,
            sub_career_name, sub_career_code, sub_workplace_name, sub_position, sub_department,
            sub_experience_year, sub_experience_month, sub_salary_per_month, sub_salary_per_day,
            sub_leader_name, sub_work_per_week,
            consent_customer_name, consent_first_name, consent_last_name, is_disclosure_consent,
            is_personal_disclosure_consent, is_credit_consent, is_final_consent,
            purpose_buy, purpose_buy_name, reason_buy, reason_buy_etc, car_user, car_user_name,
            car_user_relation, car_user_name_2, car_user_citizen_id, car_user_home_no,
            car_user_home_name, car_user_room_no, car_user_floor, car_user_soi, car_user_moo,
            car_user_road, car_user_sub_district, car_user_district, car_user_province_name,
            car_user_province_code, car_user_postal_code, car_user_phone_no,
            first_referral_fullname, first_referral_house_no, first_referral_moo, first_referral_house_name,
            first_referral_room_no, first_referral_floor, first_referral_soi, first_referral_road,
            first_referral_sub_district, first_referral_district, first_referral_province_name,
            first_referral_province_code, first_referral_postal_code, first_referral_phone_no, first_referral_relation,
            second_referral_fullname, second_referral_house_no, second_referral_moo, second_referral_house_name,
            second_referral_room_no, second_referral_floor, second_referral_soi, second_referral_road,
            second_referral_sub_district, second_referral_district, second_referral_province_name,
            second_referral_province_code, second_referral_postal_code, second_referral_phone_no, second_referral_relation,
            citizenid_image_name, houseregis_image_name, face_image_name, hosue_image_name, store_image_name,
            salarycertificate_image_name, workcertificate_image_name, salarypayment_image_namem, bookbank_image_name, motocycle_image_name,
            citizenid_image_type, houseregis_image_type, face_image_type, hosue_image_type, store_image_type,
            salarycertificate_image_type, workcertificate_image_type, salarypayment_image_typem, bookbank_image_type, motocycle_image_type,
            insurer_code, insurer_name, insurance_code, insurance_name, insurance_year, insurance_plan_price, is_include_loanamount, factory_price, size_model,
            iap_check, iap_address, iap_detection_score, iap_district, iap_en_dob, iap_en_expire, iap_en_fname, iap_en_init, iap_en_issue, iap_en_lname,
            iap_en_name, iap_error_message, iap_face_buffer, iap_gender, iap_home_address, iap_id_number, iap_postal_code, iap_process_time, iap_province,
            iap_religion, iap_request_id, iap_sub_district, iap_th_dob, iap_th_expire, iap_th_fname, iap_th_init, iap_th_issue, iap_th_lname, iap_th_name,
            sl_code, checker_code, e_paper,
            identity_approve_consent_value, motor_insurance_consent_value, nmotor_insurance_consent_value,
            analyze_consent_value, info_consent_value, info_party_consent_value, analyze_party_consent_value,
            prdt_info_party_consent_value, followup_consent_value, info_develop_consent_value,
            e_paper_consent_value,
            // === add house regis place (25/08/2022) ===
            hrp_address, hrp_sub_district, hrp_district, hrp_province_name, hrp_province_code, hrp_postal_code,
            // === new field for total loss (29/08/2022) ===
            coverage_total_loss, max_ltv, price_include_vat, engine_number, chassis_number,
            engine_no_running, chassis_no_running,
            typecase,
            ciz_gender,
            dipchip_uuid,
            cizcard_image,
            // === add field (nickname, maried status, stayed year, stayed month, house type , house owner typed) (15/11/2022) ===
            nickname, maried_status, house_type, stayed_month, stayed_year, house_owner_type


        } = parseFormdata

        let birth_date_eng_dtype = null
        let ciz_issued_date_dtype = null
        let ciz_expired_date_dtype = null

        if (birth_date) {
            birth_date_eng_dtype = _util.convertstringtodate_date_field(birth_date)
        } else {
            if (birth_date_eng) {
                birth_date_eng_dtype = _util.convertstringtodate(birth_date_eng)
            }
        }
        if (ciz_issued_date) {
            ciz_issued_date_dtype = ciz_issued_date
        } else {
            if (ciz_issued_date_text) {
                // ciz_issued_date = moment(ciz_issued_date, 'yyyy/mm/dd hh24:mi:ss').toDate();
                ciz_issued_date_dtype = _util.convertstringtodate(ciz_issued_date_text)
            }
        }
        if (ciz_expired_date) {
            ciz_expired_date_dtype = ciz_expired_date
        } else {
            if (ciz_expired_date_text) {
                // ciz_expired_date = moment(ciz_expired_date, 'yyyy/mm/dd hh24:mi:ss').toDate();
                ciz_expired_date_dtype = _util.convertstringtodate(ciz_expired_date_text)
            }
        }

        console.log(`birth_date_eng_dtype : ${birth_date_eng_dtype}`)
        // === step  connect database ===
        connection = await oracledb.getConnection(
            config.database
        )

        // === gen id for each record === 
        const contactplacekeyid = uuidv4();
        const livingplacekeyid = uuidv4();
        const workplacekeyid = uuidv4();
        const careerkeyid = uuidv4();
        const creditkeyid = uuidv4();
        const consentkeyid = uuidv4();
        const purposekeyid = uuidv4();
        // const attachfilekeyid = uuidv4();
        const iappfilekeyid = uuidv4();
        // === create house regis place uuid (25/08/2022) ===
        const houseregisplacekeyid = uuidv4();

        // const facerecogapikeyid = uuidv4();

        // ====   first step  create quotation_recordrst === 

        let e_paper_new_field = 'N'
        if (e_paper_consent_value) {
            if (e_paper_consent_value == 1) {
                e_paper_new_field = 'Y'
            } else {
                e_paper_new_field = 'N'
            }
        }

        console.log(`this is uuid dipchip  : ${dipchip_uuid}`)
        try {

            let cizcard_null = [];
            let cizcard_array;
            let cizcard_send;
            if (cizcard_image) {
                cizcard_send = cizcard_image ? cizcard_array = Buffer.from(cizcard_image, "base64") : cizcard_null
            }




            const crete_quotaion = await connection.execute(
                `INSERT INTO MPLS_QUOTATION (QUO_KEY_APP_ID, USER_ID, IDCARD_NUM, PHONE_NUMBER, EMAIL, TITLE_CODE, TITLE_NAME, FIRST_NAME, 
                    LAST_NAME, BIRTH_DATE, BIRTH_DATE_TEXT_TH, BIRTH_DATE_TEXT_EN, CIZ_ISSUED_DATE, CIZ_ISSUED_PLACE, CIZ_EXPIRED_DATE, CIZ_ADDRESS, 
                    CIZ_SUB_DISTRICT, CIZ_DISTRICT, CIZ_PROVINCE_NAME, CIZ_PROVINCE_CODE, CIZ_POSTAL_CODE, QUO_STATUS, 
                    QUO_LIVING_PLACE_ID, QUO_CONTRACT_PLACE_ID, QUO_WORKING_PLACE_ID, QUO_CAREER_ID, QUO_CREDIT_ID,
                    QUO_PURPOSE_ID, QUO_CONSENT_ID, QUO_IAPP_OCR_ID, CHANNAL_TYPE, SL_CODE, CHECKER_CODE, E_PAPER, CIZ_GENDER, DIPCHIP_UUID, CIZCARD_IMAGE,
                    CIZ_NICKNAME, CIZ_HOUSE_TYPE, CIZ_HOUSE_OWNER_TYPE, CIZ_STAYED_YEAR, CIZ_STAYED_MONTH, CIZ_MARIED_STATUS )
                VALUES (:QUO_KEY_APP_ID, :USER_ID, :IDCARD_NUM, :PHONE_NUMBER, :EMAIL, :TITLE_CODE, :TITLE_NAME, :FIRST_NAME, 
                    :LAST_NAME, :BIRTH_DATE, :BIRTH_DATE_TEXT_TH, :BIRTH_DATE_TEXT_EN, :CIZ_ISSUED_DATE, :CIZ_ISSUED_PLACE, :CIZ_EXPIRED_DATE, :CIZ_ADDRESS, 
                    :CIZ_SUB_DISTRICT, :CIZ_DISTRICT, :CIZ_PROVINCE_NAME, :CIZ_PROVINCE_CODE, :CIZ_POSTAL_CODE, :QUO_STATUS,
                    :QUO_LIVING_PLACE_ID, :QUO_CONTRACT_PLACE_ID, :QUO_WORKING_PLACE_ID, :QUO_CAREER_ID, :QUO_CREDIT_ID,
                    :QUO_PURPOSE_ID, :QUO_CONSENT_ID, :QUO_IAPP_OCR_ID, :CHANNAL_TYPE, :SL_CODE, :CHECKER_CODE, :E_PAPER, :CIZ_GENDER, :DIPCHIP_UUID, :CIZCARD_IMAGE,
                    :CIZ_NICKNAME, :CIZ_HOUSE_TYPE, :CIZ_HOUSE_OWNER_TYPE, :CIZ_STAYED_YEAR, :CIZ_STAYED_MONTH, :CIZ_MARIED_STATUS )`,
                {
                    // titleCode: ciz_form.get('titleCode')?.value ? ciz_form.get('titleCode')?.value : '', 
                    // titleName: ciz_form.get('titleName')?.value ? ciz_form.get('titleName')?.value : '',
                    // firstName: ciz_form.get('firstName')?.value ? ciz_form.get('firstName')?.value : '',
                    // lastName: ciz_form.get('lastName')?.value ? ciz_form.get('lastName')?.value : '',
                    // gender: ciz_form.get('gender')?.value ? ciz_form.get('gender')?.value : '',
                    // citizenId: ciz_form.get('citizenId')?.value ? ciz_form.get('citizenId')?.value : '',
                    // birthDate: ciz_form.get('birthDate')?.value ? ciz_form.get('birthDate')?.value : '',
                    // issueDate: ciz_form.get('issueDate')?.value ? ciz_form.get('issueDate')?.value : '',
                    // expireDate: ciz_form.get('expireDate')?.value ? ciz_form.get('expireDate')?.value : '',
                    // issuePlace: ciz_form.get('issuePlace')?.value ? ciz_form.get('issuePlace')?.value : '',
                    // mariedStatus: ciz_form.get('mariedStatus')?.value ? ciz_form.get('mariedStatus')?.value : '',

                    // address: ciz_form.get('address')?.value ? ciz_form.get('address')?.value : '',
                    // district: ciz_form.get('district')?.value ? ciz_form.get('district')?.value : '',
                    // subDistrict: ciz_form.get('subDistrict')?.value ? ciz_form.get('subDistrict')?.value : '',
                    // provinceName: ciz_form.get('provinceName')?.value ? ciz_form.get('provinceName')?.value : '',
                    // provinceCode: ciz_form.get('provinceCode')?.value ? ciz_form.get('provinceCode')?.value : '', // information form (stamp via code , sync master data)
                    // postalCode: ciz_form.get('postalCode')?.value ? ciz_form.get('postalCode')?.value : '',
                    // cizcardimage: this.cizcardtab.cizCardImage_string ? this.cizcardtab.cizCardImage_string : '',
                    // dipchipuuid: dipchipuuid ? dipchipuuid : ''

                    QUO_KEY_APP_ID: quotationKeyid,
                    USER_ID: userid,
                    IDCARD_NUM: idcard_num,
                    PHONE_NUMBER: phone_number,
                    EMAIL: ciz_email,
                    TITLE_CODE: title_code,
                    TITLE_NAME: title_name,
                    FIRST_NAME: first_name,
                    LAST_NAME: last_name,
                    BIRTH_DATE: (new Date(birth_date_eng_dtype)) ?? null,
                    BIRTH_DATE_TEXT_TH: birth_date_thai,
                    BIRTH_DATE_TEXT_EN: birth_date_eng,
                    CIZ_ISSUED_DATE: (new Date(ciz_issued_date_dtype)) ?? null,
                    CIZ_ISSUED_PLACE: ciz_issued_place,
                    CIZ_EXPIRED_DATE: (new Date(ciz_expired_date_dtype)) ?? null,
                    CIZ_ADDRESS: ciz_address,
                    CIZ_SUB_DISTRICT: ciz_sub_district,
                    CIZ_DISTRICT: ciz_district,
                    CIZ_PROVINCE_NAME: ciz_province_name,
                    CIZ_PROVINCE_CODE: ciz_province_code,
                    CIZ_POSTAL_CODE: ciz_postal_code,
                    QUO_STATUS: quo_status,
                    QUO_LIVING_PLACE_ID: livingplacekeyid,
                    QUO_CONTRACT_PLACE_ID: contactplacekeyid,
                    QUO_WORKING_PLACE_ID: workplacekeyid,
                    QUO_CAREER_ID: careerkeyid,
                    QUO_CREDIT_ID: creditkeyid,
                    // QUO_IMAGE_ID: attachfilekeyid,
                    QUO_PURPOSE_ID: purposekeyid,
                    QUO_CONSENT_ID: consentkeyid,
                    QUO_IAPP_OCR_ID: iappfilekeyid,
                    CHANNAL_TYPE: channalstamp,
                    SL_CODE: sl_code,
                    CHECKER_CODE: checker_code,
                    E_PAPER: e_paper_new_field,
                    CIZ_GENDER: ciz_gender,
                    DIPCHIP_UUID: dipchip_uuid,
                    CIZCARD_IMAGE: cizcard_send,
                    CIZ_NICKNAME: nickname,
                    CIZ_HOUSE_TYPE: house_type,
                    CIZ_HOUSE_OWNER_TYPE: house_owner_type,
                    CIZ_STAYED_YEAR: stayed_year,
                    CIZ_STAYED_MONTH: stayed_month,
                    CIZ_MARIED_STATUS: maried_status
                }, {
                // autoCommit: true
                // cizcard_array: { dir: oracledb.BIND_IN, val: cizcard_array, type: oracledb.BLOB, maxSize: 50000 }
            }
            )

            console.log("Quotation was create " + crete_quotaion.rowsAffected);

        } catch (e) {
            console.log(`error create quotation : ${e}`)
            logger.error(`user ${userid} : สร้างใบคำขอไม่สำเร็จ : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `สร้างใบคำขอไม่สำเร็จ : ${e.message ? e.message : `No message`}`
            })

        }

        // == step  create reference table (etc credit, contact place, image, living place, career) === 

        // == step create living place 
        try {

            const create_ref_living_place = await connection.execute(`INSERT INTO MPLS_LIVING_PLACE (
                LIV_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE, LATITUDE, LONDTIUDE, LALON)
            VALUES (:LIV_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE, :LATITUDE, :LONDTIUDE, :LALON)`,
                {
                    LIV_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: livingplacekeyid,
                    ADDRESS: liv_address,
                    SUB_DISTRICT: liv_sub_district,
                    DISTRICT: liv_district,
                    PROVINCE_NAME: liv_province_name,
                    PROVINCE_CODE: liv_province_code,
                    POSTAL_CODE: liv_postal_code,
                    LATITUDE: la,
                    LONDTIUDE: lon,
                    LALON: lalon
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref living place record : ${create_ref_living_place.rowsAffected}`)

        } catch (e) {
            console.log(`error create living place : ${e}`)
            logger.error(`user ${userid} : ข้อมูลที่อยู่ปัจจุบันไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลที่อยู่ปัจจุบันไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })

        }

        // == step create contace place 

        try {
            const create_ref_contace_place = await connection.execute(`INSERT INTO MPLS_CONTACT_PLACE (
                CONT_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE)
            VALUES (:CONT_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE)`,
                {
                    CONT_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: contactplacekeyid,
                    ADDRESS: cont_address,
                    SUB_DISTRICT: cont_sub_district,
                    DISTRICT: cont_district,
                    PROVINCE_NAME: cont_province_name,
                    PROVINCE_CODE: cont_province_code,
                    POSTAL_CODE: cont_postal_code
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref Contact place record : ${create_ref_contace_place.rowsAffected}`)

        } catch (e) {
            console.log(`error create Contact place : ${e}`)
            logger.error(`user ${userid} : ข้อมูลที่อยู่ที่ติดต่อได้ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลที่อยู่ที่ติดต่อได้ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })

        }

        // === step create house regis place ===

        try {
            const create_ref_house_regis_place = await connection.execute(`INSERT INTO MPLS_HOUSE_REGIS_PLACE (
                HRP_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE)
            VALUES (:HRP_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE)`,
                {
                    HRP_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: houseregisplacekeyid,
                    ADDRESS: hrp_address,
                    SUB_DISTRICT: hrp_sub_district,
                    DISTRICT: hrp_district,
                    PROVINCE_NAME: hrp_province_name,
                    PROVINCE_CODE: hrp_province_code,
                    POSTAL_CODE: hrp_postal_code
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref House Regis place record : ${create_ref_house_regis_place.rowsAffected}`)

        } catch (e) {
            console.log(`error create Contact place : ${e}`)
            logger.error(`user ${userid} : ข้อมูลที่อยู่ที่ติดต่อได้ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลที่อยู่ที่ติดต่อได้ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })

        }

        // == step create work place 

        try {
            const create_ref_work_place = await connection.execute(`INSERT INTO MPLS_WORK_PLACE (
                WORK_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE)
            VALUES (:WORK_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE)`,
                {
                    WORK_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: workplacekeyid,
                    ADDRESS: work_address,
                    SUB_DISTRICT: work_sub_district,
                    DISTRICT: work_district,
                    PROVINCE_NAME: work_province_name,
                    PROVINCE_CODE: work_province_code,
                    POSTAL_CODE: work_postal_code
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref work place record : ${create_ref_work_place.rowsAffected}`)
        } catch (e) {
            console.log(`error create work place : ${e}`)
            logger.error(`user ${userid} : ข้อมูลที่อยู่ที่ทำงานไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 404,
                message: `ข้อมูลที่อยู่ที่ทำงานไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })

        }



        try {
            const create_ref_credit = await connection.execute(`INSERT INTO MPLS_CREDIT (
                CRE_QUO_KEY_APP_ID, APP_KEY_ID, BRAND_CODE, BRAND_NAME, MODEL_CODE, MODEL_NAME ,COLOR_CODE, COLOR_NAME, LOAN_AMOUNT,
                PRODUCT_VALUE, DOWN_PAYMENT, INTEREST_RATE, PAYMENT_VALUE, PAYMENT_ROUND_COUNT, INSURER_CODE, INSURER_NAME,
                INSURANCE_CODE, INSURANCE_NAME, INSURANCE_YEAR, INSURANCE_PLAN_PRICE, IS_INCLUDE_LOANAMOUNT, FACTORY_PRICE, SIZE_MODEL,
                COVERAGE_TOTAL_LOSS, MAX_LTV, PRICE_INCLUDE_VAT, ENGINE_NUMBER, CHASSIS_NUMBER, ENGINE_NO_RUNNING, CHASSIS_NO_RUNNING)
            VALUES (:CRE_QUO_KEY_APP_ID, :APP_KEY_ID, :BRAND_CODE, :BRAND_NAME, :MODEL_CODE, :MODEL_NAME, :COLOR_CODE,
                :COLOR_NAME, :LOAN_AMOUNT, :PRODUCT_VALUE, :DOWN_PAYMENT, :INTEREST_RATE, :PAYMENT_VALUE, :PAYMENT_ROUND_COUNT, :INSURER_CODE, :INSURER_NAME,
                :INSURANCE_CODE, :INSURANCE_NAME, :INSURANCE_YEAR, :INSURANCE_PLAN_PRICE, :IS_INCLUDE_LOANAMOUNT, :FACTORY_PRICE, :SIZE_MODEL,
                 :COVERAGE_TOTAL_LOSS, :MAX_LTV, :PRICE_INCLUDE_VAT, :ENGINE_NUMBER, :CHASSIS_NUMBER, :ENGINE_NO_RUNNING, :CHASSIS_NO_RUNNING )`,
                {
                    CRE_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: creditkeyid,
                    BRAND_CODE: brand_code,
                    BRAND_NAME: brand_name,
                    MODEL_CODE: model_code,
                    MODEL_NAME: model_name,
                    COLOR_CODE: color_code,
                    COLOR_NAME: color_name,
                    LOAN_AMOUNT: loan_amount,
                    PRODUCT_VALUE: product_value,
                    DOWN_PAYMENT: down_payment,
                    INTEREST_RATE: interest_rate,
                    PAYMENT_VALUE: payment_value,
                    PAYMENT_ROUND_COUNT: payment_round_count,
                    INSURER_CODE: insurer_code,
                    INSURER_NAME: insurer_name,
                    INSURANCE_CODE: insurance_code,
                    INSURANCE_NAME: insurance_name,
                    INSURANCE_YEAR: insurance_year,
                    INSURANCE_PLAN_PRICE: insurance_plan_price,
                    IS_INCLUDE_LOANAMOUNT: is_include_loanamount,
                    FACTORY_PRICE: factory_price,
                    SIZE_MODEL: size_model,
                    COVERAGE_TOTAL_LOSS: coverage_total_loss,
                    MAX_LTV: max_ltv,
                    PRICE_INCLUDE_VAT: price_include_vat,
                    ENGINE_NUMBER: engine_number,
                    CHASSIS_NUMBER: chassis_number,
                    ENGINE_NO_RUNNING: engine_no_running,
                    CHASSIS_NO_RUNNING: chassis_no_running
                },
                {
                    // autoCommit: true
                }
            )

            // const sql_create_credit = `INSERT INTO MPLS_CREDIT (
            //          CRE_QUO_KEY_APP_ID, APP_KEY_ID, BRAND_CODE, BRAND_NAME, MODEL_CODE, MODEL_NAME ,COLOR_CODE, COLOR_NAME, LOAN_AMOUNT,
            //          PRODUCT_VALUE, DOWN_PAYMENT, INTEREST_RATE, PAYMENT_VALUE, PAYMENT_ROUND_COUNT, INSURER_CODE, INSURER_NAME,
            //          INSURANCE_CODE, INSURANCE_NAME, INSURANCE_YEAR, INSURANCE_PLAN_PRICE, IS_INCLUDE_LOANAMOUNT, FACTORY_PRICE, SIZE_MODEL,
            //          COVERAGE_TOTAL_LOSS, MAX_LTV, PRICE_INCLUDE_VAT, ENGINE_NUMBER, CHASSIS_NUMBER, ENGINE_NO_RUNNING, CHASSIS_NO_RUNNING)
            //      VALUES (:CRE_QUO_KEY_APP_ID, :APP_KEY_ID, :BRAND_CODE, :BRAND_NAME, :MODEL_CODE, :MODEL_NAME, :COLOR_CODE,
            //          :COLOR_NAME, :LOAN_AMOUNT, :PRODUCT_VALUE, :DOWN_PAYMENT, :INTEREST_RATE, :PAYMENT_VALUE, :PAYMENT_ROUND_COUNT, :INSURER_CODE, :INSURER_NAME,
            //          :INSURANCE_CODE, :INSURANCE_NAME, :INSURANCE_YEAR, :INSURANCE_PLAN_PRICE, :IS_INCLUDE_LOANAMOUNT, :FACTORY_PRICE, :SIZE_MODEL,
            //           :COVERAGE_TOTAL_LOSS, :MAX_LTV, :PRICE_INCLUDE_VAT, :ENGINE_NUMBER, :CHASSIS_NUMBER, :ENGINE_NO_RUNNING, :CHASSIS_NO_RUNNING )
            //           `

            // params = {
            //     CRE_QUO_KEY_APP_ID: { dir: oracledb.BIND_IN, val: quotationKeyid, type: oracledb.STRING },
            //     APP_KEY_ID: { dir: oracledb.BIND_IN, val: creditkeyid, type: oracledb.STRING },
            //     BRAND_CODE: { dir: oracledb.BIND_IN, val: brand_code, type: oracledb.STRING },
            //     BRAND_NAME: { dir: oracledb.BIND_IN, val: brand_name, type: oracledb.STRING },
            //     MODEL_CODE: { dir: oracledb.BIND_IN, val: model_code, type: oracledb.STRING },
            //     MODEL_NAME: { dir: oracledb.BIND_IN, val: model_name, type: oracledb.STRING },
            //     COLOR_CODE: { dir: oracledb.BIND_IN, val: color_code, type: oracledb.STRING },
            //     COLOR_NAME: { dir: oracledb.BIND_IN, val: color_name, type: oracledb.STRING },
            //     LOAN_AMOUNT: { dir: oracledb.BIND_IN, val: loan_amount, type: oracledb.NUMBER },
            //     PRODUCT_VALUE: { dir: oracledb.BIND_IN, val: product_value, type: oracledb.NUMBER },
            //     DOWN_PAYMENT: { dir: oracledb.BIND_IN, val: down_payment, type: oracledb.NUMBER },
            //     INTEREST_RATE: { dir: oracledb.BIND_IN, val: interest_rate, type: oracledb.NUMBER },
            //     PAYMENT_VALUE: { dir: oracledb.BIND_IN, val: payment_value, type: oracledb.NUMBER },
            //     PAYMENT_ROUND_COUNT: { dir: oracledb.BIND_IN, val: payment_round_count, type: oracledb.NUMBER },
            //     INSURER_CODE: { dir: oracledb.BIND_IN, val: insurer_code, type: oracledb.STRING },
            //     INSURER_NAME: { dir: oracledb.BIND_IN, val: insurer_name, type: oracledb.STRING },
            //     INSURANCE_CODE: { dir: oracledb.BIND_IN, val: insurance_code, type: oracledb.STRING },
            //     INSURANCE_NAME: { dir: oracledb.BIND_IN, val: insurance_name, type: oracledb.STRING },
            //     INSURANCE_YEAR: { dir: oracledb.BIND_IN, val: insurance_year, type: oracledb.NUMBER },
            //     INSURANCE_PLAN_PRICE: { dir: oracledb.BIND_IN, val: insurance_plan_price, type: oracledb.NUMBER },
            //     IS_INCLUDE_LOANAMOUNT: { dir: oracledb.BIND_IN, val: is_include_loanamount, type: oracledb.NUMBER },
            //     FACTORY_PRICE: { dir: oracledb.BIND_IN, val: factory_price, type: oracledb.NUMBER },
            //     SIZE_MODEL: { dir: oracledb.BIND_IN, val: size_model, type: oracledb.STRING },
            //     COVERAGE_TOTAL_LOSS: { dir: oracledb.BIND_IN, val: coverage_total_loss, type: oracledb.NUMBER },
            //     MAX_LTV: { dir: oracledb.BIND_IN, val: max_ltv, type: oracledb.NUMBER },
            //     PRICE_INCLUDE_VAT: { dir: oracledb.BIND_IN, val: price_include_vat, type: oracledb.NUMBER },
            //     ENGINE_NUMBER: { dir: oracledb.BIND_IN, val: engine_number, type: oracledb.STRING },
            //     CHASSIS_NUMBER: { dir: oracledb.BIND_IN, val: chassis_number, type: oracledb.STRING },
            //     ENGINE_NO_RUNNING: { dir: oracledb.BIND_IN, val: engine_no_running, type: oracledb.STRING },
            //     CHASSIS_NO_RUNNING: { dir: oracledb.BIND_IN, val: chassis_no_running, type: oracledb.STRING }
            // }

            // const create_ref_credit = await connection.execute(sql_create_credit, params, {})

            console.log(`sussecc create ref credit record : ${create_ref_credit.rowsAffected}`)
        } catch (e) {
            console.log(`error create credit : ${e}`)
            logger.error(`user ${userid} : ข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })

        }

        // == step create career ==== 

        try {
            const create_ref_career = await connection.execute(`INSERT INTO MPLS_CAREER (
                CARE_QUO_APP_KEY_ID, APP_KEY_ID, MAIN_CAREER_NAME, MAIN_CAREER_CODE, MAIN_WORKPLACE_NAME, 
                MAIN_POSITION, MAIN_DEPARTMENT,
                MAIN_EXPERIENCE_YEAR, MAIN_EXPERIENCE_MONTH, MAIN_SALARY_PER_MONTH, MAIN_SALARY_PER_DAY,
                MAIN_LEADER_NAME, MAIN_WORK_PER_WEEK, IS_SUB_CAREER, SUB_CAREER_NAME, SUB_CAREER_CODE,
                SUB_WORKPLACE_NAME, SUB_POSITION, SUB_DEPARTMENT,SUB_EXPERIENCE_YEAR, SUB_EXPERIENCE_MONTH,
                SUB_SALARY_PER_MONTH, SUB_SALARY_PER_DAY, SUB_LEADER_NAME, SUB_WORK_PER_WEEK)
            VALUES (:CARE_QUO_APP_KEY_ID, :APP_KEY_ID, :MAIN_CAREER_NAME, :MAIN_CAREER_CODE, :MAIN_WORKPLACE_NAME, :MAIN_POSITION, :MAIN_DEPARTMENT,
                :MAIN_EXPERIENCE_YEAR, :MAIN_EXPERIENCE_MONTH, :MAIN_SALARY_PER_MONTH, :MAIN_SALARY_PER_DAY,
                :MAIN_LEADER_NAME, :MAIN_WORK_PER_WEEK, :IS_SUB_CAREER, :SUB_CAREER_NAME, :SUB_CAREER_CODE, 
                :SUB_WORKPLACE_NAME, :SUB_POSITION, :SUB_DEPARTMENT, :SUB_EXPERIENCE_YEAR, :SUB_EXPERIENCE_MONTH, 
                :SUB_SALARY_PER_MONTH, :SUB_SALARY_PER_DAY, :SUB_LEADER_NAME, :SUB_WORK_PER_WEEK)`,
                {
                    CARE_QUO_APP_KEY_ID: quotationKeyid,
                    APP_KEY_ID: careerkeyid,
                    MAIN_CAREER_NAME: main_career_name,
                    MAIN_CAREER_CODE: main_career_code,
                    MAIN_WORKPLACE_NAME: main_workplace_name,
                    MAIN_POSITION: main_position,
                    MAIN_DEPARTMENT: main_department,
                    MAIN_EXPERIENCE_YEAR: main_experience_year,
                    MAIN_EXPERIENCE_MONTH: main_experience_month,
                    MAIN_SALARY_PER_MONTH: main_salary_per_month,
                    MAIN_SALARY_PER_DAY: main_salary_per_day,
                    MAIN_LEADER_NAME: main_leader_name,
                    MAIN_WORK_PER_WEEK: main_work_per_week,
                    IS_SUB_CAREER: is_sub_career,
                    SUB_CAREER_NAME: sub_career_name,
                    SUB_CAREER_CODE: sub_career_code,
                    SUB_WORKPLACE_NAME: sub_workplace_name,
                    SUB_POSITION: sub_position,
                    SUB_DEPARTMENT: sub_department,
                    SUB_EXPERIENCE_YEAR: sub_experience_year,
                    SUB_EXPERIENCE_MONTH: sub_experience_month,
                    SUB_SALARY_PER_MONTH: sub_salary_per_month,
                    SUB_SALARY_PER_DAY: sub_salary_per_day,
                    SUB_LEADER_NAME: sub_leader_name,
                    SUB_WORK_PER_WEEK: sub_work_per_week
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref career record : ${create_ref_career.rowsAffected}`)
        } catch (e) {
            console.log(`error create career : ${e}`)
            logger.error(`user ${userid} : ข้อมูลอาชีพและรายได้ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลอาชีพและรายได้ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })

        }

        // == step create consent ==== 
        // === add PDPA new Consent (20/07/2022) ===
        try {
            console.log('trigger this !!')
            const create_ref_consent = await connection.execute(`INSERT INTO MPLS_CONSENT (
                CONS_QUO_KEY_APP_ID, APP_KEY_ID, CUSTOMER_NAME, FIRST_NAME, LAST_NAME, IS_DISCLOSURE_CONSENT, 
                IS_PERSONAL_DISCLOSURE_CONSENT, IS_CREDIT_CONSENT, SIGNATURE_IMAGE, WITNESS_IMAGE,
                IDENTITY_APPROVE_CONSENT_VALUE, MOTOR_INSURANCE_CONSENT_VALUE, NMOTOR_INSURANCE_CONSENT_VALUE,
                ANALYZE_CONSENT_VALUE, INFO_CONSENT_VALUE, INFO_PARTY_CONSENT_VALUE, ANALYZE_PARTY_CONSENT_VALUE,
                PRDT_INFO_PARTY_CONSENT_VALUE, FOLLOWUP_CONSENT_VALUE, INFO_DEVELOP_CONSENT_VALUE,
                E_PAPER_CONSENT_VALUE)
            VALUES (:CONS_QUO_KEY_APP_ID, :APP_KEY_ID, :CUSTOMER_NAME, :FIRST_NAME, :LAST_NAME, :IS_DISCLOSURE_CONSENT, 
                :IS_PERSONAL_DISCLOSURE_CONSENT, :IS_CREDIT_CONSENT, :SIGNATURE_IMAGE, :WITNESS_IMAGE,
                :IDENTITY_APPROVE_CONSENT_VALUE, :MOTOR_INSURANCE_CONSENT_VALUE, :NMOTOR_INSURANCE_CONSENT_VALUE,
                :ANALYZE_CONSENT_VALUE, :INFO_CONSENT_VALUE, :INFO_PARTY_CONSENT_VALUE, :ANALYZE_PARTY_CONSENT_VALUE,
                :PRDT_INFO_PARTY_CONSENT_VALUE, :FOLLOWUP_CONSENT_VALUE, :INFO_DEVELOP_CONSENT_VALUE,
                :E_PAPER_CONSENT_VALUE)`,
                {
                    CONS_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: consentkeyid,
                    CUSTOMER_NAME: consent_customer_name,
                    FIRST_NAME: consent_first_name,
                    LAST_NAME: consent_last_name,
                    IS_DISCLOSURE_CONSENT: is_disclosure_consent,
                    IS_PERSONAL_DISCLOSURE_CONSENT: is_personal_disclosure_consent,
                    IS_CREDIT_CONSENT: is_credit_consent,
                    SIGNATURE_IMAGE: signatureBuffer,
                    WITNESS_IMAGE: witnessBuffer,
                    IDENTITY_APPROVE_CONSENT_VALUE: identity_approve_consent_value,
                    MOTOR_INSURANCE_CONSENT_VALUE: motor_insurance_consent_value,
                    NMOTOR_INSURANCE_CONSENT_VALUE: nmotor_insurance_consent_value,
                    ANALYZE_CONSENT_VALUE: analyze_consent_value,
                    INFO_CONSENT_VALUE: info_consent_value,
                    INFO_PARTY_CONSENT_VALUE: info_party_consent_value,
                    ANALYZE_PARTY_CONSENT_VALUE: analyze_party_consent_value,
                    PRDT_INFO_PARTY_CONSENT_VALUE: prdt_info_party_consent_value,
                    FOLLOWUP_CONSENT_VALUE: followup_consent_value,
                    INFO_DEVELOP_CONSENT_VALUE: info_develop_consent_value,
                    E_PAPER_CONSENT_VALUE: e_paper_consent_value
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref consent record : ${create_ref_consent.rowsAffected}`)
        }

        catch (e) {
            console.log(`error create consent : ${e}`)
            logger.error(`user ${userid} : ข้อมูลเอกสารสัญญาไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลเอกสารสัญญาไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })
        }


        // == step create purpose === 
        try {
            const create_ref_purpose = await connection.execute(`INSERT INTO MPLS_PURPOSE (
                PURP_QUO_APP_KEY_ID, APP_KEY_ID, PURPOSE_OF_BUY, PURPOSE_OF_BUY_NAME, REASON_OF_BUY,
                REASON_OF_BUY_NAME, CAR_USER, CAR_USER_RELATION, CAR_USER_NAME, CAR_USER_FULLNAME, CAR_USER_CITIZENCARD_ID,
                CAR_USER_HOME_NO, CAR_USER_HOME_NAME, CAR_USER_SOI, CAR_USER_MOO, CAR_USER_ROAD, CAR_USER_SUB_DISTRICT,
                CAR_USER_DISTRICT, CAR_USER_PROVINCE_NAME, CAR_USER_PROVINCE_CODE, CAR_USER_POSTAL_CODE, CAR_USER_ROOM_NO,
                CAR_USER_FLOOR, CAR_USER_PHONENO, FIRST_REFERRAL_FULLNAME, FIRST_REFERRAL_HOUSE_NO, FIRST_REFERRAL_MOO,
                FIRST_REFERRAL_HOUSE_NAME, FIRST_REFERRAL_ROOM_NO, FIRST_REFERRAL_FLOOR, FIRST_REFERRAL_SOI, FIRST_REFERRAL_ROAD,
                FIRST_REFERRAL_SUB_DISTRICT, FIRST_REFERRAL_DISTRICT, FIRST_REFERRAL_PROVINCE_NAME, FIRST_REFERRAL_PROVINCE_CODE,
                FIRST_REFERRAL_POSTAL_CODE, FIRST_REFERRAL_PHONENO, FIRST_REFERRAL_RELATION, SECOND_REFERRAL_FULLNAME, SECOND_REFERRAL_HOUSE_NO, SECOND_REFERRAL_MOO,
                SECOND_REFERRAL_HOUSE_NAME, SECOND_REFERRAL_ROOM_NO, SECOND_REFERRAL_FLOOR, SECOND_REFERRAL_SOI, SECOND_REFERRAL_ROAD,
                SECOND_REFERRAL_SUB_DISTRICT, SECOND_REFERRAL_DISTRICT, SECOND_REFERRAL_PROVINCE_NAME, SECOND_REFERRAL_PROVINCE_CODE,
                SECOND_REFERRAL_POSTAL_CODE, SECOND_REFERRAL_PHONENO, SECOND_REFERRAL_RELATION)
            VALUES (:PURP_QUO_APP_KEY_ID, :APP_KEY_ID, :PURPOSE_OF_BUY, :PURPOSE_OF_BUY_NAME, :REASON_OF_BUY,
                :REASON_OF_BUY_NAME, :CAR_USER, :CAR_USER_RELATION, :CAR_USER_NAME, :CAR_USER_FULLNAME, :CAR_USER_CITIZENCARD_ID,
                :CAR_USER_HOME_NO, :CAR_USER_HOME_NAME, :CAR_USER_SOI, :CAR_USER_MOO, :CAR_USER_ROAD, :CAR_USER_SUB_DISTRICT,
                :CAR_USER_DISTRICT, :CAR_USER_PROVINCE_NAME, :CAR_USER_PROVINCE_CODE, :CAR_USER_POSTAL_CODE, :CAR_USER_ROOM_NO,
                :CAR_USER_FLOOR, :CAR_USER_PHONENO, :FIRST_REFERRAL_FULLNAME, :FIRST_REFERRAL_HOUSE_NO, :FIRST_REFERRAL_MOO,
                :FIRST_REFERRAL_HOUSE_NAME, :FIRST_REFERRAL_ROOM_NO, :FIRST_REFERRAL_FLOOR, :FIRST_REFERRAL_SOI, :FIRST_REFERRAL_ROAD,
                :FIRST_REFERRAL_SUB_DISTRICT, :FIRST_REFERRAL_DISTRICT, :FIRST_REFERRAL_PROVINCE_NAME, :FIRST_REFERRAL_PROVINCE_CODE,
                :FIRST_REFERRAL_POSTAL_CODE, :FIRST_REFERRAL_PHONENO, :FIRST_REFERRAL_RELATION, :SECOND_REFERRAL_FULLNAME, :SECOND_REFERRAL_HOUSE_NO, :SECOND_REFERRAL_MOO,
                :SECOND_REFERRAL_HOUSE_NAME, :SECOND_REFERRAL_ROOM_NO, :SECOND_REFERRAL_FLOOR, :SECOND_REFERRAL_SOI, :SECOND_REFERRAL_ROAD,
                :SECOND_REFERRAL_SUB_DISTRICT, :SECOND_REFERRAL_DISTRICT, :SECOND_REFERRAL_PROVINCE_NAME, :SECOND_REFERRAL_PROVINCE_CODE,
                :SECOND_REFERRAL_POSTAL_CODE, :SECOND_REFERRAL_PHONENO, :SECOND_REFERRAL_RELATION)`,
                {
                    PURP_QUO_APP_KEY_ID: quotationKeyid,
                    APP_KEY_ID: purposekeyid,
                    PURPOSE_OF_BUY: purpose_buy, PURPOSE_OF_BUY_NAME: purpose_buy_name, REASON_OF_BUY: reason_buy,
                    REASON_OF_BUY_NAME: reason_buy_etc, CAR_USER: car_user, CAR_USER_RELATION: car_user_relation, CAR_USER_NAME: car_user_name, CAR_USER_FULLNAME: car_user_name_2, CAR_USER_CITIZENCARD_ID: car_user_citizen_id,
                    CAR_USER_HOME_NO: car_user_home_no, CAR_USER_HOME_NAME: car_user_home_name, CAR_USER_SOI: car_user_soi, CAR_USER_MOO: car_user_moo, CAR_USER_ROAD: car_user_road, CAR_USER_SUB_DISTRICT: car_user_sub_district,
                    CAR_USER_DISTRICT: car_user_district, CAR_USER_PROVINCE_NAME: car_user_province_name, CAR_USER_PROVINCE_CODE: car_user_province_code, CAR_USER_POSTAL_CODE: car_user_postal_code, CAR_USER_ROOM_NO: car_user_room_no,
                    CAR_USER_FLOOR: car_user_floor, CAR_USER_PHONENO: car_user_phone_no, FIRST_REFERRAL_FULLNAME: first_referral_fullname, FIRST_REFERRAL_HOUSE_NO: first_referral_house_no, FIRST_REFERRAL_MOO: first_referral_moo,
                    FIRST_REFERRAL_HOUSE_NAME: first_referral_house_name, FIRST_REFERRAL_ROOM_NO: first_referral_room_no, FIRST_REFERRAL_FLOOR: first_referral_floor, FIRST_REFERRAL_SOI: first_referral_soi, FIRST_REFERRAL_ROAD: first_referral_road,
                    FIRST_REFERRAL_SUB_DISTRICT: first_referral_sub_district, FIRST_REFERRAL_DISTRICT: first_referral_district, FIRST_REFERRAL_PROVINCE_NAME: first_referral_province_name, FIRST_REFERRAL_PROVINCE_CODE: first_referral_province_code,
                    FIRST_REFERRAL_POSTAL_CODE: first_referral_postal_code, FIRST_REFERRAL_PHONENO: first_referral_phone_no, FIRST_REFERRAL_RELATION: first_referral_relation, SECOND_REFERRAL_FULLNAME: second_referral_fullname, SECOND_REFERRAL_HOUSE_NO: second_referral_house_no,
                    SECOND_REFERRAL_MOO: second_referral_moo, SECOND_REFERRAL_HOUSE_NAME: second_referral_house_name, SECOND_REFERRAL_ROOM_NO: second_referral_room_no, SECOND_REFERRAL_FLOOR: second_referral_floor,
                    SECOND_REFERRAL_SOI: second_referral_soi, SECOND_REFERRAL_ROAD: second_referral_road, SECOND_REFERRAL_SUB_DISTRICT: second_referral_sub_district, SECOND_REFERRAL_DISTRICT: second_referral_district,
                    SECOND_REFERRAL_PROVINCE_NAME: second_referral_province_name, SECOND_REFERRAL_PROVINCE_CODE: second_referral_province_code, SECOND_REFERRAL_POSTAL_CODE: second_referral_postal_code,
                    SECOND_REFERRAL_PHONENO: second_referral_phone_no, SECOND_REFERRAL_RELATION: second_referral_relation
                },
                {
                    // autoCommit: true
                }
            )

            console.log(`sussecc create ref purpose record : ${create_ref_purpose.rowsAffected}`)

        } catch (e) {
            console.log(`error create Purpose : ${e}`)
            logger.error(`user ${userid} : ข้อมูลวัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(400).send({
                status: 400,
                message: `ข้อมูลวัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })
        }

        // === step create attach file ===
        // try {
        //     const create_ref_attach_file = await connection.execute(`INSERT INTO MPLS_ATTACH_FILE (
        //         ATF_QUO_APP_KEY_ID, APP_KEY_ID, CITIZENID_IMAGE, HOUSE_REGISTRATION_IMAGE, FACE_IMAGE, HOUSE_IMAGE, STORE_IMAGE,
        //         SALARY_CERTIFICATE_IMAGE, WORK_CERTIFICATE_IMAGE, SALARY_PAYMENT_IMAGE, BOOKBANK_IMAGE, MOTOCYCLE_LICENSE_IMAGE,
        //         SIGNATURE_IMAGE, CITIZENID_IMAGE_NAME, HOUSE_REGISTRATION_IMAGE_NAME, FACE_IMAGE_NAME, BOOKBANK_IMAGE_NAME)
        //     VALUES (:ATF_QUO_APP_KEY_ID, :APP_KEY_ID, :CITIZENID_IMAGE, :HOUSE_REGISTRATION_IMAGE, :FACE_IMAGE, :HOUSE_IMAGE, :STORE_IMAGE,
        //         :SALARY_CERTIFICATE_IMAGE, :WORK_CERTIFICATE_IMAGE, :SALARY_PAYMENT_IMAGE, :BOOKBANK_IMAGE, :MOTOCYCLE_LICENSE_IMAGE,
        //         :SIGNATURE_IMAGE, :CITIZENID_IMAGE_NAME, :HOUSE_REGISTRATION_IMAGE_NAME, :FACE_IMAGE_NAME, :BOOKBANK_IMAGE_NAME)`,
        //         {
        //             ATF_QUO_APP_KEY_ID: quotationKeyid,
        //             APP_KEY_ID: attachfilekeyid,
        //             CITIZENID_IMAGE: cititzenBuffer,
        //             HOUSE_REGISTRATION_IMAGE: houseregisBuffer,
        //             FACE_IMAGE: faceBuffer,
        //             HOUSE_IMAGE: hosueBuffer,
        //             STORE_IMAGE: storeBuffer,
        //             SALARY_CERTIFICATE_IMAGE: salarycertificateBuffer,
        //             WORK_CERTIFICATE_IMAGE: workcertificateBuffer,
        //             SALARY_PAYMENT_IMAGE: salarypaymentBuffer,
        //             BOOKBANK_IMAGE: bookbankBuffer,
        //             MOTOCYCLE_LICENSE_IMAGE: motocyclelicenseBuffer,
        //             SIGNATURE_IMAGE: signatureBuffer,
        //             // ==== add name and type of image === (05/05/2022)
        //             CITIZENID_IMAGE_NAME: citizenid_image_name,
        //             HOUSE_REGISTRATION_IMAGE_NAME: houseregis_image_name,
        //             FACE_IMAGE_NAME: face_image_name,
        //             BOOKBANK_IMAGE_NAME: bookbank_image_name


        //         },
        //         {
        //             // autoCommit: true
        //         }
        //     )

        //     console.log(`sussecc create ref attach file record : ${create_ref_attach_file.rowsAffected}`)
        // } catch (e) {
        //     console.log(`error create attach file : ${e}`)
        //     return res.status(404).send({
        //         status: 404,
        //         message: e.message ? e.message : `create attach file fail`
        //     })
        // }

        // === step create attach file  v2 ===
        const isidcardinclude = imageData.find(items => items.code == 01);
        const iscustomerfaceinclude = imageData.find(items => items.code == 03);

        // === add require image type for quotation (28/10/2022) ===
        const iscizcardimagesign = imageData.find(items => items.code == 09)
        const isncbconsent = imageData.find(items => items.code == 10)

        // console.log(`iscizcardimagesign : ${iscizcardimagesign.code}`)
        // console.log(`isncbconsent : ${isncbconsent.code}`)

        console.log(`this is typecase : ${typecase}`)
        if (typecase == 'P') {
            try {
                // === save stage (06/09/2022) ===
                if (imageData.length !== 0) {

                    const sql = `
                    INSERT INTO MPLS_IMAGE_FILE (
                    IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                    IMAGE_CODE, IMAGE_FILE, STATUS, ACTIVE_STATUS)
                    VALUES (:quokeyid, :keyid, :filename, :filetype, 
                    :code, :filedata, :status, 'Y')
                    `

                    const binds = imageData;

                    const options = {
                        bindDefs: {
                            quokeyid: { type: oracledb.STRING, maxSize: 50 },
                            keyid: { type: oracledb.STRING, maxSize: 50 },
                            filename: { type: oracledb.STRING, maxSize: 200 },
                            filetype: { type: oracledb.STRING, maxSize: 200 },
                            code: { type: oracledb.STRING, maxSize: 4 },
                            filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                            status: { type: oracledb.NUMBER }
                        }
                    }

                    const result = await connection.executeMany(sql, binds, options)

                    console.log(`sussecc create ref attach file v2 record : ${result.rowsAffected}`)


                } else {
                    // === save stage without attach image (06/09/2022) ===
                    console.log('trigger this ')

                }
            } catch (e) {
                console.log(`error create attach file v2 : ${e}`)
                logger.error(`user ${userid} : ข้อมูลเอกสารประกอบการสมัครสินเชื่อไม่ถูกต้อง (รูปภาพ): ${e.message ? e.message : `No message`}`)
                return res.status(400).send({
                    status: 400,
                    message: `ข้อมูลเอกสารประกอบการสมัครสินเชื่อไม่ถูกต้อง (รูปภาพ): ${e.message ? e.message : `No message`}`
                })
            }
        } else {
            try {

                // === cheack image citizen card ====

                // if (!(isidcardinclude && iscustomerfaceinclude)) {

                // === add require image type for quotation (28/10/2022) ===
                if (!(isidcardinclude && iscustomerfaceinclude && iscizcardimagesign && isncbconsent)) {
                    logger.error(`user ${userid} : กรุณาแนบภาพบัตรประชาชนลูกค้า , รูปภาพหน้าลูกค้าพร้อมบัตรประชาชน , สำเนาบัตรประชาชนพร้อมลายเซ็นรับรองถูกต้อง , และ NCB Consent ก่อนสร้างใบคำขอ`)
                    return res.status(400).send({
                        status: 400,
                        // message: `กรุณาแนบภาพบัตรประชาชนลูกค้า และ รูปภาพหน้าลูกค้าพร้อมบัตรประชาชน`,
                        message: `กรุณาแนบภาพบัตรประชาชนลูกค้า , รูปภาพหน้าลูกค้าพร้อมบัตรประชาชน , สำเนาบัตรประชาชนพร้อมลายเซ็นรับรองถูกต้อง , และ NCB Consent ก่อนสร้างใบคำขอ`,
                        data: []
                    })
                }

                if (imageData.length !== 0) {

                    const sql = `
                    INSERT INTO MPLS_IMAGE_FILE (
                    IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                    IMAGE_CODE, IMAGE_FILE, STATUS, ACTIVE_STATUS)
                    VALUES (:quokeyid, :keyid, :filename, :filetype, 
                    :code, :filedata, :status, 'Y')
                    `

                    const binds = imageData;

                    const options = {
                        bindDefs: {
                            quokeyid: { type: oracledb.STRING, maxSize: 50 },
                            keyid: { type: oracledb.STRING, maxSize: 50 },
                            filename: { type: oracledb.STRING, maxSize: 200 },
                            filetype: { type: oracledb.STRING, maxSize: 200 },
                            code: { type: oracledb.STRING, maxSize: 4 },
                            filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                            status: { type: oracledb.NUMBER }
                        }
                    }

                    const result = await connection.executeMany(sql, binds, options)

                    console.log(`sussecc create ref attach file v2 record : ${result.rowsAffected}`)


                } else {
                    logger.error(`user ${userid} : แนบไฟล์ภาพอย่างน้อย 1 ภาพ`)
                    return res.status(400).send({
                        status: 400,
                        message: `แนบไฟล์ภาพอย่างน้อย 1 ภาพ`,
                        data: []
                    })

                }
            } catch (e) {
                console.log(`error create attach file v2 : ${e}`)
                logger.error(`user ${userid} : ข้อมูลเอกสารประกอบการสมัครสินเชื่อไม่ถูกต้อง (รูปภาพ): ${e.message ? e.message : `No message`}`)
                return res.status(400).send({
                    status: 400,
                    message: `ข้อมูลเอกสารประกอบการสมัครสินเชื่อไม่ถูกต้อง (รูปภาพ): ${e.message ? e.message : `No message`}`
                })
            }
        }
        if (iap_check) {
            // === step create IAPP ===
            try {
                const create_ref_iapp = await connection.execute(`INSERT INTO MPLS_IAPP_OCR (
                            APP_KEY_ID, IAPP_QUO_KEY_ID, ADDRESS, DETECTION_SCORE, EN_DOB, EN_EXPIRE, EN_FNAME, EN_INIT, EN_ISSUE, EN_LNAME,
                            ERROR_MESSAGE, FACE, GENDER, HOME_ADDRESS, ID_NUMBER, POSTAL_CODE, PROCESS_TIME, PROVINCE, RELIGION, 
                            REQUEST_ID, SUB_DISTRICT, TH_DOB, TH_EXPIRE, TH_FNAME, TH_INIT, TH_ISSUE, TH_LNAME, TH_NAME
                            )
                        VALUES (:APP_KEY_ID, :IAPP_QUO_KEY_ID, :ADDRESS, :DETECTION_SCORE, :EN_DOB, :EN_EXPIRE, :EN_FNAME, :EN_INIT, :EN_ISSUE, :EN_LNAME,
                            :ERROR_MESSAGE, :FACE, :GENDER, :HOME_ADDRESS, :ID_NUMBER, :POSTAL_CODE, :PROCESS_TIME, :PROVINCE, :RELIGION, 
                            :REQUEST_ID, :SUB_DISTRICT, :TH_DOB, :TH_EXPIRE, :TH_FNAME, :TH_INIT, :TH_ISSUE, :TH_LNAME, :TH_NAME
                            )`,
                    {
                        APP_KEY_ID: iappfilekeyid,
                        IAPP_QUO_KEY_ID: quotationKeyid,
                        ADDRESS: iap_address,
                        DETECTION_SCORE: iap_detection_score,
                        EN_DOB: iap_en_dob,
                        EN_EXPIRE: iap_en_expire,
                        EN_FNAME: iap_en_fname,
                        EN_INIT: iap_en_init,
                        EN_ISSUE: iap_en_issue,
                        EN_LNAME: iap_en_lname,
                        ERROR_MESSAGE: iap_error_message,
                        FACE: iappfaceBuffer,
                        GENDER: iap_gender,
                        HOME_ADDRESS: iap_home_address,
                        ID_NUMBER: iap_id_number,
                        POSTAL_CODE: iap_postal_code,
                        PROCESS_TIME: iap_process_time,
                        PROVINCE: iap_province,
                        RELIGION: iap_religion,
                        REQUEST_ID: iap_request_id,
                        SUB_DISTRICT: iap_sub_district,
                        TH_DOB: iap_th_dob,
                        TH_EXPIRE: iap_th_expire,
                        TH_FNAME: iap_th_fname,
                        TH_INIT: iap_th_init,
                        TH_ISSUE: iap_th_issue,
                        TH_LNAME: iap_th_lname,
                        TH_NAME: iap_th_name
                    },
                    {
                        // autoCommit: true
                    }
                )

                console.log(`sussecc create ref iapp ocr record : ${create_ref_iapp.rowsAffected}`)
            }

            catch (e) {
                console.log(`error create consent : ${e}`)
                logger.error(`user ${userid} : ข้อมูล OCR (สแกนบัตรประชาชน) ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
                return res.status(400).send({
                    status: 400,
                    message: `ข้อมูล OCR (สแกนบัตรประชาชน) ไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
                })
            }

        } else {
            console.log(`IAPP Ocr no value `)
        }



        // === commit all record if all created record success ====
        const commitall = await connection.commit();

        try {
            commitall
        } catch (e) {
            console.err(e.message)
            logger.error(`user ${userid} : สร้างใบคำขอไม่สำเร็จ (commit fail) : ${e.message ? e.message : `No message`}`)
            res.send(400).send({
                status: 400,
                message: `สร้างใบคำขอไม่สำเร็จ (commit fail)`,
                data: []
            })
        }

        // === step get quotation by id to return value to client ===

        const sqlstring_getquotationkeyid = `SELECT * FROM MPLS_QUOTATION WHERE QUO_KEY_APP_ID = '${quotationKeyid}'`
        const resultQuotation = await connection.execute(sqlstring_getquotationkeyid, [],
            {
                outFormat: oracledb.OBJECT
            })

        if (resultQuotation) {

            if (resultQuotation.rows.length == 0) {
                logger.error(`user ${userid} : ไม่พบรายการ Quotation ที่สร้างสำเร็จ`)
                const noresultFormatJson = {
                    status: 400,
                    message: 'ไม่พบรายการ Quotation ที่สร้างสำเร็จ'
                }
                res.status(400).send(noresultFormatJson)
            } else {
                let resData = resultQuotation.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                let returnData = new Object
                returnData.data = lowerResData
                returnData.status = 200
                returnData.message = 'success'

                // === tran all upperCase to lowerCase === 
                let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                    result[key.toLowerCase()] = val;
                });

                res.status(200).json(returnDatalowerCase);
            }
        } else {
            logger.error(`user ${userid} : ไม่พบรายการ Quotation ที่สร้างสำเร็จ`)
            return res.status(400).send({
                status: 400,
                message: `ไม่พบรายการ Quotation ที่สร้างสำเร็จ`,
                data: []
            })
        }

    } catch (e) {
        logger.error(`Error out of valid : ${e.message ? e.message : 'No return message'}`)
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

async function updateQuotationImage(req, res, next) {

    // === already log4js ===

    let connection;
    const logger = log4js.getLogger("update")
    try {
        let app_no
        let e_paper = ''
        let e_paper_new_field = 'N'
        let e_doc_status = ''
        let sms_send_status = ''
        let quo_status = ''
        let checker_code = ''
        console.log(`trigger start`)
        let imageCheckCode = [];
        const token = req.user
        const userid = token.ID

        // === check userid (21/10/2022) ===
        if (!userid) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบ userid (token)`,
                data: []
            })
        }

        // === chaanal type (25/05/2022) === 
        const channal = token.channal
        let channalstamp = ''

        if (channal) {
            switch (token.channal) {
                case 'checker': {
                    channalstamp = 'C'
                }
                    break;
                case 'dealer': {
                    channalstamp = 'S'
                }
            }
        }
        console.log(`chaanal : ${channalstamp}`)

        // === Get data on multipart/form-data === 
        let fileData
        let formData
        // const form = formidable({ multiples: true })
        const form = new multiparty.Form()
        await new Promise(function (resolve, reject) {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err)
                    return
                }
                formData = fields
                fileData = files
                resolve()
            })
            return
        })

        const parseFormdata = JSON.parse(formData.item)
        const {
            quotationid,
            living_place_id,
            contact_place_id,
            house_regis_place_id,
            work_place_id,
            credit_id,
            career_id,
            purpose_id,
            consent_id,
            is_new_sig_image,
            is_new_witness_sig_image,
            no_update_credit,
            lalon, la, lon, idcard_num, phone_number, ciz_email, title_code, title_name, first_name, birth_date,
            last_name, birth_date_thai, birth_date_eng, ciz_issued_date, ciz_expired_date,
            ciz_issued_date_text, ciz_expired_date_text, ciz_issued_place, ciz_address,
            ciz_sub_district, ciz_district, ciz_province_name, ciz_province_code, ciz_postal_code,
            liv_address, liv_sub_district, liv_district, liv_province_name, liv_province_code, liv_postal_code,
            cont_address, cont_sub_district, cont_district, cont_province_name, cont_province_code, cont_postal_code,
            work_address, work_sub_district, work_district, work_province_name, work_province_code, work_postal_code,
            brand_code, brand_name, model_code, model_name, color_code, color_name, loan_amount,
            product_value, down_payment, interest_rate, payment_value, payment_round_count,
            main_career_name, main_career_code, main_workplace_name, main_position, main_department,
            main_experience_year, main_experience_month, main_salary_per_month, main_salary_per_day,
            main_leader_name, main_work_per_week, is_sub_career,
            sub_career_name, sub_career_code, sub_workplace_name, sub_position, sub_department,
            sub_experience_year, sub_experience_month, sub_salary_per_month, sub_salary_per_day,
            sub_leader_name, sub_work_per_week,
            consent_customer_name, consent_first_name, consent_last_name, is_disclosure_consent,
            is_personal_disclosure_consent, is_credit_consent, is_final_consent,
            purpose_buy, purpose_buy_name, reason_buy, reason_buy_etc, car_user, car_user_name,
            car_user_relation, car_user_name_2, car_user_citizen_id, car_user_home_no,
            car_user_home_name, car_user_room_no, car_user_floor, car_user_soi, car_user_moo,
            car_user_road, car_user_sub_district, car_user_district, car_user_province_name,
            car_user_province_code, car_user_postal_code, car_user_phone_no,
            first_referral_fullname, first_referral_house_no, first_referral_moo, first_referral_house_name,
            first_referral_room_no, first_referral_floor, first_referral_soi, first_referral_road,
            first_referral_sub_district, first_referral_district, first_referral_province_name,
            first_referral_province_code, first_referral_postal_code, first_referral_phone_no, first_referral_relation,
            second_referral_fullname, second_referral_house_no, second_referral_moo, second_referral_house_name,
            second_referral_room_no, second_referral_floor, second_referral_soi, second_referral_road,
            second_referral_sub_district, second_referral_district, second_referral_province_name,
            second_referral_province_code, second_referral_postal_code, second_referral_phone_no, second_referral_relation,
            citizenid_image_name, houseregis_image_name, face_image_name, hosue_image_name, store_image_name,
            salarycertificate_image_name, workcertificate_image_name, salarypayment_image_namem, bookbank_image_name, motocycle_image_name,
            citizenid_image_type, houseregis_image_type, face_image_type, hosue_image_type, store_image_type,
            salarycertificate_image_type, workcertificate_image_type, salarypayment_image_typem, bookbank_image_type, motocycle_image_type,
            insurer_code, insurer_name, insurance_code, insurance_name, insurance_year, insurance_plan_price, is_include_loanamount, factory_price, size_model,
            iap_check, iap_address, iap_detection_score, iap_district, iap_en_dob, iap_en_expire, iap_en_fname, iap_en_init, iap_en_issue, iap_en_lname,
            iap_en_name, iap_error_message, iap_face_buffer, iap_gender, iap_home_address, iap_id_number, iap_postal_code, iap_process_time, iap_province,
            iap_religion, iap_request_id, iap_sub_district, iap_th_dob, iap_th_expire, iap_th_fname, iap_th_init, iap_th_issue, iap_th_lname, iap_th_name,
            identity_approve_consent_value, motor_insurance_consent_value, nmotor_insurance_consent_value,
            analyze_consent_value, info_consent_value, info_party_consent_value, analyze_party_consent_value,
            prdt_info_party_consent_value, followup_consent_value, info_develop_consent_value,
            e_paper_consent_value,
            // === add house regis place (25/08/2022) ===
            hrp_address, hrp_sub_district, hrp_district, hrp_province_name, hrp_province_code, hrp_postal_code,
            // === new field for total loss (29/08/2022) ===
            coverage_total_loss, max_ltv, price_include_vat, engine_number, chassis_number,
            engine_no_running, chassis_no_running,
            sl_code,
            typecase,
            ciz_gender,
            // === add field (nickname, maried status, stayed year, stayed month, house type , house owner typed) (15/11/2022) ===
            nickname, maried_status, house_type, stayed_month, stayed_year, house_owner_type
        } = parseFormdata

        console.log(`quotationid: ${quotationid}`)

        // === check quotationid ====
        if (!quotationid) {
            logger.error(`user ${userid} : ไม่พบ quotationid parameter`)
            return res.status(400).send({
                status: 400,
                message: `ไม่พบ quotationid parameter`,
                data: []
            })
        }

        let birth_date_eng_dtype = null
        let ciz_issued_date_dtype = null
        let ciz_expired_date_dtype = null

        if (birth_date) {
            birth_date_eng_dtype = _util.convertstringtodate_date_field(birth_date)
        } else {
            if (birth_date_eng) {
                birth_date_eng_dtype = _util.convertstringtodate(birth_date_eng)
            }
        }
        if (ciz_issued_date_text) {
            // ciz_issued_date = moment(ciz_issued_date, 'yyyy/mm/dd hh24:mi:ss').toDate();
            ciz_issued_date_dtype = _util.convertstringtodate(ciz_issued_date_text)
        } else {
            if (ciz_issued_date) {
                ciz_issued_date_dtype = ciz_issued_date
            }
        }
        if (ciz_expired_date_text) {
            // ciz_expired_date = moment(ciz_expired_date, 'yyyy/mm/dd hh24:mi:ss').toDate();
            ciz_expired_date_dtype = _util.convertstringtodate(ciz_expired_date_text)
        } else {
            if (ciz_expired_date) {
                ciz_expired_date_dtype = ciz_expired_date
            }
        }

        // === check application number not contain data and get some data from record (17/06/2022) ==== 

        connection = await oracledb.getConnection(
            config.database
        )
        const resultChkValidate = await connection.execute(`
            SELECT APPLICATION_NUM, E_PAPER, QUO_STATUS, E_DOC_STATUS,
            SMS_SEND_STATUS, CHECKER_CODE FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        console.log(`this is resultChkValidate : ${JSON.stringify(resultChkValidate)}`)

        console.log(`application_num : ${resultChkValidate.rows[0].APPLICATION_NUM}`)

        // ==== map value to param when data return from record === 
        app_no = resultChkValidate.rows[0].APPLICATION_NUM
        e_paper = resultChkValidate.rows[0].E_PAPER
        e_doc_status = resultChkValidate.rows[0].E_DOC_STATUS
        sms_send_status = resultChkValidate.rows[0].SMS_SEND_STATUS
        quo_status = resultChkValidate.rows[0].QUO_STATUS
        checker_code = resultChkValidate.rows[0].CHECKER_CODE

        if (app_no != null) {
            console.log(`Record is in another stage, cant't update Dat`)
            logger.error(`user ${userid}, quotationid : ${quotationid} : (Record is in another stage, cant't update Data)`)
            return res.status(405).send({
                status: 405,
                message: `Record is in another stage, cant't update Data`,
                data: []
            })
        } else if (resultChkValidate.rows.length !== 1) {
            console.log(`Invalid Record Duplicate`)
            logger.error(`user ${userid}, quotationid : ${quotationid} : เลขใบคำขอซ้ำในระบบ โปรดติดต่อเจ้าหน้าที่`)
            return res.status(400).send({
                status: 400,
                message: `เลขใบคำขอซ้ำในระบบ โปรดติดต่อเจ้าหน้าที่`,
                data: []
            })
        } else {
            // === do next ===
            // ==== step 2 ====
            // ===== loop check recent upload image ====
            // console.log(`trigger step 2`)
            try {

                const resultCheckRecent = await connection.execute(`
                SELECT IMAGE_CODE , APP_KEY_ID
                FROM MPLS_IMAGE_FILE WHERE IMGF_QUO_APP_KEY_ID = :quotationid
                `, {
                    quotationid: quotationid
                }, {
                    outFormat: oracledb.OBJECT
                })

                // === check =====
                if (resultCheckRecent.rows.length !== 0) {
                    for (let i = 0; i < resultCheckRecent.rows.length; i++) {
                        const obj = {}
                        obj["IMAGE_CODE"] = resultCheckRecent.rows[i].IMAGE_CODE;
                        obj["IMAGE_KEY"] = resultCheckRecent.rows[i].APP_KEY_ID;
                        imageCheckCode.push(obj)
                    }
                }

                console.log(`imageCheckCode : ${JSON.stringify(imageCheckCode)}`)

                // === update quotation with new image ===

            } catch (e) {
                logger.error(`user ${userid}, quotationid : ${quotationid} : Error between Check recent upload image. : ${e.message ? e.message : 'No return message'}`)
                return res.status(400).send({
                    status: 400,
                    message: `Error between Check recent upload image. : ${e.message ? e.message : 'No return message'}`,
                    data: []
                })
            }
        }

        if (app_no) {
            logger.error(`user ${userid}, quotationid : ${quotationid} : Invalid condition`)
            return res.status(400).send({
                status: 400,
                message: `Invalid condition`, // === เงื่่อนไขการบันทึกเคสไม่ถูกต้อง ===
                data: []
            })
        } else {
            // === do next ===


            // === get file form multipart-form-data === 

            const citizenid_image = fileData.citizenid_image ? fileData.citizenid_image : null
            const houseregis_image = fileData.houseregis_image ? fileData.houseregis_image : null
            const face_image = fileData.face_image ? fileData.face_image : null
            const house_image = fileData.house_image ? fileData.house_image : null
            const store_image = fileData.store_image ? fileData.store_image : null
            const salarycertificate_image = fileData.salarycertificate_image ? fileData.salarycertificate_image : null
            const workcertificate_image = fileData.workcertificate_image ? fileData.workcertificate_image : null
            const salarypayment_image = fileData.salarypayment_image ? fileData.salarypayment_image : null
            const bookbank_image = fileData.bookbank_image ? fileData.bookbank_image : null
            const motocyclelicense_image = fileData.motocyclelicense_image ? fileData.motocyclelicense_image : null
            const signature_image = fileData.signature_image ? fileData.signature_image : null
            const witness_image = fileData.witness_image ? fileData.witness_image : null

            // console.log('citizenid_image : ' + citizenid_image)

            imagetobuffer = (file) => {
                return fs.readFileSync(file[0].path);
            }
            var imageDataCreate = []; // ==== create new record image === 
            var imageDataUpdate = []; // ==== update record image ====
            var imageDataAll = []; // ==== update record image ==== (12/09/2022)

            const cititzenBuffer = citizenid_image ? imagetobuffer(citizenid_image) : null
            const houseregisBuffer = houseregis_image ? imagetobuffer(houseregis_image) : null
            const faceBuffer = face_image ? imagetobuffer(face_image) : null
            const hosueBuffer = house_image ? imagetobuffer(house_image) : null
            const storeBuffer = store_image ? imagetobuffer(store_image) : null
            const salarycertificateBuffer = salarycertificate_image ? imagetobuffer(salarycertificate_image) : null
            const workcertificateBuffer = workcertificate_image ? imagetobuffer(workcertificate_image) : null
            const salarypaymentBuffer = salarypayment_image ? imagetobuffer(salarypayment_image) : null
            const bookbankBuffer = bookbank_image ? imagetobuffer(bookbank_image) : null
            const motocyclelicenseBuffer = motocyclelicense_image ? imagetobuffer(motocyclelicense_image) : null
            const signatureBuffer = signature_image ? imagetobuffer(signature_image) : null
            const witnessBuffer = witness_image ? imagetobuffer(witness_image) : null


            // === add valid for check all image require type replace use from imageCheckCode(sql check) (29/10/2022) ===
            let imagetypevalid = imageCheckCode;

            genImagInfo = (fileinfo, file, code) => {


                const resultFilterCheck = imageCheckCode.find((items) => {
                    return items.IMAGE_CODE == code
                })

                if (!resultFilterCheck) {
                    console.log(`create`)
                    // === create new image list ==== 

                    // if (!imageCheckCode.includes(code)) {

                    let image = {}
                    const filename = fileinfo[0].fieldName
                    const filetype = fileinfo[0].headers['content-type']
                    const orifilename = fileinfo[0].originalFilename
                    const readfileimage = fs.readFileSync(fileinfo[0].path)
                    image.filename = filename
                    image.filetype = filetype
                    // image.orifilename = orifilename
                    image.keyid = uuidv4()
                    image.quokeyid = quotationid
                    image.status = 0
                    image.filedata = readfileimage
                    image.code = code
                    // console.log(`this is each image : ${JSON.stringify(image)}`)
                    imageDataCreate.push(image)
                    imageDataAll.push(image)
                    imagetypevalid.push({ IMAGE_CODE: code, IMAGE_KEY: 'NEW' })
                } else {
                    console.log(`update`)
                    // ==== update image list ====
                    console.log(`record id : ${resultFilterCheck.IMAGE_KEY}`)
                    let image = {}
                    const filename = fileinfo[0].fieldName
                    const filetype = fileinfo[0].headers['content-type']
                    const orifilename = fileinfo[0].originalFilename
                    const readfileimage = fs.readFileSync(fileinfo[0].path)
                    // image.filename = filename
                    image.filetype = filetype
                    // image.orifilename = orifilename
                    image.keyid = resultFilterCheck.IMAGE_KEY
                    image.quokeyid = quotationid
                    // image.status = 0
                    image.filedata = readfileimage
                    image.code = code
                    // console.log(`this is each image : ${JSON.stringify(image)}`)
                    imageDataUpdate.push(image)
                    imageDataAll.push(image)
                }
            }

            if (cititzenBuffer) await genImagInfo(citizenid_image, cititzenBuffer, '01');
            if (houseregisBuffer) await genImagInfo(houseregis_image, houseregisBuffer, '02');
            if (faceBuffer) await genImagInfo(face_image, faceBuffer, '03');
            if (hosueBuffer) await genImagInfo(house_image, hosueBuffer, '04');
            if (storeBuffer) await genImagInfo(store_image, storeBuffer, '05');
            if (salarycertificateBuffer) await genImagInfo(salarycertificate_image, salarycertificateBuffer, '06');
            if (workcertificateBuffer) await genImagInfo(workcertificate_image, workcertificateBuffer, '07');
            if (salarypaymentBuffer) await genImagInfo(salarypayment_image, salarypaymentBuffer, '08');
            if (bookbankBuffer) await genImagInfo(bookbank_image, bookbankBuffer, '09');
            if (motocyclelicenseBuffer) await genImagInfo(motocyclelicense_image, motocyclelicenseBuffer, '10');

            // console.log(`imageDataCreate : ${imageDataCreate}`)
            // console.log(`imageDataUpdate : ${imageDataUpdate}`)
            console.log(`imageDataCreate : ${imageDataCreate}`)
            console.log(`imageDataUpdate : ${imageDataUpdate}`)
            console.log(`this is check data : all ${JSON.stringify(imagetypevalid)}`)

            // ===== stage 3 ====== 
            // === *** sql mayexeute stage *** === 
            try {

                console.log(`length update : ${imageDataUpdate.length}`)

                // ==== check if draft update check image require 2 pic (citizen id card , face and citizen card) (12/09/2022) ====

                const isidcardinclude = imagetypevalid.find(items => items.IMAGE_CODE == '01');
                const iscustomerfaceinclude = imagetypevalid.find(items => items.IMAGE_CODE == '03');

                // === add require image type for quotation (28/10/2022) ===
                const iscizcardimagesign = imagetypevalid.find(items => items.IMAGE_CODE == '09')
                const isncbconsent = imagetypevalid.find(items => items.IMAGE_CODE == '10')

                if (typecase == 'P') {

                    try {
                        // === check database with quotationid to check image type is include ('01','03') (13/09/2022) === 
                        // === add require image from type '09' and '10' on (28/10/2022) ====

                        const checkimagetypeP = await checkimagetype(quotationid)

                        console.log(`Check image type validate retrun : ${checkimagetypeP}`)

                        // ==== if checkimagetpyeP return null or empty string is not valid (missing image type '01', '03') === 
                        //  ** ==== reurn 'F' : missing 'face_image' (image_type = '03') === **
                        //  ** ==== reurn 'C' : missing 'citizenid_image' (image_type = '01') === **
                        //  ** ==== reurn 'B' : ALL REQUIRE image_type done === **
                        //  ** ==== reurn '' : missing both  === **

                        // (etc. should be return '' or 'B' if it create on client web101 )

                        console.log(`isidcardinclude : ${isidcardinclude}`)
                        console.log(`iscustomerfaceinclude : ${iscustomerfaceinclude}`)

                        switch (checkimagetypeP) {
                            case '':

                                {
                                    if (isidcardinclude && iscustomerfaceinclude && iscizcardimagesign && isncbconsent) {

                                    } else {
                                        return res.status(400).send({
                                            status: 400,
                                            // message: `กรุณาแนบภาพบัตรประชาชนลูกค้า และ รูปภาพหน้าลูกค้าพร้อมบัตรประชาชน ก่อนสร้างใบคำขอ`, (OLD CHECK ON SQL RETURN 4 VALUE TO CHECK EACH CONDITION , NOW RETURN 'B' AND NULL)
                                            message: `กรุณาแนบภาพบัตรประชาชนลูกค้า , รูปภาพหน้าลูกค้าพร้อมบัตรประชาชน , สำเนาบัตรประชาชนพร้อมลายเซ็นรับรองถูกต้อง , และ NCB Consent ก่อนสร้างใบคำขอ`,
                                            data: []
                                        })
                                    }
                                }

                            case 'C':

                                {
                                    if (isidcardinclude) {

                                    } else {
                                        return res.status(400).send({
                                            status: 400,
                                            message: `กรุณาแนบภาพบัตรประชาชนลูกค้า ก่อนสร้างใบคำขอ`,
                                            data: []
                                        })
                                    }
                                }

                                break;
                            case 'F':

                                {
                                    if (iscustomerfaceinclude) {

                                    } else {
                                        return res.status(400).send({
                                            status: 400,
                                            message: `กรุณาแนบรูปภาพหน้าลูกค้าพร้อมบัตรประชาชน ก่อนสร้างใบคำขอ`,
                                            data: []
                                        })
                                    }
                                }

                                break;
                            case 'B':

                                {
                                    // === alraady valid === 
                                }

                                break;

                            default:
                                break;
                        }


                    } catch (e) {
                        logger.error(`user ${userid}, quotationid : ${quotationid} : Check image type is problem : ${e.message ? e.message : 'No return message'}'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `Check image type is problem : ${e.message ? e.message : 'No return message'}`,
                            data: []
                        })
                    }


                    // === check here !! ===
                    // if (!(isidcardinclude && iscustomerfaceinclude)) {
                    //     return res.status(400).send({
                    //         status: 400,
                    //         message: `กรุณาแนบภาพบัตรประชาชนลูกค้า และ รูปภาพหน้าลูกค้าพร้อมบัตรประชาชน ก่อนสร้างใบคำขอ`,
                    //         data: []
                    //     })
                    // }
                }

                if (imageDataUpdate.length !== 0) {
                    // --- Update ---
                    console.log(`imagedataupdate length (quotaionUpdate): ${imageDataUpdate.length}`)

                    console.log(`image update : (filetype : ${imageDataUpdate[0].filetype} , code : ${imageDataUpdate[0].code} , 
                        quokeyid : ${imageDataUpdate[0].quokeyid})`)
                    try {
                        const sqlupdate = `
                            UPDATE MPLS_IMAGE_FILE
                            SET IMAGE_FILE = :filedata,
                                IMAGE_TYPE = :filetype,
                                ACTIVE_STATUS = 'Y'
                            WHERE IMAGE_CODE = :code AND
                            IMGF_QUO_APP_KEY_ID = :quokeyid
                    `
                        const bindsUpdate = imageDataUpdate;

                        const options = {
                            bindDefs: {
                                filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                                filetype: { type: oracledb.STRING, maxSize: 200 },
                                code: { type: oracledb.STRING, maxSize: 4 },
                                quokeyid: { type: oracledb.STRING, maxSize: 50 }
                            }
                        }

                        const resultUpdateImage = await connection.executeMany(sqlupdate, bindsUpdate, options)

                        console.log(`sussecc update image attach file : ${resultUpdateImage.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : Can't update image record with error status: ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `Can't update image record with error status: ${e.message ? e.message : `no status`}`
                        })
                    }
                }

                console.log(`length create : ${imageDataCreate.length}`)

                if (imageDataCreate.length !== 0) {
                    // --- Insert ---

                    try {

                        const sqlInsert = `INSERT INTO MPLS_IMAGE_FILE (
                        IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                        IMAGE_CODE, IMAGE_FILE, STATUS, ACTIVE_STATUS)
                        VALUES (:quokeyid, :keyid, :filename, :filetype, 
                        :code, :filedata, :status, 'Y')`
                        const bindsInsert = imageDataCreate;

                        const options = {
                            bindDefs: {
                                quokeyid: { type: oracledb.STRING, maxSize: 50 },
                                keyid: { type: oracledb.STRING, maxSize: 50 },
                                filename: { type: oracledb.STRING, maxSize: 200 },
                                filetype: { type: oracledb.STRING, maxSize: 200 },
                                code: { type: oracledb.STRING, maxSize: 4 },
                                filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                                status: { type: oracledb.NUMBER }
                            }
                        }


                        const resultInsertImage = await connection.executeMany(sqlInsert, bindsInsert, options)

                        console.log(`sussecc insert image attach file : ${resultInsertImage.rowsAffected}`)

                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : อัพโหลดไฟล์ภาพไม่สำเร็จ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `อัพโหลดไฟล์ภาพไม่สำเร็จ : ${e.message ? e.message : `no status`}`
                        })
                    }

                    // === update quotation record (main column) ===

                }

                if (!app_no) {
                    // console.log(`quotation id is : ${quotationid}`)
                    try {

                        if (e_paper_consent_value) {
                            if (e_paper_consent_value == 1) {
                                e_paper_new_field = 'Y'
                            } else {
                                e_paper_new_field = 'N'
                            }
                        }

                        const update_quotation = await connection.execute(`
                            UPDATE MPLS_QUOTATION
                            SET QUO_STATUS = :QUO_STATUS,
                                E_DOC_STATUS = :E_DOC_STATUS,
                                SMS_SEND_STATUS = :SMS_SEND_STATUS,
                                CHECKER_CODE = :CHECKER_CODE,
                                IDCARD_NUM = :IDCARD_NUM,
                                PHONE_NUMBER = :PHONE_NUMBER,
                                EMAIL = :EMAIL,
                                TITLE_CODE = :TITLE_CODE,
                                TITLE_NAME = :TITLE_NAME,
                                FIRST_NAME = :FIRST_NAME,
                                LAST_NAME = :LAST_NAME,
                                BIRTH_DATE = :BIRTH_DATE,
                                BIRTH_DATE_TEXT_TH = :BIRTH_DATE_TEXT_TH,
                                BIRTH_DATE_TEXT_EN = :BIRTH_DATE_TEXT_EN,
                                CIZ_ISSUED_DATE = :CIZ_ISSUED_DATE,
                                CIZ_ISSUED_PLACE = :CIZ_ISSUED_PLACE,
                                CIZ_EXPIRED_DATE = :CIZ_EXPIRED_DATE,
                                CIZ_ADDRESS = :CIZ_ADDRESS,
                                CIZ_SUB_DISTRICT = :CIZ_SUB_DISTRICT,
                                CIZ_DISTRICT = :CIZ_DISTRICT,
                                CIZ_PROVINCE_NAME = :CIZ_PROVINCE_NAME,
                                CIZ_PROVINCE_CODE = :CIZ_PROVINCE_CODE,
                                CIZ_POSTAL_CODE = :CIZ_POSTAL_CODE,
                                SL_CODE = :SL_CODE,
                                E_PAPER = :E_PAPER_NEW_FIELD,
                                CIZ_GENDER = :CIZ_GENDER,
                                CIZ_NICKNAME = :CIZ_NICKNAME,
                                CIZ_HOUSE_TYPE = :CIZ_HOUSE_TYPE,
                                CIZ_HOUSE_OWNER_TYPE = :CIZ_HOUSE_OWNER_TYPE,
                                CIZ_STAYED_YEAR = :CIZ_STAYED_YEAR,
                                CIZ_STAYED_MONTH = :CIZ_STAYED_MONTH,
                                CIZ_MARIED_STATUS = :CIZ_MARIED_STATUS
                            WHERE QUO_KEY_APP_ID = :quotationid
                            `, {
                            // QUO_STATUS: quo_status,
                            QUO_STATUS: 0, // === update quotationstatus from '4' to '0' (13/09/2022) === 
                            E_DOC_STATUS: e_doc_status,
                            SMS_SEND_STATUS: sms_send_status,
                            CHECKER_CODE: checker_code,
                            IDCARD_NUM: idcard_num,
                            PHONE_NUMBER: phone_number,
                            EMAIL: ciz_email,
                            TITLE_CODE: title_code,
                            TITLE_NAME: title_name,
                            FIRST_NAME: first_name,
                            LAST_NAME: last_name,
                            BIRTH_DATE: (new Date(birth_date_eng_dtype)) ?? null,
                            BIRTH_DATE_TEXT_TH: birth_date_thai,
                            BIRTH_DATE_TEXT_EN: birth_date_eng,
                            CIZ_ISSUED_DATE: (new Date(ciz_issued_date_dtype)) ?? null,
                            CIZ_ISSUED_PLACE: ciz_issued_place,
                            CIZ_EXPIRED_DATE: (new Date(ciz_expired_date_dtype)) ?? null,
                            CIZ_ADDRESS: ciz_address,
                            CIZ_SUB_DISTRICT: ciz_sub_district,
                            CIZ_DISTRICT: ciz_district,
                            CIZ_PROVINCE_NAME: ciz_province_name,
                            CIZ_PROVINCE_CODE: ciz_province_code,
                            CIZ_POSTAL_CODE: ciz_postal_code,
                            SL_CODE: sl_code,
                            E_PAPER_NEW_FIELD: e_paper_new_field,
                            CIZ_GENDER: ciz_gender,
                            CIZ_NICKNAME: nickname,
                            CIZ_HOUSE_TYPE: house_type,
                            CIZ_HOUSE_OWNER_TYPE: house_owner_type,
                            CIZ_STAYED_YEAR: stayed_year,
                            CIZ_STAYED_MONTH: stayed_month,
                            CIZ_MARIED_STATUS: maried_status,
                            quotationid: quotationid
                        }, {
                            // QUO_STATUS: { type: oracledb.NUMBER, maxSize: 2 },
                            // E_PAPER: { type: oracledb.STRING, maxSize: 2 },
                            // E_DOC_STATUS: { type: oracledb.STRING, maxSize: 10 },
                            // SMS_SEND_STATUS: { type: oracledb.STRING, maxSize: 2 },
                            // CHECKER_CODE: { type: oracledb.STRING, maxSize: 20 },
                            // IDCARD_NUM: { type: oracledb.STRING, maxSize: 3000 },
                            // PHONE_NUMBER: { type: oracledb.STRING, maxSize: 3000 },
                            // EMAIL: { type: oracledb.STRING, maxSize: 300 },
                            // TITLE_CODE: { type: oracledb.STRING, maxSize: 3 },
                            // TITLE_NAME: { type: oracledb.STRING, maxSize: 3000 },
                            // FIRST_NAME: { type: oracledb.STRING, maxSize: 3000 },
                            // LAST_NAME: { type: oracledb.STRING, maxSize: 3000 },
                            // BIRTH_DATE: { type: oracledb.DATE },
                            // BIRTH_DATE_TEXT_TH: { type: oracledb.STRING, maxSize: 100 },
                            // BIRTH_DATE_TEXT_EN: { type: oracledb.STRING, maxSize: 100 },
                            // CIZ_ISSUED_DATE: { type: oracledb.DATE },
                            // CIZ_ISSUED_PLACE: { type: oracledb.STRING, maxSize: 200 },
                            // CIZ_EXPIRED_DATE: { type: oracledb.DATE },
                            // CIZ_ADDRESS: { type: oracledb.STRING, maxSize: 1000 },
                            // CIZ_SUB_DISTRICT: { type: oracledb.STRING, maxSize: 3000 },
                            // CIZ_DISTRICT: { type: oracledb.STRING, maxSize: 3000 },
                            // CIZ_PROVINCE_NAME: { type: oracledb.STRING, maxSize: 50 },
                            // CIZ_PROVINCE_CODE: { type: oracledb.STRING, maxSize: 3 },
                            // CIZ_POSTAL_CODE: { type: oracledb.STRING, maxSize: 5},
                            // quotationid: { type: oracledb.STRING, maxSize: 50 }
                        })


                        console.log(`sussecc update quotation information : ${update_quotation.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลทั่วไป) ได้ : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลทั่วไป) ได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }

                    // === update living place record ===
                    try {
                        const update_living_place = await connection.execute(`
                            UPDATE MPLS_LIVING_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE,
                                LATITUDE = :LATITUDE,
                                LONDTIUDE = :LONDTIUDE,
                                LALON = :LALON
                            WHERE APP_KEY_ID = :livingplaceid
                            `, {
                            ADDRESS: liv_address,
                            SUB_DISTRICT: liv_sub_district,
                            DISTRICT: liv_district,
                            PROVINCE_NAME: liv_province_name,
                            PROVINCE_CODE: liv_province_code,
                            POSTAL_CODE: liv_postal_code,
                            LATITUDE: la,
                            LONDTIUDE: lon,
                            LALON: lalon,
                            livingplaceid: living_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update living place : ${update_living_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }

                    // === update contact place record ==== 
                    try {
                        const update_contact_place = await connection.execute(`
                            UPDATE MPLS_CONTACT_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE
                            WHERE APP_KEY_ID = :contactplace
                            `, {
                            ADDRESS: cont_address,
                            SUB_DISTRICT: cont_sub_district,
                            DISTRICT: cont_district,
                            PROVINCE_NAME: cont_province_name,
                            PROVINCE_CODE: cont_province_code,
                            POSTAL_CODE: cont_postal_code,
                            contactplace: contact_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update contact place : ${update_contact_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }

                    // === update house regis place record ==== 
                    try {
                        const update_house_regis_place = await connection.execute(`
                            UPDATE MPLS_HOUSE_REGIS_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE
                            WHERE APP_KEY_ID = :houseregisplace
                            `, {
                            ADDRESS: hrp_address,
                            SUB_DISTRICT: hrp_sub_district,
                            DISTRICT: hrp_district,
                            PROVINCE_NAME: hrp_province_name,
                            PROVINCE_CODE: hrp_province_code,
                            POSTAL_CODE: hrp_postal_code,
                            houseregisplace: house_regis_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update house regis place : ${update_house_regis_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่ตามทะเบียนบ้านได้) ได้ : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่ตามทะเบียนบ้านได้) ได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }

                    // === update work place record ==== 
                    try {
                        const update_work_place = await connection.execute(`
                            UPDATE MPLS_WORK_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE
                            WHERE APP_KEY_ID = :workplaceid
                            `, {
                            ADDRESS: work_address,
                            SUB_DISTRICT: work_sub_district,
                            DISTRICT: work_district,
                            PROVINCE_NAME: work_province_name,
                            PROVINCE_CODE: work_province_code,
                            POSTAL_CODE: work_postal_code,
                            workplaceid: work_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update work place : ${update_work_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่ทำงาน) ได้ : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่ทำงาน) ได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }

                    // === update credit record ==== 
                    if (!no_update_credit) {
                        try {
                            const update_credit = await connection.execute(`
                                UPDATE MPLS_CREDIT 
                                SET BRAND_CODE = :BRAND_CODE,
                                    BRAND_NAME = :BRAND_NAME,
                                    MODEL_CODE = :MODEL_CODE,
                                    MODEL_NAME = :MODEL_NAME,
                                    COLOR_CODE = :COLOR_CODE,
                                    COLOR_NAME = :COLOR_NAME,
                                    LOAN_AMOUNT = :LOAN_AMOUNT,
                                    PRODUCT_VALUE = :PRODUCT_VALUE,
                                    DOWN_PAYMENT = :DOWN_PAYMENT,
                                    INTEREST_RATE = :INTEREST_RATE,
                                    PAYMENT_VALUE = :PAYMENT_VALUE,
                                    PAYMENT_ROUND_COUNT = :PAYMENT_ROUND_COUNT,
                                    INSURER_CODE = :INSURER_CODE,
                                    INSURER_NAME = :INSURER_NAME,
                                    INSURANCE_CODE = :INSURANCE_CODE,
                                    INSURANCE_NAME = :INSURANCE_NAME,
                                    INSURANCE_YEAR = :INSURANCE_YEAR,
                                    INSURANCE_PLAN_PRICE = :INSURANCE_PLAN_PRICE,
                                    IS_INCLUDE_LOANAMOUNT = :IS_INCLUDE_LOANAMOUNT,
                                    FACTORY_PRICE = :FACTORY_PRICE,
                                    SIZE_MODEL = :SIZE_MODEL,
                                    COVERAGE_TOTAL_LOSS = :COVERAGE_TOTAL_LOSS,
                                    MAX_LTV = :MAX_LTV,
                                    PRICE_INCLUDE_VAT = :PRICE_INCLUDE_VAT,
                                    ENGINE_NUMBER = :ENGINE_NUMBER,
                                    CHASSIS_NUMBER = :CHASSIS_NUMBER,
                                    ENGINE_NO_RUNNING = :ENGINE_NO_RUNNING,
                                    CHASSIS_NO_RUNNING = :CHASSIS_NO_RUNNING
                                WHERE APP_KEY_ID = :creditid
                                `, {
                                BRAND_CODE: brand_code,
                                BRAND_NAME: brand_name,
                                MODEL_CODE: model_code,
                                MODEL_NAME: model_name,
                                COLOR_CODE: color_code,
                                COLOR_NAME: color_name,
                                LOAN_AMOUNT: loan_amount,
                                PRODUCT_VALUE: product_value,
                                DOWN_PAYMENT: down_payment,
                                INTEREST_RATE: interest_rate,
                                PAYMENT_VALUE: payment_value,
                                PAYMENT_ROUND_COUNT: payment_round_count,
                                INSURER_CODE: insurer_code,
                                INSURER_NAME: insurer_name,
                                INSURANCE_CODE: insurance_code,
                                INSURANCE_NAME: insurance_name,
                                INSURANCE_YEAR: insurance_year,
                                INSURANCE_PLAN_PRICE: insurance_plan_price,
                                IS_INCLUDE_LOANAMOUNT: is_include_loanamount,
                                FACTORY_PRICE: factory_price,
                                SIZE_MODEL: size_model,
                                COVERAGE_TOTAL_LOSS: coverage_total_loss,
                                MAX_LTV: max_ltv,
                                PRICE_INCLUDE_VAT: price_include_vat,
                                ENGINE_NUMBER: engine_number,
                                CHASSIS_NUMBER: chassis_number,
                                ENGINE_NO_RUNNING: engine_no_running,
                                CHASSIS_NO_RUNNING: chassis_no_running,
                                creditid: credit_id
                            }, {
                                outFormat: oracledb.OBJECT
                            })

                            console.log(`sussecc update credit : ${update_credit.rowsAffected}`)

                        } catch (e) {
                            console.error(e)
                            logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (ข้อมูลอาชีพ) ได้ : ${e.message ? e.message : 'No return message'}`)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (ข้อมูลอาชีพ) ได้ : ${e.message ? e.message : 'No return message'}`
                            })
                        }
                    } else {
                        console.log(`didn't update credit record`)
                    }
                    // === update career record ==== 
                    try {
                        const update_career = await connection.execute(`
                            UPDATE MPLS_CAREER
                            SET MAIN_CAREER_NAME = :MAIN_CAREER_NAME,
                                MAIN_CAREER_CODE = :MAIN_CAREER_CODE,
                                MAIN_WORKPLACE_NAME = :MAIN_WORKPLACE_NAME,
                                MAIN_POSITION = :MAIN_POSITION,
                                MAIN_DEPARTMENT = :MAIN_DEPARTMENT,
                                MAIN_EXPERIENCE_YEAR = :MAIN_EXPERIENCE_YEAR,
                                MAIN_EXPERIENCE_MONTH = :MAIN_EXPERIENCE_MONTH,
                                MAIN_SALARY_PER_MONTH = :MAIN_SALARY_PER_MONTH,
                                MAIN_SALARY_PER_DAY = :MAIN_SALARY_PER_DAY,
                                MAIN_LEADER_NAME = :MAIN_LEADER_NAME,
                                MAIN_WORK_PER_WEEK = :MAIN_WORK_PER_WEEK,
                                IS_SUB_CAREER = :IS_SUB_CAREER,
                                SUB_CAREER_NAME = :SUB_CAREER_NAME,
                                SUB_CAREER_CODE = :SUB_CAREER_CODE,
                                SUB_WORKPLACE_NAME = :SUB_WORKPLACE_NAME,
                                SUB_POSITION = :SUB_POSITION,
                                SUB_DEPARTMENT = :SUB_DEPARTMENT,
                                SUB_EXPERIENCE_YEAR = :SUB_EXPERIENCE_YEAR,
                                SUB_EXPERIENCE_MONTH = :SUB_EXPERIENCE_MONTH,
                                SUB_SALARY_PER_MONTH = :SUB_SALARY_PER_MONTH,
                                SUB_SALARY_PER_DAY = :SUB_SALARY_PER_DAY,
                                SUB_LEADER_NAME = :SUB_LEADER_NAME,
                                SUB_WORK_PER_WEEK = :SUB_WORK_PER_WEEK
                            WHERE APP_KEY_ID = :careerid
                            `, {
                            MAIN_CAREER_NAME: main_career_name,
                            MAIN_CAREER_CODE: main_career_code,
                            MAIN_WORKPLACE_NAME: main_workplace_name,
                            MAIN_POSITION: main_position,
                            MAIN_DEPARTMENT: main_department,
                            MAIN_EXPERIENCE_YEAR: main_experience_year,
                            MAIN_EXPERIENCE_MONTH: main_experience_month,
                            MAIN_SALARY_PER_MONTH: main_salary_per_month,
                            MAIN_SALARY_PER_DAY: main_salary_per_day,
                            MAIN_LEADER_NAME: main_leader_name,
                            MAIN_WORK_PER_WEEK: main_work_per_week,
                            IS_SUB_CAREER: is_sub_career,
                            SUB_CAREER_NAME: sub_career_name,
                            SUB_CAREER_CODE: sub_career_code,
                            SUB_WORKPLACE_NAME: sub_workplace_name,
                            SUB_POSITION: sub_position,
                            SUB_DEPARTMENT: sub_department,
                            SUB_EXPERIENCE_YEAR: sub_experience_year,
                            SUB_EXPERIENCE_MONTH: sub_experience_month,
                            SUB_SALARY_PER_MONTH: sub_salary_per_month,
                            SUB_SALARY_PER_DAY: sub_salary_per_day,
                            SUB_LEADER_NAME: sub_leader_name,
                            SUB_WORK_PER_WEEK: sub_work_per_week,
                            careerid: career_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update career : ${update_career.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อได้  : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้าข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }
                    // === update purpose record ==== 
                    try {
                        const update_purpose = await connection.execute(`
                            UPDATE MPLS_PURPOSE
                            SET PURPOSE_OF_BUY  = :PURPOSE_OF_BUY, PURPOSE_OF_BUY_NAME  = :PURPOSE_OF_BUY_NAME, REASON_OF_BUY  = :REASON_OF_BUY,
                                REASON_OF_BUY_NAME  = :REASON_OF_BUY_NAME, CAR_USER  = :CAR_USER, CAR_USER_RELATION  = :CAR_USER_RELATION, CAR_USER_NAME = :CAR_USER_NAME, CAR_USER_FULLNAME  = :CAR_USER_FULLNAME, CAR_USER_CITIZENCARD_ID  = :CAR_USER_CITIZENCARD_ID,
                                CAR_USER_HOME_NO  = :CAR_USER_HOME_NO, CAR_USER_HOME_NAME  = :CAR_USER_HOME_NAME, CAR_USER_SOI  = :CAR_USER_SOI, CAR_USER_MOO  = :CAR_USER_MOO, CAR_USER_ROAD  = :CAR_USER_ROAD, CAR_USER_SUB_DISTRICT  = :CAR_USER_SUB_DISTRICT,
                                CAR_USER_DISTRICT  = : car_user_district, CAR_USER_PROVINCE_NAME  = : car_user_province_name, CAR_USER_PROVINCE_CODE  = : car_user_province_code, CAR_USER_POSTAL_CODE  = :CAR_USER_POSTAL_CODE, CAR_USER_ROOM_NO  = :CAR_USER_ROOM_NO,
                                CAR_USER_FLOOR  = :CAR_USER_FLOOR, CAR_USER_PHONENO  = :CAR_USER_PHONENO, FIRST_REFERRAL_FULLNAME  = :FIRST_REFERRAL_FULLNAME, FIRST_REFERRAL_HOUSE_NO  = :FIRST_REFERRAL_HOUSE_NO, FIRST_REFERRAL_MOO  = :FIRST_REFERRAL_MOO,
                                FIRST_REFERRAL_HOUSE_NAME  = :FIRST_REFERRAL_HOUSE_NAME, FIRST_REFERRAL_ROOM_NO  = :FIRST_REFERRAL_ROOM_NO, FIRST_REFERRAL_FLOOR  = :FIRST_REFERRAL_FLOOR, FIRST_REFERRAL_SOI  = :FIRST_REFERRAL_SOI, FIRST_REFERRAL_ROAD  = :FIRST_REFERRAL_ROAD,
                                FIRST_REFERRAL_SUB_DISTRICT  = :FIRST_REFERRAL_SUB_DISTRICT, FIRST_REFERRAL_DISTRICT  = :FIRST_REFERRAL_DISTRICT, FIRST_REFERRAL_PROVINCE_NAME  = :FIRST_REFERRAL_PROVINCE_NAME, FIRST_REFERRAL_PROVINCE_CODE  = :FIRST_REFERRAL_PROVINCE_CODE,
                                FIRST_REFERRAL_POSTAL_CODE  = :FIRST_REFERRAL_POSTAL_CODE, FIRST_REFERRAL_PHONENO  = :FIRST_REFERRAL_PHONENO, FIRST_REFERRAL_RELATION  = :FIRST_REFERRAL_RELATION, SECOND_REFERRAL_FULLNAME  = :SECOND_REFERRAL_FULLNAME, SECOND_REFERRAL_HOUSE_NO  = :SECOND_REFERRAL_HOUSE_NO,
                                SECOND_REFERRAL_MOO  = :SECOND_REFERRAL_MOO, SECOND_REFERRAL_HOUSE_NAME  = :SECOND_REFERRAL_HOUSE_NAME, SECOND_REFERRAL_ROOM_NO  = :SECOND_REFERRAL_ROOM_NO, SECOND_REFERRAL_FLOOR  = :SECOND_REFERRAL_FLOOR,
                                SECOND_REFERRAL_SOI  = :SECOND_REFERRAL_SOI, SECOND_REFERRAL_ROAD  = :SECOND_REFERRAL_ROAD, SECOND_REFERRAL_SUB_DISTRICT  = :SECOND_REFERRAL_SUB_DISTRICT, SECOND_REFERRAL_DISTRICT  = :SECOND_REFERRAL_DISTRICT,
                                SECOND_REFERRAL_PROVINCE_NAME  = :SECOND_REFERRAL_PROVINCE_NAME, SECOND_REFERRAL_PROVINCE_CODE  = :SECOND_REFERRAL_PROVINCE_CODE, SECOND_REFERRAL_POSTAL_CODE  = :SECOND_REFERRAL_POSTAL_CODE,
                                SECOND_REFERRAL_PHONENO  = :SECOND_REFERRAL_PHONENO, SECOND_REFERRAL_RELATION  = :SECOND_REFERRAL_RELATION
                            WHERE APP_KEY_ID = :purposeid
                            `, {
                            PURPOSE_OF_BUY: purpose_buy, PURPOSE_OF_BUY_NAME: purpose_buy_name, REASON_OF_BUY: reason_buy,
                            REASON_OF_BUY_NAME: reason_buy_etc, CAR_USER: car_user, CAR_USER_RELATION: car_user_relation, CAR_USER_NAME: car_user_name, CAR_USER_FULLNAME: car_user_name_2, CAR_USER_CITIZENCARD_ID: car_user_citizen_id,
                            CAR_USER_HOME_NO: car_user_home_no, CAR_USER_HOME_NAME: car_user_home_name, CAR_USER_SOI: car_user_soi, CAR_USER_MOO: car_user_moo, CAR_USER_ROAD: car_user_road, CAR_USER_SUB_DISTRICT: car_user_sub_district,
                            CAR_USER_DISTRICT: car_user_district, CAR_USER_PROVINCE_NAME: car_user_province_name, CAR_USER_PROVINCE_CODE: car_user_province_code, CAR_USER_POSTAL_CODE: car_user_postal_code, CAR_USER_ROOM_NO: car_user_room_no,
                            CAR_USER_FLOOR: car_user_floor, CAR_USER_PHONENO: car_user_phone_no, FIRST_REFERRAL_FULLNAME: first_referral_fullname, FIRST_REFERRAL_HOUSE_NO: first_referral_house_no, FIRST_REFERRAL_MOO: first_referral_moo,
                            FIRST_REFERRAL_HOUSE_NAME: first_referral_house_name, FIRST_REFERRAL_ROOM_NO: first_referral_room_no, FIRST_REFERRAL_FLOOR: first_referral_floor, FIRST_REFERRAL_SOI: first_referral_soi, FIRST_REFERRAL_ROAD: first_referral_road,
                            FIRST_REFERRAL_SUB_DISTRICT: first_referral_sub_district, FIRST_REFERRAL_DISTRICT: first_referral_district, FIRST_REFERRAL_PROVINCE_NAME: first_referral_province_name, FIRST_REFERRAL_PROVINCE_CODE: first_referral_province_code,
                            FIRST_REFERRAL_POSTAL_CODE: first_referral_postal_code, FIRST_REFERRAL_PHONENO: first_referral_phone_no, FIRST_REFERRAL_RELATION: first_referral_relation, SECOND_REFERRAL_FULLNAME: second_referral_fullname, SECOND_REFERRAL_HOUSE_NO: second_referral_house_no,
                            SECOND_REFERRAL_MOO: second_referral_moo, SECOND_REFERRAL_HOUSE_NAME: second_referral_house_name, SECOND_REFERRAL_ROOM_NO: second_referral_room_no, SECOND_REFERRAL_FLOOR: second_referral_floor,
                            SECOND_REFERRAL_SOI: second_referral_soi, SECOND_REFERRAL_ROAD: second_referral_road, SECOND_REFERRAL_SUB_DISTRICT: second_referral_sub_district, SECOND_REFERRAL_DISTRICT: second_referral_district,
                            SECOND_REFERRAL_PROVINCE_NAME: second_referral_province_name, SECOND_REFERRAL_PROVINCE_CODE: second_referral_province_code, SECOND_REFERRAL_POSTAL_CODE: second_referral_postal_code,
                            SECOND_REFERRAL_PHONENO: second_referral_phone_no, SECOND_REFERRAL_RELATION: second_referral_relation,
                            purposeid: purpose_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update purpose : ${update_purpose.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (วัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง) ได้ : ${e.message ? e.message : 'No return message'}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (วัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง) ได้ : ${e.message ? e.message : 'No return message'}`
                        })
                    }
                    // === update consent signature inage record ==== 

                    // console.log(`is_new_sig_image : ${is_new_sig_image}`)
                    // console.log(`is_new_witness_sig_image : ${is_new_witness_sig_image}`)

                    // === add step update new PDPA consent Value (27/07/2022) ===

                    if (is_new_sig_image || is_new_witness_sig_image) {
                        try {
                            let sqlsig;
                            let bindparamsig;
                            if (is_new_sig_image) {
                                sqlsig = `UPDATE MPLS_CONSENT
                                            SET SIGNATURE_IMAGE = :SIGNATURE_IMAGE,
                                                IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                                MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                                NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                                ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                                INFO_CONSENT_VALUE = :info_consent_value,
                                                INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                                ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                                PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                                FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                                INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                                IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                            WHERE APP_KEY_ID = :consentid
                                            `
                                bindparamsig = {

                                    SIGNATURE_IMAGE: signatureBuffer,
                                    identity_approve_consent_value: identity_approve_consent_value,
                                    motor_insurance_consent_value: motor_insurance_consent_value,
                                    nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                    analyze_consent_value: analyze_consent_value,
                                    info_consent_value: info_consent_value,
                                    info_party_consent_value: info_party_consent_value,
                                    analyze_party_consent_value: analyze_party_consent_value,
                                    prdt_info_party_consent_value: prdt_info_party_consent_value,
                                    followup_consent_value: followup_consent_value,
                                    info_develop_consent_value: info_develop_consent_value,
                                    e_paper_consent_value: e_paper_consent_value,
                                    is_disclosure_consent: is_disclosure_consent,
                                    consentid: consent_id
                                }
                            }
                            if (is_new_witness_sig_image) {
                                sqlsig = `UPDATE MPLS_CONSENT
                                            SET WITNESS_IMAGE = :WITNESS_IMAGE,
                                                IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                                MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                                NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                                ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                                INFO_CONSENT_VALUE = :info_consent_value,
                                                INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                                ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                                PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                                FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                                INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                                IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                            WHERE APP_KEY_ID = :consentid
                                            `
                                bindparamsig = {

                                    WITNESS_IMAGE: witnessBuffer,
                                    identity_approve_consent_value: identity_approve_consent_value,
                                    motor_insurance_consent_value: motor_insurance_consent_value,
                                    nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                    analyze_consent_value: analyze_consent_value,
                                    info_consent_value: info_consent_value,
                                    info_party_consent_value: info_party_consent_value,
                                    analyze_party_consent_value: analyze_party_consent_value,
                                    prdt_info_party_consent_value: prdt_info_party_consent_value,
                                    followup_consent_value: followup_consent_value,
                                    info_develop_consent_value: info_develop_consent_value,
                                    e_paper_consent_value: e_paper_consent_value,
                                    is_disclosure_consent: is_disclosure_consent,
                                    consentid: consent_id
                                }
                            }
                            if (is_new_sig_image && is_new_witness_sig_image) {
                                sqlsig = `UPDATE MPLS_CONSENT
                                        SET SIGNATURE_IMAGE = :SIGNATURE_IMAGE,
                                            WITNESS_IMAGE = :WITNESS_IMAGE,
                                            IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                            MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                            NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                            ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                            INFO_CONSENT_VALUE = :info_consent_value,
                                            INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                            ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                            PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                            FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                            INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                            E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                            IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                        WHERE APP_KEY_ID = :consentid
                                `
                                bindparamsig = {

                                    SIGNATURE_IMAGE: signatureBuffer,
                                    WITNESS_IMAGE: witnessBuffer,
                                    identity_approve_consent_value: identity_approve_consent_value,
                                    motor_insurance_consent_value: motor_insurance_consent_value,
                                    nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                    analyze_consent_value: analyze_consent_value,
                                    info_consent_value: info_consent_value,
                                    info_party_consent_value: info_party_consent_value,
                                    analyze_party_consent_value: analyze_party_consent_value,
                                    prdt_info_party_consent_value: prdt_info_party_consent_value,
                                    followup_consent_value: followup_consent_value,
                                    info_develop_consent_value: info_develop_consent_value,
                                    e_paper_consent_value: e_paper_consent_value,
                                    is_disclosure_consent: is_disclosure_consent,
                                    consentid: consent_id
                                }

                                // console.log(`sqlsig : ${sqlsig}`)
                                // console.log(`bindparamsig : ${JSON.stringify(bindparamsig)}`)
                            }

                            const update_consent = await connection.execute(sqlsig, bindparamsig, { outFormat: oracledb.OBJECT })

                            console.log(`sussecc update consent : ${update_consent.rowsAffected}`)
                        } catch (e) {
                            console.error(e)
                            logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (รูปภาพลายเซ็นต์หรือ PDPA) : ${e.message ? e.message : 'No return message'}`)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (รูปภาพลายเซ็นต์หรือ PDPA) : ${e.message ? e.message : 'No return message'}`
                            })
                        }
                    } else {
                        console.log(`didn't update new signature (customer sig, or witness sig)`)

                        // === Add update new PDPA field consent (21/07/2022) === 
                        try {
                            let sqlsig;
                            let bindparamsig;
                            sqlsig = `UPDATE MPLS_CONSENT
                                            SET IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                                MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                                NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                                ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                                INFO_CONSENT_VALUE = :info_consent_value,
                                                INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                                ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                                PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                                FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                                INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                                IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                            WHERE APP_KEY_ID = :consentid
                                            `
                            bindparamsig = {
                                identity_approve_consent_value: identity_approve_consent_value,
                                motor_insurance_consent_value: motor_insurance_consent_value,
                                nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                analyze_consent_value: analyze_consent_value,
                                info_consent_value: info_consent_value,
                                info_party_consent_value: info_party_consent_value,
                                analyze_party_consent_value: analyze_party_consent_value,
                                prdt_info_party_consent_value: prdt_info_party_consent_value,
                                followup_consent_value: followup_consent_value,
                                info_develop_consent_value: info_develop_consent_value,
                                e_paper_consent_value: e_paper_consent_value,
                                is_disclosure_consent: is_disclosure_consent,
                                consentid: consent_id
                            }
                            const update_consent = await connection.execute(sqlsig, bindparamsig, { outFormat: oracledb.OBJECT })

                            console.log(`sussecc update consent (PDPA consent only) : ${update_consent.rowsAffected}`)
                        } catch (e) {
                            console.error(e)
                            logger.error(`user ${userid}, quotationid: ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (PDPA only (no image add)) : ${e.message ? e.message : 'No return message'}`)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (PDPA only (no image add)) : ${e.message ? e.message : 'No return message'}`
                            })
                        }

                    }
                }




                // ===*** commit stage ***====
                const commitall = await connection.commit();

                try {
                    commitall
                } catch (e) {
                    logger.error(`user ${userid}, quotationid: ${quotationid} : commit fail : ${e.message ? e.message : 'No return message'}`)
                    console.err(e.message)
                    res.send(404).send(e.message)
                }

                // === End ===
                const sqlstring_getquotationkeyid = `SELECT * FROM MPLS_QUOTATION WHERE QUO_KEY_APP_ID = '${quotationid}'`
                const resultQuotation = await connection.execute(sqlstring_getquotationkeyid, [],
                    {
                        outFormat: oracledb.OBJECT
                    })

                if (resultQuotation) {

                    if (resultQuotation.rows.length == 0) {
                        logger.error(`user ${userid} : No quotation Record`)
                        const noresultFormatJson = {
                            status: 400,
                            message: 'No quotation Record'
                        }
                        res.status(201).send(noresultFormatJson)
                    } else {
                        let resData = resultQuotation.rows
                        const lowerResData = tolowerService.arrayobjtolower(resData)
                        let returnData = new Object
                        returnData.data = lowerResData
                        returnData.status = 200
                        returnData.message = 'success'
                        // === tran all upperCase to lowerCase === 
                        let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                            result[key.toLowerCase()] = val;
                        });
                        res.status(200).json(returnDatalowerCase);
                    }
                } else {
                    logger.error(`user ${userid} : Can't find record quotation id after select}`)
                    return res.status(400).send({
                        status: 400,
                        message: `Can't find record quotation id after select`,
                        data: []
                    })
                }

            } catch (e) {
                logger.error(`user ${userid} : Error between execute image data : ${e.message ? e.message : ''}`)
                return res.status(400).send({
                    status: 400,
                    message: `Error between execute image data : ${e.message ? e.message : ''}`,
                    data: []
                })
            }
        }

    } catch (e) {
        logger.error(`user ${userid} : ${e.message ? e.message : ''}`)
        console.error(e.message ? e.message : 'No return message')
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

async function updateQuotationImageonlyinsert(req, res, next) {
    let connection;
    try {

        console.log(`trigger start`)
        let imageCheckCode = [];
        const token = req.user
        const userid = token.ID
        // === chaanal type (25/05/2022) === 
        const channal = token.channal
        let channalstamp = ''

        if (channal) {
            switch (token.channal) {
                case 'checker': {
                    channalstamp = 'C'
                }
                    break;
                case 'dealer': {
                    channalstamp = 'S'
                }
            }
        }
        console.log(`chaanal : ${channalstamp}`)

        // === Get data on multipart/form-data === 
        let fileData
        let formData
        // const form = formidable({ multiples: true })
        const form = new multiparty.Form()
        await new Promise(function (resolve, reject) {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err)
                    return
                }
                formData = fields
                fileData = files
                resolve()
            })
            return
        })

        const parseFormdata = JSON.parse(formData.item)
        const { quotationid } = parseFormdata
        console.log(`quotationid: ${quotationid}`)

        connection = await oracledb.getConnection(
            config.database
        )
        // === do next ===
        // ==== step 2 ====
        // ===== loop check recent upload image ====
        console.log(`trigger step 2`)
        try {

            const resultCheckRecent = await connection.execute(`
                SELECT IMAGE_CODE , APP_KEY_ID
                FROM MPLS_IMAGE_FILE WHERE IMGF_QUO_APP_KEY_ID = :quotationid
                `, {
                quotationid: quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // === check =====
            if (resultCheckRecent.rows.length !== 0) {
                for (let i = 0; i < resultCheckRecent.rows.length; i++) {
                    const obj = {}
                    obj["IMAGE_CODE"] = resultCheckRecent.rows[i].IMAGE_CODE;
                    obj["IMAGE_KEY"] = resultCheckRecent.rows[i].APP_KEY_ID;
                    imageCheckCode.push(obj)
                }
            } else {
                return res.status(400).send({
                    status: 400,
                    message: `record invalid condition`,
                    data: []
                })
            }

            console.log(`imageCheckCode : ${JSON.stringify(imageCheckCode)}`)

            // === update quotation with new image ===

        } catch (e) {
            return res.status(400).send({
                status: 400,
                message: `Error between Check recent upload image.`,
                data: []
            })
        }

        // === do next ===
        // === get file form multipart-form-data === 

        const citizenid_image = fileData.citizenid_image ? fileData.citizenid_image : null
        const houseregis_image = fileData.houseregis_image ? fileData.houseregis_image : null
        const face_image = fileData.face_image ? fileData.face_image : null
        const house_image = fileData.house_image ? fileData.house_image : null
        const store_image = fileData.store_image ? fileData.store_image : null
        const salarycertificate_image = fileData.salarycertificate_image ? fileData.salarycertificate_image : null
        const workcertificate_image = fileData.workcertificate_image ? fileData.workcertificate_image : null
        const salarypayment_image = fileData.salarypayment_image ? fileData.salarypayment_image : null
        const bookbank_image = fileData.bookbank_image ? fileData.bookbank_image : null
        const motocyclelicense_image = fileData.motocyclelicense_image ? fileData.motocyclelicense_image : null

        // console.log('citizenid_image : ' + citizenid_image)

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }
        var imageDataCreate = []; // ==== create new record image === 
        // var imageDataUpdate = []; // ==== update record image ====

        const cititzenBuffer = citizenid_image ? imagetobuffer(citizenid_image) : null
        const houseregisBuffer = houseregis_image ? imagetobuffer(houseregis_image) : null
        const faceBuffer = face_image ? imagetobuffer(face_image) : null
        const hosueBuffer = house_image ? imagetobuffer(house_image) : null
        const storeBuffer = store_image ? imagetobuffer(store_image) : null
        const salarycertificateBuffer = salarycertificate_image ? imagetobuffer(salarycertificate_image) : null
        const workcertificateBuffer = workcertificate_image ? imagetobuffer(workcertificate_image) : null
        const salarypaymentBuffer = salarypayment_image ? imagetobuffer(salarypayment_image) : null
        const bookbankBuffer = bookbank_image ? imagetobuffer(bookbank_image) : null
        const motocyclelicenseBuffer = motocyclelicense_image ? imagetobuffer(motocyclelicense_image) : null

        genImagInfo = async (fileinfo, file, code) => {


            const resultFilterCheck = imageCheckCode.find((items) => {
                return items.IMAGE_CODE == code
            })

            if (!resultFilterCheck) {
                console.log(`create`)
                // === create new image list ==== 

                // if (!imageCheckCode.includes(code)) {

                let image = {}
                const filename = fileinfo[0].fieldName
                const filetype = fileinfo[0].headers['content-type']
                const orifilename = fileinfo[0].originalFilename
                const readfileimage = fs.readFileSync(fileinfo[0].path)
                image.filename = filename
                image.filetype = filetype
                // image.orifilename = orifilename
                image.keyid = uuidv4()
                image.quokeyid = quotationid
                image.status = 0
                image.filedata = readfileimage
                image.code = code
                // console.log(`this is each image : ${JSON.stringify(image)}`)
                imageDataCreate.push(image)
            } else {
                if (resultFilterCheck.IMAGE_CODE == '09' || resultFilterCheck.IMAGE_CODE == '10') {
                    // // ==== insert image (code in ('09','10')) that have already record ====
                    console.log(`record id : ${resultFilterCheck.IMAGE_KEY}`)
                    let image = {}
                    const filename = fileinfo[0].fieldName
                    const filetype = fileinfo[0].headers['content-type']
                    const orifilename = fileinfo[0].originalFilename
                    const readfileimage = fs.readFileSync(fileinfo[0].path)
                    image.filename = filename
                    image.filetype = filetype
                    // image.orifilename = orifilename
                    image.keyid = uuidv4()
                    image.quokeyid = quotationid
                    image.status = 0
                    image.filedata = readfileimage
                    image.code = code

                    try {
                        const setrecentimageinactive = await updateinactiveimagetype(resultFilterCheck.IMAGE_KEY)
                        if (setrecentimageinactive) {
                            imageDataCreate.push(image)
                        } else {
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทรายการ`
                            })
                        }
                    } catch (e) {
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทรายการ`
                        })
                    }

                } else {
                    // console.log(`update`)
                    // // ==== update image list ====
                    // console.log(`record id : ${resultFilterCheck.IMAGE_KEY}`)
                    // let image = {}
                    // const filetype = fileinfo[0].headers['content-type']
                    // const readfileimage = fs.readFileSync(fileinfo[0].path)
                    // image.filetype = filetype
                    // image.quokeyid = quotationid
                    // image.filedata = readfileimage
                    // imageDataUpdate.push(image)
                }
            }
        }

        if (cititzenBuffer) await genImagInfo(citizenid_image, cititzenBuffer, '01');
        if (houseregisBuffer) await genImagInfo(houseregis_image, houseregisBuffer, '02');
        if (faceBuffer) await genImagInfo(face_image, faceBuffer, '03');
        if (hosueBuffer) await genImagInfo(house_image, hosueBuffer, '04');
        if (storeBuffer) await genImagInfo(store_image, storeBuffer, '05');
        if (salarycertificateBuffer) await genImagInfo(salarycertificate_image, salarycertificateBuffer, '06');
        if (workcertificateBuffer) await genImagInfo(workcertificate_image, workcertificateBuffer, '07');
        if (salarypaymentBuffer) await genImagInfo(salarypayment_image, salarypaymentBuffer, '08');
        if (bookbankBuffer) await genImagInfo(bookbank_image, bookbankBuffer, '09');
        if (motocyclelicenseBuffer) await genImagInfo(motocyclelicense_image, motocyclelicenseBuffer, '10');

        console.log(`imageDataCreate : ${imageDataCreate}`)
        // console.log(`imageDataUpdate : ${imageDataUpdate}`)

        // ===== stage 3 ====== 
        // === *** sql mayexeute stage === 
        try {

            // console.log(`length update : ${imageDataUpdate.length}`)
            // if (imageDataUpdate.length !== 0) {
            //     // --- Update ---
            //     try {
            //         const sqlupdate = `
            //             UPDATE MPLS_IMAGE_FILE
            //             SET IMAGE_FILE = :filedata,
            //                 IMAGE_TYPE = :filetype
            //             WHERE IMGF_QUO_APP_KEY_ID = :quokeyid
            //     `
            //         const bindsUpdate = imageDataUpdate;

            //         const options = {
            //             bindDefs: {
            //                 filedata: { type: oracledb.BLOB, maxSize: 5000000 },
            //                 filetype: { type: oracledb.STRING, maxSize: 200 },
            //                 quokeyid: { type: oracledb.STRING, maxSize: 50 }
            //             }
            //         }

            //         const resultUpdateImage = await connection.executeMany(sqlupdate, bindsUpdate, options)

            //         console.log(`sussecc update image attach file : ${resultUpdateImage.rowsAffected}`)
            //     } catch (e) {
            //         console.error(e)
            //         return res.status(400).send({
            //             status: 400,
            //             message: `Can't update image record with error status: ${e.message ? e.message : `no status`}`
            //         })
            //     }
            // }
            // console.log(`length create : ${imageDataCreate.length}`)

            if (imageDataCreate.length !== 0) {
                // --- Insert ---

                try {

                    const sqlInsert = `INSERT INTO MPLS_IMAGE_FILE (
                        IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                        IMAGE_CODE, IMAGE_FILE, STATUS, ACTIVE_STATUS)
                        VALUES (:quokeyid, :keyid, :filename, :filetype, 
                        :code, :filedata, :status, 'Y')`
                    const bindsInsert = imageDataCreate;

                    const options = {
                        bindDefs: {
                            quokeyid: { type: oracledb.STRING, maxSize: 50 },
                            keyid: { type: oracledb.STRING, maxSize: 50 },
                            filename: { type: oracledb.STRING, maxSize: 200 },
                            filetype: { type: oracledb.STRING, maxSize: 200 },
                            code: { type: oracledb.STRING, maxSize: 4 },
                            filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                            status: { type: oracledb.NUMBER }
                        }
                    }


                    const resultInsertImage = await connection.executeMany(sqlInsert, bindsInsert, options)

                    console.log(`sussecc insert image attach file : ${resultInsertImage.rowsAffected}`)

                } catch (e) {
                    console.error(e)
                    return res.status(400).send({
                        status: 400,
                        message: `can't create image recrd with error status: ${e.message ? e.message : `no status`}`
                    })
                }
            }


            // ===*** commit stage ***====
            const commitall = await connection.commit();

            try {
                commitall
            } catch {
                console.err(err.message)
                res.send(404).send(err.message)
            }

            // === End ===
            const sqlstring_getquotationkeyid = `SELECT * FROM MPLS_QUOTATION WHERE QUO_KEY_APP_ID = '${quotationid}'`
            const resultQuotation = await connection.execute(sqlstring_getquotationkeyid, [],
                {
                    outFormat: oracledb.OBJECT
                })

            if (resultQuotation) {

                if (resultQuotation.rows.length == 0) {
                    const noresultFormatJson = {
                        status: 400,
                        message: 'No quotation Record'
                    }
                    res.status(201).send(noresultFormatJson)
                } else {
                    let resData = resultQuotation.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });
                    res.status(200).json(returnDatalowerCase);
                }
            } else {
                return res.status(400).send({
                    status: 400,
                    message: `Can't find record quotation id after select`,
                    data: []
                })
            }

        } catch (e) {
            return res.status(400).send({
                status: 400,
                message: `Error between execute image data : ${e.message ? e.message : ''}`,
                data: []
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

async function updateinactiveimagetype(image_key) {

    console.log(`trigger inactive record service`)
    let connection;
    try {

        connection = await oracledb.getConnection(config.database)

        const updateimagestatus = await connection.execute(`
            UPDATE MPLS_IMAGE_FILE
               SET ACTIVE_STATUS = 'N'
            WHERE APP_KEY_ID = :image_key
        `, {
            image_key: image_key
        }, {
            outFormat: oracledb.OBJECT
        })

        if (updateimagestatus.rowsAffected == 0) {
            return false
        } else {

            // ===*** commit stage ***====
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(`อัพเดท inaactive status ผิดพลาด : ${e.message ? e.message : 'No error message'}`)
                return false
            }
            return true
        }

    } catch (e) {
        console.error(e);
        return false
    }
}

async function getquotationbyid(req, res, next) {

    // ==== already log4js ====

    let connection;
    const logger = log4js.getLogger("view");
    try {

        const token = req.user
        const userid = token.ID
        const channal = token.channal

        const radmin = token.radmin

        var quotationid = req.params.id

        // === check userid params === 

        if (!userid) {
            return res.status(400).send({
                status: 400,
                message: `ไม่มีค่า user id สำหรับยืนยันตน`
            })
        }

        // === check quotationid params ===

        if (!quotationid) {
            logger.error(`user ${userid} : ไม่มีค่า quotationd`)
            return res.status(400).send({
                status: 400,
                message: `ไม่มีค่า quotationid`,
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB]

        connection = await oracledb.getConnection(
            config.database
        )

        const results = await connection.execute(`
        SELECT QU.*, 
                CTP.APP_KEY_ID AS CTP_APP_KEY_ID,
                CTP.ADDRESS AS CTP_ADDRESS,
                CTP.SUB_DISTRICT AS CTP_SUB_DISTRICT,
                CTP.DISTRICT AS CTP_DISTRICT,
                CTP.PROVINCE_NAME AS CTP_PROVINCE_NAME,
                CTP.PROVINCE_CODE AS CTP_PROVINCE_CODE,
                CTP.POSTAL_CODE AS CTP_POSTAL_CODE,
                HRP.APP_KEY_ID AS HRP_APP_KEY_ID,
                HRP.ADDRESS AS HRP_ADDRESS,
                HRP.SUB_DISTRICT AS HRP_SUB_DISTRICT,
                HRP.DISTRICT AS HRP_DISTRICT,
                HRP.PROVINCE_NAME AS HRP_PROVINCE_NAME,
                HRP.PROVINCE_CODE AS HRP_PROVINCE_CODE,
                HRP.POSTAL_CODE AS HRP_POSTAL_CODE,
                LVP.APP_KEY_ID AS LVP_APP_KEY_ID,
                LVP.ADDRESS AS LVP_ADDRESS,
                LVP.SUB_DISTRICT AS LVP_SUB_DISTRICT,
                LVP.DISTRICT AS LVP_DISTRICT,
                LVP.PROVINCE_NAME AS LVP_PROVINCE_NAME,
                LVP.PROVINCE_CODE AS LVP_PROVINCE_CODE,
                LVP.POSTAL_CODE AS LVP_POSTAL_CODE,
                LVP.LATITUDE AS LVP_LATITUDE,
                LVP.LONDTIUDE AS LVP_LONDTIUDE,
                LVP.LALON AS LVP_LALON,
                WP.APP_KEY_ID AS WP_APP_KEY_ID,
                WP.ADDRESS AS WP_ADDRESS,
                WP.SUB_DISTRICT AS WP_SUB_DISTRICT,
                WP.DISTRICT AS WP_DISTRICT,
                WP.PROVINCE_NAME AS WP_PROVINCE_NAME,
                WP.PROVINCE_CODE AS WP_PROVINCE_CODE,
                WP.POSTAL_CODE AS WP_POSTAL_CODE,
                CD.APP_KEY_ID AS CD_APP_KEY_ID, 
                CD.BRAND_CODE AS CD_BRAND_CODE, 
                CD.BRAND_NAME AS CD_BRAND_NAME, 
                CD.STATUS AS CD_STATUS, 
                CD.MODEL_CODE AS CD_MODEL_CODE, 
                CD.MODEL_NAME AS CD_MODEL_NAME, 
                CD.COLOR_CODE AS CD_COLOR_CODE, 
                CD.COLOR_NAME AS CD_COLOR_NAME, 
                CD.LOAN_AMOUNT AS CD_LOAN_AMOUNT, 
                CD.PRODUCT_VALUE AS CD_PRODUCTVALUE, 
                CD.INTEREST_RATE AS CD_INTEREST_RATE, 
                CD.PAYMENT_VALUE AS CD_PAYMENT_VALUE, 
                CD.PAYMENT_ROUND_COUNT AS CD_PAYMENT_ROUND_COUNT, 
                CD.DOWN_PAYMENT AS CD_DOWN_PAYMENT,
                CD.INSURER_CODE AS CD_INSURER_CODE,
                CD.INSURER_NAME AS CD_INSURER_NAME,
                CD.INSURANCE_CODE AS CD_INSURANCE_CODE,
                CD.INSURANCE_NAME AS CD_INSURANCE_NAME,
                CD.INSURANCE_YEAR AS CD_INSURANCE_YEAR,
                CD.INSURANCE_PLAN_PRICE AS CD_INSURANCE_PLAN_PRICE,
                CD.IS_INCLUDE_LOANAMOUNT AS CD_IS_INCLUDE_LOANAMOUNT,
                CD.FACTORY_PRICE AS CD_FACTORY_PRICE,
                CD.SIZE_MODEL AS CD_SIZE_MODEL,
                CD.COVERAGE_TOTAL_LOSS AS CD_COVERAGE_TOTAL_LOSS,
                CD.MAX_LTV AS CD_MAX_LTV,
                CD.PRICE_INCLUDE_VAT AS CD_PRICE_INCLUDE_VAT,
                CD.ENGINE_NUMBER AS CD_ENGINE_NUMBER,
                CD.CHASSIS_NUMBER AS CD_CHASSIS_NUMBER,
                CD.ENGINE_NO_RUNNING AS CD_ENGINE_NO_RUNNING,
                CD.CHASSIS_NO_RUNNING AS CD_CHASSIS_NO_RUNNING,
                (CD.LOAN_AMOUNT + CD.INSURANCE_PLAN_PRICE) AS CD_NET_FINANCE,
                CR.APP_KEY_ID AS CR_APP_KEY_ID,
                CR.MAIN_CAREER_NAME AS CR_MAIN_CAREER_NAME,
                CR.MAIN_CAREER_CODE AS CR_MAIN_CAREER_CODE,
                CR.MAIN_WORKPLACE_NAME AS CR_MAIN_WORKPLACE_NAME,
                CR.MAIN_POSITION AS CR_MAIN_POSITION,
                CR.MAIN_DEPARTMENT AS CR_MAIN_DEPARTMENT,
                CR.MAIN_EXPERIENCE_YEAR AS CR_MAIN_EXPERIENCE_YEAR,
                CR.MAIN_EXPERIENCE_MONTH AS CR_MAIN_EXPERIENCE_MONTH,
                CR.MAIN_SALARY_PER_MONTH AS CR_MAIN_SALARY_PER_MONTH,
                CR.MAIN_SALARY_PER_DAY AS CR_MAIN_SALARY_PER_DAY,
                CR.MAIN_LEADER_NAME AS CR_MAIN_LEADER_NAME,
                CR.MAIN_WORK_PER_WEEK AS CR_MAIN_WORK_PER_WEEK,
                CR.IS_SUB_CAREER AS CR_IS_SUB_CAREER,
                CR.SUB_CAREER_NAME AS CR_SUB_CAREER_NAME,
                CR.SUB_CAREER_CODE AS CR_SUB_CAREER_CODE,
                CR.SUB_WORKPLACE_NAME AS CR_SUB_WORKPLACE_NAME,
                CR.SUB_POSITION AS CR_SUB_POSITION,
                CR.SUB_DEPARTMENT AS CR_SUB_DEPARTMENT,
                CR.SUB_EXPERIENCE_YEAR AS CR_SUB_EXPERIENCE_YEAR,
                CR.SUB_EXPERIENCE_MONTH AS CR_SUB_EXPERIENCE_MONTH,
                CR.SUB_SALARY_PER_MONTH AS CR_SUB_SALARY_PER_MONTH,
                CR.SUB_SALARY_PER_DAY AS CR_SUB_SALARY_PER_DAY,
                CR.SUB_LEADER_NAME AS CR_SUB_LEADER_NAME,
                CR.SUB_WORK_PER_WEEK AS CR_SUB_WORK_PER_WEEK,
                CS.APP_KEY_ID AS CS_APP_KEY_ID,
                CS.CUSTOMER_NAME AS CS_CUSTOMER_NAME,
                CS.FIRST_NAME AS CS_FIRST_NAME,
                CS.LAST_NAME AS CS_LAST_NAME,
                CS.IS_CREDIT_CONSENT AS CS_IS_CREDIT_CONSENT,
                CS.IS_FINAL_CONSENT AS CS_IS_FINAL_CONSENT,
                CS.IS_DISCLOSURE_CONSENT AS CS_IS_DISCLOSURE_CONSENT,
                CS.IS_PERSONAL_DISCLOSURE_CONSENT AS CS_IS_PERSONAL_DISCLOSURE,
                CS.SIGNATURE_IMAGE AS CS_SIGNATURE_IMAGE,
                CS.WITNESS_IMAGE AS CS_WITNESS_IMAGE,
                CS.IDENTITY_APPROVE_CONSENT_VALUE AS IDENTITY_APPROVE_CONSENT_VALUE,
                CS.MOTOR_INSURANCE_CONSENT_VALUE AS MOTOR_INSURANCE_CONSENT_VALUE,
                CS.NMOTOR_INSURANCE_CONSENT_VALUE AS NMOTOR_INSURANCE_CONSENT_VALUE,
                CS.ANALYZE_CONSENT_VALUE AS ANALYZE_CONSENT_VALUE,
                CS.INFO_CONSENT_VALUE AS INFO_CONSENT_VALUE,
                CS.INFO_PARTY_CONSENT_VALUE AS INFO_PARTY_CONSENT_VALUE,
                CS.ANALYZE_PARTY_CONSENT_VALUE AS ANALYZE_PARTY_CONSENT_VALUE,
                CS.PRDT_INFO_PARTY_CONSENT_VALUE AS PRDT_INFO_PARTY_CONSENT_VALUE,
                CS.FOLLOWUP_CONSENT_VALUE AS FOLLOWUP_CONSENT_VALUE,
                CS.INFO_DEVELOP_CONSENT_VALUE AS INFO_DEVELOP_CONSENT_VALUE,
                CS.E_PAPER_CONSENT_VALUE AS E_PAPER_CONSENT_VALUE,
                CS.IS_CHECK_SALE_SHEET_EXPLAIN AS IS_CHECK_SALE_SHEET_EXPLAIN,
                CS.IS_CHECK_PRODUCT_DETAIL AS IS_CHECK_PRODUCT_DETAIL,
                CS.IS_CHECK_PAYMENT_RULE AS IS_CHECK_PAYMENT_RULE,
                CS.IS_CHECK_CONTRACT_EXPLAIN AS IS_CHECK_CONTRACT_EXPLAIN,
                CS.IS_CHECK_TOTAL_LOSS_EXPLAIN AS IS_CHECK_TOTAL_LOSS_EXPLAIN,
                CS.IS_CHECK_TOTAL_LOSS_COMPANY AS IS_CHECK_TOTAL_LOSS_COMPANY,
                CS.IS_CHECK_LIFE_INSURANCE AS IS_CHECK_LIFE_INSURANCE,
                CS.IS_CHECK_L_INSUR_DETAIL AS IS_CHECK_L_INSUR_DETAIL,
                CS.IS_CHECK_L_INSUR_PLAN AS IS_CHECK_L_INSUR_PLAN,
                CS.IS_CHECK_L_INSUR_COMPANY AS IS_CHECK_L_INSUR_COMPANY,
                CS.IS_CHECK_L_INSUR_REFUND AS IS_CHECK_L_INSUR_REFUND,
                CS.IS_CHECK_L_INSUR_CANCLE_D AS IS_CHECK_L_INSUR_CANCLE_D,
                PP.APP_KEY_ID AS PP_APP_KEY_ID,
                PP.PURPOSE_OF_BUY AS PP_PURPOSE_OF_BUY,
                PP.PURPOSE_OF_BUY_NAME AS PP_PURPOSE_OF_BUY_NAME,
                PP.REASON_OF_BUY AS PP_REASON_OF_BUY,
                PP.REASON_OF_BUY_NAME AS PP_REASON_OF_BUY_NAME,
                PP.CAR_USER AS PP_CAR_USER,
                PP.CAR_USER_NAME AS PP_CAR_USER_NAME,
                PP.CAR_USER_RELATION AS PP_CAR_USER_RELATION,
                PP.CAR_USER_FULLNAME AS PP_CAR_USER_FULLNAME,
                PP.CAR_USER_CITIZENCARD_ID AS PP_CAR_USER_CITIZENCARD_ID,
                PP.CAR_USER_HOME_NO AS PP_CAR_USER_HOME_NO,
                PP.CAR_USER_HOME_NAME AS PP_CAR_USER_HOME_NAME,
                PP.CAR_USER_SOI AS PP_CAR_USER_SOI,
                PP.CAR_USER_TROK AS PP_CAR_USER_TROK,
                PP.CAR_USER_MOO AS PP_CAR_USER_MOO,
                PP.CAR_USER_ROAD AS PP_CAR_USER_ROAD,
                PP.CAR_USER_SUB_DISTRICT AS PP_CAR_USER_SUB_DISTRICT,
                PP.CAR_USER_DISTRICT AS PP_CAR_USER_DISTRICT,
                PP.CAR_USER_PROVINCE_CODE AS PP_CAR_USER_PROVINCE_CODE,
                PP.CAR_USER_PROVINCE_NAME AS PP_CAR_USER_PROVINCE_NAME,
                PP.CAR_USER_POSTAL_CODE AS PP_CAR_USER_POSTAL_CODE,
                PP.CAR_USER_ROOM_NO AS PP_CAR_USER_ROOM_NO,
                PP.CAR_USER_FLOOR AS PP_CAR_USER_FLOOR,
                PP.CAR_USER_PHONENO AS PP_CAR_USER_PHONENO,
                PP.FIRST_REFERRAL_FULLNAME AS PP_FIRST_REFERRAL_FULLNAME,
                PP.FIRST_REFERRAL_HOUSE_NO AS PP_FIRST_REFERRAL_HOUSENO,
                PP.FIRST_REFERRAL_MOO AS PP_FIRST_REFERRAL_MOO,
                PP.FIRST_REFERRAL_HOUSE_NAME AS PP_FIRST_REFERRAL_HOUSE_NAME,
                PP.FIRST_REFERRAL_ROOM_NO AS PP_FIRST_REFERRAL_ROOM_NO,
                PP.FIRST_REFERRAL_FLOOR AS PP_FIRST_REFERRAL_FLOOR,
                PP.FIRST_REFERRAL_SOI AS PP_FIRST_REFERRAL_SOI,
                PP.FIRST_REFERRAL_ROAD AS PP_FIRST_REFERRAL_ROAD,
                PP.FIRST_REFERRAL_SUB_DISTRICT AS PP_FIRST_REFERRAL_SUB_DISTRICT,
                PP.FIRST_REFERRAL_DISTRICT AS PP_FIRST_REFERRAL_DISTRICT,
                PP.FIRST_REFERRAL_PROVINCE_NAME AS PP_FIRST_REFERRAL_PROVINCE_N,
                PP.FIRST_REFERRAL_PROVINCE_CODE AS PP_FIRST_REFERRAL_PROVINCE_C,
                PP.FIRST_REFERRAL_POSTAL_CODE AS PP_FIRST_REFERRAL_POSTAL_CODE,
                PP.FIRST_REFERRAL_PHONENO AS PP_FIRST_REFERRAL_PHONENO,
                PP.FIRST_REFERRAL_RELATION AS PP_FIRST_REFERRAL_RELATION,
                PP.SECOND_REFERRAL_FULLNAME AS PP_SECOND_REFERRAL_FULLNAME,
                PP.SECOND_REFERRAL_HOUSE_NO AS PP_SECOND_REFERRAL_HOUSENO,
                PP.SECOND_REFERRAL_MOO AS PP_SECOND_REFERRAL_MOO,
                PP.SECOND_REFERRAL_HOUSE_NAME AS PP_SECOND_REFERRAL_HOUSE_NAME,
                PP.SECOND_REFERRAL_ROOM_NO AS PP_SECOND_REFERRAL_ROOM_NO,
                PP.SECOND_REFERRAL_FLOOR AS PP_SECOND_REFERRAL_FLOOR,
                PP.SECOND_REFERRAL_SOI AS PP_SECOND_REFERRAL_SOI,
                PP.SECOND_REFERRAL_ROAD AS PP_SECOND_REFERRAL_ROAD,
                PP.SECOND_REFERRAL_SUB_DISTRICT AS PP_SECOND_REFERRAL_SUB_D,
                PP.SECOND_REFERRAL_DISTRICT AS PP_SECOND_REFERRAL_DISTRICT,
                PP.SECOND_REFERRAL_PROVINCE_NAME AS PP_SECOND_REFERRAL_PROVINCE_N,
                PP.SECOND_REFERRAL_PROVINCE_CODE AS PP_SECOND_REFERRAL_PROVINCE_C,
                PP.SECOND_REFERRAL_POSTAL_CODE AS PP_SECOND_REFERRAL_POSTAL_CODE,
                PP.SECOND_REFERRAL_PHONENO AS PP_SECOND_REFERRAL_PHONENO,
                PP.SECOND_REFERRAL_RELATION AS PP_SECOND_REFERRAL_RELATION
                FROM MPLS_QUOTATION QU
                LEFT JOIN MPLS_CONTACT_PLACE CTP
                ON QUO_KEY_APP_ID = CONT_QUO_KEY_APP_ID
                LEFT JOIN MPLS_LIVING_PLACE LVP
                ON QUO_KEY_APP_ID = LIV_QUO_KEY_APP_ID
                LEFT JOIN MPLS_WORK_PLACE WP
                ON QUO_KEY_APP_ID = WORK_QUO_KEY_APP_ID
                LEFT JOIN MPLS_CREDIT CD
                ON QUO_KEY_APP_ID = CRE_QUO_KEY_APP_ID
                LEFT JOIN MPLS_CAREER CR
                ON QUO_KEY_APP_ID = CARE_QUO_APP_KEY_ID
                LEFT JOIN MPLS_CONSENT CS
                ON QUO_KEY_APP_ID = CONS_QUO_KEY_APP_ID
                LEFT JOIN MPLS_PURPOSE PP
                ON QUO_KEY_APP_ID = PURP_QUO_APP_KEY_ID
                LEFT JOIN MPLS_HOUSE_REGIS_PLACE HRP
                ON QUO_KEY_APP_ID = HRP_QUO_KEY_APP_ID
                WHERE QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: { dir: oracledb.BIND_IN, val: quotationid, type: oracledb.STRING }
        },
            {
                outFormat: oracledb.OBJECT
            })

        if (results) {
            if (results.rows.length == 0) {
                logger.error(`uesr ${userid}, quotationid: ${quotationid} : No record found`)
                const noresult = {
                    status: 201,
                    message: 'No record found',
                    data: []
                }
                res.status(201).send(noresult)
            } else {
                let resData = results.rows

                // === thrown when permission fail === 

                if (radmin !== 'Y' && radmin !== 'FI') {
                    if (resData[0].USER_ID != userid) {
                        logger.error(`uesr ${userid}, quotationid: ${quotationid} : ไม่มีสิทธิ์ในการดูใบคำขอนี้`)
                        return res.status(202).send({
                            status: 202,
                            message: 'ไม่มีสิทธิ์ในการดูใบคำขอนี้',
                            data: []
                        })
                    } else {
                        // console.log(`have permission`)
                    }
                }

                try {
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'

                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });
                    return res.status(200).json(returnDatalowerCase)
                    // === api process finish (success) === 
                } catch (e) {
                    logger.error(`uesr ${userid}, quotationid: ${quotationid} : Error when combine results data`)
                    return res.status(201).send({
                        status: 201,
                        message: `Error when combine results data`,
                        data: []
                    })
                }

            }
        }
    } catch (e) {
        logger.error(`Error out of valid : ${e.message ? e.message : 'No return message'}`)
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

async function activeEpaper(req, res, next) {

    let connection;

    try {
        const quotationid = req.query.quotationid
        connection = await oracledb.getConnection(
            config.database
        )

        if (!quotationid) {
            return res.status(460).send({
                status: 460,
                message: `require quotationid`,
                data: []
            })
        }

        // === cheack quotation id format === 

        try {
            const resultCheckFormat = await connection.execute(`
                SELECT E_PAPER, QUO_KEY_APP_ID 
                FROM MPLS_QUOTATION
                WHERE QUO_KEY_APP_ID = :quotationid
            `, {
                quotationid: quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // console.log(`quotation id Results : ${JSON.stringify(resultCheckFormat)}`)

            if (!resultCheckFormat) {
                return res.status(460).send({
                    status: 460,
                    message: `quotionid not found`,
                    data: []
                })
            } else {
                // === do next ===
                if (resultCheckFormat.rows.length !== 0) {
                    const resDataCheck = resultCheckFormat.rows[0]

                    if (resDataCheck.E_PAPER == 'Y') {
                        return res.status(200).send({
                            status: 200,
                            message: `this record was already active`,
                            data: []
                        })
                    }
                    // === do next execute === 
                    console.log(`valid quotation`)
                } else {
                    return res.status(460).send({
                        status: 460,
                        message: `quotation not found`,
                        data: []
                    })
                }
            }

        } catch (e) {
            console.error(e)
            return res.status(460).send({
                status: 460,
                message: `Error when try to check conditon : ${e}`,
                data: []
            })
        }

        const resultUpdateEpaper = await connection.execute(`
            UPDATE MPLS_QUOTATION 
            SET E_PAPER = 'Y'
            WHERE QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            autoCommit: true
        })

        if (!resultUpdateEpaper) {
            return res.status(460).send({
                status: 460,
                message: `can't update quotation e-paper status`,
                data: []
            })
        } else {
            return res.status(200).send({
                status: 200,
                message: `success update e-paper status`,
                data: []
            })
        }

    } catch (e) {
        console.error(e);
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

async function canclequotation(req, res, next) {

    let connection;

    try {
        const quotationid = req.params.quotationid

        if (!quotationid) {
            return res.status(400).send({
                status: 400,
                message: `กรุณาระบุไอดีของใบคำขอ`,
                data: []
            })
        }
        connection = await oracledb.getConnection(
            config.database
        )

        const resultQuo = await connection.execute(`
            SELECT QUO_STATUS, APPLICATION_NUM 
            FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultQuo.rows.length !== 0) {
            // ==== check validate condition for cancle quotation ==== 
            // ==== if application number was already value , can't cancle quotation === 
            const quoitem = resultQuo.rows[0]

            if (quoitem.APPLICATION_NUM) {
                logger.error("")
                return res.status(400).send({
                    status: 400,
                    message: `ใบคำขอได้ถูกสร้างในระบบ ORACLE แล้ว ไม่สามารถยกเลิกได้`,
                    data: []
                })
            }

            if (quoitem.QUO_STATUS == 3) {
                return res.status(400).send({
                    status: 400,
                    message: `ใบคำขอนี้ถูกยกเลิกไปแล้ว`,
                    data: []
                })
            }

        } else {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบรายการใบคำขอนี้ ยกเลิกไม่ได้`
            })
        }

        // ==== update status to quotation for cancle quotation ====

        const resultUpdatequotation = await connection.execute(`
                UPDATE MPLS_QUOTATION
                SET QUO_STATUS = 3
                WHERE QUO_KEY_APP_ID = :quotationid
            `, {
            quotationid: quotationid
        }, {
            autoCommit: true
        })


        if (resultUpdatequotation) {
            console.log(`update quotation status (cancle) success : ${resultUpdatequotation.rowsAffected}`)
            return res.status(200).send({
                status: 200,
                message: `ยกเลิกเคสสำเร็จ`,
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

async function getinsurancedetailbyid(req, res, next) {

    let connection;
    try {

        const { applicationid } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultAddressinfo = await connection.execute(`
        SELECT 
                X_CUST_MAPPING_EXT.APPLICATION_NUM,
                X_CUST_MAPPING_EXT.NET_FINANCE,
                X_CUST_MAPPING_EXT.MONTHLY,
                X_CUST_MAPPING_EXT.RATE_CHARGE,
                X_CUST_MAPPING_EXT.TERM,
                X_SAMM_CONTRACT.FIRST_DUE,
                -- X_PRODUCT_DETAIL.PRODUCT_CODE,
                X_PRODUCT_DETAIL.BRAND_CODE,
                X_PRODUCT_DETAIL.MODELCODE,
                BTW.F_GET_MODEL_NAME (X_PRODUCT_DETAIL.BRAND_CODE,X_PRODUCT_DETAIL.MODELCODE)  AS MODEL_NAME,
                X_CUST_MAPPING_EXT.INSURANCE_YEARS,
                X_INSURER_INFO.INSURER_NAME,
                BTW.GET_FACTORY_PRICE(X_PRODUCT_DETAIL.PRODUCT_CODE,X_PRODUCT_DETAIL.BRAND_CODE,X_PRODUCT_DETAIL.MODELCODE) AS TL_T1,
                X_CUST_MAPPING_EXT.COVERAGE_TOTAL_LOSS
            FROM btw.X_CUST_MAPPING_EXT,btw.X_SAMM_CONTRACT, btw.X_PRODUCT_DETAIL,btw.X_INSURANCE,btw.X_INSURER_INFO
            WHERE (X_CUST_MAPPING_EXT.APPLICATION_NUM =X_SAMM_CONTRACT.APPLICATION_NUM)
            AND (X_CUST_MAPPING_EXT.APPLICATION_NUM =X_PRODUCT_DETAIL.APPLICATION_NUM)
            AND (X_CUST_MAPPING_EXT.INSURANCE_CODE   =   X_INSURANCE.INSURANCE_CODE)
            AND (X_INSURANCE.INSURER_CODE = X_INSURER_INFO.INSURER_CODE)
            AND X_CUST_MAPPING_EXT.LOAN_RESULT='Y'
            AND  X_CUST_MAPPING_EXT.APPLICATION_NUM = :applicationid
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })


        if (resultAddressinfo.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ insurance detail (not found record)`,
                data: []
            })
        } else {
            const resData = resultAddressinfo.rows

            let lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: `Success`,
                data: lowerResData
            })
        }

    } catch (e) {

        console.error(e)
        return res.status(200).send({
            status: 500,
            message: `เกิดข้อผิดพลาดในการหาค่า latitude, longtitude ในระบบ : ${e.message ? e.message : 'No return message'}`
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

async function updatedraft(req, res, next) {

    // ==== savedraft api is use createquotation that send typecase == 'P' in formData.item ====
    // === already log4js ===

    let connection;
    const logger = log4js.getLogger("update");
    try {

        let app_no
        let e_paper = ''
        let e_paper_new_field = 'N'
        let e_doc_status = ''
        let sms_send_status = ''
        let quo_status = ''
        let checker_code = ''
        console.log(`trigger start`)
        let imageCheckCode = [];
        const token = req.user
        const userid = token.ID
        // === chaanal type (25/05/2022) ===
        const channal = token.channal
        let channalstamp = ''

        if (channal) {
            switch (token.channal) {
                case 'checker': {
                    channalstamp = 'C'
                }
                    break;
                case 'dealer': {
                    channalstamp = 'S'
                }
            }
        }
        console.log(`chaanal : ${channalstamp}`)

        // === Get data on multipart/form-data ===  
        let fileData
        let formData
        // const form = formidable({ multiples: true })
        const form = new multiparty.Form()
        await new Promise(function (resolve, reject) {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err)
                    return
                }
                formData = fields
                fileData = files
                resolve()
            })
            return
        })

        const parseFormdata = JSON.parse(formData.item)
        const {
            quotationid,
            living_place_id,
            contact_place_id,
            house_regis_place_id,
            work_place_id,
            credit_id,
            career_id,
            purpose_id,
            consent_id,
            is_new_sig_image,
            is_new_witness_sig_image,
            no_update_credit,
            lalon, la, lon, idcard_num, phone_number, ciz_email, title_code, title_name, first_name, birth_date,
            last_name, birth_date_thai, birth_date_eng, ciz_issued_date, ciz_expired_date,
            ciz_issued_date_text, ciz_expired_date_text, ciz_issued_place, ciz_address,
            ciz_sub_district, ciz_district, ciz_province_name, ciz_province_code, ciz_postal_code,
            liv_address, liv_sub_district, liv_district, liv_province_name, liv_province_code, liv_postal_code,
            cont_address, cont_sub_district, cont_district, cont_province_name, cont_province_code, cont_postal_code,
            work_address, work_sub_district, work_district, work_province_name, work_province_code, work_postal_code,
            brand_code, brand_name, model_code, model_name, color_code, color_name, loan_amount,
            product_value, down_payment, interest_rate, payment_value, payment_round_count,
            main_career_name, main_career_code, main_workplace_name, main_position, main_department,
            main_experience_year, main_experience_month, main_salary_per_month, main_salary_per_day,
            main_leader_name, main_work_per_week, is_sub_career,
            sub_career_name, sub_career_code, sub_workplace_name, sub_position, sub_department,
            sub_experience_year, sub_experience_month, sub_salary_per_month, sub_salary_per_day,
            sub_leader_name, sub_work_per_week,
            consent_customer_name, consent_first_name, consent_last_name, is_disclosure_consent,
            is_personal_disclosure_consent, is_credit_consent, is_final_consent,
            purpose_buy, purpose_buy_name, reason_buy, reason_buy_etc, car_user, car_user_name,
            car_user_relation, car_user_name_2, car_user_citizen_id, car_user_home_no,
            car_user_home_name, car_user_room_no, car_user_floor, car_user_soi, car_user_moo,
            car_user_road, car_user_sub_district, car_user_district, car_user_province_name,
            car_user_province_code, car_user_postal_code, car_user_phone_no,
            first_referral_fullname, first_referral_house_no, first_referral_moo, first_referral_house_name,
            first_referral_room_no, first_referral_floor, first_referral_soi, first_referral_road,
            first_referral_sub_district, first_referral_district, first_referral_province_name,
            first_referral_province_code, first_referral_postal_code, first_referral_phone_no, first_referral_relation,
            second_referral_fullname, second_referral_house_no, second_referral_moo, second_referral_house_name,
            second_referral_room_no, second_referral_floor, second_referral_soi, second_referral_road,
            second_referral_sub_district, second_referral_district, second_referral_province_name,
            second_referral_province_code, second_referral_postal_code, second_referral_phone_no, second_referral_relation,
            citizenid_image_name, houseregis_image_name, face_image_name, hosue_image_name, store_image_name,
            salarycertificate_image_name, workcertificate_image_name, salarypayment_image_namem, bookbank_image_name, motocycle_image_name,
            citizenid_image_type, houseregis_image_type, face_image_type, hosue_image_type, store_image_type,
            salarycertificate_image_type, workcertificate_image_type, salarypayment_image_typem, bookbank_image_type, motocycle_image_type,
            insurer_code, insurer_name, insurance_code, insurance_name, insurance_year, insurance_plan_price, is_include_loanamount, factory_price, size_model,
            iap_check, iap_address, iap_detection_score, iap_district, iap_en_dob, iap_en_expire, iap_en_fname, iap_en_init, iap_en_issue, iap_en_lname,
            iap_en_name, iap_error_message, iap_face_buffer, iap_gender, iap_home_address, iap_id_number, iap_postal_code, iap_process_time, iap_province,
            iap_religion, iap_request_id, iap_sub_district, iap_th_dob, iap_th_expire, iap_th_fname, iap_th_init, iap_th_issue, iap_th_lname, iap_th_name,
            identity_approve_consent_value, motor_insurance_consent_value, nmotor_insurance_consent_value,
            analyze_consent_value, info_consent_value, info_party_consent_value, analyze_party_consent_value,
            prdt_info_party_consent_value, followup_consent_value, info_develop_consent_value,
            e_paper_consent_value,
            cizcard_image,
            // === add house regis place (25/08/2022) ===
            hrp_address, hrp_sub_district, hrp_district, hrp_province_name, hrp_province_code, hrp_postal_code,
            // === new field for total loss (29/08/2022) ===
            coverage_total_loss, max_ltv, price_include_vat, engine_number, chassis_number,
            engine_no_running, chassis_no_running, sl_code, ciz_gender,
            // === add field (nickname, maried status, stayed year, stayed month, house type , house owner typed) (15/11/2022) ===
            nickname, maried_status, house_type, stayed_month, stayed_year, house_owner_type
        } = parseFormdata

        console.log(`quotationid: ${quotationid}`)

        let birth_date_eng_dtype = null
        let ciz_issued_date_dtype = null
        let ciz_expired_date_dtype = null

        if (birth_date) {
            birth_date_eng_dtype = _util.convertstringtodate_date_field(birth_date)
        } else {
            if (birth_date_eng) {
                birth_date_eng_dtype = _util.convertstringtodate(birth_date_eng)
            }
        }
        if (ciz_issued_date_text) {
            // ciz_issued_date = moment(ciz_issued_date, 'yyyy/mm/dd hh24:mi:ss').toDate();
            ciz_issued_date_dtype = _util.convertstringtodate(ciz_issued_date_text)
        } else {
            if (ciz_issued_date) {
                ciz_issued_date_dtype = ciz_issued_date
            }
        }
        if (ciz_expired_date_text) {
            // ciz_expired_date = moment(ciz_expired_date, 'yyyy/mm/dd hh24:mi:ss').toDate();
            ciz_expired_date_dtype = _util.convertstringtodate(ciz_expired_date_text)
        } else {
            if (ciz_expired_date) {
                ciz_expired_date_dtype = ciz_expired_date
            }
        }

        // === check application number not contain data and get some data from record (17/06/2022) ==== 

        connection = await oracledb.getConnection(
            config.database
        )
        const resultChkValidate = await connection.execute(`
            SELECT APPLICATION_NUM, E_PAPER, QUO_STATUS, E_DOC_STATUS,
            SMS_SEND_STATUS, CHECKER_CODE FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        // === check result data quotation (20/10/2022) ===

        if (resultChkValidate.rows.length == 0) {
            logger.error(`user ${userid} : ไม่พบรายการตาม quotationid`)
            return res.status(400).send({
                status: 400,
                message: `ไม่พบรายการตาม quotationid `,
                data: []
            })
        }

        console.log(`this is resultChkValidate : ${JSON.stringify(resultChkValidate)}`)

        console.log(`application_num : ${resultChkValidate.rows[0].APPLICATION_NUM}`)

        // ==== map value to param when data return from record === 
        app_no = resultChkValidate.rows[0].APPLICATION_NUM
        e_paper = resultChkValidate.rows[0].E_PAPER
        e_doc_status = resultChkValidate.rows[0].E_DOC_STATUS
        sms_send_status = resultChkValidate.rows[0].SMS_SEND_STATUS
        quo_status = resultChkValidate.rows[0].QUO_STATUS
        checker_code = resultChkValidate.rows[0].CHECKER_CODE

        if (app_no != null) {

            logger.error(`user ${userid} , quotationid : ${quotationid} : (Record is in another stage, cant't update Data)`)
            console.log(`Record is in another stage, cant't update Dat`)
            return res.status(405).send({
                status: 405,
                message: `Record is in another stage, cant't update Data`,
                data: []
            })
        } else if (resultChkValidate.rows.length !== 1) {
            logger.error(`user ${userid} , quotationid : ${quotationid} : (เลขใบคำขอซ้ำในระบบ โปรดติดต่อเจ้าหน้าที่)`)
            console.log(`Invalid Record Duplicate`)
            return res.status(400).send({
                status: 400,
                message: `เลขใบคำขอซ้ำในระบบ โปรดติดต่อเจ้าหน้าที่`,
                data: []
            })
        } else {
            // === do next ===
            // ==== step 2 ====
            // ===== loop check recent upload image ====
            console.log(`trigger step 2`)
            try {

                const resultCheckRecent = await connection.execute(`
                SELECT IMAGE_CODE , APP_KEY_ID
                FROM MPLS_IMAGE_FILE WHERE IMGF_QUO_APP_KEY_ID = :quotationid
                `, {
                    quotationid: quotationid
                }, {
                    outFormat: oracledb.OBJECT
                })

                // === check =====
                if (resultCheckRecent.rows.length !== 0) {
                    for (let i = 0; i < resultCheckRecent.rows.length; i++) {
                        const obj = {}
                        obj["IMAGE_CODE"] = resultCheckRecent.rows[i].IMAGE_CODE;
                        obj["IMAGE_KEY"] = resultCheckRecent.rows[i].APP_KEY_ID;
                        imageCheckCode.push(obj)
                    }
                }

                console.log(`imageCheckCode : ${JSON.stringify(imageCheckCode)}`)

                // === update quotation with new image ===

            } catch (e) {
                logger.error(`user ${userid} , quotationid : ${quotationid} : Error between Check recent upload image. : ${e.message}`)
                return res.status(400).send({
                    status: 400,
                    message: `Error between Check recent upload image. : ${e.message ? e.message : `No message`}`,
                    data: []
                })
            }
        }

        if (app_no) {
            logger.error(`user ${userid} , quotationid : ${quotationid} : Invalid condition`)
            return res.status(400).send({
                status: 400,
                message: `Invalid condition`, // === เงื่่อนไขการบันทึกเคสไม่ถูกต้อง ===
                data: []
            })
        } else {
            // === do next ===


            // === get file form multipart-form-data === 

            const citizenid_image = fileData.citizenid_image ? fileData.citizenid_image : null
            const houseregis_image = fileData.houseregis_image ? fileData.houseregis_image : null
            const face_image = fileData.face_image ? fileData.face_image : null
            const house_image = fileData.house_image ? fileData.house_image : null
            const store_image = fileData.store_image ? fileData.store_image : null
            const salarycertificate_image = fileData.salarycertificate_image ? fileData.salarycertificate_image : null
            const workcertificate_image = fileData.workcertificate_image ? fileData.workcertificate_image : null
            const salarypayment_image = fileData.salarypayment_image ? fileData.salarypayment_image : null
            const bookbank_image = fileData.bookbank_image ? fileData.bookbank_image : null
            const motocyclelicense_image = fileData.motocyclelicense_image ? fileData.motocyclelicense_image : null
            const signature_image = fileData.signature_image ? fileData.signature_image : null
            const witness_image = fileData.witness_image ? fileData.witness_image : null

            // console.log('citizenid_image : ' + citizenid_image)

            imagetobuffer = (file) => {
                return fs.readFileSync(file[0].path);
            }
            var imageDataCreate = []; // ==== create new record image === 
            var imageDataUpdate = []; // ==== update record image ====

            const cititzenBuffer = citizenid_image ? imagetobuffer(citizenid_image) : null
            const houseregisBuffer = houseregis_image ? imagetobuffer(houseregis_image) : null
            const faceBuffer = face_image ? imagetobuffer(face_image) : null
            const hosueBuffer = house_image ? imagetobuffer(house_image) : null
            const storeBuffer = store_image ? imagetobuffer(store_image) : null
            const salarycertificateBuffer = salarycertificate_image ? imagetobuffer(salarycertificate_image) : null
            const workcertificateBuffer = workcertificate_image ? imagetobuffer(workcertificate_image) : null
            const salarypaymentBuffer = salarypayment_image ? imagetobuffer(salarypayment_image) : null
            const bookbankBuffer = bookbank_image ? imagetobuffer(bookbank_image) : null
            const motocyclelicenseBuffer = motocyclelicense_image ? imagetobuffer(motocyclelicense_image) : null
            const signatureBuffer = signature_image ? imagetobuffer(signature_image) : null
            const witnessBuffer = witness_image ? imagetobuffer(witness_image) : null


            genImagInfo = (fileinfo, file, code) => {


                const resultFilterCheck = imageCheckCode.find((items) => {
                    return items.IMAGE_CODE == code
                })

                if (!resultFilterCheck) {
                    console.log(`create`)
                    // === create new image list ==== 

                    // if (!imageCheckCode.includes(code)) {

                    let image = {}
                    const filename = fileinfo[0].fieldName
                    const filetype = fileinfo[0].headers['content-type']
                    const orifilename = fileinfo[0].originalFilename
                    const readfileimage = fs.readFileSync(fileinfo[0].path)
                    image.filename = filename
                    image.filetype = filetype
                    // image.orifilename = orifilename
                    image.keyid = uuidv4()
                    image.quokeyid = quotationid
                    image.status = 0
                    image.filedata = readfileimage
                    image.code = code
                    // console.log(`this is each image : ${JSON.stringify(image)}`)
                    imageDataCreate.push(image)
                } else {
                    console.log(`update`)
                    // ==== update image list ====
                    console.log(`record id : ${resultFilterCheck.IMAGE_KEY}`)
                    let image = {}
                    const filename = fileinfo[0].fieldName
                    const filetype = fileinfo[0].headers['content-type']
                    const orifilename = fileinfo[0].originalFilename
                    const readfileimage = fs.readFileSync(fileinfo[0].path)
                    // image.filename = filename
                    image.filetype = filetype
                    // image.orifilename = orifilename
                    // image.keyid = resultFilterCheck.IMAGE_KEY
                    image.quokeyid = quotationid
                    // image.status = 0
                    image.filedata = readfileimage
                    image.code = code
                    // console.log(`this is each image : ${JSON.stringify(image)}`)
                    imageDataUpdate.push(image)
                }
            }

            if (cititzenBuffer) await genImagInfo(citizenid_image, cititzenBuffer, '01');
            if (houseregisBuffer) await genImagInfo(houseregis_image, houseregisBuffer, '02');
            if (faceBuffer) await genImagInfo(face_image, faceBuffer, '03');
            if (hosueBuffer) await genImagInfo(house_image, hosueBuffer, '04');
            if (storeBuffer) await genImagInfo(store_image, storeBuffer, '05');
            if (salarycertificateBuffer) await genImagInfo(salarycertificate_image, salarycertificateBuffer, '06');
            if (workcertificateBuffer) await genImagInfo(workcertificate_image, workcertificateBuffer, '07');
            if (salarypaymentBuffer) await genImagInfo(salarypayment_image, salarypaymentBuffer, '08');
            if (bookbankBuffer) await genImagInfo(bookbank_image, bookbankBuffer, '09');
            if (motocyclelicenseBuffer) await genImagInfo(motocyclelicense_image, motocyclelicenseBuffer, '10');

            console.log(`imageDataCreate : ${imageDataCreate}`)
            console.log(`imageDataUpdate : ${imageDataUpdate}`)

            // ===== stage 3 ====== 
            // === *** sql mayexeute stage === 
            try {

                console.log(`length update : ${imageDataUpdate.length}`)

                if (imageDataUpdate.length !== 0) {

                    // --- Update ---
                    try {
                        const sqlupdate = `
                            UPDATE MPLS_IMAGE_FILE
                            SET IMAGE_FILE = :filedata,
                                IMAGE_TYPE = :filetype,
                                ACTIVE_STATUS = 'Y'
                            WHERE IMAGE_CODE = :code AND
                            IMGF_QUO_APP_KEY_ID = :quokeyid
                    `
                        const bindsUpdate = imageDataUpdate;

                        const options = {
                            bindDefs: {
                                filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                                filetype: { type: oracledb.STRING, maxSize: 200 },
                                code: { type: oracledb.STRING, maxSize: 4 },
                                quokeyid: { type: oracledb.STRING, maxSize: 50 }
                            }
                        }

                        const resultUpdateImage = await connection.executeMany(sqlupdate, bindsUpdate, options)

                        console.log(`sussecc update image attach file : ${resultUpdateImage.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : Can't update image record with error status: ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `Can't update image record with error status: ${e.message ? e.message : `no status`}`
                        })
                    }
                }

                console.log(`length create : ${imageDataCreate.length}`)

                if (imageDataCreate.length !== 0) {
                    // --- Insert ---

                    try {

                        const sqlInsert = `INSERT INTO MPLS_IMAGE_FILE (
                        IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                        IMAGE_CODE, IMAGE_FILE, STATUS, ACTIVE_STATUS)
                        VALUES (:quokeyid, :keyid, :filename, :filetype, 
                        :code, :filedata, :status, 'Y')`
                        const bindsInsert = imageDataCreate;

                        const options = {
                            bindDefs: {
                                quokeyid: { type: oracledb.STRING, maxSize: 50 },
                                keyid: { type: oracledb.STRING, maxSize: 50 },
                                filename: { type: oracledb.STRING, maxSize: 200 },
                                filetype: { type: oracledb.STRING, maxSize: 200 },
                                code: { type: oracledb.STRING, maxSize: 4 },
                                filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                                status: { type: oracledb.NUMBER }
                            }
                        }


                        const resultInsertImage = await connection.executeMany(sqlInsert, bindsInsert, options)

                        console.log(`sussecc insert image attach file : ${resultInsertImage.rowsAffected}`)

                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : อัพโหลดไฟล์ภาพไม่สำเร็จ: ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `อัพโหลดไฟล์ภาพไม่สำเร็จ : ${e.message ? e.message : `no status`}`
                        })
                    }

                    // === update quotation record (main column) ===

                }

                if (!app_no) {
                    // console.log(`quotation id is : ${quotationid}`)
                    try {

                        if (e_paper_consent_value) {
                            if (e_paper_consent_value == 1) {
                                e_paper_new_field = 'Y'
                            } else {
                                e_paper_new_field = 'N'
                            }
                        }

                        // === check cizcard_image (05/10/2022) ===

                        const sqlstr = `UPDATE MPLS_QUOTATION
                        SET QUO_STATUS = :QUO_STATUS,
                            E_DOC_STATUS = :E_DOC_STATUS,
                            SMS_SEND_STATUS = :SMS_SEND_STATUS,
                            CHECKER_CODE = :CHECKER_CODE,
                            IDCARD_NUM = :IDCARD_NUM,
                            PHONE_NUMBER = :PHONE_NUMBER,
                            EMAIL = :EMAIL,
                            TITLE_CODE = :TITLE_CODE,
                            TITLE_NAME = :TITLE_NAME,
                            FIRST_NAME = :FIRST_NAME,
                            LAST_NAME = :LAST_NAME,
                            BIRTH_DATE = :BIRTH_DATE,
                            BIRTH_DATE_TEXT_TH = :BIRTH_DATE_TEXT_TH,
                            BIRTH_DATE_TEXT_EN = :BIRTH_DATE_TEXT_EN,
                            CIZ_ISSUED_DATE = :CIZ_ISSUED_DATE,
                            CIZ_ISSUED_PLACE = :CIZ_ISSUED_PLACE,
                            CIZ_EXPIRED_DATE = :CIZ_EXPIRED_DATE,
                            CIZ_ADDRESS = :CIZ_ADDRESS,
                            CIZ_SUB_DISTRICT = :CIZ_SUB_DISTRICT,
                            CIZ_DISTRICT = :CIZ_DISTRICT,
                            CIZ_PROVINCE_NAME = :CIZ_PROVINCE_NAME,
                            CIZ_PROVINCE_CODE = :CIZ_PROVINCE_CODE,
                            CIZ_POSTAL_CODE = :CIZ_POSTAL_CODE,
                            SL_CODE = :SL_CODE,
                            E_PAPER = :E_PAPER_NEW_FIELD,
                            CIZ_GENDER = :CIZ_GENDER,
                            CIZ_NICKNAME = :CIZ_NICKNAME,
                                CIZ_HOUSE_TYPE = :CIZ_HOUSE_TYPE,
                                CIZ_HOUSE_OWNER_TYPE = :CIZ_HOUSE_OWNER_TYPE,
                                CIZ_STAYED_YEAR = :CIZ_STAYED_YEAR,
                                CIZ_STAYED_MONTH = :CIZ_STAYED_MONTH,
                                CIZ_MARIED_STATUS = :CIZ_MARIED_STATUS `
                        let bindstr = {
                            QUO_STATUS: quo_status,
                            E_DOC_STATUS: e_doc_status,
                            SMS_SEND_STATUS: sms_send_status,
                            CHECKER_CODE: checker_code,
                            IDCARD_NUM: idcard_num,
                            PHONE_NUMBER: phone_number,
                            EMAIL: ciz_email,
                            TITLE_CODE: title_code,
                            TITLE_NAME: title_name,
                            FIRST_NAME: first_name,
                            LAST_NAME: last_name,
                            BIRTH_DATE: (new Date(birth_date_eng_dtype)) ?? null,
                            BIRTH_DATE_TEXT_TH: birth_date_thai,
                            BIRTH_DATE_TEXT_EN: birth_date_eng,
                            CIZ_ISSUED_DATE: (new Date(ciz_issued_date_dtype)) ?? null,
                            CIZ_ISSUED_PLACE: ciz_issued_place,
                            CIZ_EXPIRED_DATE: (new Date(ciz_expired_date_dtype)) ?? null,
                            CIZ_ADDRESS: ciz_address,
                            CIZ_SUB_DISTRICT: ciz_sub_district,
                            CIZ_DISTRICT: ciz_district,
                            CIZ_PROVINCE_NAME: ciz_province_name,
                            CIZ_PROVINCE_CODE: ciz_province_code,
                            CIZ_POSTAL_CODE: ciz_postal_code,
                            SL_CODE: sl_code,
                            E_PAPER_NEW_FIELD: e_paper_new_field,
                            CIZ_GENDER: ciz_gender,
                            CIZ_NICKNAME: nickname,
                            CIZ_HOUSE_TYPE: house_type,
                            CIZ_HOUSE_OWNER_TYPE: house_owner_type,
                            CIZ_STAYED_YEAR: stayed_year,
                            CIZ_STAYED_MONTH: stayed_month,
                            CIZ_MARIED_STATUS: maried_status,
                            quotationid: quotationid
                        }
                        const sqlwhereconditionstr = `WHERE QUO_KEY_APP_ID = :quotationid`

                        let sqlcizcardimage = ''
                        let cizcard_array;
                        let cizcard_send;

                        if (cizcard_image !== '') {
                            cizcard_send = cizcard_image ? cizcard_array = Buffer.from(cizcard_image, "base64") : []
                            sqlcizcardimage = ` , CIZCARD_IMAGE = :CIZCARD_IMAGE `
                            bindstr.CIZCARD_IMAGE = cizcard_send
                        }


                        const allsqlstr = `${sqlstr}${sqlcizcardimage}${sqlwhereconditionstr}`

                        const update_quotation = await connection.execute(allsqlstr, bindstr, {})



                        console.log(`sussecc update quotation information : ${update_quotation.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลทั่วไป) ได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลทั่วไป) ได้ : ${e.message ? e.message : `No message`}`
                        })
                    }

                    // === update living place record ===
                    try {
                        const update_living_place = await connection.execute(`
                            UPDATE MPLS_LIVING_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE,
                                LATITUDE = :LATITUDE,
                                LONDTIUDE = :LONDTIUDE,
                                LALON = :LALON
                            WHERE APP_KEY_ID = :livingplaceid
                            `, {
                            ADDRESS: liv_address,
                            SUB_DISTRICT: liv_sub_district,
                            DISTRICT: liv_district,
                            PROVINCE_NAME: liv_province_name,
                            PROVINCE_CODE: liv_province_code,
                            POSTAL_CODE: liv_postal_code,
                            LATITUDE: la,
                            LONDTIUDE: lon,
                            LALON: lalon,
                            livingplaceid: living_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update living place : ${update_living_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : `No message`}`
                        })
                    }

                    // === update contact place record ==== 
                    try {
                        const update_contact_place = await connection.execute(`
                            UPDATE MPLS_CONTACT_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE
                            WHERE APP_KEY_ID = :contactplace
                            `, {
                            ADDRESS: cont_address,
                            SUB_DISTRICT: cont_sub_district,
                            DISTRICT: cont_district,
                            PROVINCE_NAME: cont_province_name,
                            PROVINCE_CODE: cont_province_code,
                            POSTAL_CODE: cont_postal_code,
                            contactplace: contact_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update contact place : ${update_contact_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้ : ${e.message ? e.message : `No message`}`
                        })
                    }

                    // === update house regis place record ==== 
                    try {
                        const update_house_regis_place = await connection.execute(`
                            UPDATE MPLS_HOUSE_REGIS_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE
                            WHERE APP_KEY_ID = :houseregisplace
                            `, {
                            ADDRESS: hrp_address,
                            SUB_DISTRICT: hrp_sub_district,
                            DISTRICT: hrp_district,
                            PROVINCE_NAME: hrp_province_name,
                            PROVINCE_CODE: hrp_province_code,
                            POSTAL_CODE: hrp_postal_code,
                            houseregisplace: house_regis_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update house regis place : ${update_house_regis_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่ตามทะเบียนบ้านได้) ได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่ตามทะเบียนบ้านได้) ได้ : ${e.message ? e.message : `No message`}`
                        })
                    }

                    // === update work place record ==== 
                    try {
                        const update_work_place = await connection.execute(`
                            UPDATE MPLS_WORK_PLACE
                            SET ADDRESS = :ADDRESS,
                                SUB_DISTRICT = :SUB_DISTRICT,
                                DISTRICT = :DISTRICT,
                                PROVINCE_NAME = :PROVINCE_NAME,
                                PROVINCE_CODE = :PROVINCE_CODE,
                                POSTAL_CODE = :POSTAL_CODE
                            WHERE APP_KEY_ID = :workplaceid
                            `, {
                            ADDRESS: work_address,
                            SUB_DISTRICT: work_sub_district,
                            DISTRICT: work_district,
                            PROVINCE_NAME: work_province_name,
                            PROVINCE_CODE: work_province_code,
                            POSTAL_CODE: work_postal_code,
                            workplaceid: work_place_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update work place : ${update_work_place.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่ทำงาน) ได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่ทำงาน) ได้ : ${e.message ? e.message : `No message`}`
                        })
                    }

                    // === update credit record ==== 
                    if (!no_update_credit) {
                        try {
                            const update_credit = await connection.execute(`
                                UPDATE MPLS_CREDIT 
                                SET BRAND_CODE = :BRAND_CODE,
                                    BRAND_NAME = :BRAND_NAME,
                                    MODEL_CODE = :MODEL_CODE,
                                    MODEL_NAME = :MODEL_NAME,
                                    COLOR_CODE = :COLOR_CODE,
                                    COLOR_NAME = :COLOR_NAME,
                                    LOAN_AMOUNT = :LOAN_AMOUNT,
                                    PRODUCT_VALUE = :PRODUCT_VALUE,
                                    DOWN_PAYMENT = :DOWN_PAYMENT,
                                    INTEREST_RATE = :INTEREST_RATE,
                                    PAYMENT_VALUE = :PAYMENT_VALUE,
                                    PAYMENT_ROUND_COUNT = :PAYMENT_ROUND_COUNT,
                                    INSURER_CODE = :INSURER_CODE,
                                    INSURER_NAME = :INSURER_NAME,
                                    INSURANCE_CODE = :INSURANCE_CODE,
                                    INSURANCE_NAME = :INSURANCE_NAME,
                                    INSURANCE_YEAR = :INSURANCE_YEAR,
                                    INSURANCE_PLAN_PRICE = :INSURANCE_PLAN_PRICE,
                                    IS_INCLUDE_LOANAMOUNT = :IS_INCLUDE_LOANAMOUNT,
                                    FACTORY_PRICE = :FACTORY_PRICE,
                                    SIZE_MODEL = :SIZE_MODEL,
                                    COVERAGE_TOTAL_LOSS = :COVERAGE_TOTAL_LOSS,
                                    MAX_LTV = :MAX_LTV,
                                    PRICE_INCLUDE_VAT = :PRICE_INCLUDE_VAT,
                                    ENGINE_NUMBER = :ENGINE_NUMBER,
                                    CHASSIS_NUMBER = :CHASSIS_NUMBER,
                                    ENGINE_NO_RUNNING = :ENGINE_NO_RUNNING,
                                    CHASSIS_NO_RUNNING = :CHASSIS_NO_RUNNING
                                WHERE APP_KEY_ID = :creditid
                                `, {
                                BRAND_CODE: brand_code,
                                BRAND_NAME: brand_name,
                                MODEL_CODE: model_code,
                                MODEL_NAME: model_name,
                                COLOR_CODE: color_code,
                                COLOR_NAME: color_name,
                                LOAN_AMOUNT: loan_amount,
                                PRODUCT_VALUE: product_value,
                                DOWN_PAYMENT: down_payment,
                                INTEREST_RATE: interest_rate,
                                PAYMENT_VALUE: payment_value,
                                PAYMENT_ROUND_COUNT: payment_round_count,
                                INSURER_CODE: insurer_code,
                                INSURER_NAME: insurer_name,
                                INSURANCE_CODE: insurance_code,
                                INSURANCE_NAME: insurance_name,
                                INSURANCE_YEAR: insurance_year,
                                INSURANCE_PLAN_PRICE: insurance_plan_price,
                                IS_INCLUDE_LOANAMOUNT: is_include_loanamount,
                                FACTORY_PRICE: factory_price,
                                SIZE_MODEL: size_model,
                                COVERAGE_TOTAL_LOSS: coverage_total_loss,
                                MAX_LTV: max_ltv,
                                PRICE_INCLUDE_VAT: price_include_vat,
                                ENGINE_NUMBER: engine_number,
                                CHASSIS_NUMBER: chassis_number,
                                ENGINE_NO_RUNNING: engine_no_running,
                                CHASSIS_NO_RUNNING: chassis_no_running,
                                creditid: credit_id
                            }, {
                                outFormat: oracledb.OBJECT
                            })

                            console.log(`sussecc update credit : ${update_credit.rowsAffected}`)

                        } catch (e) {
                            console.error(e)
                            logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (ข้อมูลอาชีพ) ได้ : ${e.message ? e.message : `no status`}`)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (ข้อมูลอาชีพ) ได้ : ${e.message ? e.message : `No message`}`
                            })
                        }
                    } else {
                        console.log(`didn't update credit record`)
                    }
                    // === update career record ==== 
                    try {
                        const update_career = await connection.execute(`
                            UPDATE MPLS_CAREER
                            SET MAIN_CAREER_NAME = :MAIN_CAREER_NAME,
                                MAIN_CAREER_CODE = :MAIN_CAREER_CODE,
                                MAIN_WORKPLACE_NAME = :MAIN_WORKPLACE_NAME,
                                MAIN_POSITION = :MAIN_POSITION,
                                MAIN_DEPARTMENT = :MAIN_DEPARTMENT,
                                MAIN_EXPERIENCE_YEAR = :MAIN_EXPERIENCE_YEAR,
                                MAIN_EXPERIENCE_MONTH = :MAIN_EXPERIENCE_MONTH,
                                MAIN_SALARY_PER_MONTH = :MAIN_SALARY_PER_MONTH,
                                MAIN_SALARY_PER_DAY = :MAIN_SALARY_PER_DAY,
                                MAIN_LEADER_NAME = :MAIN_LEADER_NAME,
                                MAIN_WORK_PER_WEEK = :MAIN_WORK_PER_WEEK,
                                IS_SUB_CAREER = :IS_SUB_CAREER,
                                SUB_CAREER_NAME = :SUB_CAREER_NAME,
                                SUB_CAREER_CODE = :SUB_CAREER_CODE,
                                SUB_WORKPLACE_NAME = :SUB_WORKPLACE_NAME,
                                SUB_POSITION = :SUB_POSITION,
                                SUB_DEPARTMENT = :SUB_DEPARTMENT,
                                SUB_EXPERIENCE_YEAR = :SUB_EXPERIENCE_YEAR,
                                SUB_EXPERIENCE_MONTH = :SUB_EXPERIENCE_MONTH,
                                SUB_SALARY_PER_MONTH = :SUB_SALARY_PER_MONTH,
                                SUB_SALARY_PER_DAY = :SUB_SALARY_PER_DAY,
                                SUB_LEADER_NAME = :SUB_LEADER_NAME,
                                SUB_WORK_PER_WEEK = :SUB_WORK_PER_WEEK
                            WHERE APP_KEY_ID = :careerid
                            `, {
                            MAIN_CAREER_NAME: main_career_name,
                            MAIN_CAREER_CODE: main_career_code,
                            MAIN_WORKPLACE_NAME: main_workplace_name,
                            MAIN_POSITION: main_position,
                            MAIN_DEPARTMENT: main_department,
                            MAIN_EXPERIENCE_YEAR: main_experience_year,
                            MAIN_EXPERIENCE_MONTH: main_experience_month,
                            MAIN_SALARY_PER_MONTH: main_salary_per_month,
                            MAIN_SALARY_PER_DAY: main_salary_per_day,
                            MAIN_LEADER_NAME: main_leader_name,
                            MAIN_WORK_PER_WEEK: main_work_per_week,
                            IS_SUB_CAREER: is_sub_career,
                            SUB_CAREER_NAME: sub_career_name,
                            SUB_CAREER_CODE: sub_career_code,
                            SUB_WORKPLACE_NAME: sub_workplace_name,
                            SUB_POSITION: sub_position,
                            SUB_DEPARTMENT: sub_department,
                            SUB_EXPERIENCE_YEAR: sub_experience_year,
                            SUB_EXPERIENCE_MONTH: sub_experience_month,
                            SUB_SALARY_PER_MONTH: sub_salary_per_month,
                            SUB_SALARY_PER_DAY: sub_salary_per_day,
                            SUB_LEADER_NAME: sub_leader_name,
                            SUB_WORK_PER_WEEK: sub_work_per_week,
                            careerid: career_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update career : ${update_career.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้าข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อได้ : ${e.message ? e.message : `No message`}`
                        })
                    }
                    // === update purpose record ==== 
                    try {
                        const update_purpose = await connection.execute(`
                            UPDATE MPLS_PURPOSE
                            SET PURPOSE_OF_BUY  = :PURPOSE_OF_BUY, PURPOSE_OF_BUY_NAME  = :PURPOSE_OF_BUY_NAME, REASON_OF_BUY  = :REASON_OF_BUY,
                                REASON_OF_BUY_NAME  = :REASON_OF_BUY_NAME, CAR_USER  = :CAR_USER, CAR_USER_RELATION  = :CAR_USER_RELATION, CAR_USER_NAME = :CAR_USER_NAME, CAR_USER_FULLNAME  = :CAR_USER_FULLNAME, CAR_USER_CITIZENCARD_ID  = :CAR_USER_CITIZENCARD_ID,
                                CAR_USER_HOME_NO  = :CAR_USER_HOME_NO, CAR_USER_HOME_NAME  = :CAR_USER_HOME_NAME, CAR_USER_SOI  = :CAR_USER_SOI, CAR_USER_MOO  = :CAR_USER_MOO, CAR_USER_ROAD  = :CAR_USER_ROAD, CAR_USER_SUB_DISTRICT  = :CAR_USER_SUB_DISTRICT,
                                CAR_USER_DISTRICT  = : car_user_district, CAR_USER_PROVINCE_NAME  = : car_user_province_name, CAR_USER_PROVINCE_CODE  = : car_user_province_code, CAR_USER_POSTAL_CODE  = :CAR_USER_POSTAL_CODE, CAR_USER_ROOM_NO  = :CAR_USER_ROOM_NO,
                                CAR_USER_FLOOR  = :CAR_USER_FLOOR, CAR_USER_PHONENO  = :CAR_USER_PHONENO, FIRST_REFERRAL_FULLNAME  = :FIRST_REFERRAL_FULLNAME, FIRST_REFERRAL_HOUSE_NO  = :FIRST_REFERRAL_HOUSE_NO, FIRST_REFERRAL_MOO  = :FIRST_REFERRAL_MOO,
                                FIRST_REFERRAL_HOUSE_NAME  = :FIRST_REFERRAL_HOUSE_NAME, FIRST_REFERRAL_ROOM_NO  = :FIRST_REFERRAL_ROOM_NO, FIRST_REFERRAL_FLOOR  = :FIRST_REFERRAL_FLOOR, FIRST_REFERRAL_SOI  = :FIRST_REFERRAL_SOI, FIRST_REFERRAL_ROAD  = :FIRST_REFERRAL_ROAD,
                                FIRST_REFERRAL_SUB_DISTRICT  = :FIRST_REFERRAL_SUB_DISTRICT, FIRST_REFERRAL_DISTRICT  = :FIRST_REFERRAL_DISTRICT, FIRST_REFERRAL_PROVINCE_NAME  = :FIRST_REFERRAL_PROVINCE_NAME, FIRST_REFERRAL_PROVINCE_CODE  = :FIRST_REFERRAL_PROVINCE_CODE,
                                FIRST_REFERRAL_POSTAL_CODE  = :FIRST_REFERRAL_POSTAL_CODE, FIRST_REFERRAL_PHONENO  = :FIRST_REFERRAL_PHONENO, FIRST_REFERRAL_RELATION  = :FIRST_REFERRAL_RELATION, SECOND_REFERRAL_FULLNAME  = :SECOND_REFERRAL_FULLNAME, SECOND_REFERRAL_HOUSE_NO  = :SECOND_REFERRAL_HOUSE_NO,
                                SECOND_REFERRAL_MOO  = :SECOND_REFERRAL_MOO, SECOND_REFERRAL_HOUSE_NAME  = :SECOND_REFERRAL_HOUSE_NAME, SECOND_REFERRAL_ROOM_NO  = :SECOND_REFERRAL_ROOM_NO, SECOND_REFERRAL_FLOOR  = :SECOND_REFERRAL_FLOOR,
                                SECOND_REFERRAL_SOI  = :SECOND_REFERRAL_SOI, SECOND_REFERRAL_ROAD  = :SECOND_REFERRAL_ROAD, SECOND_REFERRAL_SUB_DISTRICT  = :SECOND_REFERRAL_SUB_DISTRICT, SECOND_REFERRAL_DISTRICT  = :SECOND_REFERRAL_DISTRICT,
                                SECOND_REFERRAL_PROVINCE_NAME  = :SECOND_REFERRAL_PROVINCE_NAME, SECOND_REFERRAL_PROVINCE_CODE  = :SECOND_REFERRAL_PROVINCE_CODE, SECOND_REFERRAL_POSTAL_CODE  = :SECOND_REFERRAL_POSTAL_CODE,
                                SECOND_REFERRAL_PHONENO  = :SECOND_REFERRAL_PHONENO, SECOND_REFERRAL_RELATION  = :SECOND_REFERRAL_RELATION
                            WHERE APP_KEY_ID = :purposeid
                            `, {
                            PURPOSE_OF_BUY: purpose_buy, PURPOSE_OF_BUY_NAME: purpose_buy_name, REASON_OF_BUY: reason_buy,
                            REASON_OF_BUY_NAME: reason_buy_etc, CAR_USER: car_user, CAR_USER_RELATION: car_user_relation, CAR_USER_NAME: car_user_name, CAR_USER_FULLNAME: car_user_name_2, CAR_USER_CITIZENCARD_ID: car_user_citizen_id,
                            CAR_USER_HOME_NO: car_user_home_no, CAR_USER_HOME_NAME: car_user_home_name, CAR_USER_SOI: car_user_soi, CAR_USER_MOO: car_user_moo, CAR_USER_ROAD: car_user_road, CAR_USER_SUB_DISTRICT: car_user_sub_district,
                            CAR_USER_DISTRICT: car_user_district, CAR_USER_PROVINCE_NAME: car_user_province_name, CAR_USER_PROVINCE_CODE: car_user_province_code, CAR_USER_POSTAL_CODE: car_user_postal_code, CAR_USER_ROOM_NO: car_user_room_no,
                            CAR_USER_FLOOR: car_user_floor, CAR_USER_PHONENO: car_user_phone_no, FIRST_REFERRAL_FULLNAME: first_referral_fullname, FIRST_REFERRAL_HOUSE_NO: first_referral_house_no, FIRST_REFERRAL_MOO: first_referral_moo,
                            FIRST_REFERRAL_HOUSE_NAME: first_referral_house_name, FIRST_REFERRAL_ROOM_NO: first_referral_room_no, FIRST_REFERRAL_FLOOR: first_referral_floor, FIRST_REFERRAL_SOI: first_referral_soi, FIRST_REFERRAL_ROAD: first_referral_road,
                            FIRST_REFERRAL_SUB_DISTRICT: first_referral_sub_district, FIRST_REFERRAL_DISTRICT: first_referral_district, FIRST_REFERRAL_PROVINCE_NAME: first_referral_province_name, FIRST_REFERRAL_PROVINCE_CODE: first_referral_province_code,
                            FIRST_REFERRAL_POSTAL_CODE: first_referral_postal_code, FIRST_REFERRAL_PHONENO: first_referral_phone_no, FIRST_REFERRAL_RELATION: first_referral_relation, SECOND_REFERRAL_FULLNAME: second_referral_fullname, SECOND_REFERRAL_HOUSE_NO: second_referral_house_no,
                            SECOND_REFERRAL_MOO: second_referral_moo, SECOND_REFERRAL_HOUSE_NAME: second_referral_house_name, SECOND_REFERRAL_ROOM_NO: second_referral_room_no, SECOND_REFERRAL_FLOOR: second_referral_floor,
                            SECOND_REFERRAL_SOI: second_referral_soi, SECOND_REFERRAL_ROAD: second_referral_road, SECOND_REFERRAL_SUB_DISTRICT: second_referral_sub_district, SECOND_REFERRAL_DISTRICT: second_referral_district,
                            SECOND_REFERRAL_PROVINCE_NAME: second_referral_province_name, SECOND_REFERRAL_PROVINCE_CODE: second_referral_province_code, SECOND_REFERRAL_POSTAL_CODE: second_referral_postal_code,
                            SECOND_REFERRAL_PHONENO: second_referral_phone_no, SECOND_REFERRAL_RELATION: second_referral_relation,
                            purposeid: purpose_id
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        console.log(`sussecc update purpose : ${update_purpose.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
                        logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (วัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง) ได้ : ${e.message ? e.message : `no status`}`)
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (วัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง) ได้ : ${e.message ? e.message : `No message`}`
                        })
                    }
                    // === update consent signature inage record ==== 

                    // console.log(`is_new_sig_image : ${is_new_sig_image}`)
                    // console.log(`is_new_witness_sig_image : ${is_new_witness_sig_image}`)

                    // === add step update new PDPA consent Value (27/07/2022) ===


                    // ==== add draft stage chekc here is update or create from recent (12/09/2022) ====

                    // **** Read ****
                    // ----- Detail when update draft first check is recent draft is already create consent record or not ? by check field 'is_disclosure_consent' send via item on client API ----

                    if (is_new_sig_image || is_new_witness_sig_image) {
                        try {
                            let sqlsig;
                            let bindparamsig;
                            if (is_new_sig_image) {
                                sqlsig = `UPDATE MPLS_CONSENT
                                            SET SIGNATURE_IMAGE = :SIGNATURE_IMAGE,
                                                IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                                MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                                NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                                ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                                INFO_CONSENT_VALUE = :info_consent_value,
                                                INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                                ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                                PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                                FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                                INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                                IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                            WHERE APP_KEY_ID = :consentid
                                            `
                                bindparamsig = {

                                    SIGNATURE_IMAGE: signatureBuffer,
                                    identity_approve_consent_value: identity_approve_consent_value,
                                    motor_insurance_consent_value: motor_insurance_consent_value,
                                    nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                    analyze_consent_value: analyze_consent_value,
                                    info_consent_value: info_consent_value,
                                    info_party_consent_value: info_party_consent_value,
                                    analyze_party_consent_value: analyze_party_consent_value,
                                    prdt_info_party_consent_value: prdt_info_party_consent_value,
                                    followup_consent_value: followup_consent_value,
                                    info_develop_consent_value: info_develop_consent_value,
                                    e_paper_consent_value: e_paper_consent_value,
                                    is_disclosure_consent: is_disclosure_consent,
                                    consentid: consent_id
                                }
                            }
                            if (is_new_witness_sig_image) {
                                sqlsig = `UPDATE MPLS_CONSENT
                                            SET WITNESS_IMAGE = :WITNESS_IMAGE,
                                                IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                                MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                                NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                                ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                                INFO_CONSENT_VALUE = :info_consent_value,
                                                INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                                ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                                PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                                FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                                INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                                IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                            WHERE APP_KEY_ID = :consentid
                                            `
                                bindparamsig = {

                                    WITNESS_IMAGE: witnessBuffer,
                                    identity_approve_consent_value: identity_approve_consent_value,
                                    motor_insurance_consent_value: motor_insurance_consent_value,
                                    nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                    analyze_consent_value: analyze_consent_value,
                                    info_consent_value: info_consent_value,
                                    info_party_consent_value: info_party_consent_value,
                                    analyze_party_consent_value: analyze_party_consent_value,
                                    prdt_info_party_consent_value: prdt_info_party_consent_value,
                                    followup_consent_value: followup_consent_value,
                                    info_develop_consent_value: info_develop_consent_value,
                                    e_paper_consent_value: e_paper_consent_value,
                                    is_disclosure_consent: is_disclosure_consent,
                                    consentid: consent_id
                                }
                            }
                            if (is_new_sig_image && is_new_witness_sig_image) {
                                sqlsig = `UPDATE MPLS_CONSENT
                                        SET SIGNATURE_IMAGE = :SIGNATURE_IMAGE,
                                            WITNESS_IMAGE = :WITNESS_IMAGE,
                                            IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                            MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                            NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                            ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                            INFO_CONSENT_VALUE = :info_consent_value,
                                            INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                            ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                            PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                            FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                            INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                            E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                            IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                        WHERE APP_KEY_ID = :consentid
                                `
                                bindparamsig = {

                                    SIGNATURE_IMAGE: signatureBuffer,
                                    WITNESS_IMAGE: witnessBuffer,
                                    identity_approve_consent_value: identity_approve_consent_value,
                                    motor_insurance_consent_value: motor_insurance_consent_value,
                                    nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                    analyze_consent_value: analyze_consent_value,
                                    info_consent_value: info_consent_value,
                                    info_party_consent_value: info_party_consent_value,
                                    analyze_party_consent_value: analyze_party_consent_value,
                                    prdt_info_party_consent_value: prdt_info_party_consent_value,
                                    followup_consent_value: followup_consent_value,
                                    info_develop_consent_value: info_develop_consent_value,
                                    e_paper_consent_value: e_paper_consent_value,
                                    is_disclosure_consent: is_disclosure_consent,
                                    consentid: consent_id
                                }

                                // console.log(`sqlsig : ${sqlsig}`)
                                // console.log(`bindparamsig : ${JSON.stringify(bindparamsig)}`)
                            }

                            const update_consent = await connection.execute(sqlsig, bindparamsig, { outFormat: oracledb.OBJECT })

                            console.log(`sussecc update consent (update draft) : ${update_consent.rowsAffected}`)
                        } catch (e) {
                            console.error(e)
                            logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (รูปภาพลายเซ็นต์หรือ PDPA) : ${e.message ? e.message : `no status`}`)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (รูปภาพลายเซ็นต์หรือ PDPA) : ${e.message ? e.message : `No message`}`
                            })
                        }
                    } else {
                        console.log(`didn't update new signature (customer sig, or witness sig)`)

                        // === Add update new PDPA field consent (21/07/2022) === 
                        try {
                            let sqlsig;
                            let bindparamsig;
                            sqlsig = `UPDATE MPLS_CONSENT
                                            SET IDENTITY_APPROVE_CONSENT_VALUE = :identity_approve_consent_value,
                                                MOTOR_INSURANCE_CONSENT_VALUE = :motor_insurance_consent_value,
                                                NMOTOR_INSURANCE_CONSENT_VALUE = :nmotor_insurance_consent_value,
                                                ANALYZE_CONSENT_VALUE = :analyze_consent_value,
                                                INFO_CONSENT_VALUE = :info_consent_value,
                                                INFO_PARTY_CONSENT_VALUE = :info_party_consent_value,
                                                ANALYZE_PARTY_CONSENT_VALUE = :analyze_party_consent_value,
                                                PRDT_INFO_PARTY_CONSENT_VALUE = :prdt_info_party_consent_value,
                                                FOLLOWUP_CONSENT_VALUE = :followup_consent_value,
                                                INFO_DEVELOP_CONSENT_VALUE = :info_develop_consent_value,
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value,
                                                IS_DISCLOSURE_CONSENT = :is_disclosure_consent
                                            WHERE APP_KEY_ID = :consentid
                                            `
                            bindparamsig = {
                                identity_approve_consent_value: identity_approve_consent_value,
                                motor_insurance_consent_value: motor_insurance_consent_value,
                                nmotor_insurance_consent_value: nmotor_insurance_consent_value,
                                analyze_consent_value: analyze_consent_value,
                                info_consent_value: info_consent_value,
                                info_party_consent_value: info_party_consent_value,
                                analyze_party_consent_value: analyze_party_consent_value,
                                prdt_info_party_consent_value: prdt_info_party_consent_value,
                                followup_consent_value: followup_consent_value,
                                info_develop_consent_value: info_develop_consent_value,
                                e_paper_consent_value: e_paper_consent_value,
                                is_disclosure_consent: is_disclosure_consent,
                                consentid: consent_id
                            }
                            const update_consent = await connection.execute(sqlsig, bindparamsig, { outFormat: oracledb.OBJECT })

                            console.log(`sussecc update consent (PDPA consent only) : ${update_consent.rowsAffected}`)
                        } catch (e) {
                            console.error(e)
                            logger.error(`user ${userid} , quotationid : ${quotationid} : ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (PDPA only) : ${e.message ? e.message : `no status`}`)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (PDPA only) : ${e.message ? e.message : `No message`}`
                            })
                        }
                    }

                    // ==== end all schema update === 
                }




                // ===***commit stage ***====
                const commitall = await connection.commit();

                try {
                    commitall
                } catch (e) {
                    logger.error(`user ${userid} , quotationid : ${quotationid} : commit fail : ${e.message ? e.message : `no status`}`)
                    console.err(e.message)
                    res.send(404).send(e.message)
                }

                // === End ===
                const sqlstring_getquotationkeyid = `SELECT * FROM MPLS_QUOTATION WHERE QUO_KEY_APP_ID = '${quotationid}'`
                const resultQuotation = await connection.execute(sqlstring_getquotationkeyid, [],
                    {
                        outFormat: oracledb.OBJECT
                    })

                if (resultQuotation) {

                    if (resultQuotation.rows.length == 0) {
                        logger.error(`user ${userid} , quotationid : ${quotationid} : No quotation Record`)
                        const noresultFormatJson = {
                            status: 400,
                            message: 'No quotation Record'
                        }
                        res.status(201).send(noresultFormatJson)
                    } else {
                        let resData = resultQuotation.rows
                        const lowerResData = tolowerService.arrayobjtolower(resData)
                        let returnData = new Object
                        returnData.data = lowerResData
                        returnData.status = 200
                        returnData.message = 'success'
                        // === tran all upperCase to lowerCase === 
                        let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                            result[key.toLowerCase()] = val;
                        });
                        res.status(200).json(returnDatalowerCase);
                    }
                } else {
                    logger.error(`user ${userid} , quotationid : ${quotationid} : Can't find record quotation id after select`)
                    return res.status(400).send({
                        status: 400,
                        message: `Can't find record quotation id after select`,
                        data: []
                    })
                }

            } catch (e) {
                logger.error(`user ${userid} , quotationid : ${quotationid} : Error between execute image data : ${e.message ? e.message : ''}`)
                return res.status(400).send({
                    status: 400,
                    message: `Error between execute image data : ${e.message ? e.message : 'no message'}`,
                    data: []
                })
            }
        }
    } catch (e) {
        logger.error(`Error out of valid : ${e.message ? e.message : 'No return message'}`)
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

async function checkimagetype(quotationid) {
    // === add require image from type '09' and '10' on (28/10/2022) ====
    let connection;
    try {
        if (quotationid) {
            // === check imagetyper array with sql function
            connection = await oracledb.getConnection(
                config.database
            )
            const resultcheckimagetype = await connection.execute(`
                SELECT GET_CHECK_IMAGE_TYPE_REQUIRE(:quotationid) AS VALUE FROM DUAL
            `, {
                quotationid: quotationid
            }, {
                outFormat: oracledb.OBJECT
            })


            const resData = resultcheckimagetype.rows[0]

            return resData.VALUE ? resData.VALUE : ''

        } else {
            return ''
        }
    } catch (e) {
        console.error(e)
        return (e)
    } finally {
        if (connection) {
            try {
                await connection.close()
            } catch (e) {
                console.error(e)
                return (e)
            }
        }
    }

}

async function checkimagerequire(req, res, next) {

    let connection;
    try {

        let { quotationid } = req.query

        if (!quotationid) {
            return res.status(400).send({
                status: 400,
                message: `no quotationid`,
                data: []
            })
        }
        // === check imagetyper array with sql function
        connection = await oracledb.getConnection(
            config.database
        )
        const resultcheckimagetype = await connection.execute(`
            SELECT GET_CHECK_IMAGE_TYPE_REQUIRE(:quotationid) AS VALUE FROM DUAL
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })


        const resData = resultcheckimagetype.rows[0]

        return res.status(200).send({
            status: 200,
            message: `success`,
            data: resData
        })
    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : `No message`}`,
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

async function getdopastatusbyid(req, res, next) {

    let connection;
    try {

        let { quotationid } = req.query

        if (!quotationid) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบค่า quotationid`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const resultdopastatus = await connection.execute(`
                select mplq.first_name, mplq.last_name, dcl.* from
                mpls_quotation mplq 
                inner join dipchip_card_reader_dopa_log dcl
                on mplq.dipchip_uuid = dcl.uuid
                where mplq.quo_key_app_id = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultdopastatus.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการตรวจบัตรตาม quotationid`,
                data: []
            })
        }

        // === return value === 
        const resData = resultdopastatus.rows
        const lowerResData = tolowerService.arrayobjtolower(resData)
        return res.status(200).send({
            status: 200,
            message: 'success',
            data: lowerResData
        })



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

module.exports.getquotationlist = getquotationlist
module.exports.createquotation = createQuotation
module.exports.getquotationbyid = getquotationbyid
module.exports.updateQuotationImage = updateQuotationImage
module.exports.updateQuotationImageonlyinsert = updateQuotationImageonlyinsert
module.exports.activeEpaper = activeEpaper
module.exports.canclequotation = canclequotation
module.exports.getinsurancedetailbyid = getinsurancedetailbyid
module.exports.updatedraft = updatedraft
module.exports.checkimagerequire = checkimagerequire
module.exports.getdopastatusbyid = getdopastatusbyid
