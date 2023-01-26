const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
// const formidable = require('formidable');
var multiparty = require('multiparty');
// const { result } = require('lodash');
// const fs = require('fs');
// var util = require('util');
const _util = require('./_selfutil');
const { result } = require('lodash');
const e = require('cors');
var JsBarcode = require('jsbarcode');
var QRCode = require('qrcode')
var Canvas = require("canvas")

// async function getcontractlist(req, res, next) {
//     let connection;
//     try {
//         // let cust_id = [];
//         const { pageno, name, surname, applicationid } = req.query

//         const indexstart = (pageno - 1) * 5 + 1
//         const indexend = (pageno * 5)
//         let rowCount;

//         // === GETUSER ID AND CHANNAL_TYPE (25/05/2022) ===
//         const token = req.user
//         const userid = token.ID
//         const radmin = token.radmin

//         connection = await oracledb.getConnection(
//             config.database
//         )

//         let finishsql;
//         let bindparams = {};
//         let queryname = ''
//         let querysurname = ''
//         let queryappid = ''
//         // ==== build query string form execute ====
//         const sqlbase = `SELECT COUNT (AP.HP_NO) AS COUNT
//                             FROM BTW.AC_PROVE AP
//                             LEFT JOIN BTW.CUST_INFO CI
//                             ON AP.CUST_NO_0 = CI.CUST_NO
//                             LEFT JOIN
//                             (
//                             SELECT quo.application_num,LP.ADDRESS, lp.LATITUDE, lp.LONDTIUDE  from
//                             mpls_quotation quo
//                             LEFT JOIN mpls_living_place lp
//                             ON QUO.QUO_LIVING_PLACE_ID = lp.app_key_id
//                             ) QUO
//                             ON AP.HP_NO = QUO.APPLICATION_NUM
//                         `
//         if (name) {
//             queryname = ` WHERE CI.NAME LIKE :custname`
//             bindparams.custname = `${name}%`
//         }
//         if (surname) {

//             if (!name) {
//                 querysurname = ` WHERE CI.SNAME LIKE :surname`
//             } else {
//                 querysurname = ` AND CI.SNAME LIKE :surname`
//             }

//             bindparams.surname = `${surname}%`
//         }

//         if (applicationid) {

//             if (!(name || surname)) {
//                 queryappid = ` WHERE AP.HP_NO = :applicationid`
//             } else {
//                 queryappid = ` AND AP.HP_NO = :applicationid`
//             }

//             bindparams.applicationid = applicationid

//         }

//         finishsql = `${sqlbase}${queryname}${querysurname}${queryappid}`

//         console.log(`finishsql : ${finishsql}`)
//         console.log(`bindparams : ${JSON.stringify(bindparams)}`)

//         const resultcontractcount = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

//         if (resultcontractcount.rows[0].count == 0) {
//             return res.status(200).send({
//                 status: 200,
//                 message: 'NO RECORD FOUND',
//                 data: []
//             })
//         } else {
//             // const resData = resultnego.rows
//             // const lowerResData = tolowerService.arrayobjtolower(resData)
//             // return res.status(200).send({
//             //     status: 200,
//             //     message: 'success',
//             //     data: lowerResData
//             // })
//             try {

//                 let finishsqlrecord;
//                 // === get record of negotiation === 
//                 rowCount = resultcontractcount.rows[0].COUNT

//                 bindparams.indexstart = indexstart
//                 bindparams.indexend = indexend

//                 const basesql = `SELECT AP.HP_NO, AP.MONTHLY, AP.FIRST_DUE, AP.PERIOD, CIM.WILL_PAY_AMT, CIM.WILL_PAY_INST,
//                 CI.NAME, CI.SNAME , QUO.LATITUDE, QUO.LONDTIUDE, 
//                 QUO.ADDRESS , ROW_NUMBER() OVER (ORDER BY HP_NO ASC) LINE_NUMBER
//                 FROM BTW.AC_PROVE AP
//                 LEFT JOIN BTW.CUST_INFO CI
//                 ON AP.CUST_NO_0 = CI.CUST_NO
//                 LEFT JOIN
//                 (
//                 SELECT quo.application_num,LP.ADDRESS, lp.LATITUDE, lp.LONDTIUDE  from
//                 mpls_quotation quo
//                 LEFT JOIN mpls_living_place lp
//                 ON QUO.QUO_LIVING_PLACE_ID = lp.app_key_id
//                 ) QUO
//                 ON AP.HP_NO = QUO.APPLICATION_NUM
//                 LEFT JOIN COLL_INFO_MONTHLY CIM
//                 ON AP.HP_NO = CIM.HP_NO
//                 `

//                 finishsqlrecord = `select * from(
//                     ${basesql}${queryname}${querysurname}${queryappid}
//                     )WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
//                     `
//                 console.log(`finishsqlrecord : ${finishsqlrecord}`)

//                 const resultList = await connection.execute(finishsqlrecord, bindparams, { outFormat: oracledb.OBJECT })

//                 if (resultList.rows.length == 0) {
//                     return res.status(404).send({
//                         status: 404,
//                         message: 'No negotaiation record',
//                         data: []
//                     })
//                 } else {

//                     const resData = resultList.rows
//                     const lowerResData = tolowerService.arrayobjtolower(resData)
//                     let returnData = new Object
//                     returnData.data = lowerResData
//                     returnData.status = 200
//                     returnData.message = 'success'
//                     returnData.CurrentPage = Number(pageno)
//                     returnData.pageSize = 5
//                     returnData.rowCount = rowCount
//                     returnData.pageCount = Math.ceil(rowCount / 5);

//                     // === tran all upperCase to lowerCase === 
//                     let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
//                         result[key.toLowerCase()] = val;
//                     });

//                     // res.status(200).json(results.rows[0]);
//                     res.status(200).json(returnDatalowerCase);
//                 }

//             } catch (e) {
//                 console.error(e)
//                 return res.status(400).send({
//                     status: 400,
//                     mesasage: `error during get list data of colletion : ${e.message}`,
//                     data: []
//                 })
//             }
//         }


//     } catch (e) {
//         console.error(e)
//         return next(e)
//     } finally {
//         if (connection) {
//             try {
//                 await connection.close()
//             } catch (e) {
//                 console.error(e)
//                 return next(e)
//             }
//         }
//     }

// }

