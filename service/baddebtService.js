/* This is about service for bad-debt-dashboard (oracle menu 730 สัญญารอตัดหนี้สูญ)
Created on 28/02/2024
Created by Napat
 */

const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const stagectrl = require('./writeoffrule/wrtieoffcontrolstage')

async function checkuserstage(req, res, next) {

    let connection;
    try {

        const token = req.user
        const userid = token.ID

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
                    returnData.pageCount = Math.ceil(rowCount / page_size);

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
                    mesasage: `error during get list data of bad debt view list : ${e.message}`,
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
            } catch (e) {
                console.error(e);
            }
        }
    }
}

async function createwriteofflist(req, res, next) {
    let connection;

    try {

        console.log(`trigger start writeoff`)
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { branch_code, writeoff_detail_list } = req.body

        if (!branch_code) {
            return res.status(200).send({
                status: 400,
                message: `missing parameter branch_code`,
                data: []
            })
        }

        /* ... check type of writeoff_detail_list ... */
        if (!Array.isArray(writeoff_detail_list)) {
            return res.status(200).send({
                status: 400,
                message: `type of paramiter miss match (writeoff_detail_list)`
            })
        }


        connection = await oracledb.getConnection(config.database)


        const checkstage = await getuserstage(userid)

        /* ... check user permissage (only stage = 1 in X_REQUEST_WRITEOFF_STAGEFLOW) ... */
        if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการสร้างรายการ`, data: [] })
        if (checkstage.stage_flow !== '1') return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการสร้างรายการ`, data: [] })

        /* ... get GET_MONTH_RUNNING from pkg ... */
        const generate_doc_id = await connection.execute(
            `
            DECLARE
                V_YEAR VARCHAR2(4);
                V_MONTH VARCHAR2(2);
                V_RUN    VARCHAR2(4);
                VAL_DOC_ID VARCHAR2(20);
            BEGIN
                BTW.PKG_PARAM_RUNNING.GET_MONTH_RUNNING('WRITEOFF_DOC_ID',V_YEAR ,V_MONTH,V_RUN);
                
                VAL_DOC_ID := V_YEAR||V_MONTH||V_RUN;
      
                :doc_id := VAL_DOC_ID;
                :running_num := V_RUN;

            END;
            `
            , {
                doc_id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                running_num: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }, {
            outFormat: oracledb.OBJECT
        })

        if (!generate_doc_id.outBinds.doc_id || !generate_doc_id.outBinds.running_num) {
            return res.status(200).send({
                status: 400,
                message: `ไม่สามารถ generate running id ได้`,
                data: []
            })
        }

        /* ... check list of writeoff_detail_list is exits ... */

        if (writeoff_detail_list.length !== 0) {

            try {
                const listofbaddebt = await connection.execute(
                    `
                    SELECT
                        MAINQ.HP_NO
                    FROM
                        (
                            SELECT
                                ACP.HP_NO,
                                BP.BRANCH_NAME,
                                BP.BRANCH_CODE,
                                TP.TITLE_NAME || ' ' || CIF.NAME || ' ' || CIF.SNAME CUST_NAME,
                                ACP.BILL,
                                ACP.BILL_SUB,
                                CMX.CREATE_CONTRACT_DATE AS CONTRACT_DATE,
                                BTW.PKG_MONTH_END.GET_OUTSTAND_BALANCE (
                                    'N',
                                    ACP.HP_NO,
                                    to_char (sysdate, 'dd/mm/yyyy'),
                                    null,
                                    'btw.'
                                ) AS DEBT_AV,
                                GET_POST_REF_NO (ACP.HP_NO, '4') AS POST_REF_NO,
                                GET_POST_CANCLE_DATE (ACP.HP_NO, '4') AS CANCEL_POST_DATE
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
                                and ACP.HP_NO NOT IN
                                (
                                    
                                    SELECT 
                                        DISTINCT(HP_NO)
                                    FROM
                                        BTW.X_REQUEST_WRITEOFF_DETAIL
                                    WHERE
                                        NVL(CANCEL, 'X') <> 'Y'
                                )
                                and BP.BRANCH_CODE = :branch_code
                        ) MAINQ
                    `, {
                    branch_code: branch_code
                }, {
                    outFormat: oracledb.OBJECT
                }
                )

                if (listofbaddebt.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: `bad debt list not exits`,
                        data: []
                    })
                }

                /* ... check bad debt list ... */
                const isBaddebtlistIsMember = writeoff_detail_list.every(item => listofbaddebt.rows.some(el => el.HP_NO === item.hp_no));

                if (!isBaddebtlistIsMember) {
                    return res.status(200).send({
                        status: 400,
                        message: `ไม่เจอเลขสัญญาบางรายการใน list`,
                        data: []
                    })
                }

            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 400,
                    message: `Error between get bad debt list of branch_code '${branch_code}' (${e.message ?? 'No return message'})`,
                    data: []
                })
            }
        }

        /* .... create writeoff header and detail ... */

        /* .... get time for create writeoff headder ... */

        let current_timestamp_value;
        try {
            const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

            if (current_timestamp.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `can't get current_timestamp value from server`,
                    data: []
                })
            }

            current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                data: []
            })
        }


        /* ... writeoff header ... */
        try {
            const createwriteoffheader = await connection.execute(
                `
                INSERT INTO BTW.X_REQUEST_WRITEOFF_HEADER (
                    DOC_ID,
                    STAGE_FLOW,
                    BRANCH_CODE,
                    REQUESTER,
                    ROW_AMOUNT,
                    CREATED_TIME
                ) VALUES (
                    :doc_id,
                    :stage_flow,
                    :branch_code,
                    :requester,
                    :row_amount,
                    :created_time
                )
                `,
                {
                    doc_id: generate_doc_id.outBinds.doc_id,
                    stage_flow: '1',
                    branch_code: branch_code,
                    requester: token.ID,
                    row_amount: writeoff_detail_list.length,
                    created_time: { val: current_timestamp_value, type: oracledb.DATE }
                },
                {
                    autoCommit: false
                }
            )

            console.log(`success create writeoff header`)

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to create writeoff header`,
                data: []
            })
        }

        /* ... writeoff detail ... */
        if (writeoff_detail_list.length !== 0) {
            try {

                const sqlcreatewriteoffdetaillist =
                    `
                INSERT INTO BTW.X_REQUEST_WRITEOFF_DETAIL (
                    DOC_ID,
                    HP_NO,
                    CUST_NAME,
                    CONTRACT_DATE,
                    OUTSTANDING,
                    TERMINATE_DATE,
                    POST_RESPONSE,
                    BILL_CODE,
                    BILL_SUB
                ) VALUES (
                    :doc_id,
                    :hp_no,
                    :cust_name,
                    :contract_date,
                    :outstanding,
                    :terminate_date,
                    :post_response,
                    :bill_code,
                    :bill_sub
                )
                `
                let bindcreatewriteoffdetaillist = [];
                for (let i = 0; i < writeoff_detail_list.length; i++) {
                    bindcreatewriteoffdetaillist.push({
                        doc_id: generate_doc_id.outBinds.doc_id,
                        hp_no: writeoff_detail_list[i].hp_no ?? '',
                        cust_name: writeoff_detail_list[i].cust_name ?? '',
                        contract_date: writeoff_detail_list[i].contract_date ? moment(writeoff_detail_list[i].contract_date).toDate() : null,
                        outstanding: writeoff_detail_list[i].debt_av ?? null,
                        terminate_date: writeoff_detail_list[i].cancel_post_date ? moment(writeoff_detail_list[i].cancel_post_date).toDate() : null,
                        post_response: writeoff_detail_list[i].send_date ? moment(writeoff_detail_list[i].send_date).toDate() : null,
                        bill_code: writeoff_detail_list[i].bill ?? '',
                        bill_sub: writeoff_detail_list[i].bill_sub ?? ''
                    })
                }

                const options = {
                    bindDefs: {
                        doc_id: { type: oracledb.STRING, maxSize: 9 },
                        hp_no: { type: oracledb.STRING, maxSize: 15 },
                        cust_name: { type: oracledb.STRING, maxSize: 100 },
                        contract_date: { type: oracledb.DATE },
                        outstanding: { type: oracledb.NUMBER },
                        terminate_date: { type: oracledb.DATE },
                        post_response: { type: oracledb.DATE },
                        bill_code: { type: oracledb.STRING, maxSize: 5 },
                        bill_sub: { type: oracledb.STRING, maxSize: 5 }
                    },
                    autoCommit: false
                }

                const createwriteoffdetail = await connection.executeMany(sqlcreatewriteoffdetaillist, bindcreatewriteoffdetaillist, options)


                console.log(`success create writeoff detail (record : ${createwriteoffdetail.rowsAffected})`)
            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 400,
                    message: `Error when try to create writeoff header`,
                    data: []
                })
            }
        }

        /* .... insert writeoff stage control ... */
        try {

            await connection.execute(
                `
                INSERT INTO BTW.X_REQUEST_WRITEOFF_STAGE_CTRL (
                    DOC_ID,
                    REWORK_ID,
                    STAGE_FLOW,
                    UPD_USER,
                    UPD_DATETIME
                ) VALUES (
                    :doc_id,
                    :rework_id,
                    :stage_flow,
                    :upd_user,
                    :upd_datetime
                )
                `,
                {
                    doc_id: generate_doc_id.outBinds.doc_id,
                    rework_id: 0, // default 0 in this step
                    stage_flow: '1',
                    upd_user: token.ID,
                    upd_datetime: { val: current_timestamp_value, type: oracledb.DATE }
                }
            )

            console.log(`success insert writeoff stage control record`)

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error during insert writeoff stage control to database (${e.message ?? 'No return message'})`
            })
        }

        /* ... update UPDATE_MONTH_RUNNING from pkg ... */
        try {

            await connection.execute(
                `
                DECLARE
                    V_RUN   VARCHAR2(4);
                BEGIN
                    V_RUN := :running_number;
                    BTW.PKG_PARAM_RUNNING.UPDATE_MONTH_RUNNING('WRITEOFF_DOC_ID',TO_CHAR(sysdate,'YYYY'),TO_CHAR(sysdate,'MM'),V_RUN);
                END;
                `, {
                running_number: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: generate_doc_id.outBinds.running_num }
            })

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error during update running number to database (${e.message ?? 'No return message'})`
            })
        }

        /* ... commit all and return status success ... */

        try {
            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `Create writeoff header and detail success`,
                data: []
            })

            /* ... End Process ... */
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit database (${e.message ?? 'No return message'})`
            })
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
            status: 400,
            mesasage: `error during create writeofflist : ${e.message}`,
            data: []
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

