/* This is about service for bad-debt-dashboard (oracle menu 730 สัญญารอตัดหนี้สูญ)
Created on 28/02/2024
Created by Napat
 */

const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')

async function checkuserstage(req, res, next) {

    let connection;
    try {

        const token = req.user
        const userid = token.ID

        console.log(`this is userid  : ${userid}`)
        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
            SELECT 
                *
            FROM 
                (
                    SELECT
                        ROWNUM AS LINE_NUMBER,
                        XWS.*
                    FROM 
                        BTW.X_REQUEST_WRITEOFF_STAGEFLOW XWS
                    WHERE 
                        NVL(CANCEL, 'X') <> 'Y'
                        AND EMP_ID = :userid
                    ORDER BY CREATED_TIME
                )
            WHERE 
                LINE_NUMBER = 1
            `
            , {
                userid: userid
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

async function baddebtlistdashboard(req, res, next) {

    let connection;
    try {


        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***


        const { page_no, page_size, branch_code, sort_type, sort_field } = req.body

        if (!(page_no)) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters pageno`,
                data: []
            })
        }

        if (!branch_code) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters branch`,
                data: []
            })
        }

        if (!page_size && typeof parseInt(page_no) !== "number") {
            return res.status(200).send({
                status: 400,
                message: `missing parameters pagesize`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        /* ... check user permissage (only stage = 1 in X_REQUEST_WRITEOFF_STAGEFLOW) ... */

        const checkstage = await getuserstage(userid)

        if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
        if (checkstage.stage_flow !== '1') return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })

        /* ... query data contrast ... */
        const indexstart = (page_no - 1) * page_size + 1
        const indexend = (page_no * page_size)

        let rowCount;
        let bindparams = {};
        let querybranch = ''
        let filternorepeat =
            `
        AND ACP.HP_NO NOT IN
            (
                
                SELECT 
                    DISTINCT(HP_NO)
                FROM
                    BTW.X_REQUEST_WRITEOFF_DETAIL
                WHERE
                    NVL(CANCEL, 'X') <> 'Y'
            )
        `;



        if (branch_code) {

            if (branch_code !== 0 && branch_code !== '0') {
                querybranch = ` AND BP.BRANCH_CODE = :branch `
                bindparams.branch = branch_code
            }
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` ORDER BY HP_NO ASC `
        }


        const sqlbase =
            `
            SELECT 
                ROWNUM AS LINE_NUMBER, 
                T.* 
            FROM 
                (
                    SELECT  
                        MAINQ.*,
                        GET_POSTCODE_RECENT_STATUS(MAINQ.POST_REF_NO) AS SEND_STATUS,
                        GET_POSTCODE_RECENT_DATE(MAINQ.POST_REF_NO) AS SEND_DATE,
                        GET_RECENT_PAYMENT_DATE(MAINQ.HP_NO) AS RECENT_PAYMENT_DATE
                    FROM 
                    (
                    SELECT
                    ACP.HP_NO,
                    BP.BRANCH_NAME,
                    BP.BRANCH_CODE,
                    TP.TITLE_NAME||' '||CIF.NAME||' '||CIF.SNAME CUST_NAME,
                    ACP.BILL,
                    ACP.BILL_SUB,
                    CMX.CREATE_CONTRACT_DATE AS CONTRACT_DATE,
                    BTW.PKG_MONTH_END.GET_OUTSTAND_BALANCE('N',ACP.HP_NO ,to_char(sysdate,'dd/mm/yyyy'),null,'btw.') AS DEBT_AV,
                    GET_POST_REF_NO(ACP.HP_NO, '4') AS POST_REF_NO,
                    GET_POST_CANCLE_DATE(ACP.HP_NO, '4') AS CANCEL_POST_DATE 
                    
                    FROM
                    BTW.AC_PROVE ACP,
                    BTW.X_CUST_MAPPING CM,
                    BTW.X_CUST_MAPPING_EXT CMX,
                    BTW.X_DEALER_P DP,
                    BTW.BRANCH_P BP,
                    BTW.CUST_INFO CIF,
                    BTW.TITLE_P TP
                    WHERE
                    ACP.AC_STATUS is null
                    and ACP.BILL = '900'
                    and ACP.HP_NO = CMX.CONTRACT_NO
                    and CMX.APPLICATION_NUM = CM.APPLICATION_NUM
                    and CMX.SL_CODE = DP.DL_CODE
                    and CMX.LOAN_RESULT = 'Y'
                    and DP.DL_BRANCH = BP.BRANCH_CODE
                    and CM.CUST_NO = CIF.CUST_NO
                    and TP.TITLE_ID = CIF.FNAME
                    ${filternorepeat}
                    ${querybranch}
                    ) MAINQ
                    ${querysort}
                ) T 
            `

        const sqlcount = `SELECT COUNT(LINE_NUMBER) AS ROWCOUNT FROM (${sqlbase})`

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
                        message: 'NO RECORD FOUND',
                        data: []
                    })
                } else {

                    let resData = result.rows

                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(page_no)
                    returnData.pageSize = page_size
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

async function getuserstage(userid) {
    if (!userid) return null;

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(
            `
            SELECT 
                *
            FROM 
                (
                    SELECT
                        ROWNUM AS LINE_NUMBER,
                        XWS.*
                    FROM 
                        BTW.X_REQUEST_WRITEOFF_STAGEFLOW XWS
                    WHERE 
                        NVL(CANCEL, 'X') <> 'Y'
                        AND EMP_ID = :userid
                    ORDER BY CREATED_TIME
                )
            WHERE 
                LINE_NUMBER = 1
            `,
            {
                userid: userid
            },
            {
                outFormat: oracledb.OBJECT
            }
        )

        if (result.rows.length == 0) return null

        const lowerResData = tolowerService.objtolower(result.rows[0])

        return lowerResData

    } catch (e) {
        console.error(e)
        return null
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log(`connection close complete!`)
            } catch (e) {
                console.error(e);
            }
        }
    }
}

module.exports.checkuserstage = checkuserstage
module.exports.baddebtlistdashboard = baddebtlistdashboard