async function getviewcontractlist(req, res, next) {
    let connection;
    try {
        // let cust_id = [];
        const { pageno, name, surname, due, applicationid, branchcode, billcode, trackcode, carcheckstatus } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;

        // === GETUSER ID AND CHANNAL_TYPE (25/05/2022) ===
        const token = req.user
        const userid = token.ID
        const radmin = token.radmin

        connection = await oracledb.getConnection(
            config.database
        )

        let finishsql;
        let bindparams = {};
        let queryname = ''
        let querysurname = ''
        let queryappid = ''
        let querydue = ''
        let querybranch = ''
        let querybill = ''
        let querytrack = ''
        let querycarcheck = ''
        // ==== build query string form execute ====

        if (name) {
            queryname = ` AND NAME LIKE :custname `
            bindparams.custname = `${name}%`
        }
        if (surname) {


            querysurname = ` AND SNAME LIKE :surname `
            bindparams.surname = `${surname}%`
        }

        if (applicationid) {


            queryappid = ` AND COLL_INFO_MONTHLY_VIEW.HP_NO = :applicationid `
            bindparams.applicationid = applicationid

        }

        if (due) {
            // const d = new Date(due)
            // const datestr = _util.datetostring(d)
            // querydue = ` AND coll_info_monthly_view.first_due = TO_DATE(:due, 'dd/mm/yyyy') `
            // bindparams.due = datestr
            querydue = ` AND SUBSTR(TO_CHAR(coll_info_monthly_view.first_due, 'dd/mm/yyyy'), 1,2) = :due `
            // const formatdue = due.toLocaleString('en-US', {
            //     minimumIntegerDigits: 2,
            //     useGrouping: false
            //   })
            // console.log(`this is formatdue : ${formatdue}`)
            const formatdue = _util.build2digitstringdate(due)
            // console.log(`this is formatdue : ${formatdue}`)
            bindparams.due = formatdue

        }

        if (branchcode) {
            querybranch = ` AND branch_p.branch_code = :branchcode  `
            bindparams.branchcode = branchcode
        }

        if (billcode) {
            querybill = ` AND BILL_BEG = :billcode `
            bindparams.billcode = billcode
        }

        if (trackcode && trackcode != '0') {
            querytrack = ` AND CALL_TRACK_INFO_STATUS = :trackcode `
            bindparams.trackcode = trackcode
        }

        if (carcheckstatus) {
            querycarcheck = ` and em.STATUS = :status_em `
            bindparams.status_em = carcheckstatus
        }

        const sqlbase = `
            SELECT coll_info_monthly_view.hp_no,
                                    title_p.title_id,
                                    CASE
                                    WHEN LENGTH(NVL(cti.hp_no,1))=1 THEN '2'
                                    WHEN LENGTH(NVL(cti.hp_no,1)) > 1 THEN '1'
                                    END  as CALL_TRACK_INFO_STATUS,
                                    CASE WHEN coll_info_monthly_view.priority > 0 THEN '(-_-!) ' END
                                    || ''
                                    || title_p.title_name
                                    AS tittle_name,
                                    black1.name,
                                    black1.sname,
                                    type_p.type_code,
                                    type_p.type_name,
                                    branch_p.branch_code,
                                    branch_p.branch_name,
                                    coll_info_monthly_view.month_end,
                                    coll_info_monthly_view.year_end,
                                    coll_info_monthly_view.bill_beg,
                                    coll_info_monthly_view.bill_sub_beg,
                                    coll_info_monthly_view.bill_curr,
                                    coll_info_monthly_view.bill_sub_curr,
                                    coll_info_monthly_view.collected_inst,
                                    coll_info_monthly_view.collected_amt,
                                    coll_info_monthly_view.collected_date,
                                    coll_info_monthly_view.by_bill,
                                    coll_info_monthly_view.by_dealer,
                                    coll_info_monthly_view.monthly,
                                    coll_info_monthly_view.will_pay_amt,
                                    coll_info_monthly_view.will_pay_inst,
                                    coll_info_monthly_view.first_due,
                                    coll_info_monthly_view.total_paid,
                                    coll_info_monthly_view.term,
                                    coll_info_monthly_view.account_status,
                                    coll_info_monthly_view.stage_no,
                                    coll_info_monthly_view.safety_level,
                                    coll_info_monthly_view.no_of_overdue,
                                    coll_info_monthly_view.col_r_code,
                                    coll_info_monthly_view.no_of_sms,
                                    coll_info_monthly_view.no_of_contact,
                                    coll_info_monthly_view.no_of_appoint,
                                    coll_info_monthly_view.flag,
                                    status_call.flagname,
                                    black1.cust_no,
                                    perc_pay,
                                    coll_info_monthly_view.stapay,
                                    coll_info_monthly_view.hp_hold,
                                    coll_info_monthly_view.nego_id,
                                    coll_info_monthly_view.stapay1,
                                    coll_info_monthly_view.unp_mrr,
                                    coll_info_monthly_view.unp_100,
                                    coll_info_monthly_view.unp_200,
                                    x_cust_mapping_ext.bussiness_code,
                                    x_cust_mapping_ext.dl_code,
                                    coll_info_monthly_view.ROLLBACK_CALL,
                                    X_DEALER_P.DL_BRANCH
                                   -- ROW_NUMBER() OVER (ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, coll_info_monthly_view.hp_no ASC) LINE_NUMBER
                            FROM coll_info_monthly_view,
                                    black1,
                                    title_p,
                                    type_p,
                                    branch_p,
                                    status_call,
                                    x_cust_mapping_ext,
                                    X_DEALER_P,
                                    (select distinct hp_no
                                        from btw.CALL_TRACK_INFO 
                                        where trunc(rec_day) = trunc(sysdate)
                                        and phone_no=0)  cti
                                    WHERE (    (coll_info_monthly_view.hp_no = black1.hp(+))
                                        AND (title_p.title_id(+) = black1.fname_code)
                                        AND (black1.TYPE = type_p.type_code(+))
                                        --AND (coll_info_monthly_view.branch_code = branch_p.branch_code)
                                        AND (coll_info_monthly_view.flag = status_call.flag)
                                        AND coll_info_monthly_view.hp_no = x_cust_mapping_ext.contract_no)
                                        AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE(+)
                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                                        AND coll_info_monthly_view.hp_no = cti.hp_no(+)
                                        AND COLL_INFO_MONTHLY_VIEW.STAPAY1 is null
                                        ${queryname}${querysurname}${queryappid}${querydue}${querybranch}
                                        ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, hp_no ASC
                                ) a
                        `

        const wherecondition = `
        where  HP_NO IS NOT NULL
                  ${querybill}${querytrack}
                    ) T , ESTIMATE_REPO_CHECK_MASTER em , ESTIMATE_REPO_CHECK_MASTER_P ep
                    where T.HP_NO = em.CONTACT_NO(+)
                    and em.STATUS = ep.STATUS(+) 
                    ${querycarcheck}
                    ORDER BY TO_CHAR (t.first_due, 'DD') ASC, t.hp_no ASC
                    `

        finishsql = `
        select count (hp_no) as count from(
            select rownum as LINE_NUMBER, T.*, ep.DETAILS from (
            select a.* from(
                ${sqlbase}${wherecondition})
                `

        const resultcontractcount = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

        if (resultcontractcount.rows[0].count == 0) {
            return res.status(200).send({
                status: 200,
                message: 'NO RECORD FOUND',
                data: []
            })
        } else {
            // const resData = resultnego.rows
            // const lowerResData = tolowerService.arrayobjtolower(resData)
            // return res.status(200).send({
            //     status: 200,
            //     message: 'success',
            //     data: lowerResData
            // })
            try {

                let finishsqlrecord;
                // === get record of negotiation === 
                rowCount = resultcontractcount.rows[0].COUNT

                // console.log(`RowCount : ${rowCount}`)

                bindparams.indexstart = indexstart
                bindparams.indexend = indexend

                const basesql = `
                SELECT coll_info_monthly_view.hp_no,
                                    title_p.title_id,
                                    CASE
                                    WHEN LENGTH(NVL(cti.hp_no,1))=1 THEN '2'
                                    WHEN LENGTH(NVL(cti.hp_no,1)) > 1 THEN '1'
                                    END  as CALL_TRACK_INFO_STATUS,
                                    CASE WHEN coll_info_monthly_view.priority > 0 THEN '(-_-!) ' END
                                    || ''
                                    || title_p.title_name
                                    AS tittle_name,
                                    black1.name,
                                    black1.sname,
                                    type_p.type_code,
                                    type_p.type_name,
                                    branch_p.branch_code,
                                    branch_p.branch_name,
                                    coll_info_monthly_view.month_end,
                                    coll_info_monthly_view.year_end,
                                    coll_info_monthly_view.bill_beg,
                                    coll_info_monthly_view.bill_sub_beg,
                                    coll_info_monthly_view.bill_curr,
                                    coll_info_monthly_view.bill_sub_curr,
                                    coll_info_monthly_view.collected_inst,
                                    coll_info_monthly_view.collected_amt,
                                    coll_info_monthly_view.collected_date,
                                    coll_info_monthly_view.by_bill,
                                    coll_info_monthly_view.by_dealer,
                                    coll_info_monthly_view.monthly,
                                    coll_info_monthly_view.will_pay_amt,
                                    coll_info_monthly_view.will_pay_inst,
                                    coll_info_monthly_view.first_due,
                                    coll_info_monthly_view.total_paid,
                                    coll_info_monthly_view.term,
                                    coll_info_monthly_view.account_status,
                                    coll_info_monthly_view.stage_no,
                                    coll_info_monthly_view.safety_level,
                                    coll_info_monthly_view.no_of_overdue,
                                    coll_info_monthly_view.col_r_code,
                                    coll_info_monthly_view.no_of_sms,
                                    coll_info_monthly_view.no_of_contact,
                                    coll_info_monthly_view.no_of_appoint,
                                    coll_info_monthly_view.flag,
                                    status_call.flagname,
                                    black1.cust_no,
                                    perc_pay,
                                    coll_info_monthly_view.stapay,
                                    coll_info_monthly_view.hp_hold,
                                    coll_info_monthly_view.nego_id,
                                    coll_info_monthly_view.stapay1,
                                    coll_info_monthly_view.unp_mrr,
                                    coll_info_monthly_view.unp_100,
                                    coll_info_monthly_view.unp_200,
                                    x_cust_mapping_ext.bussiness_code,
                                    x_cust_mapping_ext.dl_code,
                                    coll_info_monthly_view.ROLLBACK_CALL,
                                    X_DEALER_P.DL_BRANCH
                                   -- ROW_NUMBER() OVER (ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, coll_info_monthly_view.hp_no ASC) LINE_NUMBER
                            FROM coll_info_monthly_view,
                                    black1,
                                    title_p,
                                    type_p,
                                    branch_p,
                                    status_call,
                                    x_cust_mapping_ext,
                                    X_DEALER_P,
                                    (select distinct hp_no
                                        from btw.CALL_TRACK_INFO 
                                        where trunc(rec_day) = trunc(sysdate)
                                        and phone_no=0)  cti
                                    WHERE (    (coll_info_monthly_view.hp_no = black1.hp(+))
                                        AND (title_p.title_id(+) = black1.fname_code)
                                        AND (black1.TYPE = type_p.type_code(+))
                                        --AND (coll_info_monthly_view.branch_code = branch_p.branch_code)
                                        AND (coll_info_monthly_view.flag = status_call.flag)
                                        AND coll_info_monthly_view.hp_no = x_cust_mapping_ext.contract_no)
                                        AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE(+)
                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                                        AND coll_info_monthly_view.hp_no = cti.hp_no(+)
                                        AND COLL_INFO_MONTHLY_VIEW.STAPAY1 is null
                                        ${queryname}${querysurname}${queryappid}${querydue}${querybranch}
                                        ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, hp_no ASC
                                ) A
                `

                const wherecondition = `
                WHERE  HP_NO IS NOT NULL
                  ${querybill}${querytrack}
                    ) T , ESTIMATE_REPO_CHECK_MASTER em , ESTIMATE_REPO_CHECK_MASTER_P ep
                    where T.HP_NO = em.CONTACT_NO(+) 
                    and em.STATUS = ep.STATUS(+) 
                    ${querycarcheck}
                    ORDER BY TO_CHAR (T.first_due, 'DD') ASC, hp_no ASC
                `

                finishsqlrecord = `SELECT * FROM(
                    SELECT ROWNUM AS LINE_NUMBER, T.*, ep.DETAILS FROM (
                        SELECT  A.* FROM(
                            ${basesql}${wherecondition}
                            )
                            WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
                    `

                // console.log(bindparams)

                const resultList = await connection.execute(finishsqlrecord, bindparams, { outFormat: oracledb.OBJECT })

                if (resultList.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No negotaiation record',
                        data: []
                    })
                } else {

                    let resData = resultList.rows

                    // ==== add [ppointment date payment ==== 
                    resData.forEach((items, i) => {
                        const paymentdate = _util.getnextmonth(items.FIRST_DUE)
                        resData[i].paymentdate = paymentdate
                    });



                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    mesasage: `error during get list data of colletion : ${e.message}`,
                    data: []
                })
            }
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