async function addwriteoffdetail(req, res, next) {
    let connection;

    try {

        console.log(`trigger start writeoff`)
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow, branch_code, writeoff_detail_list } = req.body

        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check parameter branch_code... */
        if (!branch_code) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters branch_code`,
                data: []
            })
        }

        /* ... check type of writeoff_detail_list ... */
        if (!Array.isArray(writeoff_detail_list)) {
            return res.status(200).send({
                status: 400,
                message: `type of paramiter miss match (writeoff_detail_list)`
            })
        }

        /* ... writeoff_detail_list must have value ... */
        if (writeoff_detail_list.length == 0) {
            return res.status(200).send({
                status: 400,
                message: `ไม่มีรายการ writeoff_detail_list`
            })
        }


        connection = await oracledb.getConnection(config.database)


        const checkstage = await getuserstage(userid)

        /* ... check user permissage (only stage = 1 in X_REQUEST_WRITEOFF_STAGEFLOW) ... */
        if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการสร้างรายการ`, data: [] })
        if (checkstage.stage_flow !== '1') return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการสร้างรายการ`, data: [] })
        if (stagectrl.stageControl.isAdd.some(item => item !== checkstage.stage_flow)) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการสร้างรายการ (stage ctrl)`, data: [] })

        /* ... check list of writeoff_detail_list is exits ... */

        try {
            const listofbaddebt = await connection.execute(
                `
                    SELECT
                        MAINQ.HP_NO
                    FROM
                        (
                            SELECT
                                ACP.HP_NO,
                                BP.BRANCH_NAME,
                                BP.BRANCH_CODE,
                                TP.TITLE_NAME || ' ' || CIF.NAME || ' ' || CIF.SNAME CUST_NAME,
                                ACP.BILL,
                                ACP.BILL_SUB,
                                CMX.CREATE_CONTRACT_DATE AS CONTRACT_DATE,
                                BTW.PKG_MONTH_END.GET_OUTSTAND_BALANCE (
                                    'N',
                                    ACP.HP_NO,
                                    to_char (sysdate, 'dd/mm/yyyy'),
                                    null,
                                    'btw.'
                                ) AS DEBT_AV,
                                GET_POST_REF_NO (ACP.HP_NO, '4') AS POST_REF_NO,
                                GET_POST_CANCLE_DATE (ACP.HP_NO, '4') AS CANCEL_POST_DATE
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
                                and ACP.HP_NO NOT IN
                                (
                                    
                                    SELECT 
                                        DISTINCT(HP_NO)
                                    FROM
                                        BTW.X_REQUEST_WRITEOFF_DETAIL
                                    WHERE
                                        NVL(CANCEL, 'X') <> 'Y'
                                )
                                and BP.BRANCH_CODE = :branch_code
                        ) MAINQ
                    `, {
                branch_code: branch_code
            }, {
                outFormat: oracledb.OBJECT
            }
            )

            if (listofbaddebt.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `bad debt list not exits`,
                    data: []
                })
            }

            /* ... check bad debt list ... */
            const isBaddebtlistIsMember = writeoff_detail_list.every(item => listofbaddebt.rows.some(el => el.HP_NO === item.hp_no));

            if (!isBaddebtlistIsMember) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่เจอเลขสัญญาบางรายการใน list`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error between get bad debt list of branch_code '${branch_code}' (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check no repeat of hp_no in doc_id (this step can skip cause already check in list of writeoff_detail_list is exits)... */

        /* .... get time for create writeoff headder ... */

        let current_timestamp_value;
        try {
            const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

            if (current_timestamp.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `can't get current_timestamp value from server`,
                    data: []
                })
            }

            current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                data: []
            })
        }

        /* ... add writeoff detail ... */
        if (writeoff_detail_list.length !== 0) {
            try {

                const sqlcreatewriteoffdetaillist =
                    `
                INSERT INTO BTW.X_REQUEST_WRITEOFF_DETAIL (
                    DOC_ID,
                    HP_NO,
                    CUST_NAME,
                    CONTRACT_DATE,
                    OUTSTANDING,
                    TERMINATE_DATE,
                    POST_RESPONSE,
                    BILL_CODE,
                    BILL_SUB,
                    UPD_USER,
                    CREATED_TIME 
                ) VALUES (
                    :doc_id,
                    :hp_no,
                    :cust_name,
                    :contract_date,
                    :outstanding,
                    :terminate_date,
                    :post_response,
                    :bill_code,
                    :bill_sub,
                    :upd_user,
                    :created_time 
                )
                `
                let bindcreatewriteoffdetaillist = [];
                for (let i = 0; i < writeoff_detail_list.length; i++) {
                    bindcreatewriteoffdetaillist.push({
                        doc_id: doc_id,
                        hp_no: writeoff_detail_list[i].hp_no ?? '',
                        cust_name: writeoff_detail_list[i].cust_name ?? '',
                        contract_date: writeoff_detail_list[i].contract_date ? moment(writeoff_detail_list[i].contract_date).toDate() : null,
                        outstanding: writeoff_detail_list[i].debt_av ?? null,
                        terminate_date: writeoff_detail_list[i].cancel_post_date ? moment(writeoff_detail_list[i].cancel_post_date).toDate() : null,
                        post_response: writeoff_detail_list[i].send_date ? moment(writeoff_detail_list[i].send_date).toDate() : null,
                        bill_code: writeoff_detail_list[i].bill ?? '',
                        bill_sub: writeoff_detail_list[i].bill_sub ?? '',
                        upd_user: token.ID,
                        created_time: current_timestamp_value
                    })
                }

                const options = {
                    bindDefs: {
                        doc_id: { type: oracledb.STRING, maxSize: 9 },
                        hp_no: { type: oracledb.STRING, maxSize: 15 },
                        cust_name: { type: oracledb.STRING, maxSize: 100 },
                        contract_date: { type: oracledb.DATE },
                        outstanding: { type: oracledb.NUMBER },
                        terminate_date: { type: oracledb.DATE },
                        post_response: { type: oracledb.DATE },
                        bill_code: { type: oracledb.STRING, maxSize: 5 },
                        bill_sub: { type: oracledb.STRING, maxSize: 5 },
                        upd_user: { type: oracledb.STRING, maxSize: 9 },
                        created_time: { type: oracledb.DATE }
                    },
                    autoCommit: false
                }

                const createwriteoffdetail = await connection.executeMany(sqlcreatewriteoffdetaillist, bindcreatewriteoffdetaillist, options)


                console.log(`success create writeoff detail (record : ${createwriteoffdetail.rowsAffected})`)
            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 400,
                    message: `Error when try to create writeoff header`,
                    data: []
                })
            }
        }

        /* ... update writeoff header ... */
        try {

            /* ... get row_count of writeoff detail ... */
            const countdetaillist = await connection.execute(
                `
                SELECT
                    COUNT(*) ROW_COUNT
                FROM
                    BTW.X_REQUEST_WRITEOFF_DETAIL
                WHERE
                    DOC_ID = :doc_id
                    AND NVL (CANCEL, 'X') <> 'Y' 
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (countdetaillist.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่พบรายการภายใต้ doc_id หลังเพิ่มรายการ`,
                    data: []
                })
            }

            const rowcountupdate = countdetaillist.rows[0].ROW_COUNT

            const updatewriteoffheader = await connection.execute(
                `
                UPDATE BTW.X_REQUEST_WRITEOFF_HEADER
                SET
                    ROW_AMOUNT = :row_amount 
                WHERE
                    DOC_ID = :doc_id 
                    AND NVL (CANCEL, 'X') <> 'Y' 
                `,
                {
                    row_amount: rowcountupdate,
                    doc_id: doc_id
                },
                {
                    autoCommit: false
                }
            )

            if (updatewriteoffheader.rowsAffected !== 1) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถระบุรายการ doc_id ตามที่ระบุได้ (identify fail)`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to create writeoff header`,
                data: []
            })
        }


        /* ... commit all and return status success ... */

        try {
            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `เพิ่มรายการสัญญาภายใต้ DOC ID : ${doc_id} สำเร็จ`,
                data: []
            })

            /* ... End Process ... */
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit database (${e.message ?? 'No return message'})`
            })
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
            status: 400,
            mesasage: `error during create writeofflist : ${e.message}`,
            data: []
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

async function removewriteoffdetail(req, res, next) {
    let connection;
    try {

        console.log(`trigger start writeoff`)
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        let row_amount_writeoff_header;

        const { doc_id, stage_flow, writeoff_detail_list } = req.body

        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check type of writeoff_detail_list ... */
        if (!Array.isArray(writeoff_detail_list)) {
            return res.status(200).send({
                status: 400,
                message: `type of paramiter miss match (writeoff_detail_list)`
            })
        }

        /* ... writeoff_detail_list must have value ... */
        if (writeoff_detail_list.length == 0) {
            return res.status(200).send({
                status: 400,
                message: `ไม่มีรายการ writeoff_detail_list`
            })
        }


        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            /* ... only stage_flow == 1 only have permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage || !(stage_flow == '1' || stage_flow == 1)) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check writeoff_detail_list contain in doc_id ... */
        try {

            const listofwriteoffdetail = await connection.execute(
                `
                SELECT
                    HP_NO
                FROM
                    BTW.X_REQUEST_WRITEOFF_DETAIL
                WHERE
                    DOC_ID = :doc_id
                    AND NVL (CANCEL, 'X') <> 'Y'
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            }
            )

            if (listofwriteoffdetail.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่พบรายการ hp_no ภายใต้ doc_id (no record)`,
                    data: []
                })
            }

            /* ... check delete list of writeoff detail contain in doc_id record ...*/
            const isList = writeoff_detail_list.every(item => listofwriteoffdetail.rows.some(el => el.HP_NO === item.hp_no));

            row_amount_writeoff_header = listofwriteoffdetail.rows.length - writeoff_detail_list.length
            console.log(`row_amount_writeoff_header value : ${row_amount_writeoff_header}`)

            if (!isList) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่พบรายการ hp_no ใน doc_id`,
                    data: []
                })
            }

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error between check hp_no exits in doc_id : ${e.message ?? 'No Error message'}`,
                data: []
            })
        }

        /* ... remove writeoff detail from writeoff header (flag cancel = 'Y' to detail)... */

        /* .... get time for create writeoff headder ... */

        let current_timestamp_value;
        try {
            const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

            if (current_timestamp.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `can't get current_timestamp value from server`,
                    data: []
                })
            }

            current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                data: []
            })
        }

        /* ... flag cancel to writeoff detail ... */
        try {

            const sqlremovewriteoffdetail =
                `
                UPDATE BTW.X_REQUEST_WRITEOFF_DETAIL
                SET
                    CANCEL = 'Y',
                    CANCEL_DATE = :cancel_date 
                WHERE
                    DOC_ID = :doc_id 
                    AND HP_NO = :hp_no 
                    AND NVL (CANCEL, 'X') <> 'Y'
                `
            let bindremovewriteoffdetaillist = [];
            for (let i = 0; i < writeoff_detail_list.length; i++) {
                bindremovewriteoffdetaillist.push({
                    cancel_date: current_timestamp_value,
                    doc_id: doc_id,
                    hp_no: writeoff_detail_list[i].hp_no ?? ''
                })
            }

            const optionssqlremovewriteoffdetail = {
                bindDefs: {
                    cancel_date: { type: oracledb.DATE },
                    doc_id: { type: oracledb.STRING, maxSize: 10 },
                    hp_no: { type: oracledb.STRING, maxSize: 15 }
                },
                autoCommit: false
            }

            const removewriteoffdetail = await connection.executeMany(sqlremovewriteoffdetail, bindremovewriteoffdetaillist, optionssqlremovewriteoffdetail)

            console.log(`success remove writeoff detail (record: ${removewriteoffdetail.rowsAffected})`)

            /* ... check all remove writeoff detail success ... */
            if (writeoff_detail_list.length !== removewriteoffdetail.rowsAffected) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถอ้างอิง hp_no ทุกรายการที่ทำรายการได้`,
                    data: []
                })
            }


        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error between try to flag cancel to writeoff detail record : ${e.message ?? 'No error message'}`,
                data: []
            })
        }

        /* ... update row_amount of header list ... */
        try {

            if (typeof row_amount_writeoff_header !== 'number') {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถคำนวนหาค่า row_amount หลังทำรายการได้`,
                    data: []
                })
            }

            const updatewriteoffheaderrowamount = await connection.execute(
                `
                UPDATE BTW.X_REQUEST_WRITEOFF_HEADER
                SET
                    ROW_AMOUNT = :row_amount 
                WHERE
                    DOC_ID = :doc_id 
                    AND NVL (CANCEL, 'X') <> 'Y' 
                `, {
                row_amount: row_amount_writeoff_header,
                doc_id: doc_id
            }, {
                autoCommit: false
            }
            )

            if (updatewriteoffheaderrowamount.rowsAffected !== 1) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถระบุรายการ header (doc_id : ${doc_id}) ได้`,
                    data: []
                })
            }



        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to update row_amount on writeoff header : ${e.message ?? 'No error message'}`,
                data: []
            })
        }


        /* ... commit all and return status success ... */

        try {
            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `ทำการลบรายการสำเร็จ`,
                data: []
            })

            /* ... End Process ... */
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit database (${e.message ?? 'No return message'})`
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function removewriteoffheader(req, res, next) {
    let connection;
    try {

        console.log(`trigger start writeoff`)
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow } = req.body

        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }


        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            /* ... only stage_flow == 1 only have permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage || !(stage_flow == '1' || stage_flow == 1)) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check writeoff detail not contain in doc_id ... */
        try {

            const listofwriteoffdetail = await connection.execute(
                `
                SELECT
                    HP_NO
                FROM
                    BTW.X_REQUEST_WRITEOFF_DETAIL
                WHERE
                    DOC_ID = :doc_id
                    AND NVL (CANCEL, 'X') <> 'Y'
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            }
            )

            if (listofwriteoffdetail.rows.length !== 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถทำรายการได้ มีรายการ writeoff detail คงค้างอยู่`,
                    data: []
                })
            }


        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error between check hp_no not exits in doc_id : ${e.message ?? 'No Error message'}`,
                data: []
            })
        }

        /* ... remove writeoff header (flag cancel = 'Y' to writeoff header)... */

        /* .... get time for create writeoff headder ... */

        let current_timestamp_value;
        try {
            const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

            if (current_timestamp.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `can't get current_timestamp value from server`,
                    data: []
                })
            }

            current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                data: []
            })
        }

        /* ... flag cancel to writeoff header ... */
        try {

            const removewriteoffheaderlist = await connection.execute(
                `
                UPDATE BTW.X_REQUEST_WRITEOFF_HEADER
                SET
                    CANCEL = 'Y',
                    CANCEL_DATE = :cancel_date 
                WHERE
                    DOC_ID = :doc_id 
                    AND NVL (CANCEL, 'X') <> 'Y' 
                `, {
                cancel_date: { val: current_timestamp_value, type: oracledb.DATE },
                doc_id: doc_id
            }, {
                autoCommit: false
            }
            )

            console.log(`success remove writeoff header (record: ${removewriteoffheaderlist.rowsAffected})`)

            /* ... check writeoff header identity  ... */
            if (removewriteoffheaderlist.rowsAffected !== 1) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถระบุรายการ writeoff header จาก doc_id ได้`,
                    data: []
                })
            }




        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error between try to flag cancel to writeoff header record : ${e.message ?? 'No error message'}`,
                data: []
            })
        }


        /* ... commit all and return status success ... */

        try {
            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `ทำการลบรายการสำเร็จ`,
                data: []
            })

            /* ... End Process ... */
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit database (${e.message ?? 'No return message'})`
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function fetchwriteoffheader(req, res, next) {
    let connection;
    try {
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { page_no, stage_flow, sort_field, sort_type } = req.body

        if (!(page_no)) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters pageno`,
                data: []
            })
        }

        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        /* ... check user permissage (only stage = 1 in X_REQUEST_WRITEOFF_STAGEFLOW) ... */

        const checkstage = await getuserstage(userid)

        if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
        if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })

        /* ... query data contrast ... */
        const indexstart = (page_no - 1) * 10 + 1
        const indexend = (page_no * 10)

        let rowCount;
        let bindparams = {};
        let querystageflow = ''

        bindparams.userid = token.ID

        if (stage_flow) {
            querystageflow = ` AND STAGE_FLOW = :stageflow `
            bindparams.stageflow = stage_flow
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` ORDER BY DOC_ID ASC `
        }

        /* ... fetch writeoff header from database ... */

        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                MAINQ.*
            FROM
                (
                    SELECT
                        XRWH.*,
                        BTW.F_GET_BRANCH_NAME(XRWH.BRANCH_CODE) AS BRANCH_NAME,
                        BTW.F_GET_EMP_NAME_ID(:userid) AS EMP_NAME
                    FROM
                        BTW.X_REQUEST_WRITEOFF_HEADER XRWH
                    WHERE
                        NVL (CANCEL, 'X') <> 'Y'
                        ${querystageflow}
                        ${querysort}
                ) MAINQ
            `

        const sqlcount = `SELECT COUNT(LINE_NUMBER) AS ROWCOUNT FROM (${sqlbase})`

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
                    mesasage: `error during get list data of writeoff header list : ${e.message}`,
                    data: []
                })
            }

        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
            status: 400,
            mesasage: `error during fetch writeof header : ${e.message}`,
            data: []
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

async function fetchwriteoffdetail(req, res, next) {
    let connection;
    try {
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { page_no, stage_flow, doc_id, sort_field, sort_type } = req.body

        if (!(page_no)) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters pageno`,
                data: []
            })
        }

        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        /* ... check user permission (only stage = 1 in X_REQUEST_WRITEOFF_STAGEFLOW) ... */

        try {
            const checkstage = await getuserstage(userid)

            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... query data contrast ... */
        const indexstart = (page_no - 1) * 10 + 1
        const indexend = (page_no * 10)

        let rowCount;
        let bindparams = {};
        let querydocid = ''

        if (doc_id) {
            querydocid = ` AND DOC_ID = :docid `
            bindparams.docid = doc_id
        }

        if (sort_type && sort_field) {
            querysort = ` ORDER BY ${sort_field} ${sort_type} `
        } else {
            querysort = ` ORDER BY DOC_ID ASC `
        }

        /* ... fetch writeoff header from database ... */

        const sqlbase =
            `
            SELECT
                ROWNUM AS LINE_NUMBER,
                MAINQ.*
            FROM
                (
                    SELECT
                        XRWD.*,
                        (
                            SELECT 
                                COUNT(*)
                            FROM 
                                BTW.X_REQUEST_WRITEOFF_DETAIL_LOG XRWDL
                            WHERE 
                                NVL (CANCEL, 'X') <> 'Y'
                                AND XRWDL.DOC_ID = XRWD.DOC_ID
                                AND XRWDL.HP_NO = XRWD.HP_NO
                                AND NVL(XRWDL.CANCEL, 'X') <> 'Y'
                        ) AS COMMENT_COUNT
                    FROM
                        BTW.X_REQUEST_WRITEOFF_DETAIL XRWD
                    WHERE
                        NVL (CANCEL, 'X') <> 'Y'
                        ${querydocid}
                        ${querysort}
                ) MAINQ
            `

        const sqlcount = `SELECT COUNT(LINE_NUMBER) AS ROWCOUNT FROM (${sqlbase})`

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
                    mesasage: `error during get list data of writeoff detail list : ${e.message}`,
                    data: []
                })
            }

        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
            status: 400,
            mesasage: `error during fetch writeof header : ${e.message}`,
            data: []
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

