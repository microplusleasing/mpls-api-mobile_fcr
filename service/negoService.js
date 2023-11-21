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
const fs = require('fs');
// var util = require('util');
const _util = require('./_selfutil');
const { result } = require('lodash');
const e = require('cors');
var JsBarcode = require('jsbarcode');
var QRCode = require('qrcode')
var Canvas = require("canvas")
// const path = require('path');

// const imageUtilService = require('./_imageUtilService')

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
        const { pageno, name, surname, due, applicationid, branchcode, billcode, trackcode, carcheckstatus, holder, apd, group_dpd, stage_no } = req.query

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
        let queryholder = ''
        let queryapd1 = ''
        let queryapd2 = ''
        // *** add query dpd on 02/06/2023 ****
        let querydpd = ''
        let querystageno = ''

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

        if (holder) {
            queryholder = ` and COLL_INFO_MONTHLY_VIEW.HP_HOLD = :holder `
            bindparams.holder = holder
        }

        if (apd && apd !== '') {
            const apd_date_formate = moment(new Date(apd)).format("DD/MM/YYYY")
            // queryapd1 = ` NEGO_INFO, `
            queryapd1 = ` (SELECT *
                FROM (
                  SELECT hp_no, appoint_date, REC_DATE, staff_id, neg_r_code,
                         ROW_NUMBER() OVER (PARTITION BY HP_NO ORDER BY REC_DATE DESC) AS apd_index
                  FROM BTW.NEGO_INFO
                  WHERE TRUNC(APPOINT_DATE) = TRUNC(BTW.BUDDHIST_TO_CHRIS_F(TO_DATE(:apd_date_formate, 'DD/MM/YYYY')))
                  ORDER BY REC_DATE DESC
                )
                WHERE apd_index = 1) APD , `
            queryapd2 = ` AND COLL_INFO_MONTHLY_VIEW.HP_NO = APD.HP_NO (+) AND TRUNC(APD.APPOINT_DATE) = TRUNC(BTW.BUDDHIST_TO_CHRIS_F(to_date(:apd_date_formate, 'dd/mm/yyyy'))) `
            bindparams.apd_date_formate = apd_date_formate
        }

        if (group_dpd && group_dpd !== null && group_dpd !== 'null') {
            querydpd = ` and COLL_INFO_DPD.GROUP_DPD_ID = :groupdpd `
            bindparams.groupdpd = group_dpd
        }

        if (stage_no && stage_no !== '') {
            if (stage_no !== '0') {
                querystageno = ` and coll_info_monthly_view.stage_no = :stageno `
                bindparams.stageno = stage_no
            } else {
                querystageno = ` and coll_info_monthly_view.stage_no IS NULL `
            }
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
                                    (coll_info_monthly_view.will_pay_amt - coll_info_monthly_view.collected_amt) as balance_amt, 
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
                                    X_DEALER_P.DL_BRANCH,
                                    COLL_INFO_DPD.GROUP_DPD,
                                    COLL_INFO_DPD.GROUP_DPD_ID,
                                    X_REPOSSESS_STOCK.REPOS_DATE, 
                                    X_REPOSSESS_STOCK.ESTIMATE_BRANCH_BY, 
                                    X_REPOSSESS_STOCK.ESTIMATE_BRANCH_DATETIME, 
                                    X_REPOSSESS_STOCK.ESTIMATE_AUCTION_BY, 
                                    X_REPOSSESS_STOCK.ESTIMATE_AUCTION_DATETIME, 
                                    ESTIMATE_REPO_CHECK_MASTER.WAREHOUSE_STOP, 
                                    ESTIMATE_REPO_CHECK_MASTER.MAKER_DATE,
                                    ESTIMATE_REPO_CHECK_MASTER.MAKER_NAME,
                                    ESTIMATE_REPO_CHECK_MASTER.CHECKER_DATE,
                                    ESTIMATE_REPO_CHECK_MASTER.CHECKER_NAME 
                                   -- ROW_NUMBER() OVER (ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, coll_info_monthly_view.hp_no ASC) LINE_NUMBER
                            FROM coll_info_monthly_view,
                                    black1,
                                    title_p,
                                    type_p,
                                    branch_p,
                                    status_call,
                                    x_cust_mapping_ext,
                                    X_DEALER_P,
                                    BTW.COLL_INFO_DPD, 
                                    BTW.X_REPOSSESS_STOCK, 
                                    MOBILEMPLS.ESTIMATE_REPO_CHECK_MASTER, 
                                    ${queryapd1}
                                    (select distinct hp_no
                                        from btw.CALL_TRACK_INFO 
                                        where trunc(rec_day) = trunc(sysdate)
                                        and phone_no = '0')  cti
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
                                        AND COLL_INFO_MONTHLY_VIEW.HP_NO =  COLL_INFO_DPD.HP_NO (+) 
                                        AND COLL_INFO_MONTHLY_VIEW.MONTH_END = COLL_INFO_DPD.MONTH_END (+) 
                                        AND COLL_INFO_MONTHLY_VIEW.YEAR_END = COLL_INFO_DPD.YEAR_END (+)
                                        AND COLL_INFO_MONTHLY_VIEW.HP_NO = X_REPOSSESS_STOCK.CONTRACT_NO (+) 
                                        AND COLL_INFO_MONTHLY_VIEW.HP_NO = ESTIMATE_REPO_CHECK_MASTER.CONTACT_NO (+) 
                                        ${querydpd}${querystageno}${queryname}${querysurname}${queryappid}${querydue}${querybranch}${queryholder}${queryapd2}
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

        // console.log(`fin sql = : ${finishsql}`)
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
                                    (coll_info_monthly_view.will_pay_amt - coll_info_monthly_view.collected_amt) as balance_amt,
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
                                    X_DEALER_P.DL_BRANCH, 
                                    COLL_INFO_DPD.GROUP_DPD, 
                                    COLL_INFO_DPD.GROUP_DPD_ID, 
                                    X_REPOSSESS_STOCK.REPOS_DATE, 
                                    BTW.F_GET_EMP_NAME_BY_USERNAME(X_REPOSSESS_STOCK.ESTIMATE_BRANCH_BY) AS ESTIMATE_BRANCH_BY, 
                                    X_REPOSSESS_STOCK.ESTIMATE_BRANCH_DATETIME, 
                                    BTW.F_GET_EMP_NAME_BY_USERNAME(X_REPOSSESS_STOCK.ESTIMATE_AUCTION_BY) AS ESTIMATE_AUCTION_BY, 
                                    X_REPOSSESS_STOCK.ESTIMATE_AUCTION_DATETIME, 
                                    ESTIMATE_REPO_CHECK_MASTER.WAREHOUSE_STOP, 
                                    ESTIMATE_REPO_CHECK_MASTER.MAKER_DATE,
                                    ESTIMATE_REPO_CHECK_MASTER.MAKER_NAME,
                                    ESTIMATE_REPO_CHECK_MASTER.CHECKER_DATE,
                                    ESTIMATE_REPO_CHECK_MASTER.CHECKER_NAME 
                                   -- ROW_NUMBER() OVER (ORDER BY TO_CHAR (coll_info_monthly_view.first_due, 'DD') ASC, coll_info_monthly_view.hp_no ASC) LINE_NUMBER
                            FROM coll_info_monthly_view,
                                    black1,
                                    title_p,
                                    type_p,
                                    branch_p,
                                    status_call,
                                    x_cust_mapping_ext,
                                    X_DEALER_P, 
                                    BTW.COLL_INFO_DPD, 
                                    BTW.X_REPOSSESS_STOCK, 
                                    MOBILEMPLS.ESTIMATE_REPO_CHECK_MASTER, 
                                    ${queryapd1}
                                    (select distinct hp_no
                                        from btw.CALL_TRACK_INFO 
                                        where trunc(rec_day) = trunc(sysdate)
                                        and phone_no = '0')  cti
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
                                        AND COLL_INFO_MONTHLY_VIEW.HP_NO =  COLL_INFO_DPD.HP_NO (+)  
                                        AND COLL_INFO_MONTHLY_VIEW.MONTH_END = COLL_INFO_DPD.MONTH_END (+)  
                                        AND COLL_INFO_MONTHLY_VIEW.YEAR_END = COLL_INFO_DPD.YEAR_END (+)  
                                        AND COLL_INFO_MONTHLY_VIEW.HP_NO = X_REPOSSESS_STOCK.CONTRACT_NO (+) 
                                        AND COLL_INFO_MONTHLY_VIEW.HP_NO = ESTIMATE_REPO_CHECK_MASTER.CONTACT_NO (+) 
                                        ${querydpd}${querystageno}${queryname}${querysurname}${queryappid}${querydue}${querybranch}${queryholder}${queryapd2}
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

async function getagentcollinfomonthly(req, res, next) {

    let connection;
    try {

        const { pageno, due, branch, holder, sort_type, sort_field } = req.body


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
        let querydue = ''
        let querybranch = ''
        let queryholder = ''
        let querysort = ''

        if (due) {

            querydue = ` AND SUBSTR(TO_CHAR(CM.FIRST_DUE, 'dd/mm/yyyy'), 1,2) = :due `
            const formatdue = _util.build2digitstringdate(due)
            bindparams.due = formatdue

        }

        if (holder) {
            queryholder = ` AND CM.HP_HOLD = :holder `
            bindparams.holder = holder
        }

        if (branch) {

            if (branch !== 0 && branch !== '0') {
                querybranch = ` AND BRANCH_CODE = :branch `
                bindparams.branch = branch
            }
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ``
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `SELECT ROWNUM AS LINE_NUMBER, T.*
            FROM(
            SELECT   
                    CM.HP_NO,
                    BTW.PKG_CUST_INFO.F_GET_FNAME_BY_CONTRACT(CM.HP_NO) AS CUSTOMER_NAME,
                    BTW.PKG_CUST_INFO.F_GET_SNAME_BY_CONTRACT(CM.HP_NO) AS CUSTOMER_LASTNAME,
                    CM.BILL_BEG,
                    CM.BILL_SUB_BEG,
                    CM.BILL_CURR,
                    CM.BILL_SUB_CURR,
                    CM.MONTHLY,
                    TO_NUMBER(TO_CHAR (CM.first_due, 'DD')) AS DUE,
                    CM.FIRST_DUE,  
                    BTW.GET_BRANCH_SL_BY_HP_NO(CM.HP_NO) As branch_name_hp_no,
                    (        SELECT  PV.PROV_CODE
                        FROM X_CUST_MAPPING_EXT CME,X_CUST_MAPPING CM,X_DEALER_P DL,PROVINCE_P PV
                        WHERE CME.APPLICATION_NUM = CM.APPLICATION_NUM
                        AND  CME.SL_CODE = DL.DL_CODE
                        AND  DL.DL_BRANCH = PV.PROV_CODE
                        AND CM.CUST_STATUS = '0'
                        AND CME.CONTRACT_NO = CM.HP_NO) AS branch_code,
                    STAGE_NO as STAGE,  --
                    dpd_mth.DPD,
                    dpd_mth.GROUP_DPD, 
                    dpd_mth.GROUP_DPD_ID, 
                    BTW.GET_CALL_STATUS(CM.HP_NO) as STATUS_CALL_TRACK_INFO,  --สถานะการติดตาม ล่าสุด(รอการติดต่อ,Recall)
                    BTW.GET_lastcall_rec_day(CM.HP_NO) as LASTCALL_REC_DAYTIME ---rec_day ติดตามล่าสุด
                FROM COLL_INFO_MONTHLY CM,
                        BTW.COLL_INFO_DPD  dpd_mth
                WHERE   CM.HP_NO =  dpd_mth.HP_NO
                        AND CM.month_end = dpd_mth.MONTH_END
                        AND CM.year_end = dpd_mth.YEAR_END
                        AND CM.month_end = TO_CHAR (SYSDATE, 'MM')
                        AND CM.year_end = TO_CHAR (SYSDATE, 'YYYY')
                        AND CM.STAPAY1 IS NULL 
                        AND TO_CHAR(CM.FIRST_DUE,'MMYYYY') = TO_CHAR(SYSDATE,'MMYYYY') 
                      ${querydue}${queryholder}
                --ORDER BY TO_NUMBER(TO_CHAR (CM.first_due, 'DD')) , CM.hp_no  ASC
                ${querysort}
                ) T
            WHERE STATUS_CALL_TRACK_INFO IN('W','R') 
              ${querybranch}`

        const sqlcount = `select count(LINE_NUMBER) as rowCount from (${sqlbase})`

        // console.log(`sqlstr: ${sqlcount}`)

        const resultCount = await connection.execute(sqlcount, bindparams, { outFormat: oracledb.OBJECT })

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
                const finishsql = `SELECT * FROM(${sqlbase}) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `

                const result = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

                if (result.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No negotaiation agent record',
                        data: []
                    })
                } else {

                    let resData = result.rows

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

async function getagentgroupdpd(req, res, next) {

    let connection;
    try {

        const { pageno, due, branch, holder, sort_type, sort_field, groupdpd } = req.body


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
        let querydue = ''
        let querybranch = ''
        let queryholder = ''
        let querysort = ''
        let querydpd = ''

        if (due) {

            querydue = ` AND SUBSTR(TO_CHAR(CM.FIRST_DUE, 'dd/mm/yyyy'), 1,2) = :due `
            const formatdue = _util.build2digitstringdate(due)
            bindparams.due = formatdue

        }

        if (holder) {
            queryholder = ` AND CM.HP_HOLD = :holder `
            bindparams.holder = holder
        }

        if (branch) {

            if (branch !== 0 && branch !== '0') {
                querybranch = ` AND BRANCH_CODE = :branch `
                bindparams.branch = branch
            }
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ``
        }

        if (groupdpd) {
            if (groupdpd == 1 || groupdpd == 2) {
                querydpd = ` AND dpd_mth.GROUP_DPD_ID IN (2) `
            } else {
                querydpd = ' AND dpd_mth.GROUP_DPD_ID = :groupdpd '
                bindparams.groupdpd = groupdpd
            }

        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `SELECT ROWNUM AS LINE_NUMBER, T.*
            FROM(
            SELECT   
                    CM.HP_NO,
                    BTW.PKG_CUST_INFO.F_GET_FNAME_BY_CONTRACT(CM.HP_NO) AS CUSTOMER_NAME,
                    BTW.PKG_CUST_INFO.F_GET_SNAME_BY_CONTRACT(CM.HP_NO) AS CUSTOMER_LASTNAME,
                    CM.BILL_BEG,
                    CM.BILL_SUB_BEG,
                    CM.BILL_CURR,
                    CM.BILL_SUB_CURR,
                    CM.MONTHLY,
                    CM.WILL_PAY_AMT, 
                    CM.COLLECTED_AMT, 
                    (CM.WILL_PAY_AMT - CM.COLLECTED_AMT) AS BALANCE_AMT,
                    TO_NUMBER(TO_CHAR (CM.first_due, 'DD')) AS DUE,
                    CM.FIRST_DUE,  
                    BTW.GET_BRANCH_SL_BY_HP_NO(CM.HP_NO) As branch_name_hp_no,
                    (        SELECT  PV.PROV_CODE
                        FROM X_CUST_MAPPING_EXT CME,X_CUST_MAPPING CM,X_DEALER_P DL,PROVINCE_P PV
                        WHERE CME.APPLICATION_NUM = CM.APPLICATION_NUM
                        AND  CME.SL_CODE = DL.DL_CODE
                        AND  DL.DL_BRANCH = PV.PROV_CODE
                        AND CM.CUST_STATUS = '0'
                        AND CME.CONTRACT_NO = CM.HP_NO) AS branch_code,
                    STAGE_NO as STAGE,  --
                    dpd_mth.DPD,
                    dpd_mth.GROUP_DPD, 
                    dpd_mth.GROUP_DPD_ID, 
                    BTW.GET_CALL_STATUS(CM.HP_NO) as STATUS_CALL_TRACK_INFO,  --สถานะการติดตาม ล่าสุด(รอการติดต่อ,Recall)
                    BTW.GET_lastcall_rec_day(CM.HP_NO) as LASTCALL_REC_DAYTIME, ---rec_day ติดตามล่าสุด 
                    (
                        SELECT appoint_date
                        FROM
                        (
                            SELECT
                                CT.HP_NO,
                                NG.REC_DATE,
                                NG.NEG_R_CODE,
                                NG.APPOINT_DATE
                            FROM
                                BTW.CALL_TRACK_INFO CT,
                                BTW.NEGO_INFO NG,
                                NEG_RESULT_P NG_DESC
                            WHERE
                                CT.HP_NO = NG.HP_NO
                                AND TO_CHAR(CT.REC_DAY, 'DD/MM/YYYY HH24:MI:SS') = TO_CHAR(NG.REC_DATE, 'DD/MM/YYYY HH24:MI:SS')
                                AND NG.NEG_R_CODE = NG_DESC.NEG_R_CODE
                                AND NG.APPOINT_DATE IS NOT NULL
                                AND trunc( NG.APPOINT_DATE,'MM') >= trunc(sysdate,'MM')
                            ORDER BY
                                NG.REC_DATE DESC
                        )
                       WHERE  ROWNUM < 2
                       AND HP_NO = CM.HP_NO
                    ) AS LAST_APPOINT_DATE 
                FROM COLL_INFO_MONTHLY CM,
                        BTW.COLL_INFO_DPD  dpd_mth
                WHERE   CM.HP_NO =  dpd_mth.HP_NO
                        AND CM.month_end = dpd_mth.MONTH_END
                        AND CM.year_end = dpd_mth.YEAR_END
                        AND CM.month_end = TO_CHAR (SYSDATE, 'MM')
                        AND CM.year_end = TO_CHAR (SYSDATE, 'YYYY')
                        AND CM.STAPAY1 IS NULL 
                        ${querydpd}
                      ${querydue}${queryholder}
                --ORDER BY TO_NUMBER(TO_CHAR (CM.first_due, 'DD')) , CM.hp_no  ASC
                ${querysort}
                ) T
            WHERE STATUS_CALL_TRACK_INFO IN('W','R') 
              ${querybranch}`

        const sqlcount = `select count(LINE_NUMBER) as rowCount from (${sqlbase})`

        // console.log(`sqlstr: ${sqlbase}`)

        const resultCount = await connection.execute(sqlcount, bindparams, { outFormat: oracledb.OBJECT })

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
                const finishsql = `SELECT * FROM(${sqlbase}) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `

                const result = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

                if (result.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No negotaiation agent record',
                        data: []
                    })
                } else {

                    let resData = result.rows

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

async function getagentgroupstage(req, res, next) {

    let connection;
    try {

        const { pageno, due, branch, holder, sort_type, sort_field, stage } = req.body


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
        let querydue = ''
        let querybranch = ''
        let queryholder = ''
        let querysort = ''
        let querystage = ''

        if (due) {

            querydue = ` AND SUBSTR(TO_CHAR(CM.FIRST_DUE, 'dd/mm/yyyy'), 1,2) = :due `
            const formatdue = _util.build2digitstringdate(due)
            bindparams.due = formatdue

        }

        if (holder) {
            queryholder = ` AND CM.HP_HOLD = :holder `
            bindparams.holder = holder
        }

        if (branch) {

            if (branch !== 0 && branch !== '0') {
                querybranch = ` AND BRANCH_CODE = :branch `
                bindparams.branch = branch
            }
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ``
        }

        if (stage) {
            querystage = ' AND CM.STAGE_NO IN :stage '
            bindparams.stage = stage

        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `SELECT ROWNUM AS LINE_NUMBER, T.*
            FROM(
            SELECT   
                    CM.HP_NO,
                    BTW.PKG_CUST_INFO.F_GET_FNAME_BY_CONTRACT(CM.HP_NO) AS CUSTOMER_NAME,
                    BTW.PKG_CUST_INFO.F_GET_SNAME_BY_CONTRACT(CM.HP_NO) AS CUSTOMER_LASTNAME,
                    CM.BILL_BEG,
                    CM.BILL_SUB_BEG,
                    CM.BILL_CURR,
                    CM.BILL_SUB_CURR,
                    CM.MONTHLY,
                    CM.WILL_PAY_AMT, 
                    CM.COLLECTED_AMT, 
                    (CM.WILL_PAY_AMT - CM.COLLECTED_AMT) AS BALANCE_AMT,
                    TO_NUMBER(TO_CHAR (CM.first_due, 'DD')) AS DUE,
                    CM.FIRST_DUE,
                    TO_DATE(TO_CHAR(CM.first_due,'DD')||'/'||TO_CHAR(sysdate,'MM')||'/'||TO_CHAR(sysdate,'YYYY'),'dd/mm/yyyy') AS DUEDATE, 
                    BTW.GET_BRANCH_SL_BY_HP_NO(CM.HP_NO) As branch_name_hp_no,
                    (        SELECT  PV.PROV_CODE
                        FROM X_CUST_MAPPING_EXT CME,X_CUST_MAPPING CM,X_DEALER_P DL,PROVINCE_P PV
                        WHERE CME.APPLICATION_NUM = CM.APPLICATION_NUM
                        AND  CME.SL_CODE = DL.DL_CODE
                        AND  DL.DL_BRANCH = PV.PROV_CODE
                        AND CM.CUST_STATUS = '0'
                        AND CME.CONTRACT_NO = CM.HP_NO) AS branch_code,
                    STAGE_NO as STAGE,  --
                    dpd_mth.DPD,
                    dpd_mth.GROUP_DPD, 
                    dpd_mth.GROUP_DPD_ID, 
                    BTW.GET_CALL_STATUS(CM.HP_NO) as STATUS_CALL_TRACK_INFO,  --สถานะการติดตาม ล่าสุด(รอการติดต่อ,Recall)
                    BTW.GET_lastcall_rec_day(CM.HP_NO) as LASTCALL_REC_DAYTIME, ---rec_day ติดตามล่าสุด 
                    (
                        SELECT appoint_date
                        FROM
                        (
                            SELECT
                                CT.HP_NO,
                                NG.REC_DATE,
                                NG.NEG_R_CODE,
                                NG.APPOINT_DATE
                            FROM
                                BTW.CALL_TRACK_INFO CT,
                                BTW.NEGO_INFO NG,
                                NEG_RESULT_P NG_DESC
                            WHERE
                                CT.HP_NO = NG.HP_NO
                                AND TO_CHAR(CT.REC_DAY, 'DD/MM/YYYY HH24:MI:SS') = TO_CHAR(NG.REC_DATE, 'DD/MM/YYYY HH24:MI:SS')
                                AND NG.NEG_R_CODE = NG_DESC.NEG_R_CODE
                                AND NG.APPOINT_DATE IS NOT NULL
                                AND trunc( NG.APPOINT_DATE,'MM') >= trunc(sysdate,'MM')
                            ORDER BY
                                NG.REC_DATE DESC
                        )
                       WHERE  ROWNUM < 2
                       AND HP_NO = CM.HP_NO
                    ) AS LAST_APPOINT_DATE 
                FROM COLL_INFO_MONTHLY CM,
                        BTW.COLL_INFO_DPD  dpd_mth
                WHERE   CM.HP_NO =  dpd_mth.HP_NO
                        AND CM.month_end = dpd_mth.MONTH_END
                        AND CM.year_end = dpd_mth.YEAR_END
                        -- AND CM.month_end = TO_CHAR (SYSDATE, 'MM')
                        -- AND CM.year_end = TO_CHAR (SYSDATE, 'YYYY')
                        AND CM.month_end = BTW.GET_COLL_MONTH(SYSDATE) 
                        AND CM.year_end = BTW.GET_COLL_YEAR_END(SYSDATE) 
                        AND CM.STAPAY1 IS NULL 
                        ${querystage}
                      ${querydue}${queryholder}
                --ORDER BY TO_NUMBER(TO_CHAR (CM.first_due, 'DD')) , CM.hp_no  ASC
                ${querysort}
                ) T
            WHERE STATUS_CALL_TRACK_INFO IN('W','R') 
              ${querybranch}`

        const sqlcount = `select count(LINE_NUMBER) as rowCount from (${sqlbase})`

        // console.log(`sqlstr: ${sqlcount}`)

        const resultCount = await connection.execute(sqlcount, bindparams, { outFormat: oracledb.OBJECT })

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
                const finishsql = `SELECT * FROM(${sqlbase}) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `

                const result = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

                if (result.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No negotaiation agent record',
                        data: []
                    })
                } else {

                    let resData = result.rows

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
                x_cust_mapping_ext.REF_PAY_NUM,
                cust_info.BIRTH_DATE
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
            return res.status(200).send({
                status: 400,
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
        return res.status(200).send({
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

async function getnegotiationhistorybyid(req, res, next) {
    let connection;
    try {

        // === get param from query ===

        const { applicationid } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultnego = await connection.execute(`                 
                    SELECT AC_PROVE.hp_no AS  hp_no,
                    title_p.title_id,
                    CASE WHEN COLL_INFO_MONTHLY.priority > 0 THEN '(-_-!) ' END
                    || ''
                    || title_p.title_name
                    AS tittle_name,
                    CUST_INFO.name,
                    CUST_INFO.sname,
                    type_p.type_code,
                    type_p.type_name,
                    branch_p.branch_code,
                    branch_p.branch_name,
                    COLL_INFO_MONTHLY.month_end,
                    COLL_INFO_MONTHLY.year_end,
                    COLL_INFO_MONTHLY.bill_beg,
                    COLL_INFO_MONTHLY.bill_sub_beg,
                    COLL_INFO_MONTHLY.bill_curr,
                    COLL_INFO_MONTHLY.bill_sub_curr,
                    COLL_INFO_MONTHLY.collected_inst,
                    COLL_INFO_MONTHLY.collected_amt,
                    COLL_INFO_MONTHLY.collected_date,
                    COLL_INFO_MONTHLY.by_bill,
                    COLL_INFO_MONTHLY.by_dealer,
                    AC_PROVE.monthly,
                    COLL_INFO_MONTHLY.will_pay_amt,
                    COLL_INFO_MONTHLY.will_pay_inst,
                    AC_PROVE.first_due,
                    COLL_INFO_MONTHLY.total_paid,
                    AC_PROVE.PERIOD as term,
                    COLL_INFO_MONTHLY.account_status,
                    COLL_INFO_MONTHLY.stage_no,
                    COLL_INFO_MONTHLY.safety_level,
                    COLL_INFO_MONTHLY.no_of_overdue,
                    COLL_INFO_MONTHLY.col_r_code,
                    COLL_INFO_MONTHLY.no_of_sms,
                    COLL_INFO_MONTHLY.no_of_contact,
                    COLL_INFO_MONTHLY.no_of_appoint,
                    COLL_INFO_MONTHLY.flag,
                    status_call.flagname,
                    x_cust_mapping.cust_no,
                    COLL_INFO_MONTHLY.perc_pay, 
                    COLL_INFO_MONTHLY.stapay,
                    COLL_INFO_MONTHLY.hp_hold,
                    COLL_INFO_MONTHLY.nego_id,
                    COLL_INFO_MONTHLY.stapay1,
                    COLL_INFO_MONTHLY.unp_mrr,
                    COLL_INFO_MONTHLY.unp_100,
                    COLL_INFO_MONTHLY.unp_200,
                    x_cust_mapping_ext.bussiness_code,
                    x_cust_mapping_ext.dl_code,
                    COLL_INFO_MONTHLY.ROLLBACK_CALL,
                    CUST_INFO.IDCARD_NUM,
                    x_cust_mapping_ext.CREATE_CONTRACT_DATE,
                    x_cust_mapping_ext.REF_PAY_NUM,
                    cust_info.BIRTH_DATE
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
                    coll_info_monthly_view COLL_INFO_MONTHLY,
                    status_call
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
                    AND( AC_PROVE.HP_NO = COLL_INFO_MONTHLY.HP_NO(+)
                    AND COLL_INFO_MONTHLY.flag = status_call.flag(+))
                    AND AC_PROVE.HP_NO = :applicationid
                    ORDER BY TO_CHAR (TO_DATE(AC_PROVE.FIRST_DUE,'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
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
            return res.status(200).send({
                status: 400,
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
        return res.status(200).send({
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

async function getmotocyclenego(req, res, next) {
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
                X_MODEL_P.MODEL||'/'|| X_MODEL_P.DESCRIPTION||'/'|| X_MODEL_P.MODEL_GROUP as MODEL,
                X_MODEL_P.CC,
                X_PRODUCT_DETAIL.COLOR,
                X_PRODUCT_DETAIL.ENGINE_NUMBER||X_PRODUCT_DETAIL.ENGINE_NO_RUNNING AS ENGINE_NUMBER,
                X_PRODUCT_DETAIL.CHASSIS_NUMBER||X_PRODUCT_DETAIL.CHASSIS_NO_RUNNING AS CHASSIS_NUMBER,
                X_PRODUCT_DETAIL.MOTOR_NUMBER,
                AC_PROVE.REG_NO,
                AC_PROVE.REG_CITY, 
                BTW.GET_PROVINCE(AC_PROVE.REG_CITY) AS REG_CITY_NAME 
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
                status: 200,
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

async function getmotocyclenegohistory(req, res, next) {
    let connection;
    try {

        // === get param from query ===

        const { hp_no } = req.query

        connection = await oracledb.getConnection(
            config.database
        )

        const resultmotorcycle = await connection.execute(`
                SELECT AC_PROVE.hp_no AS  hp_no,
                title_p.title_id,
                CASE WHEN COLL_INFO_MONTHLY.priority > 0 THEN '(-_-!) ' END
                || ''
                || title_p.title_name
                AS tittle_name,
                CUST_INFO.name,
                CUST_INFO.sname,
                type_p.type_code,
                type_p.type_name,
                branch_p.branch_code,
                branch_p.branch_name,
                COLL_INFO_MONTHLY.month_end,
                COLL_INFO_MONTHLY.year_end,
                COLL_INFO_MONTHLY.bill_beg,
                COLL_INFO_MONTHLY.bill_sub_beg,
                COLL_INFO_MONTHLY.bill_curr,
                COLL_INFO_MONTHLY.bill_sub_curr,
                COLL_INFO_MONTHLY.collected_inst,
                COLL_INFO_MONTHLY.collected_amt,
                COLL_INFO_MONTHLY.collected_date,
                COLL_INFO_MONTHLY.by_bill,
                COLL_INFO_MONTHLY.by_dealer,
                AC_PROVE.monthly,
                COLL_INFO_MONTHLY.will_pay_amt,
                COLL_INFO_MONTHLY.will_pay_inst,
                AC_PROVE.first_due,
                COLL_INFO_MONTHLY.total_paid,
                AC_PROVE.PERIOD as term,
                COLL_INFO_MONTHLY.account_status,
                COLL_INFO_MONTHLY.stage_no,
                COLL_INFO_MONTHLY.safety_level,
                COLL_INFO_MONTHLY.no_of_overdue,
                COLL_INFO_MONTHLY.col_r_code,
                COLL_INFO_MONTHLY.no_of_sms,
                COLL_INFO_MONTHLY.no_of_contact,
                COLL_INFO_MONTHLY.no_of_appoint,
                COLL_INFO_MONTHLY.flag,
                status_call.flagname,
                x_cust_mapping.cust_no,
                COLL_INFO_MONTHLY.perc_pay, 
                COLL_INFO_MONTHLY.stapay,
                COLL_INFO_MONTHLY.hp_hold,
                COLL_INFO_MONTHLY.nego_id,
                COLL_INFO_MONTHLY.stapay1,
                COLL_INFO_MONTHLY.unp_mrr,
                COLL_INFO_MONTHLY.unp_100,
                COLL_INFO_MONTHLY.unp_200,
                x_cust_mapping_ext.bussiness_code,
                x_cust_mapping_ext.dl_code,
                BTW.GET_DEALER_NAME(x_cust_mapping_ext.dl_code) as dl_name,
                COLL_INFO_MONTHLY.ROLLBACK_CALL,
                X_DEALER_P.DL_BRANCH,
                X_CUST_MAPPING_EXT.APPLICATION_NUM,
                X_PRODUCT_DETAIL.BRAND_CODE,
                X_BRAND_P.BRAND_NAME,
                X_PRODUCT_DETAIL.MODELCODE,
                X_MODEL_P.MODEL ||'/'|| X_MODEL_P.DESCRIPTION||'/'|| X_MODEL_P.MODEL_GROUP as MODEL,
                X_MODEL_P.CC,
                X_PRODUCT_DETAIL.COLOR,
                X_PRODUCT_DETAIL.ENGINE_NUMBER||X_PRODUCT_DETAIL.ENGINE_NO_RUNNING AS ENGINE_NUMBER,
                X_PRODUCT_DETAIL.CHASSIS_NUMBER||X_PRODUCT_DETAIL.CHASSIS_NO_RUNNING AS CHASSIS_NUMBER,
                AC_PROVE.REG_NO,
                AC_PROVE.REG_CITY, 
                BTW.GET_PROVINCE(AC_PROVE.REG_CITY) AS REG_CITY_NAME 
                FROM    AC_PROVE,
                x_cust_mapping_ext,
                x_cust_mapping,
                type_p,
                CUST_INFO,--
                title_p,
                X_PRODUCT_DETAIL,
                X_BRAND_P,
                X_MODEL_P,
                X_DEALER_P,
                BRANCH_P,
                coll_info_monthly_view COLL_INFO_MONTHLY,
                status_call
                WHERE   AC_PROVE.HP_NO = x_cust_mapping_ext.CONTRACT_NO
                AND    x_cust_mapping_ext.LOAN_RESULT='Y'
                AND    AC_PROVE.AC_DATE IS NOT NULL
                AND AC_PROVE.CANCELL = 'F'
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
                AND( AC_PROVE.HP_NO = COLL_INFO_MONTHLY.HP_NO(+)
                AND COLL_INFO_MONTHLY.flag = status_call.flag(+))
                AND AC_PROVE.HP_NO = :hp_no
                ORDER BY TO_CHAR (TO_DATE(AC_PROVE.FIRST_DUE,'DD/MM/YYYY'), 'DD') ASC, AC_PROVE.HP_NO ASC
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
                status: 200,
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
                status: 200,
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
                            COLL_RECIEPT.PAY_CODE, 
                            COLL_RECIEPT.INST_NO AS ROUND_PAYMENT, 
                            BTW.PKG_MONTH_END.GET_OUTSTAND_BALANCE('N',:applicationid,to_char(sysdate,'dd/mm/yyyy'),null,'BTW.') AS OUT_STAND_MAIN,
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
                    return res.stauts(200).send({
                        status: 200,
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
                return res.status(200).send({
                    status: 400,
                    message: `การเรียกดูประวัติการชำระเงินผิดพลาด : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
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
                status: 200,
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
                    return res.status(200).send({
                        status: 200,
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
                return res.status(200).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาที่อยู่ตามเลขสัญญา : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
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
                status: 200,
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
                    return res.status(200).send({
                        status: 200,
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
                return res.status(200).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาที่อยู่ตามเลขสัญญา : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
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
                                    SELECT PHONE_NO, PHONE_NUMBER, 
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
                status: 200,
                message: 'ไม่พบรายการเบอร์โทรของลูกค้า',
                data: []
            })
        } else {
            try {

                rowCount = resultCountphone.rows[0].COUNT

                const resultphoneList = await connection.execute(`
                select * from 
                (
                    SELECT PHONE_NO, PHONE_NUMBER, 
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
                    return res.status(200).send({
                        status: 200,
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
                return res.status(200).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาเบอร์โทรของลูกค้า : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
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
            AND PHONE_TYPE_CODE NOT IN ('REF', 'RF1', 'SMS')
        `, {
            cust_id: cust_id
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountphone.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 200,
                message: 'ไม่พบรายการเบอร์โทรของลูกค้า',
                data: []
            })
        } else {
            try {

                rowCount = resultCountphone.rows[0].COUNT

                const resultphoneList = await connection.execute(`
                select * from 
                (
                    SELECT PHONE_INFO.PHONE_NO, PHONE_INFO.PHONE_NUMBER, PHONE_INFO.CUST_ID, CUST_INFO.NAME, CUST_INFO.SNAME, 
                    ROW_NUMBER() OVER (ORDER BY PHONE_INFO.REC_DATE DESC) LINE_NUMBER
                    FROM
                    BTW.PHONE_INFO, BTW.CUST_INFO
                    WHERE PHONE_INFO.CUST_ID = CUST_INFO.CUST_NO
                    AND PHONE_INFO.PHONE_STATUS_CODE = 'CN'
                    AND CUST_INFO.CUST_NO = :cust_id
                    AND PHONE_TYPE_CODE NOT IN ('REF', 'RF1', 'SMS')
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
                    return res.status(200).send({
                        status: 200,
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
                return res.status(200).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาเบอร์โทรของลูกค้า : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
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

async function getfollowuppaymentlist(req, res, next) {
    let connection;

    try {
        const { pageno, applicationid, type } = req.body

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;

        let bindparams = {};
        let queryconrcode = ''

        if (type == 1) {
            queryconrcode = ``
        } else if (type == 2) {
            queryconrcode = ` AND NEGO_INFO.NEG_R_CODE = 'M03' `
        } else {
            queryconrcode = ``
        }


        connection = await oracledb.getConnection(
            config.database
        )

        const resultCountfollow = await connection.execute(`
        SELECT COUNT (CALL_TRACK_INFO.HP_NO) AS COUNT
        FROM NEGO_INFO, CALL_TRACK_INFO,NEG_RESULT_P,emp em
        WHERE ( (CALL_TRACK_INFO.hp_no = NEGO_INFO.hp_no(+)) 
        AND NEGO_INFO.staff_id = em.emp_id(+)
        AND (CALL_TRACK_INFO.cust_id = NEGO_INFO.cust_id(+)) 
        AND (CALL_TRACK_INFO.STAFF_ID = NEGO_INFO.STAFF_ID(+))
         AND (NEGO_INFO.NEG_R_CODE = NEG_RESULT_P.NEG_R_CODE(+)) 
         AND (TO_CHAR(CALL_TRACK_INFO.rec_day,'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NEGO_INFO.rec_date(+),'dd/mm/yyyy hh24:mi:ss')) 
         AND TO_DATE(CALL_TRACK_INFO.REC_DAY,'DD/MM/YYYY') 
        BETWEEN TRUNC(ADD_MONTHS(TO_DATE(SYSDATE,'DD/MM/YYYY'),-2),'MM') 
        AND LAST_DAY(TO_DATE(SYSDATE,'DD/MM/YYYY')))
        AND CALL_TRACK_INFO.HP_NO = :applicationid
        ${queryconrcode}
        AND NEGO_INFO.NEG_R_CODE IS NOT NULL 
        `, {
            applicationid: applicationid
        }, {
            outFormat: oracledb.OBJECT
        })



        if (resultCountfollow.rows[0].COUNT == 0) {
            return res.status(200).send({
                status: 200,
                message: 'ไม่พบรายการติดตามที่อยู่ภายใต้สัญญา',
                data: []
            })
        } else {
            try {

                rowCount = resultCountfollow.rows[0].COUNT

                const resultFollowupList = await connection.execute(`
                    SELECT * FROM 
                    (
                        SELECT CALL_TRACK_INFO.HP_NO,CALL_TRACK_INFO.CUST_ID,CALL_TRACK_INFO.PHONE_NO, 
                                CALL_TRACK_INFO.CON_R_CODE,CALL_TRACK_INFO.REC_DAY, CALL_TRACK_INFO.CALL_DATE,CALL_TRACK_INFO.REC_DATE, 
                                CALL_TRACK_INFO.USER_NAME,NEGO_INFO.NEG_R_CODE,CALL_TRACK_INFO.STAFF_ID, NEGO_INFO.APPOINT_DATE, NEGO_INFO.message1, 
                                NEGO_INFO.MESSAGE2, NEGO_INFO.PAY, EM.EMP_NAME, EM.EMP_LNAME, NEG_RESULT_P.NEG_R_DETAIL, NEGO_INFO.CALL_KEYAPP_ID, 
                                CALL_TRACK_INFO.LATITUDE, CALL_TRACK_INFO.LONGITUDE, BTW.RESULT_SITEVISIT_P.DETAIL AS RESULT_SITE_VISIT, 
                                BTW.ADDRESS_TYPE_P.ADDR_TYPE_NAME, 
                                (
                                    SELECT COUNT(CALL_KEYAPP_ID)
                                    FROM BTW.SITE_VISIT_IMAGE
                                    WHERE SITE_VISIT_IMAGE.CALL_KEYAPP_ID = NEGO_INFO.CALL_KEYAPP_ID
                                ) AS IMAGE_COUNT, 
                                ROW_NUMBER() OVER (ORDER BY CALL_TRACK_INFO.REC_DAY DESC, NEGO_INFO.APPOINT_DATE DESC) LINE_NUMBER 
                        FROM    NEGO_INFO, 
                                CALL_TRACK_INFO, 
                                NEG_RESULT_P, 
                                BTW.RESULT_SITEVISIT_P, 
                                BTW.ADDRESS_TYPE_P, 
                                EMP EM
                        WHERE ( (CALL_TRACK_INFO.HP_NO = NEGO_INFO.hp_no(+)) 
                                AND NEGO_INFO.STAFF_ID = EM.EMP_ID(+)
                                AND (CALL_TRACK_INFO.CUST_ID = NEGO_INFO.CUST_ID(+)) 
                                AND (CALL_TRACK_INFO.STAFF_ID = NEGO_INFO.STAFF_ID(+))
                                AND (NEGO_INFO.NEG_R_CODE = NEG_RESULT_P.NEG_R_CODE(+)) 
                                AND (TO_CHAR(CALL_TRACK_INFO.REC_DAY,'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NEGO_INFO.REC_DATE(+),'dd/mm/yyyy hh24:mi:ss')) 
                                AND TO_DATE(CALL_TRACK_INFO.REC_DAY,'DD/MM/YYYY') 
                                BETWEEN TRUNC(ADD_MONTHS(TO_DATE(SYSDATE,'DD/MM/YYYY'),-2),'MM') 
                                AND LAST_DAY(TO_DATE(SYSDATE,'DD/MM/YYYY'))) 
                                AND NEGO_INFO.RESULT_SITEVISIT_CODE = RESULT_SITEVISIT_P.CODE (+)
                                AND NEGO_INFO.LOCATION_SITEVISIT_ADDR_TYPE = ADDRESS_TYPE_P.ADDR_TYPE_CODE (+)
                                AND CALL_TRACK_INFO.HP_NO = :applicationid
                                ${queryconrcode}
                                AND NEGO_INFO.NEG_R_CODE IS NOT NULL
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
                    return res.status(200).send({
                        status: 200,
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
                return res.status(200).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาดในการหาประวัติการติดตามตามเลขสัญญา : ${e.message}`
                })
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
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
        const token = req.user
        const userid = token.ID

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

        const reqData = JSON.parse(formData.item)

        let imagesArray = [];
        let coverImageArray = [];
        if (fileData && fileData.images) {
            console.log(`check length : ${fileData.images.length}`)
            imagesArray = fileData.images ? fileData.images : []
            coverImageArray = fileData.coverimages ? fileData.coverimages : []
        }

        // Generate a UUID
        const uuid = uuidv4();
        // Remove hyphens from the UUID
        const key = uuid.replace(/-/g, '');


        imagetobuffer = (file) => {
            return fs.readFileSync(file.path);
        }

        let imageBindingData = []

        if (imagesArray) {
            if ((imagesArray.length !== 0) && (imagesArray.length == coverImageArray.length)) {
                // ==== test build cover image ====

                for (let i = 0; i < imagesArray.length; i++) {
                    console.log(`cehck data in loop : ${JSON.stringify(imagesArray[i])}`)
                    imageBindingData.push(
                        {
                            call_keyapp_id: key,
                            image_index: i,
                            image_type: imagesArray[i].headers['content-type'],
                            image_file: imagetobuffer(imagesArray[i]),
                            image_cover: imagetobuffer(coverImageArray[i])
                        })
                }
            }
        }

        // ==== build fix param =====
        let appoint_date_dtype;
        // console.log(`appoint_date : ${appoint_date}`)
        if (reqData.appoint_date) {
            // appoint_date_dtype = moment(appoint_date, 'YYYY-MM-DD').format('LL')
            appoint_date_dtype = moment(reqData.appoint_date, 'DD/MM/YYYY').format('LL')
        }
        const currentDate = moment()
        const branch_code = '10'
        // let currentTime = new Date(currentDate).toLocaleTimeString('en-US');
        let currentTime = moment(currentDate).format("HH:mm:ss");


        connection = await oracledb.getConnection(
            config.database
        )


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
                REC_DAY, 
                LATITUDE,
                LONGITUDE, 
                ERR_LATI_LONGI_DESC,
                CALL_KEYAPP_ID 
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
                :rec_day, 
                :latitude,
                :longitude, 
                :err_lati_longi_desc,
                :call_keyapp_id 
            )
        `, {
                branch_code: branch_code,
                hp_no: reqData.hp_no,
                cust_id: reqData.cust_id,
                phone_no: reqData.phone_no,
                call_date: currentTime,
                staff_id: reqData.staff_id,
                con_r_code: reqData.con_r_code,
                rec_date: currentTime,
                user_name: reqData.user_name,
                rec_day: (new Date(currentDate)) ?? null,
                latitude: reqData.latitude,
                longitude: reqData.longitude,
                err_lati_longi_desc: reqData.errmsg ? reqData.errmsg : '',
                call_keyapp_id: key

            }, {
                autoCommit: true
            })


            console.log(`create call_track_info success : ${JSON.stringify(insertCallTrackinfo)}`)

        } catch (e) {
            try {
                if (connection) {
                    console.log(`trigger rollback (create call track)`)
                    await connection.rollback()
                    console.log(`rollback success (create call track)`)
                    return res.status(200).send({
                        status: 400,
                        message: `สร้างประวัติการติดตามไม่สำเร็จ (call track info record): ${e.message ? e.message : `No message`}`
                    })
                } else {
                    console.log(`create call_track_info success (no-connection) (create call track)`)
                    return res.status(200).send({
                        status: 400,
                        message: `สร้างประวัติการติดตามไม่สำเร็จ (call track info record): ${e.message ? e.message : `No message`}`
                    })
                }
            } catch (e) {
                return res.status(400).send({
                    status: 400,
                    message: `สร้างประวัติการติดตามไม่สำเร็จ (call track info record), (rollback fail): ${e.message ? e.message : `No message`}`
                })
            }
        }

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
                        CUST_ID, 
                        STATUS_RECALL, 
                        REQ_DUNNING_LETTER, 
                        REQ_ASSIGN_FCR, 
                        LOCATION_SITEVISIT_ADDR_TYPE, 
                        RESULT_SITEVISIT_CODE, 
                        CALL_KEYAPP_ID`
            let mainqerynego2 = ` ) VALUES (
                        :branch_code,
                        :hp_no,
                        :neg_r_code,
                        :rec_date,
                        :message1,
                        :message2,
                        :staff_id,
                        :user_name,
                        :cust_id,
                        :status_recall,
                        :req_dunning_letter,
                        :req_assign_fcr, 
                        :location_sitevisit_addr_type, 
                        :result_sitevisit_code, 
                        :call_keyapp_id 
                    `

            bindparamnego.branch_code = branch_code
            bindparamnego.hp_no = reqData.hp_no,
                bindparamnego.neg_r_code = reqData.neg_r_code,
                bindparamnego.rec_date = (new Date(currentDate)) ?? null
            bindparamnego.message1 = reqData.message1
            bindparamnego.message2 = reqData.message2
            bindparamnego.staff_id = reqData.staff_id
            bindparamnego.user_name = reqData.user_name
            bindparamnego.cust_id = reqData.cust_id
            // *** add more 3 optional field (31/07/2023) ***
            bindparamnego.status_recall = reqData.recall
            bindparamnego.req_dunning_letter = reqData.dunning_letter
            bindparamnego.req_assign_fcr = reqData.assign_fcr
            bindparamnego.location_sitevisit_addr_type = reqData.location_sitevisit_addr_type
            bindparamnego.result_sitevisit_code = reqData.result_sitevisit_code
            bindparamnego.call_keyapp_id = key

            if (appoint_date_dtype) {
                appointmentquerynego1 = `, APPOINT_DATE `
                appointmentquerynego2 = `, BTW.BUDDHIST_TO_CHRIS_F(:appoint_date) `
                bindparamnego.appoint_date = (new Date(appoint_date_dtype)) ?? null
            }


            const finalqueryinsertnego = `${mainquerynego1}${appointmentquerynego1}${mainqerynego2}${appointmentquerynego2})`

            // console.log(`sql final : ${finalqueryinsertnego}`)
            // console.log(`bind final : ${JSON.stringify(bindparamnego)}`)

            const insertnegorecord = await connection.execute(finalqueryinsertnego, bindparamnego, {
                autoCommit: true
            })

            console.log(`create nego_info success : ${JSON.stringify(insertnegorecord)}`)

        } catch (e) {
            console.log(`error create nego record : ${e}`)
            try {
                if (connection) {
                    console.log(`trigger rollback (create nego_info)`)
                    await connection.rollback()
                    console.log(`rollback success (create nego_info)`)
                    return res.status(200).send({
                        status: 400,
                        message: `สร้างประวัติการติดตามไม่สำเร็จ (nego record): ${e.message ? e.message : `No message`}`
                    })
                } else {
                    console.log(`error create nego record (no - connection) (create nego_info)`)
                    return res.status(200).send({
                        status: 400,
                        message: `สร้างประวัติการติดตามไม่สำเร็จ (nego record): ${e.message ? e.message : `No message`}`
                    })
                }

            } catch (e) {
                return res.status(200).send({
                    status: 400,
                    message: `สร้างประวัติการติดตามไม่สำเร็จ (nego record) , (rollback fail): ${e.message ? e.message : `No message`}`
                })
            }
        }

        // ==== insert image attach (12/09/2023) ====
        try {
            if (imageBindingData.length !== 0) {

                const sql = `INSERT INTO BTW.SITE_VISIT_IMAGE 
                (
                    CALL_KEYAPP_ID, 
                    IMAGE_INDEX, 
                    IMAGE_TYPE,
                    IMAGE_FILE, 
                    IMAGE_COVER, 
                    ACTIVE_STATUS
                )
                    VALUES 
                (
                    :call_keyapp_id, 
                    :image_index, 
                    :image_type, 
                    :image_file, 
                    :image_cover, 
                    'Y' 
                )`

                const binds = imageBindingData;

                const options = {
                    bindDefs: {
                        call_keyapp_id: { type: oracledb.STRING, maxSize: 50 },
                        image_index: { type: oracledb.NUMBER },
                        image_type: { type: oracledb.STRING, maxSize: 200 },
                        image_file: { type: oracledb.BLOB, maxSize: 5000000 },
                        image_cover: { type: oracledb.BLOB, maxSize: 5000000 },
                    }
                }

                const resultInsertImageAttachSitevisit = await connection.executeMany(sql, binds, { options, autoCommit: true })
                console.log(`success insert image attach Site visit : ${resultInsertImageAttachSitevisit.rowsAffected}`)
            }
        } catch (e) {
            console.log(`error image attach : ${e}`)
            try {
                if (connection) {
                    console.log(`trigger rollback (create image attach)`)
                    await connection.rollback()
                    console.log(`rollback success (create image attach)`)
                    return res.status(200).send({
                        status: 400,
                        message: `อัพโหลดไฟล์รูปแนบไม่สำเร็จ (image attach): ${e.message ? e.message : `No message`}`
                    })
                } else {
                    console.log(`error image attach (no - connection) (create image attach)`)
                    return res.status(200).send({
                        status: 400,
                        message: `อัพโหลดไฟล์รูปแนบไม่สำเร็จ (image attach): ${e.message ? e.message : `No message`}`
                    })
                }

            } catch (e) {
                return res.status(200).send({
                    status: 400,
                    message: `อัพโหลดไฟล์รูปแนบไม่สำเร็จ (image attach) , (rollback fail): ${e.message ? e.message : `No message`}`
                })
            }
        }

        // ==== success create nego and call track record then commit complete ==== 

        // console.log(`before return success value`)
        return res.status(200).send({
            status: 200,
            message: `success`,
            data: []
        })


    } catch (e) {
        // console.error(e)
        try {
            if (connection) {
                await connection.rollback()
                console.log(`insertnegolist Error: ${e.message ? e.message : `No err msg`}`)
                return res.status(400).send({
                    status: 400,
                    message: `ผิดพลาดไม่สามารถบันทึกรายการได้ : ${e.message}`
                })
            } else {
                console.log(`insertnegolist Error (no connection): ${e.message ? e.message : `No err msg`}`)
                return res.status(400).send({
                    status: 400,
                    message: `ผิดพลาดไม่สามารถบันทึกรายการได้ : ${e.message}`
                })
            }


        } catch (e) {
            console.log(`insertnegolist Error rollback: ${e.message ? e.message : `No err msg`}`)
            return res.status(400).send({
                status: 400,
                message: `ผิดพลาดไม่สามารถบันทึกรายการได้ (fail rollback): ${e.message}`
            })
        }
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log(`connection close success`)
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        } else {
            console.log(`can't create instanct of connection oracledb !`)
            return res.status(200).send({
                status: false,
                message: `Error (can't connect oracledb , try againt later)`
            })
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
                status: 200,
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
        return res.status(200).send({
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

async function createaddressInfo(req, res, next) {
    let connection;
    try {

        const reqData = req.body

        // === check all query require ===
        if (
            !(reqData.applicationid &&
                reqData.address &&
                reqData.sub_district &&
                reqData.district &&
                reqData.province_name &&
                reqData.province_code &&
                reqData.postal_code &&
                reqData.la &&
                reqData.lon &&
                reqData.lalon)
        ) {
            return res.status(200).send({
                status: 500,
                message: `mission parameter `,
                data: []
            })
        }

        // --- connect db ---
        connection = await oracledb.getConnection(config.database)
        // === check recent mpls_living_place key on mpls_quotation === 
        const getkeyliving = await connection.execute(`
            SELECT QUO_KEY_APP_ID, QUO_LIVING_PLACE_ID FROM MPLS_QUOTATION
            WHERE CONTRACT_NO = :APPLICATIONID
        `, {
            APPLICATIONID: reqData.applicationid
        }, { outFormat: oracledb.OBJECT })

        console.log(`rows Data : ${JSON.stringify(getkeyliving.rows)}`)

        if (getkeyliving.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่มีรายการในระบบ MOBILEMPLS`,
                data: []
            })
        }

        const recentlivingid = getkeyliving.rows[0].QUO_LIVING_PLACE_ID

        if (recentlivingid) {
            return res.status(200).send({
                status: 500,
                message: `มีรายการที่อยู่ปัจจุบันอยู่แล้ว (QUO_LIVING_PLACE_ID)`,
                data: []
            })
        }

        const quotationid = getkeyliving.rows[0].QUO_KEY_APP_ID

        console.log(`this is quotationid : ${quotationid}`)
        if (!quotationid) {
            return res.status(200).send({
                statsu: 500,
                message: `ไม่พบ quotationid ของรายการ ไม่สามารถเพิ่มที่อยู่ได้`,
                data: []
            })
        }

        // === gen uuid for mpls_living_place ====
        const livinguuid = uuidv4()

        // === create mpls_living_place and update mpls_quotation ====
        try {
            // === create mpls_living_place ====
            const createlivingplace = await connection.execute(`
            INSERT INTO MPLS_LIVING_PLACE (
                LIV_QUO_KEY_APP_ID, 
                APP_KEY_ID, 
                ADDRESS, 
                SUB_DISTRICT, 
                DISTRICT, 
                PROVINCE_NAME, 
                PROVINCE_CODE, 
                POSTAL_CODE, 
                LATITUDE, 
                LONDTIUDE, 
                LALON
            )
            VALUES (
                :LIV_QUO_KEY_APP_ID, 
                :APP_KEY_ID, 
                :ADDRESS, 
                :SUB_DISTRICT, 
                :DISTRICT, 
                :PROVINCE_NAME, 
                :PROVINCE_CODE, 
                :POSTAL_CODE, 
                :LATITUDE, 
                :LONDTIUDE, 
                :LALON
            )`, {
                LIV_QUO_KEY_APP_ID: quotationid,
                APP_KEY_ID: livinguuid,
                ADDRESS: reqData.address,
                SUB_DISTRICT: reqData.sub_district,
                DISTRICT: reqData.district,
                PROVINCE_NAME: reqData.province_name,
                PROVINCE_CODE: reqData.province_code,
                POSTAL_CODE: reqData.postal_code,
                LATITUDE: reqData.la,
                LONDTIUDE: reqData.lon,
                LALON: reqData.lalon

            }, { outFormat: oracledb.OBJECT })

            const updatequotation = await connection.execute(`
                UPDATE MPLS_QUOTATION 
                SET
                    QUO_LIVING_PLACE_ID = :QUO_LIVING_PLACE_ID
                WHERE 
                    QUO_KEY_APP_ID = :QUOTATIONID
            `, {
                QUO_LIVING_PLACE_ID: livinguuid,
                QUOTATIONID: quotationid
            }, { outFormat: oracledb.OBJECT })

            if (createlivingplace.rowsAffected !== 1 && updatequotation.rowsAffected !== 1) {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถเพิ่มที่อยู่ปัจจุบันได้ (updatequotation: ${updatequotation.rowsAffected} , createlivingplace: ${createlivingplace.rowsAffected})`
                })
            }

            // ==== success update and create ====
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.status(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }

            // === return success message ====

            return res.status(200).send({
                status: 200,
                message: `success add living place`,
                data: []
            })


        } catch (e) {
            return res.status(200).send({
                status: 500,
                message: `Error during create living place : ${e.message ? e.message : 'No return message'}`
            })
        }




    } catch (e) {

        console.error(e)
        return res.status(200).send({
            status: 500,
            message: `Error Create addressinfo : ${e.message}`
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
            where mplsq.contract_no = :applicationid
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
            return res.status(200).send({
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

async function getholdermaster(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const holder_list = await connection.execute(`
                                SELECT hp_hold
                                FROM
                                (SELECT T.*,
                                        ep.DETAILS
                                FROM
                                    (SELECT A.*
                                    FROM
                                        (SELECT coll_info_monthly_view.hp_hold,
                                                coll_info_monthly_view.HP_NO
                                        FROM coll_info_monthly_view,
                                            black1,
                                            title_p,
                                            type_p,
                                            branch_p,
                                            status_call,
                                            x_cust_mapping_ext,
                                            X_DEALER_P,

                                        (SELECT DISTINCT hp_no
                                            FROM btw.CALL_TRACK_INFO
                                            WHERE trunc(rec_day) = trunc(sysdate)
                                            AND phone_no = '0') cti
                                        WHERE ((coll_info_monthly_view.hp_no = black1.hp(+))
                                                AND (title_p.title_id(+) = black1.fname_code)
                                                AND (black1.TYPE = type_p.type_code(+))--AND (coll_info_monthly_view.branch_code = branch_p.branch_code)

                                                AND (coll_info_monthly_view.flag = status_call.flag)
                                                AND coll_info_monthly_view.hp_no = x_cust_mapping_ext.contract_no)
                                        AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE(+)
                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                                        AND coll_info_monthly_view.hp_no = cti.hp_no(+)
                                        AND COLL_INFO_MONTHLY_VIEW.STAPAY1 IS NULL ) A
                                    WHERE HP_NO IS NOT NULL
                                        AND HP_HOLD IS NOT NULL ) T,
                                        ESTIMATE_REPO_CHECK_MASTER em,
                                        ESTIMATE_REPO_CHECK_MASTER_P ep
                                WHERE T.HP_NO = em.CONTACT_NO(+)
                                    AND em.STATUS = ep.STATUS(+))
                                GROUP BY hp_hold`
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        // check length 

        if (holder_list.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No holder data',
                data: []
            })
        } else {

            const filter_holder = holder_list.rows.map(obj => `'${obj.HP_HOLD}'`);

            // console.log(`filter holder : ${filter_holder}`)

            // maping emp id with name from EMP db

            const mappingHolder = await connection.execute(`
            SELECT  
                EMP_ID, EMP_NAME, EMP_NAME ||' '|| EMP_LNAME AS EMP_FULLNAME, EMP_LNAME 
            FROM EMP
            WHERE EMP_ID IN (${filter_holder})
            `, {}, { outFormat: oracledb.OBJECT })

            if (mappingHolder.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: 'No holder data',
                    data: []
                })
            } else {
                const resData = mappingHolder.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                return res.status(200).send({
                    status: 200,
                    message: 'success',
                    data: lowerResData
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

async function getagentholdermaster(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const holder_list = await connection.execute(`
                                SELECT hp_hold
                                FROM
                                (SELECT T.*,
                                        ep.DETAILS
                                FROM
                                    (SELECT A.*
                                    FROM
                                        (SELECT coll_info_monthly_view.hp_hold,
                                                coll_info_monthly_view.HP_NO
                                        FROM coll_info_monthly_view,
                                            black1,
                                            title_p,
                                            type_p,
                                            branch_p,
                                            status_call,
                                            x_cust_mapping_ext,
                                            X_DEALER_P,

                                        (SELECT DISTINCT hp_no
                                            FROM btw.CALL_TRACK_INFO
                                            WHERE trunc(rec_day) = trunc(sysdate)
                                        ) cti
                                        WHERE ((coll_info_monthly_view.hp_no = black1.hp(+))
                                                AND (title_p.title_id(+) = black1.fname_code)
                                                AND (black1.TYPE = type_p.type_code(+))--AND (coll_info_monthly_view.branch_code = branch_p.branch_code)

                                                AND (coll_info_monthly_view.flag = status_call.flag)
                                                AND coll_info_monthly_view.hp_no = x_cust_mapping_ext.contract_no)
                                        AND x_cust_mapping_ext.sl_code = X_DEALER_P.DL_CODE(+)
                                        AND X_DEALER_P.DL_BRANCH = BRANCH_P.BRANCH_CODE(+)
                                        AND coll_info_monthly_view.hp_no = cti.hp_no(+)
                                        AND COLL_INFO_MONTHLY_VIEW.STAPAY1 IS NULL ) A
                                    WHERE HP_NO IS NOT NULL
                                        AND HP_HOLD IS NOT NULL ) T,
                                        ESTIMATE_REPO_CHECK_MASTER em,
                                        ESTIMATE_REPO_CHECK_MASTER_P ep
                                WHERE T.HP_NO = em.CONTACT_NO(+)
                                    AND em.STATUS = ep.STATUS(+))
                                GROUP BY hp_hold`
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        // check length 

        if (holder_list.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No holder data',
                data: []
            })
        } else {

            const filter_holder = holder_list.rows.map(obj => `'${obj.HP_HOLD}'`);

            // console.log(`filter holder : ${filter_holder}`)

            // maping emp id with name from EMP db

            const mappingHolder = await connection.execute(`
            SELECT  
                EMP_ID, EMP_NAME, EMP_NAME ||' '|| EMP_LNAME AS EMP_FULLNAME, EMP_LNAME 
            FROM EMP
            WHERE EMP_ID IN (${filter_holder})
            `, {}, { outFormat: oracledb.OBJECT })

            if (mappingHolder.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: 'No holder data',
                    data: []
                })
            } else {
                const resData = mappingHolder.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                return res.status(200).send({
                    status: 200,
                    message: 'success',
                    data: lowerResData
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

async function getagentsitevisit(req, res, next) {

    let connection;
    try {

        const { pageno, name, surname, hp_no, branch, staffid, sort_type, sort_field } = req.body


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
        let queryname = ''
        let querysurname = ''
        let queryhpno = ''
        let querybranch = ''
        let querystaffid = ''
        let querysort = ''



        if (name) {
            queryname = ` AND CI.NAME = :name `
            bindparams.name = name
        }

        if (surname) {
            querysurname = ` AND CI.SNAME = :surname `
            bindparams.surname = surname
        }

        if (hp_no) {
            queryhpno = ` AND AP.HP_NO = :hp_no `
            bindparams.hp_no = hp_no
        }

        if (branch) {

            if (branch !== 0 && branch !== '0') {
                querybranch = ` AND PV.PROV_CODE = :branch `
                bindparams.branch = branch
            }
        }

        if (staffid) {
            querystaffid = ` AND NI.STAFF_ID = :staffid `
            bindparams.staffid = staffid
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` `
        }

        connection = await oracledb.getConnection(config.database)
        const sqlbase =
            `SELECT ROWNUM AS LINE_NUMBER , T.* 
            FROM (
                    SELECT DISTINCT 
                            HP_NO,TITLE_NAME,
                            NAME,
                            SNAME,
                            BILL,
                            BILL_SUB,
                            BRANCH_NAME,
                            BRANCH_CODE,
                            STAFF_ID,
                            STAFF_NAME
                             
                    FROM( 
                            SELECT
                            AP.HP_NO,
                            TP.TITLE_NAME,
                            CI.NAME,
                            CI.SNAME,
                            AP.BILL,
                            AP.BILL_SUB,
                            BTW.GET_BRANCH_SL_BY_HP_NO(AP.HP_NO) AS BRANCH_NAME,
                            PV.PROV_CODE AS BRANCH_CODE, 
                            NI.STAFF_ID, 
                            BTW.GET_EMP_NAME( NI.STAFF_ID)  AS STAFF_NAME
                            FROM 
                            BTW.NEGO_INFO NI,
                            BTW.CALL_TRACK_INFO CTI,
                            BTW.AC_PROVE AP,
                            BTW.CUST_INFO CI,
                            BTW.TITLE_P TP,
                            BTW.PROVINCE_P PV,
                            BTW.EMP EM
                            WHERE AP.HP_NO = CTI.HP_NO
                            AND AP.CUST_NO_0 = CI.CUST_NO
                            AND CI.FNAME = TP.TITLE_ID
                            AND  CTI.HP_NO = NI.HP_NO 
                            AND (TO_CHAR(CTI.REC_DAY,'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NI.REC_DATE(+),'dd/mm/yyyy hh24:mi:ss')) 
                            AND NI.STAFF_ID = EM.EMP_ID(+)
                            AND NI.NEG_R_CODE = 'M03'
                            ${queryname}${querysurname}${queryhpno}${querybranch}${querystaffid} 
                            AND BTW.GET_BRANCH_SL_BY_HP_NO(AP.HP_NO) = PV.PROV_NAME
                            ORDER BY CTI.REC_DAY DESC
                      ) 
                      ${querysort}   
                 ) T `

        const sqlcount = `select count(LINE_NUMBER) as rowCount from (${sqlbase})`

        // console.log(`sqlstr: ${sqlcount}`)

        const resultCount = await connection.execute(sqlcount, bindparams, { outFormat: oracledb.OBJECT })

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
                const finishsql = `SELECT * FROM(${sqlbase}) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend `

                const result = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

                if (result.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No negotaiation agent record',
                        data: []
                    })
                } else {

                    let resData = result.rows

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

async function getagentassigntofcr(req, res, next) {

    let connection;
    try {

        const { pageno, hp_no, branch, rec_date, agent, sort_type, sort_field } = req.body


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
        let queryrecdate = ''
        let queryagent = ''
        let querysort = ''




        if (hp_no) {
            queryhpno = ` AND AP.HP_NO = :hp_no `
            bindparams.hp_no = hp_no
        }

        if (branch) {

            if (branch !== 0 && branch !== '0') {
                querybranch = ` AND PV.PROV_CODE = :branch `
                bindparams.branch = branch
            }
        }

        if (rec_date) {
            const rec_date_format = moment(new Date(rec_date)).format("DD/MM/YYYY")
            // console.log(`rec date : ${rec_date_format}`)
            /* ... do something ...*/
            queryrecdate = `  AND TRUNC(BTW.BUDDHIST_TO_CHRIS_F(CTI.REC_DAY)) = TRUNC(BTW.BUDDHIST_TO_CHRIS_F(to_date(:rec_date_format, 'dd/mm/yyyy'))) `
            bindparams.rec_date_format = rec_date_format
            // queryrecdate = ` AND  TRUNC(BTW.BUDDHIST_TO_CHRIS_F(to_date(CTI.REC_DAY, 'dd/mm/yyyy'))) = :rec_date `
            // bindparams.rec_date = rec_date
        } else {
            queryrecdate = ` AND  TO_CHAR(NI.REC_DATE,'yyyymm') = TO_CHAR(SYSDATE, 'yyyymm') `
        }

        if (agent) {
            queryagent = ` AND NI.STAFF_ID = :agent `
            bindparams.agent = agent
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
                                        HP_NO,
                                        BRANCH_NAME,
                                        BRANCH_CODE,
                                        AGENT_ID,
                                        AGENT_NAME,
                                        REC_DAY,
                                        HP_HOLD,
                                        HP_HOLD_NAME,
                                        STAPAY1,
                                        CUST_TITLE_NAME,
                                        CUST_NAME,
                                        CUST_SURNAME,
                                        BILL,
                                        BILL_SUB,
                                        ROW_NUMBER() OVER (
                                            PARTITION BY HP_NO
                                            ORDER BY
                                                REC_DAY DESC
                                        ) AS rn
                                    FROM
                                        (
                                            SELECT
                                                ROWNUM AS LINE_NUMBER,
                                                T.*
                                            FROM
                                                (
                                                    SELECT
                                                        DISTINCT HP_NO,
                                                        BRANCH_NAME,
                                                        BRANCH_CODE,
                                                        AGENT_ID,
                                                        AGENT_NAME,
                                                        REC_DAY,
                                                        HP_HOLD,
                                                        HP_HOLD_NAME,
                                                        STAPAY1,
                                                        CUST_TITLE_NAME,
                                                        CUST_NAME,
                                                        CUST_SURNAME,
                                                        BILL,
                                                        BILL_SUB
                                                    FROM
            (
                                                            SELECT
                                                                CM.HP_NO,
                                                                BTW.GET_BRANCH_SL_BY_HP_NO(AP.HP_NO) AS BRANCH_NAME,
                                                                PV.PROV_CODE AS BRANCH_CODE, 
                                                                NI.STAFF_ID AS AGENT_ID, 
                                                                BTW.GET_EMP_NAME( NI.STAFF_ID)  AS AGENT_NAME ,
                                                                TP.TITLE_NAME AS CUST_TITLE_NAME,
                                                                CI.NAME AS CUST_NAME,
                                                                CI.SNAME AS CUST_SURNAME,
                                                                CTI.REC_DAY,
                                                                CM.STAPAY1,
                                                                CM.HP_HOLD,
                                                                BTW.GET_EMP_NAME(CM.HP_HOLD) AS HP_HOLD_NAME,
                                                                AP.BILL,
                                                                AP.BILL_SUB
                                                            FROM
                                                                BTW.COLL_INFO_MONTHLY CM,
                                                                BTW.NEGO_INFO NI,
                                                                BTW.CALL_TRACK_INFO CTI,
                                                                BTW.AC_PROVE AP,
                                                                BTW.CUST_INFO CI,
                                                                BTW.TITLE_P TP,
                                                                BTW.PROVINCE_P PV
                                                            WHERE
                                                                CM.HP_NO = CTI.HP_NO
                                                                AND AP.HP_NO = CTI.HP_NO
                                                                AND AP.CUST_NO_0 = CI.CUST_NO
                                                                AND CI.FNAME = TP.TITLE_ID
                                                                AND CTI.HP_NO = NI.HP_NO
                                                                AND (
                                                                    TO_CHAR(CTI.REC_DAY, 'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NI.REC_DATE(+), 'dd/mm/yyyy hh24:mi:ss')
                                                                )
                                                                AND CM.month_end = TO_CHAR (SYSDATE, 'MM')
                                                                AND CM.year_end = TO_CHAR (SYSDATE, 'YYYY')
                                                                AND NI.REQ_ASSIGN_FCR = 'Y'
                                                                AND BTW.GET_BRANCH_SL_BY_HP_NO(AP.HP_NO) = PV.PROV_NAME
                                                                ${queryhpno}${querybranch}${queryrecdate}${queryagent} 
                                                            ORDER BY
                                                                CTI.REC_DAY DESC
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

async function getstaffsitevisitparameter(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const staff_list = await connection.execute(`
        SELECT DISTINCT STAFF_ID,STAFF_NAME
         
        FROM(
                SELECT 
                NI.STAFF_ID,
                BTW.GET_EMP_NAME( NI.STAFF_ID)  AS STAFF_NAME
                FROM 
                BTW.NEGO_INFO NI,
                BTW.CALL_TRACK_INFO CTI,
                BTW.AC_PROVE AP,
                BTW.CUST_INFO CI,
                BTW.TITLE_P TP,
                BTW.PROVINCE_P PV,
                BTW.EMP EM
                WHERE AP.HP_NO = CTI.HP_NO
                 AND AP.CUST_NO_0 = CI.CUST_NO
                 AND CI.FNAME = TP.TITLE_ID
                and  CTI.HP_NO = NI.HP_NO 
                AND (TO_CHAR(CTI.REC_DAY,'dd/mm/yyyy hh24:mi:ss') = TO_CHAR(NI.REC_DATE(+),'dd/mm/yyyy hh24:mi:ss')) 
                AND NI.STAFF_ID = EM.EMP_ID(+)
                AND NI.NEG_R_CODE = 'M03'
                AND BTW.GET_BRANCH_SL_BY_HP_NO(AP.HP_NO) = PV.PROV_NAME
          )
          ORDER BY STAFF_ID ASC `
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        if (staff_list.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No staff data',
                data: []
            })
        } else {
            const resData = staff_list.rows
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

async function getagentparameter(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const agent_list = await connection.execute(`
        SELECT 
                EM.EMP_ID AS AGENT_ID,
                BTW.GET_EMP_NAME( EM.EMP_ID)  AS AGENT_NAME
                FROM 
                BTW.EMP EM
                ORDER BY EMP_ID ASC `
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        if (agent_list.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No agent data',
                data: []
            })
        } else {
            const resData = agent_list.rows
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

async function getagentassigntofcragentparameter(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const agent_list = await connection.execute(`
        SELECT 
                EM.EMP_ID AS AGENT_ID,
                BTW.GET_EMP_NAME( EM.EMP_ID)  AS AGENT_NAME
                FROM 
                BTW.EMP EM
                WHERE EM.EMP_DEP = 'C6' 
                ORDER BY EMP_ID ASC `
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        if (agent_list.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No agent data',
                data: []
            })
        } else {
            const resData = agent_list.rows
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


async function gentokene01(req, res, next) {

    try {

        const { contractno } = req.body
        const token = req.user
        const userid = token.user_id

        if (!contractno) {
            return res.status(200).send({
                status: 400,
                message: 'ไม่พบเลขสัญญา CONTRACT NO',
                token: ''
            })
        }

        const jwtdecode = jwt.sign(
            {
                contract_no: contractno,
                user_id: userid
            },
            process.env.EO1_TOKEN_KEY,
            {
                expiresIn: "24h",
            }
        )

        if (jwtdecode) {
            return res.status(200).send({
                status: 200,
                message: 'success',
                token: jwtdecode
            })
        } else {
            return res.status(200).send({
                status: 400,
                message: 'ไม่สามารถระบุ Token ได้',
                token: ''
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    }
}

async function getsitevisitcoverimagelist(req, res, next) {

    let connection;

    const { keyid } = req.body
    try {

        if (!keyid) {
            return res.status(200).send({
                status: 400,
                message: `missing parameter keyid`,
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SELECT IMAGE_INDEX , IMAGE_COVER 
            FROM BTW.SITE_VISIT_IMAGE
            WHERE CALL_KEYAPP_ID = :key_id 
            ORDER BY IMAGE_INDEX ASC 
        `
            , {
                key_id: keyid
            }, {
            outFormat: oracledb.OBJECT
        })

        // ==== check row image ====
        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: `ไม่พบรายการรูปภาพลงตรวจสอบพืีนที่`,
                data: []
            })
        } else {

            // ==== return image file ====

            const countimage = result.rows.length

            let returndata = [];
            for (let i = 0; i < countimage; i++) {
                const imagefile = result.rows[i].IMAGE_COVER !== null ? true : false
                if (imagefile) {
                    const imagefile = result.rows[i].IMAGE_COVER
                    const imgbuffer = Buffer.from(imagefile).toString('base64')
                    returndata.push({ base64img: imgbuffer })
                }
            }

            return res.status(200).send({
                status: 200,
                message: 'success',
                data: returndata
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

async function getsitevisitimagebyindex(req, res, next) {

    let connection;

    const { keyid, indeximage } = req.body
    try {

        if (!keyid) {
            return res.status(200).send({
                status: 400,
                message: `missing parameter keyid`,
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SELECT IMAGE_INDEX , IMAGE_FILE
            FROM BTW.SITE_VISIT_IMAGE 
            WHERE SITE_VISIT_IMAGE.CALL_KEYAPP_ID = :keyid 
            AND SITE_VISIT_IMAGE.IMAGE_INDEX = :indeximage 
            ORDER BY SITE_VISIT_IMAGE.IMAGE_INDEX ASC 
        `, {
            keyid: keyid,
            indeximage: indeximage
        }, {
            outFormat: oracledb.OBJECT
        })

        // ==== check row image ====
        if (result.rows.length !== 1) {
            return res.status(200).send({
                status: 400,
                message: `ระบุรูปภาพลงตรวจสอบพื้นที่ไม่สำเร็จ`,
                data: []
            })
        } else {

            // ==== return image file ====

            if (result.rows[0].IMAGE_FILE !== null) {

            }
            const imagefile = result.rows[0].IMAGE_FILE
            const imgbuffer = Buffer.from(imagefile).toString('base64')



            return res.status(200).send({
                status: 200,
                message: 'success',
                data: imgbuffer
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

async function updateagentassignfcr(req, res, next) {

    let connection;
    try {

        /* ... get variable from body  ...*/
        const { hp_no, agent_id } = req.body

        /*... check variable ...*/
        if (!hp_no || !agent_id) {
            return res.status(400).send({
                status: 500,
                message: !hp_no ? `No hp_no parameter` : `No agent_id parameter`,
                data: []
            });
        }

        /* ... declear connection ...*/
        connection = await oracledb.getConnection(config.database)
        /*... (1st steps) check coll_info_monthly ...*/

        const chkupdate = await connection.execute(`
            SELECT HP_NO
            FROM BTW.COLL_INFO_MONTHLY
            WHERE HP_NO = :hp_no 
            AND MONTH_END = TO_CHAR (SYSDATE, 'MM')
            AND YEAR_END = TO_CHAR (SYSDATE, 'YYYY') 
        `, {
            hp_no: hp_no
        }, {
            outFormat: oracledb.OBJECT
        })

        /* ... (2nd steps) check result of record 
        Must have 1 row only ...*/
        const rowcount = chkupdate.rows.length
        if (rowcount !== 1) {
            if (rowcount == 0) {
                return res.status(200).send({
                    status: 500,
                    message: `Not found record to assign HP No.`,
                    data: []
                })
            } else {
                return res.status(200).send({
                    status: 500,
                    message: `Can't Identify record`,
                    data: []
                })
            }
        }

        /* .... (3rd) update coll_info_monthly ....*/
        try {

            const updateassign = await connection.execute(`
                    UPDATE BTW.COLL_INFO_MONTHLY 
                        SET HP_HOLD = :agent_id
                    WHERE HP_NO = :hp_no
                    AND MONTH_END = TO_CHAR (SYSDATE, 'MM')
                    AND YEAR_END = TO_CHAR (SYSDATE, 'YYYY') 
            `, {
                agent_id: agent_id,
                hp_no: hp_no
            }, {
                outFormat: oracledb.OBJECT
            })

            /*... (4) check update row (must be 1 ) ...*/
            if (updateassign.rowsAffected !== 1) {
                return res.status(200).send({
                    status: 500,
                    message: `assing agent ล้มเหลว ไม่พบผลลัพธ์`,
                    data: []
                })
            }

            /* ... (5) commit and return success ...*/

            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                return res.send(200).send({
                    status: 500,
                    message: `Error (commit stage): ${e.message ? e.message : 'No message'}`,
                    data: []
                })
            }

            /*... finish ...*/
            return res.status(200).send({
                status: 200,
                message: `assing agent for fcr success !!`,
                data: []
            })

        } catch (e) {
            console.error(e);
            return res.status(200).send({
                status: 500,
                message: `Fail (update coll_info_monthly) : ${e.message ? e.message : 'No err msg'}`,
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

async function getaddrtypemaster(req, res, next) {

    let connection;
    try {

        const reqData = req.body

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                -- SELECT * FROM BTW.ADDRESS_TYPE_P
                SELECT 
                    AM.ADDR_TYPE_CODE,ATP.ADDR_TYPE_NAME
                FROM    BTW.AC_PROVE AP,
                        BTW.ADDRESS_MAP AM, 
                        BTW.ADDRESS_INFO AI, 
                        BTW.ADDRESS_TYPE_P ATP, 
                        BTW.CUST_INFO CI, 
                        BTW.PROVINCE_P PP
                WHERE   AP.CUST_NO_0 = CI.CUST_NO
                        AND AM.ADDR_NO = AI.ADDR_NO
                        AND AM.ADDR_STATUS_CODE = 'CN'
                        AND AM.ADDR_TYPE_CODE = ATP.ADDR_TYPE_CODE
                        AND AI.PROV_CODE = PP.PROV_CODE(+)
                        AND AM.CUST_ID = CI.CUST_NO
                        AND AP.HP_NO = :hp_no
                ORDER BY  ATP.ID ASC
            `
            , {
                hp_no: reqData.hp_no
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

async function getresultsitevisitmaster(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                SELECT * FROM BTW.RESULT_SITEVISIT_P 
        `
            , {}, {
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

async function gettaxdetailbycontractno(req, res, next) {

    let connection;
    try {

        const reqData = req.body

        if (reqData.hp_no == '' || reqData.hp_no == null) {
            return res.status(200).send({
                status: 500,
                message: `No Param detect (hp_no)`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
            SELECT 
                VAT.CONTRACT_NO AS VAT_CONTRACT_NO,
                VAT.PROCESS_DATETIME AS VAT_PROCESS_DATETIME, 
                VAT.BALANCE AS VAT_BALANCE,
                VAT.PHONE_SMS AS VAT_PHONE_SMS, 
                NEG.NEG_R_CODE,
                VAT.SMS_MESSAGE AS VAT_SMS_MESSAGE
            FROM 
                BTW.M_VEHICLE_ACT_TEMP VAT
            LEFT JOIN (
                SELECT NEG_R_CODE
                FROM (
                    SELECT NEG_R_CODE
                    FROM BTW.NEGO_INFO 
                    WHERE 
                        NEG_R_CODE = 'M06'
                        AND NEGO_INFO.HP_NO = :hp_no
                        AND TO_CHAR(NEGO_INFO.REC_DATE, 'YYYY') = TO_CHAR(SYSDATE, 'YYYY')
                    ORDER BY REC_DATE DESC
                ) 
                WHERE ROWNUM = 1
            ) NEG ON 1=1
            WHERE 
            VAT.CONTRACT_NO = :hp_no 
            AND TO_CHAR(VAT.PROCESS_DATETIME, 'YYYY') = TO_CHAR(SYSDATE, 'YYYY')
            `
            , {
                hp_no: reqData.hp_no
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

// module.exports.getcontractlist = getcontractlist
module.exports.getnegotiationlist = getnegotiationlist
module.exports.getnegotiationbyid = getnegotiationbyid
module.exports.getnegotiationhistorybyid = getnegotiationhistorybyid
module.exports.gethistorypaymentlist = gethistorypaymentlist
module.exports.getaddresscustlist = getaddresscustlist
module.exports.getaddressncblist = getaddressncblist
module.exports.getfollowuppaymentlist = getfollowuppaymentlist
module.exports.getviewcontractlist = getviewcontractlist
module.exports.getagentcollinfomonthly = getagentcollinfomonthly
module.exports.getagentgroupdpd = getagentgroupdpd
module.exports.getagentgroupstage = getagentgroupstage
module.exports.getagentsitevisit = getagentsitevisit
module.exports.getagentassigntofcr = getagentassigntofcr
module.exports.insertnegolist = insertnegolist
module.exports.getphonenolist = getphonenolist
module.exports.getphonenolistcust = getphonenolistcust
module.exports.getlalon = getlalon
module.exports.getaddressinfo = getaddressinfo
module.exports.getmotocyclenego = getmotocyclenego
module.exports.getmotocyclenegohistory = getmotocyclenegohistory
module.exports.genqrcodenego = genqrcodenego
module.exports.updatenegolalon = updatenegolalon
module.exports.createaddressInfo = createaddressInfo

module.exports.getholdermaster = getholdermaster
module.exports.getagentholdermaster = getagentholdermaster
module.exports.gentokene01 = gentokene01
module.exports.getsitevisitcoverimagelist = getsitevisitcoverimagelist
module.exports.getsitevisitimagebyindex = getsitevisitimagebyindex
module.exports.getstaffsitevisitparameter = getstaffsitevisitparameter
module.exports.getagentparameter = getagentparameter
module.exports.getagentassigntofcragentparameter = getagentassigntofcragentparameter
module.exports.updateagentassignfcr = updateagentassignfcr
module.exports.getaddrtypemaster = getaddrtypemaster
module.exports.getresultsitevisitmaster = getresultsitevisitmaster
module.exports.gettaxdetailbycontractno = gettaxdetailbycontractno