async function getnegotiationbyid(req, res, next) {
    let connection;
    try {

        // === get param from query ===

        const { applicationid } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultnego = await connection.execute(`
        SELECT coll_info_monthly_view.hp_no,
                title_p.title_id,
                CASE WHEN coll_info_monthly_view.priority > 0 THEN '(-_-!) ' END
                || ''
                || title_p.title_name
                AS tittle_name,
                black1.name,
                black1.sname,
                type_p.type_code,
                type_p.type_name,
                branch_p.branch_code,
                branch_p.branch_name,
                coll_info_monthly_view.month_end,
                coll_info_monthly_view.year_end,
                coll_info_monthly_view.bill_beg,
                coll_info_monthly_view.bill_sub_beg,
                coll_info_monthly_view.bill_curr,
                coll_info_monthly_view.bill_sub_curr,
                coll_info_monthly_view.collected_inst,
                coll_info_monthly_view.collected_amt,
                coll_info_monthly_view.collected_date,
                coll_info_monthly_view.by_bill,
                coll_info_monthly_view.by_dealer,
                coll_info_monthly_view.monthly,
                coll_info_monthly_view.will_pay_amt,
                coll_info_monthly_view.will_pay_inst,
                coll_info_monthly_view.first_due,
                coll_info_monthly_view.total_paid,
                coll_info_monthly_view.term,
                coll_info_monthly_view.account_status,
                coll_info_monthly_view.stage_no,
                coll_info_monthly_view.safety_level,
                coll_info_monthly_view.no_of_overdue,
                coll_info_monthly_view.col_r_code,
                coll_info_monthly_view.no_of_sms,
                coll_info_monthly_view.no_of_contact,
                coll_info_monthly_view.no_of_appoint,
                coll_info_monthly_view.flag,
                status_call.flagname,
                black1.cust_no,
                perc_pay,
                coll_info_monthly_view.stapay,
                coll_info_monthly_view.hp_hold,
                coll_info_monthly_view.nego_id,
                coll_info_monthly_view.stapay1,
                coll_info_monthly_view.unp_mrr,
                coll_info_monthly_view.unp_100,
                coll_info_monthly_view.unp_200,
                x_cust_mapping_ext.bussiness_code,
                x_cust_mapping_ext.dl_code,
                coll_info_monthly_view.ROLLBACK_CALL,
                CUST_INFO.IDCARD_NUM,
                x_cust_mapping_ext.CREATE_CONTRACT_DATE,
                x_cust_mapping_ext.REF_PAY_NUM
        FROM coll_info_monthly_view,
                black1,
                title_p,
                type_p,
                branch_p,
                status_call,
                x_cust_mapping_ext,
                cust_info,
                x_cust_mapping
        WHERE (    (coll_info_monthly_view.hp_no = black1.hp(+))
                AND (title_p.title_id(+) = black1.fname_code)
                AND (black1.TYPE = type_p.type_code(+))
                AND (coll_info_monthly_view.branch_code = branch_p.branch_code)
                AND (coll_info_monthly_view.flag = status_call.flag)
                AND coll_info_monthly_view.hp_no = x_cust_mapping_ext.contract_no 
                AND coll_info_monthly_view.hp_no = :applicationid )
                AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_CUST_MAPPING.APPLICATION_NUM
                AND X_CUST_MAPPING.CUST_NO = CUST_INFO.CUST_NO
        ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, hp_no ASC
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })
        // const resultnego = await connection.execute(`
        // SELECT AP.HP_NO, AP.MONTHLY, AP.FIRST_DUE, AP.PERIOD, CI.NAME, CI.SNAME,
        //     CIM.WILL_PAY_AMT, CIM.WILL_PAY_INST
        //     FROM BTW.AC_PROVE AP
        //     LEFT JOIN BTW.CUST_INFO CI
        //     ON AP.CUST_NO_0 = CI.CUST_NO
        //     LEFT JOIN COLL_INFO_MONTHLY CIM
        //     ON AP.HP_NO = CIM.HP_NO
        //     WHERE AP.HP_NO = :applicationid
        // `, {
        //     applicationid: applicationid
        // }, {
        //     outFormat: oracledb.OBJECT
        // })

        if (resultnego.rows.length == 0) {
            return res.status(404).send({
                status: 404,
                message: `ไม่เจอรายการสัญญาที่เลือก`,
                data: []
            })
        } else {
            // ==== return success data ==== 

            let resData = resultnego.rows

            const paymentdate = _util.getnextmonth(resData[0].FIRST_DUE)
            resData[0].paymentdate = paymentdate

            const lowerResData = tolowerService.arrayobjtolower(resData)
            res.status(200).json({
                status: 200,
                message: `Success`,
                data: lowerResData
            });
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `error with message : ${e.message}`
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

async function getmotocycle(req, res, next) {
    let connection;
    try {

        // === get param from query ===

        const { hp_no } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultmotorcycle = await connection.execute(`
                SELECT coll_info_monthly_view.hp_no,
                title_p.title_id,
                CASE WHEN coll_info_monthly_view.priority > 0 THEN '(-_-!) ' END
                || ''
                || title_p.title_name
                AS tittle_name,
                black1.name,
                black1.sname,
                type_p.type_code,
                type_p.type_name,
                branch_p.branch_code,
                branch_p.branch_name,
                coll_info_monthly_view.month_end,
                coll_info_monthly_view.year_end,
                coll_info_monthly_view.bill_beg,
                coll_info_monthly_view.bill_sub_beg,
                coll_info_monthly_view.bill_curr,
                coll_info_monthly_view.bill_sub_curr,
                coll_info_monthly_view.collected_inst,
                coll_info_monthly_view.collected_amt,
                coll_info_monthly_view.collected_date,
                coll_info_monthly_view.by_bill,
                coll_info_monthly_view.by_dealer,
                coll_info_monthly_view.monthly,
                coll_info_monthly_view.will_pay_amt,
                coll_info_monthly_view.will_pay_inst,
                coll_info_monthly_view.first_due,
                coll_info_monthly_view.total_paid,
                coll_info_monthly_view.term,
                coll_info_monthly_view.account_status,
                coll_info_monthly_view.stage_no,
                coll_info_monthly_view.safety_level,
                coll_info_monthly_view.no_of_overdue,
                coll_info_monthly_view.col_r_code,
                coll_info_monthly_view.no_of_sms,
                coll_info_monthly_view.no_of_contact,
                coll_info_monthly_view.no_of_appoint,
                coll_info_monthly_view.flag,
                status_call.flagname,
                black1.cust_no,
                perc_pay,
                coll_info_monthly_view.stapay,
                coll_info_monthly_view.hp_hold,
                coll_info_monthly_view.nego_id,
                coll_info_monthly_view.stapay1,
                coll_info_monthly_view.unp_mrr,
                coll_info_monthly_view.unp_100,
                coll_info_monthly_view.unp_200,
                x_cust_mapping_ext.bussiness_code,
                x_cust_mapping_ext.dl_code,
                BTW.GET_DEALER_NAME(x_cust_mapping_ext.dl_code) as dl_name,
                coll_info_monthly_view.ROLLBACK_CALL,
                X_DEALER_P.DL_BRANCH,
                X_CUST_MAPPING_EXT.APPLICATION_NUM,
                X_PRODUCT_DETAIL.BRAND_CODE,
                X_BRAND_P.BRAND_NAME,
                X_PRODUCT_DETAIL.MODELCODE,
                X_MODEL_P.MODEL,
                X_MODEL_P.CC,
                X_PRODUCT_DETAIL.COLOR,
                X_PRODUCT_DETAIL.ENGINE_NUMBER||X_PRODUCT_DETAIL.ENGINE_NO_RUNNING AS ENGINE_NUMBER,
                X_PRODUCT_DETAIL.CHASSIS_NUMBER||X_PRODUCT_DETAIL.CHASSIS_NO_RUNNING AS CHASSIS_NUMBER,
                AC_PROVE.REG_NO,
                AC_PROVE.REG_CITY
        FROM coll_info_monthly_view,
                black1,
                title_p,
                type_p,
                branch_p,
                status_call,
                x_cust_mapping_ext,
                X_DEALER_P,
                X_PRODUCT_DETAIL,
                X_BRAND_P,
                X_MODEL_P,
                AC_PROVE
        WHERE (    (coll_info_monthly_view.hp_no = black1.hp(+))
                AND (title_p.title_id(+) = black1.fname_code)
                AND (black1.TYPE = type_p.type_code(+))
                --AND (coll_info_monthly_view.branch_code = branch_p.branch_code)
                AND (coll_info_monthly_view.flag = status_call.flag)
                AND coll_info_monthly_view.hp_no = x_cust_mapping_ext.contract_no)
                AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE(+)
                AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                AND COLL_INFO_MONTHLY_VIEW.STAPAY1 is null
                AND X_CUST_MAPPING_EXT.APPLICATION_NUM = X_PRODUCT_DETAIL.APPLICATION_NUM
                AND X_BRAND_P.PRO_CODE = '01'
                AND X_BRAND_P.BRAND_CODE = X_PRODUCT_DETAIL.BRAND_CODE
                AND X_MODEL_P.BRAND_CODE = X_PRODUCT_DETAIL.BRAND_CODE
                AND X_MODEL_P.PRO_CODE = X_PRODUCT_DETAIL.PRODUCT_CODE
                AND X_MODEL_P.MODEL_CODE = X_PRODUCT_DETAIL.MODELCODE
                AND COLL_INFO_MONTHLY_VIEW.HP_NO = AC_PROVE.HP_NO
                AND COLL_INFO_MONTHLY_VIEW.HP_NO = :hp_no
        ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, hp_no ASC
        `, {
            hp_no: hp_no
        }, {
            outFormat: oracledb.OBJECT
        })
        // const resultnego = await connection.execute(`
        // SELECT AP.HP_NO, AP.MONTHLY, AP.FIRST_DUE, AP.PERIOD, CI.NAME, CI.SNAME,
        //     CIM.WILL_PAY_AMT, CIM.WILL_PAY_INST
        //     FROM BTW.AC_PROVE AP
        //     LEFT JOIN BTW.CUST_INFO CI
        //     ON AP.CUST_NO_0 = CI.CUST_NO
        //     LEFT JOIN COLL_INFO_MONTHLY CIM
        //     ON AP.HP_NO = CIM.HP_NO
        //     WHERE AP.HP_NO = :applicationid
        // `, {
        //     applicationid: applicationid
        // }, {
        //     outFormat: oracledb.OBJECT
        // })

        if (resultmotorcycle.rows.length == 0) {
            return res.status(200).send({
                status: 404,
                message: `ไม่เจอรายการรุ่นรถตามเลขสัญญา`,
                data: []
            })
        } else {
            // ==== return success data ==== 

            let resData = resultmotorcycle.rows

            const lowerResData = tolowerService.arrayobjtolower(resData)
            res.status(200).json({
                status: 200,
                message: `Success`,
                data: lowerResData
            });
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `error with message : ${e.message}`
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

async function getnegotiationlist(req, res, next) {
    let connection;
    try {

        const { pageno } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;

        // === GETUSER ID AND CHANNAL_TYPE (25/05/2022) ===
        const token = req.user
        const userid = token.ID
        const radmin = token.radmin

        connection = await oracledb.getConnection(
            config.database
        )

        const resultnegoinfo = await connection.execute(`
        select COUNT(hp_no) as count 
        from btw.nego_info
        where staff_id = :userid
        `, {
            userid: userid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultnegoinfo.rows[0].count == 0) {
            return res.status(200).send({
                status: 200,
                message: `no data`,
                data: []
            })
        } else {

            try {

                // === get record of negotiation === 
                rowCount = resultnegoinfo.rows[0].COUNT

                const resultList = await connection.execute(`
                SELECT * FROM (select rec_date, status_recall, appoint_date, message1, 
                            message2, pay ,ROW_NUMBER() OVER (ORDER BY rec_date DESC) LINE_NUMBER
                from btw.nego_info
                where staff_id = :userid
                ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend 
                `, {
                    userid: userid,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultList.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: 'No negotaiation record',
                        data: []
                    })
                } else {

                    const resData = resultList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    mesasage: `error during get list data of colletion : ${e.message}`,
                    data: []
                })
            }
        }
    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            mesasage: `error during count record colletion : ${e.message}`,
            data: []
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

async function gethistorypaymentlist(req, res, next) {

    let connection;

    try {

        const { pageno, applicationid } = req.query
        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;

        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountHistory = await connection.execute(`
        SELECT count (hp_no) as count 
            FROM COLL_RECIEPT,COLL_PAYMENT_P 
            WHERE COLL_RECIEPT.pay_code = COLL_PAYMENT_P.pay_code 
            AND NVL(COLL_RECIEPT.CANCELL, 'F') = 'F'
            AND HP_NO = :applicationid
            ORDER BY TRUNC(COLL_RECIEPT.RECIEPT_D) DESC,COLL_RECIEPT.INST_NO DESC
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountHistory.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 404,
                message: 'ไม่พบประวัติการชำระเงิน',
                data: []
            })
        } else {
            try {

                rowCount = resultCountHistory.rows[0].COUNT
                const { applicationid } = req.query
                const resulstHistoryList = await connection.execute(`
                SELECT * FROM (
                    SELECT COLL_RECIEPT.HP_NO,TRUNC(COLL_RECIEPT.RECIEPT_D)RECIEPT_D,
                            COLL_RECIEPT.INST_NO,COLL_RECIEPT.inst_due, COLL_RECIEPT.cash,COLL_RECIEPT.out_stand,COLL_PAYMENT_P.PAY_NAME,
                            ROW_NUMBER() OVER (ORDER BY RECIEPT_D DESC) LINE_NUMBER 
                            FROM COLL_RECIEPT,COLL_PAYMENT_P 
                            WHERE COLL_RECIEPT.pay_code = COLL_PAYMENT_P.pay_code 
                            AND COLL_RECIEPT.CANCELL = 'F'
                            AND HP_NO = :applicationid
                            ORDER BY TRUNC(COLL_RECIEPT.RECIEPT_D) DESC,COLL_RECIEPT.INST_NO DESC
                    ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
                `, {
                    applicationid: applicationid,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })


                if (resulstHistoryList.rows.length == 0) {
                    return res.stauts(404).send({
                        status: 404,
                        message: `ไม่พบประวัติการชำระเงินของสัญญานี้`
                    })
                } else {
                    // === resturn success build data === 

                    const resData = resulstHistoryList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);

                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `การเรียกดูประวัติการชำระเงินผิดพลาด : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `การเรียกดูประวัติการชำระเงินผิดพลาด (count error): ${e.message}`
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

async function getaddresscustlist(req, res, next) {
    let connection;

    try {
        const { pageno, applicationid } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;


        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountdata = await connection.execute(`
        SELECT 
            COUNT (AP.HP_NO) AS COUNT
            FROM BTW.AC_PROVE AP,
            BTW.ADDRESS_MAP AM, 
            BTW.ADDRESS_INFO AI, 
            BTW.ADDRESS_TYPE_P ATP, 
            BTW.CUST_INFO CI, 
            BTW.PROVINCE_P PP
           WHERE AP.CUST_NO_0 = CI.CUST_NO
            AND AM.ADDR_NO = AI.ADDR_NO
            AND AM.ADDR_STATUS_CODE = 'CN'
            AND AM.ADDR_TYPE_CODE = ATP.ADDR_TYPE_CODE
            AND AI.PROV_CODE = PP.PROV_CODE(+)
            AND AM.CUST_ID = CI.CUST_NO
            AND AP.HP_NO = :applicationid
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountdata.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 404,
                message: 'ไม่พบรายการที่อยู่ภายใต้สัญญา',
                data: []
            })
        } else {
            try {

                rowCount = resultCountdata.rows[0].COUNT

                const resultAddressList = await connection.execute(`
                SELECT * FROM (
                (SELECT 
                    AP.HP_NO, 
                    AM.CUST_ID,AM.ADDR_TYPE_CODE,ATP.ADDR_TYPE_NAME,
                    PP.PROV_NAME,
                    AI.ADDR_NO, AI.HOME_NO, AI.HOME_NAME, AI.SAI, AI.TROK, AI.MHOD, AI.ROAD, AI.KWANG, AI.KHET, AI.PROV_CODE, AI.POST_CODE, AI.LATITUDE, AI.LONGITUDE,
                    ROW_NUMBER() OVER (ORDER BY AM.ADDR_TYPE_CODE ASC) LINE_NUMBER
                    FROM BTW.AC_PROVE AP,
                    BTW.ADDRESS_MAP AM, 
                    BTW.ADDRESS_INFO AI, 
                    BTW.ADDRESS_TYPE_P ATP, 
                    BTW.CUST_INFO CI, 
                    BTW.PROVINCE_P PP
                   WHERE AP.CUST_NO_0 = CI.CUST_NO
                    AND AM.ADDR_NO = AI.ADDR_NO
                    AND AM.ADDR_STATUS_CODE = 'CN'
                    AND AM.ADDR_TYPE_CODE = ATP.ADDR_TYPE_CODE
                    AND AI.PROV_CODE = PP.PROV_CODE(+)
                    AND AM.CUST_ID = CI.CUST_NO
                    AND AP.HP_NO = :applicationid
                )
                            )
                WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
                `, {
                    applicationid: applicationid,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultAddressList.rows.length == 0) {
                    return res.status(404).send({
                        status: 404,
                        message: `ไม่พบรายการที่อยู่ตามเลขที่สัญญา`,
                        data: []
                    })
                } else {
                    // === resturn success data via http ===
                    const resData = resultAddressList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาที่อยู่ตามเลขสัญญา : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `ไม่สามารถหาข้อมูลที่อยู่ที่ผูกกับสัญญาได้ (Count not found) : ${e.message}`
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

async function getaddressncblist(req, res, next) {
    let connection;

    try {
        const { pageno, idcode } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;


        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountncblivingdata = await connection.execute(`
                SELECT 
                COUNT (C2C.IDCODE) AS COUNT
                FROM CPU2CPU.ADDRESS C2C
            WHERE C2C.IDCODE = :idcode
        `, {
            idcode: idcode
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountncblivingdata.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 404,
                message: 'ไม่พบรายการที่อยู่จากการสืบค้น NCB',
                data: []
            })
        } else {
            try {

                rowCount = resultCountncblivingdata.rows[0].COUNT

                const resultAddressNCBList = await connection.execute(`
                SELECT * FROM (
                    (SELECT 
                        C2C.IDCODE AS IDCARD_NUMBER, 
                        C2C.PA01 AS ADDRESS1,
                        C2C.PA02 AS ADDRESS2,
                        C2C.PA03 AS ADDRESS3,
                        C2C.PA04 AS ADDRESS4,
                        C2C.PA05 AS ADDRESS5,
                        C2C.PA06 AS ADDRESS6,
                        C2C.PA07 AS ADDRESS7,
                        C2C.PA08 AS ADDRESS8,
                        ROW_NUMBER() OVER (ORDER BY C2C.PAPA ASC) LINE_NUMBER
                        FROM CPU2CPU.ADDRESS C2C
                       WHERE C2C.IDCODE = :idcode
                    )
                                )
                    WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
                `, {
                    idcode: idcode,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultAddressNCBList.rows.length == 0) {
                    return res.status(404).send({
                        status: 404,
                        message: `ไม่พบรายการที่อยู่จากการสืบค้น NCB`,
                        data: []
                    })
                } else {
                    // === resturn success data via http ===
                    const resData = resultAddressNCBList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาที่อยู่ตามเลขสัญญา : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `ไม่สามารถหาข้อมูลที่อยู่ที่ผูกกับสัญญาได้ (Count not found) : ${e.message}`
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

async function getphonenolist(req, res, next) {
    let connection;

    try {
        const { pageno, cust_id } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;


        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountphone = await connection.execute(`
                            SELECT COUNT (PHONE_NO) AS COUNT FROM
                            (
                                    SELECT PHONE_NO,
                                    CASE PHONE_TYPE_CODE
                                    WHEN 'REF' THEN 
                                    (SELECT 'บุคคลอ้างอิง ที่ 1 :  '||REFERNCE||' , ความสัมพันธ์  :  '||RELATION_REF
                                        FROM  BTW.CUST_INFO_EXT
                                        WHERE  CUST_NO = CUST_ID
                                        AND REFERNCE IS NOT NULL) 
                                    WHEN 'RF1' THEN 
                                    (  SELECT 'บุคคลอ้างอิง ที่ 2 :  '||REFERENCE1||' , ความสัมพันธ์  :  '||RELATION_REF1
                                        FROM  BTW.CUST_INFO_EXT
                                        WHERE  CUST_NO = CUST_ID
                                        AND REFERENCE1 IS NOT NULL)
                                    ELSE 'N/A'
                                    END  AS REF_CUSTOMER,
                                    CASE PHONE_TYPE_CODE
                                    WHEN 'REF' THEN 
                                    (SELECT REFERNCE
                                        FROM  BTW.CUST_INFO_EXT
                                        WHERE  CUST_NO = CUST_ID
                                        AND REFERNCE IS NOT NULL) 
                                    WHEN 'RF1' THEN 
                                    (  SELECT REFERENCE1
                                        FROM  BTW.CUST_INFO_EXT
                                        WHERE  CUST_NO = CUST_ID
                                        AND REFERENCE1 IS NOT NULL)
                                    ELSE 'N/A'
                                    END  AS REF_NAME,
                                    CASE PHONE_TYPE_CODE
                                    WHEN 'REF' THEN 
                                    (SELECT RELATION_REF
                                        FROM  BTW.CUST_INFO_EXT
                                        WHERE  CUST_NO = CUST_ID
                                        AND REFERNCE IS NOT NULL) 
                                    WHEN 'RF1' THEN 
                                    (  SELECT RELATION_REF1
                                        FROM  BTW.CUST_INFO_EXT
                                        WHERE  CUST_NO = CUST_ID
                                        AND REFERENCE1 IS NOT NULL)
                                    ELSE 'N/A'
                                    END  AS REF_STATUS
                                        FROM PHONE_INFO PF
                                        WHERE  PF.CUST_ID = :cust_id
                                        AND  PF.PHONE_TYPE_CODE IN( 'REF', 'RF1')
                                        AND  PF.PHONE_STATUS_CODE = 'CN' 
                            )
        `, {
            cust_id: cust_id
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountphone.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 404,
                message: 'ไม่พบรายการเบอร์โทรของลูกค้า',
                data: []
            })
        } else {
            try {

                rowCount = resultCountphone.rows[0].COUNT

                const resultphoneList = await connection.execute(`
                select * from 
                (
                    SELECT PHONE_NO,
                    CASE PHONE_TYPE_CODE
                  WHEN 'REF' THEN 
                  (SELECT 'บุคคลอ้างอิง ที่ 1 :  '||REFERNCE||' , ความสัมพันธ์  :  '||RELATION_REF
                    FROM  BTW.CUST_INFO_EXT
                    WHERE  CUST_NO = CUST_ID
                    AND REFERNCE IS NOT NULL) 
                  WHEN 'RF1' THEN 
                  (  SELECT 'บุคคลอ้างอิง ที่ 2 :  '||REFERENCE1||' , ความสัมพันธ์  :  '||RELATION_REF1
                    FROM  BTW.CUST_INFO_EXT
                    WHERE  CUST_NO = CUST_ID
                    AND REFERENCE1 IS NOT NULL)
                  ELSE 'N/A'
                END  AS REF_CUSTOMER,
                CASE PHONE_TYPE_CODE
                  WHEN 'REF' THEN 
                  (SELECT REFERNCE
                    FROM  BTW.CUST_INFO_EXT
                    WHERE  CUST_NO = CUST_ID
                    AND REFERNCE IS NOT NULL) 
                  WHEN 'RF1' THEN 
                  (  SELECT REFERENCE1
                    FROM  BTW.CUST_INFO_EXT
                    WHERE  CUST_NO = CUST_ID
                    AND REFERENCE1 IS NOT NULL)
                  ELSE 'N/A'
                END  AS REF_NAME,
                CASE PHONE_TYPE_CODE
                  WHEN 'REF' THEN 
                  (SELECT RELATION_REF
                    FROM  BTW.CUST_INFO_EXT
                    WHERE  CUST_NO = CUST_ID
                    AND REFERNCE IS NOT NULL) 
                  WHEN 'RF1' THEN 
                  (  SELECT RELATION_REF1
                    FROM  BTW.CUST_INFO_EXT
                    WHERE  CUST_NO = CUST_ID
                    AND REFERENCE1 IS NOT NULL)
                  ELSE 'N/A'
                END  AS REF_STATUS,
                ROW_NUMBER() OVER (ORDER BY PF.REC_DATE DESC) LINE_NUMBER
                    FROM PHONE_INFO PF
                    WHERE  PF.CUST_ID = :cust_id
                    AND  PF.PHONE_TYPE_CODE IN( 'REF', 'RF1')
                    AND  PF.PHONE_STATUS_CODE = 'CN' 
                )
                where LINE_NUMBER between :indexstart AND :indexend
                `, {
                    cust_id: cust_id,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultphoneList.rows.length == 0) {
                    return res.status(404).send({
                        status: 404,
                        message: `ไม่พบรายการเบอร์โทรของลูกค้า`,
                        data: []
                    })
                } else {
                    // === resturn success data via http ===
                    const resData = resultphoneList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาเบอร์โทรของลูกค้า : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `ไม่สามารถหาเบอร์โทรของลูกค้าได้ (Count not found) : ${e.message}`
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

async function getphonenolistcust(req, res, next) {
    let connection;

    try {
        const { pageno, cust_id } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;


        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountphone = await connection.execute(`
        SELECT COUNT (PHONE_INFO.CUST_ID) AS COUNT FROM
            BTW.PHONE_INFO, BTW.CUST_INFO
        WHERE PHONE_INFO.CUST_ID = CUST_INFO.CUST_NO
            AND PHONE_INFO.PHONE_STATUS_CODE = 'CN'
            AND CUST_INFO.CUST_NO = :cust_id
            AND PHONE_TYPE_CODE NOT IN ('REF', 'RF1')
        `, {
            cust_id: cust_id
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountphone.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 404,
                message: 'ไม่พบรายการเบอร์โทรของลูกค้า',
                data: []
            })
        } else {
            try {

                rowCount = resultCountphone.rows[0].COUNT

                const resultphoneList = await connection.execute(`
                select * from 
                (
                    SELECT PHONE_INFO.PHONE_NO, PHONE_INFO.CUST_ID, CUST_INFO.NAME, CUST_INFO.SNAME, 
                    ROW_NUMBER() OVER (ORDER BY PHONE_INFO.REC_DATE DESC) LINE_NUMBER
                    FROM
                    BTW.PHONE_INFO, BTW.CUST_INFO
                    WHERE PHONE_INFO.CUST_ID = CUST_INFO.CUST_NO
                    AND PHONE_INFO.PHONE_STATUS_CODE = 'CN'
                    AND CUST_INFO.CUST_NO = :cust_id
                    AND PHONE_TYPE_CODE NOT IN ('REF', 'RF1')
                )
                where LINE_NUMBER between :indexstart AND :indexend
                `, {
                    cust_id: cust_id,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultphoneList.rows.length == 0) {
                    return res.status(404).send({
                        status: 404,
                        message: `ไม่พบรายการเบอร์โทรของลูกค้า`,
                        data: []
                    })
                } else {
                    // === resturn success data via http ===
                    const resData = resultphoneList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาเบอร์โทรของลูกค้า : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `ไม่สามารถหาเบอร์โทรของลูกค้าได้ (Count not found) : ${e.message}`
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

// async function getfollowuppaymentlist(req, res, next) {
//     let connection;

//     try {
//         const { pageno, applicationid } = req.query

//         const indexstart = (pageno - 1) * 5 + 1
//         const indexend = (pageno * 5)
//         let rowCount;


//         connection = await oracledb.getConnection(
//             config.database
//         )

//         const resultCountfollow = await connection.execute(`
//         select count(hp_no) as count
//             from btw.nego_info
//             where hp_no = :applicationid
//         `, {
//             applicationid: applicationid
//         }, {
//             outFormat: oracledb.OBJECT
//         })



//         if (resultCountfollow.rows[0].COUNT == 0) {
//             return res.status(400).send({
//                 status: 400,
//                 message: 'ไม่พบรายการติดตามที่อยู่ภายใต้สัญญา',
//                 data: []
//             })
//         } else {
//             try {

//                 rowCount = resultCountfollow.rows[0].COUNT

//                 const resultFollowupList = await connection.execute(`
//                 SELECT * FROM (
//                     select ni.hp_no, ni.rec_date, ni.appoint_date, ni.message1, 
//                     ni.message2, ni.pay, ni.staff_id, em.emp_name, em.emp_lname,
//                     ROW_NUMBER() OVER (ORDER BY HP_NO ASC) LINE_NUMBER 
//                     from btw.nego_info ni, btw.emp em
//                     where ni.hp_no = :applicationid
//                     and ni.staff_id = em.emp_id(+)
//                     order by rec_date desc
//                     )    
//                     WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
//                 `, {
//                     applicationid: applicationid,
//                     indexstart: indexstart,
//                     indexend: indexend
//                 }, {
//                     outFormat: oracledb.OBJECT
//                 })

//                 if (resultFollowupList.rows.length == 0) {
//                     return res.status(404).send({
//                         status: 404,
//                         message: `ไม่พบรายการที่อยู่ตามเลขที่สัญญา`,
//                         data: []
//                     })
//                 } else {
//                     // === resturn success data via http ===
//                     const resData = resultFollowupList.rows
//                     const lowerResData = tolowerService.arrayobjtolower(resData)
//                     let returnData = new Object
//                     returnData.data = lowerResData
//                     returnData.status = 200
//                     returnData.message = 'success'
//                     returnData.CurrentPage = Number(pageno)
//                     returnData.pageSize = 5
//                     returnData.rowCount = rowCount
//                     returnData.pageCount = Math.ceil(rowCount / 5);

//                     // === tran all upperCase to lowerCase === 
//                     let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
//                         result[key.toLowerCase()] = val;
//                     });

//                     // res.status(200).json(results.rows[0]);
//                     res.status(200).json(returnDatalowerCase);
//                 }

//             } catch (e) {
//                 console.error(e)
//                 return res.status(400).send({
//                     status: 400,
//                     message: `เกิดข้อผิดพลาดในการหาประวัติการติดตามตามเลขสัญญา : ${e.message}`
//                 })
//             }
//         }

//     } catch (e) {
//         console.error(e)
//         return res.status(400).send({
//             status: 400,
//             message: `ไม่สามารถหาประวัติการติดตามที่ผูกกับสัญญาได้ (Count not found) : ${e.message}`
//         })
//     } finally {
//         if (connection) {
//             try {
//                 await connection.close()
//             } catch (e) {
//                 console.error(e)
//                 return next(e)
//             }
//         }
//     }

// }

async function getfollowuppaymentlist(req, res, next) {
    let connection;

    try {
        const { pageno, applicationid } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;


        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountfollow = await connection.execute(`
        SELECT COUNT (CALL_TRACK_INFO.HP_NO) AS COUNT
        FROM NEGO_INFO, CALL_TRACK_INFO,NEG_RESULT_P,emp em
        WHERE ( (CALL_TRACK_INFO.hp_no = NEGO_INFO.hp_no(+)) 
        and NEGO_INFO.staff_id = em.emp_id(+)
        AND (CALL_TRACK_INFO.cust_id = NEGO_INFO.cust_id(+)) 
        AND (CALL_TRACK_INFO.STAFF_ID = NEGO_INFO.STAFF_ID(+))
         AND (NEGO_INFO.NEG_R_CODE = NEG_RESULT_P.NEG_R_CODE(+)) 
         AND (TO_CHAR(CALL_TRACK_INFO.rec_day,'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NEGO_INFO.rec_date(+),'dd/mm/yyyy hh24:mi:ss')) 
         AND TO_DATE(CALL_TRACK_INFO.REC_DAY,'DD/MM/YYYY') 
        BETWEEN TRUNC(ADD_MONTHS(TO_DATE(SYSDATE,'DD/MM/YYYY'),-2),'MM') 
        AND LAST_DAY(TO_DATE(SYSDATE,'DD/MM/YYYY')))
        AND CALL_TRACK_INFO.HP_NO = :applicationid
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountfollow.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 404,
                message: 'ไม่พบรายการติดตามที่อยู่ภายใต้สัญญา',
                data: []
            })
        } else {
            try {

                rowCount = resultCountfollow.rows[0].COUNT

                const resultFollowupList = await connection.execute(`
                SELECT * FROM (
                    SELECT CALL_TRACK_INFO.HP_NO,CALL_TRACK_INFO.CUST_ID,CALL_TRACK_INFO.PHONE_NO
                    ,CALL_TRACK_INFO.CON_R_CODE,CALL_TRACK_INFO.rec_day, CALL_TRACK_INFO.CALL_DATE,CALL_TRACK_INFO.REC_DATE, 
                    CALL_TRACK_INFO.USER_NAME,NEGO_INFO.NEG_R_CODE,CALL_TRACK_INFO.STAFF_ID, NEGO_INFO.appoint_date, NEGO_INFO.message1, 
                    NEGO_INFO.message2, NEGO_INFO.pay, em.emp_name, em.emp_lname, NEG_RESULT_P.NEG_R_DETAIL,
                    ROW_NUMBER() OVER (ORDER BY CALL_TRACK_INFO.REC_DAY DESC, NEGO_INFO.APPOINT_DATE DESC) LINE_NUMBER 
                    FROM NEGO_INFO, CALL_TRACK_INFO,NEG_RESULT_P,emp em
                    WHERE ( (CALL_TRACK_INFO.hp_no = NEGO_INFO.hp_no(+)) 
                    and NEGO_INFO.staff_id = em.emp_id(+)
                    AND (CALL_TRACK_INFO.cust_id = NEGO_INFO.cust_id(+)) 
                    AND (CALL_TRACK_INFO.STAFF_ID = NEGO_INFO.STAFF_ID(+))
                    AND (NEGO_INFO.NEG_R_CODE = NEG_RESULT_P.NEG_R_CODE(+)) 
                    AND (TO_CHAR(CALL_TRACK_INFO.rec_day,'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NEGO_INFO.rec_date(+),'dd/mm/yyyy hh24:mi:ss')) 
                    AND TO_DATE(CALL_TRACK_INFO.REC_DAY,'DD/MM/YYYY') 
                    BETWEEN TRUNC(ADD_MONTHS(TO_DATE(SYSDATE,'DD/MM/YYYY'),-2),'MM') 
                    AND LAST_DAY(TO_DATE(SYSDATE,'DD/MM/YYYY')))
                    and CALL_TRACK_INFO.HP_NO = :applicationid
                    )
                    WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend
                `, {
                    applicationid: applicationid,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultFollowupList.rows.length == 0) {
                    return res.status(404).send({
                        status: 404,
                        message: `ไม่พบรายการที่อยู่ตามเลขที่สัญญา`,
                        data: []
                    })
                } else {
                    // === resturn success data via http ===
                    const resData = resultFollowupList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาประวัติการติดตามตามเลขสัญญา : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `ไม่สามารถหาประวัติการติดตามที่ผูกกับสัญญาได้ (Count not found) : ${e.message}`
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

async function insertnegolist(req, res, next) {
    let connection;
    try {


        //=== get parameter ====
        console.log(`trigger`)
        const objectjson = req.body

        let { hp_no, cust_id, phone_no, staff_id, user_name, neg_r_code,
            appoint_date, message1, message2, con_r_code,
        } = objectjson

        // console.log(`this is all value form clietn : ${JSON.stringify(objectjson)}`)

        const token = req.user
        const userid = token.ID

        // ==== build fix param =====
        let appoint_date_dtype;
        if (appoint_date) {
            appoint_date_dtype = moment(appoint_date, 'YYYY-MM-DD').format('LL')
        }
        const currentDate = moment()
        const branch_code = '10'
        // let currentTime = new Date(currentDate).toLocaleTimeString('en-US');
        let currentTime = moment(currentDate).format("HH:mm:ss");


        connection = await oracledb.getConnection(
            config.database
        )


        // ==== insert nego record ====
        try {

            let appointmentquerynego1 = '';
            let appointmentquerynego2 = '';
            let bindparamnego = {}
            let mainquerynego1 = `INSERT INTO BTW.NEGO_INFO (
                BRANCH_CODE,
                HP_NO,
                NEG_R_CODE,
                REC_DATE,
                MESSAGE1,
                MESSAGE2,
                STAFF_ID,
                USER_NAME,
                CUST_ID`
            let mainqerynego2 = ` ) VALUES (
                :branch_code,
                :hp_no,
                :neg_r_code,
                :rec_date,
                :message1,
                :message2,
                :staff_id,
                :user_name,
                :cust_id
            `

            bindparamnego.branch_code = branch_code
            bindparamnego.hp_no = hp_no,
                bindparamnego.neg_r_code = neg_r_code,
                bindparamnego.rec_date = (new Date(currentDate)) ?? null
            bindparamnego.message1 = message1
            bindparamnego.message2 = message2
            bindparamnego.staff_id = staff_id
            bindparamnego.user_name = user_name
            bindparamnego.cust_id = cust_id

            if (appoint_date_dtype) {
                appointmentquerynego1 = `, APPOINT_DATE `
                appointmentquerynego2 = `, :appoint_date `
                bindparamnego.appoint_date = (new Date(appoint_date_dtype)) ?? null
            }

            const finalqueryinsertnego = `${mainquerynego1}${appointmentquerynego1}${mainqerynego2}${appointmentquerynego2})`

            // console.log(`sql final : ${finalqueryinsertnego}`)
            // console.log(`bind final : ${JSON.stringify(bindparamnego)}`)

            const insertnegorecord = await connection.execute(finalqueryinsertnego, bindparamnego, {
                // autoCommit: true
            })

            console.log(`create nego_info success : ${JSON.stringify(insertnegorecord)}`)

        } catch (e) {
            console.log(`error create nego record : ${e}`)
            return res.status(200).send({
                status: 400,
                message: `สร้างประวัติการติดตามไม่สำเร็จ (nego record): ${e.message ? e.message : `No message`}`
            })
        }

        // ==== insert call track info record ====
        try {
            const insertCallTrackinfo = await connection.execute(`
            INSERT INTO BTW.CALL_TRACK_INFO (
                BRANCH_CODE,
                HP_NO,
                CUST_ID,
                PHONE_NO,
                CALL_DATE,
                STAFF_ID,
                CON_R_CODE,
                REC_DATE,
                USER_NAME,
                REC_DAY
            ) VALUES (
                :branch_code,
                :hp_no,
                :cust_id,
                :phone_no,
                :call_date,
                :staff_id,
                :con_r_code,
                :rec_date,
                :user_name,
                :rec_day
            )
        `, {
                branch_code: branch_code,
                hp_no: hp_no,
                cust_id: cust_id,
                phone_no: phone_no,
                call_date: currentTime,
                staff_id: staff_id,
                con_r_code: con_r_code,
                rec_date: currentTime,
                user_name: user_name,
                rec_day: (new Date(currentDate)) ?? null

            }, {
                // autoCommit: true
            })


            console.log(`create call_track_info success : ${JSON.stringify(insertCallTrackinfo)}`)

        } catch (e) {
            console.log(`error call_track_info record : ${e}`)
            return res.status(400).send({
                status: 400,
                message: `สร้างประวัติการติดตามไม่สำเร็จ (call track info record): ${e.message ? e.message : `No message`}`
            })
        }

        // === commit all record if all created record success ===
        const commitall = await connection.commit();

        try {
            commitall
        } catch {
            console.err(err.message)
            res.send(400).send({
                status: 400,
                message: `สร้างรายการประวัตืการติดตามไม่สำเร็จ (commit fail)`,
                data: []
            })
        }

        // ==== success create nego and call track record then commit complete ==== 
        return res.status(200).send({
            status: 200,
            message: `success`,
            data: []
        })

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `ผิดพลาดไม่สามารถบันทึกรายการได้ : ${e.message}`
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

async function getlalon(req, res, next) {

    let connection;
    try {

        const { applicationid } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultLalon = await connection.execute(`
        select quo.quo_id, quo.idcard_num,quo.application_num,quo.quo_key_app_id, quo.first_name, quo.last_name, liv.LATITUDE, liv.LONDTIUDE
                from mpls_quotation quo, mpls_living_place liv
                where quo.quo_key_app_id = liv.LIV_QUO_KEY_APP_ID
                and quo.application_num is not null
                and quo.application_num = :applicationid
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultLalon.rows.length == 0) {
            return res.status(200).send({
                status: 404,
                message: `ไม่พบรายการ la/lon (not found record)`,
                data: []
            })
        } else {
            const resData = resultLalon.rows
            // console.log(`resData: ${JSON.stringify(resData)}`)
            // console.log(`resData[0].LATITUDE : ${resData[0].LATITUDE}`)
            // console.log(`resData[0].LONDTIUDE : ${resData[0].LONDTIUDE}`)
            if (!(resData[0].LATITUDE) || !(resData[0].LONDTIUDE)) {
                return res.status(404).send({
                    status: 404,
                    message: `เลขแอพพลิเคชั่น ${resData[0].APPLICATION_NUM} ไม่มีค่า LA/LON`
                })
            }

            let lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: `Success`,
                data: lowerResData
            })
        }

    } catch (e) {

        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `เกิดข้อผิดพลาดในการหาค่า latitude, longtitude ในระบบ : ${e.message}`
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

async function getaddressinfo(req, res, next) {

    let connection;
    try {

        const { contract_no } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultAddressinfo = await connection.execute(`
        select mplsq.quo_key_app_id as quotationid,
                mplsq.application_num as application_no,
                mplsliv.address,
                MPLSLIV.LATITUDE,
                MPLSLIV.LONDTIUDE,
                mplsliv.sub_district, 
                mplsliv.district, 
                mplsliv.postal_code,
                mplsliv.province_code
            from mpls_quotation mplsq, 
                mpls_living_place mplsliv

            where mplsq.quo_key_app_id = mplsliv.LIV_QUO_KEY_APP_ID
            and mplsq.contract_no = :contract_no
        `, {
            contract_no: contract_no
        }, {
            outFormat: oracledb.OBJECT
        })


        if (resultAddressinfo.rows.length == 0) {
            return res.status(200).send({
                status: 404,
                message: `ไม่พบรายการ address info (not found record)`,
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
        return res.status(400).send({
            status: 400,
            message: `เกิดข้อผิดพลาดในการหาค่า latitude, longtitude ในระบบ : ${e.message}`
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

async function updatenegolalon(req, res, next) {

    let connection;
    try {

        const { applicationid, latitude, longitude } = req.body

        connection = await oracledb.getConnection(
            config.database
        )

        const resultquotation = await connection.execute(`
        select mplsq.quo_key_app_id as quotationid
            from mpls_quotation mplsq
            where mplsq.application_num = :applicationid
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })


        if (resultquotation.rows.length == 0) {
            return res.status(200).send({
                status: 404,
                message: `ไม่พบรายการ quotationid`,
                data: []
            })
        } else {

            // === declare quotationid (19/10/2022) === 
            const resultquotationid = resultquotation.rows[0].QUOTATIONID

            // === check id not null 

            if (!resultquotationid) {
                return res.status(200).send({
                    status: 404,
                    message: `ไม่พบรายการ quotationid`,
                    data: []
                })
            }

            // === update la, lon ====

            const updatelalon = await connection.execute(`
                    UPDATE MPLS_LIVING_PLACE
                    SET LATITUDE = :latitude,
                        LONDTIUDE = :longitude
                    WHERE LIV_QUO_KEY_APP_ID = :resultquotationid
            `, {
                latitude: latitude,
                longitude: longitude,
                resultquotationid: resultquotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // === check update result ===

            if (updatelalon.rowsAffected !== 0) {
                // === success ===
                try {
                    await connection.commit()

                    // === return success ===

                    return res.status(200).send({
                        status: 200,
                        message: `success to update living place (la,lon)`,
                        data: []
                    })
                } catch (e) {
                    return res.status(400).send({
                        status: 400,
                        message: `fail during commit date (update living place)`,
                        data: []
                    })
                }
            }

        }

    } catch (e) {

        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `เกิดข้อผิดพลาดในการหาค่า latitude, longtitude ในระบบ : ${e.message}`
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

async function genqrcodenego(req, res, next) {

    let connection;

    try {

        const {
            ref_pay_num,
            type,
            contract_no
        } = req.query

        // if (!type) {
        //     return res.status(400).send({
        //         status: 200,
        //         message: `missing type payment insur`,
        //         data: []
        //     })
        // }

        // if (!ref_pay_num) {
        //     return res.status(400).send({
        //         status: 200,
        //         message: `missing ref pay code`,
        //         data: []
        //     })
        // }

        if (!contract_no) {
            return res.status(400).send({
                status: 200,
                message: `missing contract_no`,
                data: []
            })
        }

        // === USE ref_pay_num to GEN QR Image === 

        try {
            // const resData = resultREFpay.rows
            const resD = [{ REF_PAY_NUM: ref_pay_num }]
            const lowerResData = tolowerService.arrayobjtolower(resD)
            const refpay = resD[0].REF_PAY_NUM
            const billerid = process.env.BILLER_ID
            let char13 = String.fromCharCode(13);
            // const bilpaymentformat = `${billerid}${char13}${type}${refpay}${char13}${char13}0`
            const bilpaymentformat = `${billerid}${char13}${contract_no}${char13}${char13}0`
            var canvas = new Canvas.Canvas()
            JsBarcode(canvas, bilpaymentformat, {
                width: 1,
                height: 50,
                fontSize: 10,
                displayValue: false,
                margin: 0
            })
            // const resultimg = await QRCode.toDataURL(bilpaymentformat, {
            //     // === set option of QR CODE gen === 
            //     margin: 0 // === set empty area none ===
            // })
            // let bufferObj = Buffer.from(resultimg, "base64")

            // console.log(`resultimg : ${resultimg}`)

            const resultimgqr = await QRCode.toBuffer(bilpaymentformat, {
                margin: 0,
                type: 'png',
                scale: 5
            })

            // res.writeHead(
            //     200,
            //     {
            //         //content-type: image/png tells the browser to expect an image
            //         "Content-Type": "image/png",
            //     }
            // );

            // res.end(canvas.toBuffer("image/png"));
            lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
            lowerResData[0].bill_payment = bilpaymentformat
            return res.status(200).send({
                status: 200,
                message: `success`,
                data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
            })
        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `can't bind image : ${e}`,
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

// module.exports.getcontractlist = getcontractlist
module.exports.getnegotiationlist = getnegotiationlist
module.exports.getnegotiationbyid = getnegotiationbyid
module.exports.gethistorypaymentlist = gethistorypaymentlist
module.exports.getaddresscustlist = getaddresscustlist
module.exports.getaddressncblist = getaddressncblist
module.exports.getfollowuppaymentlist = getfollowuppaymentlist
module.exports.getviewcontractlist = getviewcontractlist
module.exports.insertnegolist = insertnegolist
module.exports.getphonenolist = getphonenolist
module.exports.getphonenolistcust = getphonenolistcust
module.exports.getlalon = getlalon
module.exports.getaddressinfo = getaddressinfo
module.exports.getmotocycle = getmotocycle
module.exports.genqrcodenego = genqrcodenego
module.exports.updatenegolalon = updatenegolalon