async function fetchwriteoffheadercomment(req, res, next) {

    let connection;
    try {

        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow } = req.body

        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }


        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /*... check stage ctrl ... */
        let checkstagectrl;
        try {

            checkstagectrl = await connection.execute(
                `
                SELECT
                    MQRY.*
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWSC.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_STAGE_CTRL XRWSC
                        WHERE
                            DOC_ID = :doc_id 
                        ORDER BY
                            UPD_DATETIME DESC
                    ) MQRY
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (checkstagectrl.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้ (can't find ctrl stage)`,
                    data: []
                })
            }

            /*... stage stage flow match with stage ctrl ... */

            if (checkstagectrl.rows[0].STAGE_FLOW !== stage_flow) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check stage ctrl (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        const commentHeaderList = await connection.execute(
            `
            SELECT
                XRWHL.*,
                BTW.F_GET_EMP_NAME_ID (XRWHL.UPD_USER) AS UPD_NAME,
                CASE
                    WHEN XRWHL.stage_flow = :stage_flow
                    AND ROW_NUMBER() OVER (
                        PARTITION BY
                            DOC_ID
                        ORDER BY
                            CREATED_TIME desc
                    ) = 1 THEN 'Y'
                    ELSE 'N'
                END AS is_edit
            FROM
                BTW.X_REQUEST_WRITEOFF_HEADER_LOG XRWHL
            WHERE
                DOC_ID = :doc_id
            `
            , {
                stage_flow: stage_flow,
                doc_id: doc_id
            }, {
            outFormat: oracledb.OBJECT
        })

        if (commentHeaderList.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'No data',
                data: []
            })
        } else {
            const resData = commentHeaderList.rows
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
            status: 400,
            message: `Fail : ${e.message ?? 'No return message'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function fetchwriteoffdetailcomment(req, res, next) {

    let connection;
    try {

        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow, hp_no } = req.body

        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check parameter hp_no... */
        if (!hp_no) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters hp_no`,
                data: []
            })
        }


        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /*... check stage ctrl ... */
        let checkstagectrl;
        try {

            checkstagectrl = await connection.execute(
                `
                SELECT
                    MQRY.*
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWSC.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_STAGE_CTRL XRWSC
                        WHERE
                            DOC_ID = :doc_id 
                        ORDER BY
                            UPD_DATETIME DESC
                    ) MQRY
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (checkstagectrl.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้ (can't find ctrl stage)`,
                    data: []
                })
            }

            /*... stage stage flow match with stage ctrl ... */

            if (checkstagectrl.rows[0].STAGE_FLOW !== stage_flow) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check stage ctrl (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        const commentDetailList = await connection.execute(
            `
            SELECT
                XRWDL.*,
                BTW.F_GET_EMP_NAME_ID (XRWDL.UPD_USER) AS UPD_NAME,
                CASE
                    WHEN XRWDL.stage_flow = :stage_flow
                    AND ROW_NUMBER() OVER (
                        PARTITION BY
                            DOC_ID
                        ORDER BY
                            CREATED_TIME desc
                    ) = 1 THEN 'Y'
                    ELSE 'N'
                END AS is_edit
            FROM
                BTW.X_REQUEST_WRITEOFF_DETAIL_LOG XRWDL
            WHERE
                DOC_ID = :doc_id
                AND HP_NO = :hp_no
                AND NVL(CANCEL, 'X') <> 'Y' 
            `
            , {
                stage_flow: stage_flow,
                doc_id: doc_id,
                hp_no: hp_no
            }, {
            outFormat: oracledb.OBJECT
        })

        if (commentDetailList.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No data',
                data: []
            })
        } else {
            const resData = commentDetailList.rows
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
            status: 400,
            message: `Fail : ${e.message ?? 'No return message'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function createwriteoffheadercomment(req, res, next) {

    let connection;
    try {
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow, message } = req.body


        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check parameter message... */
        if (!message) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters message`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /*... check stage ctrl ... */
        let checkstagectrl;
        try {

            checkstagectrl = await connection.execute(
                `
                SELECT
                    MQRY.*
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWSC.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_STAGE_CTRL XRWSC
                        WHERE
                            DOC_ID = :doc_id 
                        ORDER BY
                            UPD_DATETIME DESC
                    ) MQRY
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (checkstagectrl.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้ (can't find ctrl stage)`,
                    data: []
                })
            }

            /*... stage stage flow match with stage ctrl ... */

            if (checkstagectrl.rows[0].STAGE_FLOW !== stage_flow) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check stage ctrl (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check recent comment ... */
        /* ... if no comment match with rework_id => insert comment ... */
        /* ... if comment match with rework_id => edit comment ... */
        /* ... edit commmet mean update recent comment (stage_comment, created_time and upd_user) ... */

        let isComment;
        try {

            const recentCommentHeader = await connection.execute(
                `
                SELECT
                    *
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWHL.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_HEADER_LOG XRWHL
                        WHERE
                            DOC_ID = :doc_id
                            AND REWORK_ID = :rework_id
                            AND UPD_USER = :userid
                    )
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id,
                rework_id: checkstagectrl.rows[0].REWORK_ID,
                userid: token.ID
            }, { outFormat: oracledb.OBJECT }
            )

            isComment = recentCommentHeader.rows.length !== 0


        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check recent comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        try {
            /* .... get time for create writeoff headder log ... */

            let current_timestamp_value;
            try {
                const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

                if (current_timestamp.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: `can't get current_timestamp value from server`,
                        data: []
                    })
                }

                current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

            } catch (e) {
                return res.status(200).send({
                    status: 400,
                    message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                    data: []
                })
            }

            if (!isComment) {
                /* ... insert comment ... */

                const result_create_writeoff_header_log = await connection.execute(
                    `
                    INSERT INTO BTW.X_REQUEST_WRITEOFF_HEADER_LOG (
                        DOC_ID,
                        STAGE_FLOW,
                        STAGE_COMMENT,
                        STAGE_LOG,
                        UPD_USER,
                        CREATED_TIME,
                        REWORK_ID
                    ) VALUES (
                        :doc_id,
                        :stage_flow,
                        :stage_comment,
                        :stage_log,
                        :upd_user,
                        :created_time,
                        :rework_id
                    )
                    `, {
                    doc_id: doc_id,
                    stage_flow: checkstagectrl.rows[0].STAGE_FLOW,
                    stage_comment: message,
                    stage_log: 'สร้างรายการ Header Log',
                    upd_user: token.ID,
                    created_time: { val: current_timestamp_value, type: oracledb.DATE },
                    rework_id: checkstagectrl.rows[0].REWORK_ID
                }, { autoCommit: false })

                console.log(`success create writeoff header list (row : ${result_create_writeoff_header_log.rowsAffected})`)

            } else {
                /* ... edit comment => update recent comment (stage_comment, created_time and upd_user) ... */

                /* ... fixed to seperate api to updatewriteoffheadercomment (11/03/2024) ... */

                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถสร้างรายการ comment header ได้เนื่องจากมีรายการแล้ว`,
                    data: []
                })
            }
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to create or edit comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... commit stage ... */

        try {

            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `สร้าง / อัพเดทรายการ writeoff header log สำเร็จ`,
                data: []
            })

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit created or update writeoff header log (${e.message ?? 'No return message'})`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function createwriteoffdetailcomment(req, res, next) {

    let connection;
    try {
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow, hp_no, message } = req.body


        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check parameter hp_no... */
        if (!hp_no) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters hp_no`,
                data: []
            })
        }

        /* ... check parameter message... */
        if (!message) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters message`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /*... check stage ctrl ... */
        let checkstagectrl;
        try {

            checkstagectrl = await connection.execute(
                `
                SELECT
                    MQRY.*
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWSC.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_STAGE_CTRL XRWSC
                        WHERE
                            DOC_ID = :doc_id 
                        ORDER BY
                            UPD_DATETIME DESC
                    ) MQRY
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (checkstagectrl.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้ (can't find ctrl stage)`,
                    data: []
                })
            }

            /*... stage stage flow match with stage ctrl ... */

            if (checkstagectrl.rows[0].STAGE_FLOW !== stage_flow) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check stage ctrl (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check recent comment ... */
        /* ... if no comment match with rework_id => insert comment ... */
        /* ... if comment match with rework_id => edit comment ... */
        /* ... edit commmet mean update recent comment (stage_comment, created_time and upd_user) ... */

        let isComment;
        try {

            const recentCommentHeader = await connection.execute(
                `
                SELECT
                    *
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWDL.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_DETAIL_LOG XRWDL
                        WHERE
                            DOC_ID = :doc_id
                            AND REWORK_ID = :rework_id
                            AND UPD_USER = :userid
                            AND HP_NO = :hp_no
                            AND NVL(CANCEL, 'X') <> 'Y' 
                    )
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id,
                rework_id: checkstagectrl.rows[0].REWORK_ID,
                userid: token.ID,
                hp_no: hp_no
            }, { outFormat: oracledb.OBJECT }
            )

            isComment = recentCommentHeader.rows.length !== 0


        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check recent comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        try {
            /* .... get time for create writeoff headder log ... */

            let current_timestamp_value;
            try {
                const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

                if (current_timestamp.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: `can't get current_timestamp value from server`,
                        data: []
                    })
                }

                current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

            } catch (e) {
                return res.status(200).send({
                    status: 400,
                    message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                    data: []
                })
            }

            if (!isComment) {
                /* ... insert comment ... */

                const result_create_writeoff_header_log = await connection.execute(
                    `
                    INSERT INTO BTW.X_REQUEST_WRITEOFF_DETAIL_LOG (
                        DOC_ID,
                        HP_NO,
                        STAGE_FLOW,
                        STAGE_COMMENT,
                        STAGE_LOG,
                        UPD_USER,
                        CREATED_TIME,
                        REWORK_ID
                    ) VALUES (
                        :doc_id,
                        :hp_no,
                        :stage_flow,
                        :stage_comment,
                        :stage_log,
                        :upd_user,
                        :created_time,
                        :rework_id
                    )
                    `, {
                    doc_id: doc_id,
                    hp_no: hp_no,
                    stage_flow: checkstagectrl.rows[0].STAGE_FLOW,
                    stage_comment: message,
                    stage_log: 'สร้างรายการ Header Log',
                    upd_user: token.ID,
                    created_time: { val: current_timestamp_value, type: oracledb.DATE },
                    rework_id: checkstagectrl.rows[0].REWORK_ID
                }, { autoCommit: false })

                console.log(`success create writeoff header list (row : ${result_create_writeoff_header_log.rowsAffected})`)

            } else {
                /* ... edit comment => update recent comment (stage_comment, created_time and upd_user) ... */

                /* ... fixed to seperate api to updatewriteoffheadercomment (11/03/2024) ... */

                return res.status(200).send({
                    status: 400,
                    message: `ไม่สามารถสร้างรายการ comment detail ได้เนื่องจากมีรายการแล้ว`,
                    data: []
                })
            }
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to create or edit comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... commit stage ... */

        try {

            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `สร้าง / อัพเดทรายการ writeoff header log สำเร็จ`,
                data: []
            })

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit created or update writeoff header log (${e.message ?? 'No return message'})`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function updatewriteoffheadercomment(req, res, next) {

    let connection;
    try {
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow, message } = req.body


        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check parameter message... */
        if (!message) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters message`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /*... check stage ctrl ... */
        let checkstagectrl;
        try {

            checkstagectrl = await connection.execute(
                `
                SELECT
                    MQRY.*
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWSC.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_STAGE_CTRL XRWSC
                        WHERE
                            DOC_ID = :doc_id 
                        ORDER BY
                            UPD_DATETIME DESC
                    ) MQRY
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (checkstagectrl.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้ (can't find ctrl stage)`,
                    data: []
                })
            }

            /*... stage stage flow match with stage ctrl ... */

            if (checkstagectrl.rows[0].STAGE_FLOW !== stage_flow) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check stage ctrl (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check recent comment ... */
        /* ... if no comment match with rework_id => insert comment ... */
        /* ... if comment match with rework_id => edit comment ... */
        /* ... edit commmet mean update recent comment (stage_comment, created_time and upd_user) ... */

        let isComment;
        try {

            const recentCommentHeader = await connection.execute(
                `
                SELECT
                    *
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWHL.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_HEADER_LOG XRWHL
                        WHERE
                            DOC_ID = :doc_id
                            AND REWORK_ID = :rework_id
                            AND UPD_USER = :userid
                    )
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id,
                rework_id: checkstagectrl.rows[0].REWORK_ID,
                userid: token.ID
            }, { outFormat: oracledb.OBJECT }
            )

            isComment = recentCommentHeader.rows.length !== 0


        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check recent comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        try {
            /* .... get time for create writeoff headder log ... */

            let current_timestamp_value;
            try {
                const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

                if (current_timestamp.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: `can't get current_timestamp value from server`,
                        data: []
                    })
                }

                current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

            } catch (e) {
                return res.status(200).send({
                    status: 400,
                    message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                    data: []
                })
            }

            if (!isComment) {
                /* ... insert comment ... */

                /* ... fixed to seperate api to createwriteoffheadercomment (11/03/2024) ... */

                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถอัพเดทรายการ header comment ได้ยังไม่มี comment ภายใต้ ID ของ stage นี้ (rework_id)`,
                    data: []
                })

            } else {
                /* ... edit comment => update recent comment (stage_comment, created_time and upd_user) ... */

                const result_update_writeoff_header_log = await connection.execute(
                    `
                    UPDATE BTW.X_REQUEST_WRITEOFF_HEADER_LOG
                    SET
                        STAGE_COMMENT = :stage_comment,
                        STAGE_LOG = :stage_log,
                        CREATED_TIME = :created_time,
                        UPD_USER = :upd_user
                    WHERE
                        DOC_ID = :doc_id
                        AND STAGE_FLOW = :stage_flow
                        AND REWORK_ID = :rework_id
                        AND UPD_USER = :upd_user  
                    `, {
                    stage_comment: message,
                    stage_log: 'สร้างรายการ Header Log',
                    created_time: { val: current_timestamp_value, type: oracledb.DATE },
                    upd_user: token.ID,
                    doc_id: doc_id,
                    stage_flow: checkstagectrl.rows[0].STAGE_FLOW,
                    rework_id: checkstagectrl.rows[0].REWORK_ID

                }, { autoCommit: false })

                console.log(`success update writeoff header list (row : ${result_update_writeoff_header_log.rowsAffected})`)

                /* ... check update row == 1 ... */
                if (result_update_writeoff_header_log.rowsAffected !== 1) {
                    return res.status(200).send({
                        status: 400,
                        message: `update writeoff header log can't identify`,
                        data: []
                    })
                }
            }
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to create or edit comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... commit stage ... */

        try {

            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `สร้าง / อัพเดทรายการ writeoff header log สำเร็จ`,
                data: []
            })

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit created or update writeoff header log (${e.message ?? 'No return message'})`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}

async function updatewriteoffdetailcomment(req, res, next) {

    let connection;
    try {
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***

        const { doc_id, stage_flow, hp_no, message } = req.body


        /* ... check parameter doc_id... */
        if (!doc_id) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters doc_id`,
                data: []
            })
        }

        /* ... check parameter stage_flow... */
        if (!stage_flow) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters stage_flow`,
                data: []
            })
        }

        /* ... check parameter hp_no... */
        if (!hp_no) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters hp_no`,
                data: []
            })
        }

        /* ... check parameter message... */
        if (!message) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters message`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        try {
            /* ... check stage permission ... */
            const checkstage = await getuserstage(userid)
            if (!checkstage) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })
            if (checkstage.stage_flow !== stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ`, data: [] })


            /* ... check doc_id in stage ... */
            const checkdocidstage = await connection.execute(` SELECT STAGE_FLOW FROM BTW.X_REQUEST_WRITEOFF_HEADER WHERE DOC_ID = :doc_id `, { doc_id: doc_id }, { outFormat: oracledb.OBJECT })
            if (checkdocidstage.rows.length == 0) return res.status(200).send({ status: 400, message: `ไม่พบรายการ doc_id ภายใต้ stage flow` })
            if (checkdocidstage.rows[0].STAGE_FLOW !== checkstage.stage_flow) return res.status(200).send({ status: 400, message: `ไม่มีสิทธ์ในการทำรายการ (stage flow miss match)` })

        } catch (e) {
            return res.status(200).send({
                status: 400,
                message: `Error when try to check permission of stage flow and doc_id (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /*... check stage ctrl ... */
        let checkstagectrl;
        try {

            checkstagectrl = await connection.execute(
                `
                SELECT
                    MQRY.*
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWSC.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_STAGE_CTRL XRWSC
                        WHERE
                            DOC_ID = :doc_id 
                        ORDER BY
                            UPD_DATETIME DESC
                    ) MQRY
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id
            }, {
                outFormat: oracledb.OBJECT
            })

            if (checkstagectrl.rows.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้ (can't find ctrl stage)`,
                    data: []
                })
            }

            /*... stage stage flow match with stage ctrl ... */

            if (checkstagectrl.rows[0].STAGE_FLOW !== stage_flow) {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่ได้อยู่ใน stage ที่สามารถทำรายการได้`,
                    data: []
                })
            }

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check stage ctrl (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... check recent comment ... */
        /* ... if no comment match with rework_id => insert comment ... */
        /* ... if comment match with rework_id => edit comment ... */
        /* ... edit commmet mean update recent comment (stage_comment, created_time and upd_user) ... */

        let isComment;
        try {

            const recentCommentHeader = await connection.execute(
                `
                SELECT
                    *
                FROM
                    (
                        SELECT
                            ROWNUM AS LINE_NUMBER,
                            XRWDL.*
                        FROM
                            BTW.X_REQUEST_WRITEOFF_DETAIL_LOG XRWDL
                        WHERE
                            DOC_ID = :doc_id
                            AND REWORK_ID = :rework_id
                            AND UPD_USER = :userid
                            AND HP_NO = :hp_no
                            AND NVL(CANCEL, 'X') <> 'Y' 
                    )
                WHERE
                    LINE_NUMBER = 1
                `, {
                doc_id: doc_id,
                rework_id: checkstagectrl.rows[0].REWORK_ID,
                userid: token.ID,
                hp_no: hp_no
            }, { outFormat: oracledb.OBJECT }
            )

            isComment = recentCommentHeader.rows.length !== 0


        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to check recent comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        try {
            /* .... get time for create writeoff headder log ... */

            let current_timestamp_value;
            try {
                const current_timestamp = await connection.execute(`SELECT CURRENT_TIMESTAMP FROM DUAL`, {}, { outFormat: oracledb.OBJECT })

                if (current_timestamp.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: `can't get current_timestamp value from server`,
                        data: []
                    })
                }

                current_timestamp_value = current_timestamp.rows[0].CURRENT_TIMESTAMP

            } catch (e) {
                return res.status(200).send({
                    status: 400,
                    message: `Error during get CUREENT_TIME from database ${e.message ?? 'No retrun message'}`,
                    data: []
                })
            }

            if (!isComment) {
                /* ... insert comment ... */

                /* ... fixed to seperate api to createwriteoffheadercomment (11/03/2024) ... */

                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถอัพเดทรายการ detail comment ได้ยังไม่มี comment ภายใต้ ID ของ stage นี้ (rework_id)`,
                    data: []
                })

            } else {
                /* ... edit comment => update recent comment (stage_comment, created_time and upd_user) ... */

                const result_update_writeoff_header_log = await connection.execute(
                    `
                    UPDATE BTW.X_REQUEST_WRITEOFF_DETAIL_LOG
                    SET
                        STAGE_COMMENT = :stage_comment,
                        STAGE_LOG = :stage_log,
                        CREATED_TIME = :created_time,
                        UPD_USER = :upd_user
                    WHERE
                        DOC_ID = :doc_id
                        AND STAGE_FLOW = :stage_flow
                        AND REWORK_ID = :rework_id
                        AND UPD_USER = :upd_user 
                        AND HP_NO = :hp_no
                    `, {
                    stage_comment: message,
                    stage_log: 'สร้างรายการ Header Log',
                    created_time: { val: current_timestamp_value, type: oracledb.DATE },
                    upd_user: token.ID,
                    doc_id: doc_id,
                    stage_flow: checkstagectrl.rows[0].STAGE_FLOW,
                    rework_id: checkstagectrl.rows[0].REWORK_ID,
                    hp_no: hp_no

                }, { autoCommit: false })

                console.log(`success update writeoff header list (row : ${result_update_writeoff_header_log.rowsAffected})`)

                /* ... check update row == 1 ... */
                if (result_update_writeoff_header_log.rowsAffected !== 1) {
                    return res.status(200).send({
                        status: 400,
                        message: `update writeoff header log can't identify`,
                        data: []
                    })
                }
            }
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to create or edit comment (${e.message ?? 'No return message'})`,
                data: []
            })
        }

        /* ... commit stage ... */

        try {

            await connection.commit()

            return res.status(200).send({
                status: 200,
                message: `สร้าง / อัพเดทรายการ writeoff header log สำเร็จ`,
                data: []
            })

        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 400,
                message: `Error when try to commit created or update writeoff header log (${e.message ?? 'No return message'})`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 400,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}


module.exports.checkuserstage = checkuserstage
module.exports.baddebtlistdashboard = baddebtlistdashboard
/* ... create writeoff list ... */
module.exports.createwriteofflist = createwriteofflist
/* ... update writeoff list ... */
module.exports.addwriteoffdetail = addwriteoffdetail
/* ... remove writeoff list ... */
module.exports.removewriteoffdetail = removewriteoffdetail
module.exports.removewriteoffheader = removewriteoffheader
/*... fetch writeoff ... */
module.exports.fetchwriteoffheader = fetchwriteoffheader
module.exports.fetchwriteoffdetail = fetchwriteoffdetail
/*... fetch comment ... */
module.exports.fetchwriteoffheadercomment = fetchwriteoffheadercomment
module.exports.fetchwriteoffdetailcomment = fetchwriteoffdetailcomment
/* ... create comment ... */
module.exports.createwriteoffheadercomment = createwriteoffheadercomment
module.exports.createwriteoffdetailcomment = createwriteoffdetailcomment
/* ... update comment ... */
module.exports.updatewriteoffheadercomment = updatewriteoffheadercomment
module.exports.updatewriteoffdetailcomment = updatewriteoffdetailcomment