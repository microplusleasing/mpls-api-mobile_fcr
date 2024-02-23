const oracledb = require('oracledb')
const config = require('./connectdb')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken')
var multiparty = require('multiparty');
const fs = require('fs');

async function callMobileDial(req, res, next) {

    try {
        let test = req.body
        console.log(`this is body : ${JSON.stringify(test)}`)
        return res.status(200).send({
            message: 200,
            data: {
                mobile_status: 'success',
                code: '001',
                filed_1: `data_1`
            }
        })

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    }
}

async function checkcallrecent(req, res, next) {

    let connection;
    try {

        // const { application_id, user_id } = req.body
        // const { user_id } = req.body
        const token = req.user
        const user_id = token.user_id
        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
        SELECT COUNT(*) AS WAITING_DIAL
        FROM(
        SELECT CALL_TRACK_INFO.hp_no,NVL(NEGO_INFO.hp_no,'Y') AS STATUS_WAIT
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
                -- AND CALL_TRACK_INFO.HP_NO = :APPLICATION_ID
                AND CALL_TRACK_INFO.USER_NAME = :USER_ID
                AND CALL_TRACK_INFO.CON_R_CODE = 'CON'
                AND CALL_TRACK_INFO.PHONE_NO <> '0'
                )
                WHERE STATUS_WAIT = 'Y' 
        `
            , {
                // APPLICATION_ID: application_id,
                USER_ID: user_id
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
            const check_recent_dial = result.rows[0].WAITING_DIAL
            if (check_recent_dial == 0) {
                return res.status(200).send({
                    status: 200,
                    message: 'Success',
                    data: {
                        no_recent_dial: true
                    }
                })
            } else {

                // *** GET RECENT HP_NO (15/08/2023) ****
                const dupdata = await connection.execute(`
                SELECT * 
                FROM 
                (
                SELECT          CALL_TRACK_INFO.hp_no,NVL(NEGO_INFO.hp_no,'Y') AS STATUS_WAIT
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
                                -- AND CALL_TRACK_INFO.HP_NO = :APPLICATION_ID
                                AND CALL_TRACK_INFO.USER_NAME = :USER_ID
                                AND CALL_TRACK_INFO.CON_R_CODE = 'CON'
                                AND CALL_TRACK_INFO.PHONE_NO <> '0'
                                ORDER BY CALL_TRACK_INFO.REC_DATE DESC
                )
                                WHERE STATUS_WAIT = 'Y' 
                `, {
                    user_id: user_id
                }, {
                    outFormat: oracledb.OBJECT
                })


                if (dupdata.rows[0].HP_NO) {
                    const recent_hp_no = dupdata.rows[0].HP_NO

                    return res.status(200).send({
                        status: 200,
                        message: 'No data',
                        data: {
                            no_recent_dial: false,
                            recent_hp_no: recent_hp_no
                        }
                    })
                } else {
                    return res.status(200).send({
                        status: 200,
                        message: 'No data',
                        data: {
                            no_recent_dial: false,
                            recent_hp_no: ''
                        }
                    })
                }

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

async function createcalltrackdial(req, res, next) {

    let connection;
    try {


        // const { branch_code, hp_no, cust_id, phone_no, staff_id, con_r_code, user_name } = req.body
        const { branch_code, hp_no, cust_id, phone_no, staff_id, con_r_code, latitude, longitude, errmsg } = req.body
        const token = req.user
        const user_name = token.user_id
        const currentDate = moment()
        const currentTime = moment(currentDate).format("HH:mm:ss");
        // Generate a UUID
        const uuid = uuidv4();
        // Remove hyphens from the UUID
        const key = uuid.replace(/-/g, '');
        connection = await oracledb.getConnection(config.database)
        const result_insert = await connection.execute(`
                INSERT INTO BTW.CALL_TRACK_INFO (
                    BRANCH_CODE,
                    HP_NO,
                    CUST_ID,
                    PHONE_NO,
                    CALL_DATE,
                    STAFF_ID,
                    CON_R_CODE,
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
                    :user_name,
                    :rec_day,
                    :latitude,
                    :longitude,
                    :err_lati_longi_desc,
                    :call_keyapp_id 
                )
        `
            , {
                branch_code: branch_code,
                hp_no: hp_no,
                cust_id: cust_id,
                phone_no: phone_no,
                call_date: currentTime,
                staff_id: staff_id,
                con_r_code: con_r_code,
                user_name: user_name,
                rec_day: (new Date(currentDate)) ?? null,
                latitude: latitude,
                longitude: longitude,
                err_lati_longi_desc: errmsg ? errmsg : '',
                call_keyapp_id: key
            }, {
            outFormat: oracledb.OBJECT,
        })

        if (result_insert.rowsAffected == 1) {

            // == succeess create quotation econsent flow (DIPCHIP) ==
            const commitall = await connection.commit();

            try {
                commitall

                return res.status(200).send({
                    status: 200,
                    uuid: key,
                    message: 'success insert call track record.'
                })
            } catch (e) {
                logger.error(`user ${userid}, quotationid: ${quotationKeyid} : commit fail : ${e.message ? e.message : 'No return message'}`)
                console.err(e.message)
                return res.status(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }
        } else {
            return res.status(200).send({
                status: 400,
                message: 'fail insert call track record.'
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

async function gettokenmobiledial(req, res, next) {

    let connection;
    try {

        let { user_id } = req.body

        const token = jwt.sign(
            {
                userId: user_id
            },

        )

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

async function updatefailcalldial(req, res, next) {

    let connection;
    try {

        // const { uuid, code } = req.body
        const { uuid, code, timestamp } = req.body
        const token = req.user
        const userid = token.user_id
        connection = await oracledb.getConnection(config.database)
        // const response_date = `2023-07-26T07:51:34.1185769Z`
        const timestamp_bind = timestamp !== null ? timestamp : moment().format('YYYY-MM-DD HH:mm:ss.SSSSSSS ZZ');
        const currentUtcTime = moment.utc(timestamp_bind).format('DD/MM/YYYY HH:mm:ss');
        console.log(`timestamp_bind : ${timestamp_bind}`)
        console.log(`currentUtcTime : ${currentUtcTime}`)
        const result = await connection.execute(`
        UPDATE BTW.CALL_TRACK_INFO
            SET
                RESPONSE_CALL_DATETIME = to_date(:response_date, 'DD/MM/YYYY hh24:mi:ss'), 
                RESPONSE_CALL_STATUS = :response_code 
            WHERE CALL_KEYAPP_ID = :uuid 
            AND USER_NAME = :userid`
            , {
                response_date: currentUtcTime,
                response_code: code,
                uuid: uuid,
                userid: userid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rowsAffected == 1) {

            // == succeess create quotation econsent flow (DIPCHIP) ==
            const commitall = await connection.commit();

            try {
                commitall

                return res.status(200).send({
                    status: 200,
                    message: 'update call track success !'
                })

            } catch (e) {
                console.err(e.message)
                return res.status(200).send({
                    status: 500,
                    message: `update call track fail (commit stage) : ${e.message}`,
                    data: []
                })
            }

        } else {
            return res.status(200).send({
                status: 400,
                message: 'update call track fail !'
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

async function insertnegotocalltrack(req, res, next) {

    let connection;
    try {

        // let { hp_no, cust_id, staff_id, neg_r_code, appoint_date, message1, message2, recall, dunning_letter, assign_fcr } = req.body
        // let appoint_date_dtype;
        // if (appoint_date) {
        //     appoint_date_dtype = moment(appoint_date, 'DD/MM/YYYY').format('LL')
        // }


        const branch_code = 10
        const token = req.user
        const userid = token.ID // *** no 10 incluse ***
        const user_name = token.user_id // *** 10 incluse ***


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
        let appoint_date_dtype;
        if (reqData.appoint_date) {
            appoint_date_dtype = moment(reqData.appoint_date, 'DD/MM/YYYY').format('LL')
        }

        // uncomment for next deploy (19/02/2024)
        let timesplit = []
        let hoursplit = ''
        let minsplit = ''
        if (reqData.recall_time && typeof reqData.recall_time == 'string') {
            timesplit = reqData.recall_time.split(':')
            if (timesplit.length == 2) {
                hoursplit = timesplit[0]
                minsplit = timesplit[1]
            }
        }

        connection = await oracledb.getConnection(config.database)
        // *** check call_track_info record is waiting ****
        const result_check_wait = await connection.execute(`
        SELECT *
        FROM (
                    SELECT CALL_TRACK_INFO.hp_no,NVL(NEGO_INFO.hp_no,'Y') AS STATUS_WAIT
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
                    -- AND CALL_TRACK_INFO.HP_NO = :APPLICATION_ID
                    AND CALL_TRACK_INFO.USER_NAME = :USER_ID
                    AND CALL_TRACK_INFO.CON_R_CODE = 'CON'
                    AND CALL_TRACK_INFO.PHONE_NO <> '0'
                    ORDER BY REC_DAY DESC 
            )
        WHERE ROWNUM = 1 `
            , {
                USER_ID: user_name
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result_check_wait.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: `ไม่พบรายการตามเงื่อนไขที่กำหนด (Fail to check call_track_info record)`,
                data: []
            })
        } else {
            if (result_check_wait.rows[0].STATUS_WAIT !== 'Y') {
                return res.status(200).send({
                    status: 400,
                    message: `ไม่พบรายการผ่านระบบโทรออก (Call Mobile Dial)`,
                    data: []
                })
            } else {
                // *** Match recent call_track_info record ***

                // *** get query recent call_track_info record database ****
                const res_recent_call_track = await connection.execute(`
                SELECT *
                    FROM (
                        SELECT  HP_NO, REC_DAY, CALL_KEYAPP_ID, RESPONSE_CALL_STATUS 
                        FROM CALL_TRACK_INFO
                        WHERE HP_NO = :HP_NO 
                        AND USER_NAME = :USER_NAME 
                        AND CON_R_CODE = :CON_R_CODE 
                        ORDER BY REC_DAY DESC 
                    )
                    WHERE ROWNUM = 1 
                `, {
                    HP_NO: reqData.hp_no,
                    USER_NAME: user_name,
                    CON_R_CODE: 'CON'
                }, {
                    outFormat: oracledb.OBJECT
                })

                console.log(`res_recent_call_track: ${JSON.stringify(res_recent_call_track)}`)

                if (res_recent_call_track.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: `ไม่พบรายการตามเงื่อนไขที่กำหนด (Fail to check call_track_info record)`,
                        data: []
                    })
                } else {
                    console.log(`REC_DAY : ${res_recent_call_track.rows[0].REC_DAY}`)
                    console.log(`CALL_KEYAPP_ID : ${res_recent_call_track.rows[0].CALL_KEYAPP_ID}`)
                    if (
                        (res_recent_call_track.rows[0].REC_DAY == null || res_recent_call_track.rows[0].REC_DAY == '') &&
                        (res_recent_call_track.rows[0].CALL_KEYAPP_ID == null || res_recent_call_track.rows[0].CALL_KEYAPP_ID == '')
                    ) {
                        return res.status(200).send({
                            status: 400,
                            message: `ไม่พบค่าเวลาที่โทรออก (CALL_TRACK_INFO.REC_DAY , CALL_TRACK_INFO.CALL_KEYAPP_ID)`
                        })
                    } else {
                        // *** have rec_day ***
                        const rec_day = res_recent_call_track.rows[0].REC_DAY
                        const call_keyapp_id = res_recent_call_track.rows[0].CALL_KEYAPP_ID
                        const response_call_status = res_recent_call_track.rows[0].RESPONSE_CALL_STATUS

                        // *** check if RESPONSE_CALL_STATUS == 500 update call_track_info.REC_DATE

                        // if (response_call_status == '500') {
                        // **** CHANGE TO !== 200 DO THIS (P'THEP) (31/07/2023) ***
                        if (response_call_status !== '200') {
                            try {

                                // *** update recent call_track ***
                                const update_call_track_info = await connection.execute(`
                                    UPDATE BTW.CALL_TRACK_INFO 
                                    SET REC_DATE = TO_CHAR(SYSDATE, 'hh24:mi:ss') 
                                    WHERE CALL_KEYAPP_ID = :CALL_KEYAPP_ID
                                `, {
                                    CALL_KEYAPP_ID: call_keyapp_id
                                }, {
                                    autoCommit: true
                                })

                                console.log(`update call_track_info success : ${JSON.stringify(update_call_track_info)}`)

                            } catch (e) {
                                try {
                                    if (connection) {
                                        await connection.rollback()
                                        return res.status(200).send({
                                            status: 400,
                                            message: `อัพเดทประวัติการติดตามไม่สำเร็จ (call track info record): ${e.message ? e.message : `No message`}`
                                        })
                                    } else {
                                        console.log(`create call_track_info success (no-connection) (update call track)`)
                                        return res.status(200).send({
                                            status: 400,
                                            message: `อัพเดทประวัติการติดตามไม่สำเร็จ (call track info record): ${e.message ? e.message : `No message`}`
                                        })
                                    }
                                } catch (e) {
                                    return res.status(400).send({
                                        status: 400,
                                        message: `อัพเดทประวัติการติดตามไม่สำเร็จ (call track info record), (rollback fail): ${e.message ? e.message : `No message`}`
                                    })
                                }
                            }

                            // image upload for type neg_r_code == 'M03'
                            // for neg_r_code = 'M03'
                            const imagesArray = fileData.images ? fileData.images : []
                            const coverImageArray = fileData.coverimages ? fileData.coverimages : []

                            // get uuid from call_keyapp_id
                            const uuid = call_keyapp_id

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
                                                call_keyapp_id: uuid,
                                                image_index: i,
                                                image_type: imagesArray[i].headers['content-type'],
                                                image_file: imagetobuffer(imagesArray[i]),
                                                image_cover: imagetobuffer(coverImageArray[i])
                                            })
                                    }
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
                        }

                        // *** create nego info to call track info ***

                        try {

                            // let appointmentquerynego1 = '';
                            // let appointmentquerynego2 = '';
                            let addonfield1 = '';
                            let addonfield2 = '';
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
                                        CALL_KEYAPP_ID,
                                        AGENT_CALL_UUID,
                                        CHECK_SEC_DETAIL`
                            let mainquerynego2 = ` ) VALUES (
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
                                        :call_keyapp_id,
                                        :agent_call_uuid,
                                        :check_sec_detail 
                                    `

                            bindparamnego.branch_code = branch_code
                            bindparamnego.hp_no = reqData.hp_no,
                                bindparamnego.neg_r_code = reqData.neg_r_code,
                                bindparamnego.rec_date = (new Date(rec_day)) ?? null
                            bindparamnego.message1 = reqData.message1
                            bindparamnego.message2 = reqData.message2
                            bindparamnego.staff_id = userid
                            bindparamnego.user_name = user_name
                            bindparamnego.cust_id = reqData.cust_id
                            // *** add more 3 optional field (31/07/2023) ***
                            bindparamnego.status_recall = reqData.recall
                            bindparamnego.req_dunning_letter = reqData.dunning_letter
                            bindparamnego.req_assign_fcr = reqData.assign_fcr
                            bindparamnego.location_sitevisit_addr_type = reqData.location_sitevisit_addr_type
                            bindparamnego.result_sitevisit_code = reqData.result_sitevisit_code
                            bindparamnego.call_keyapp_id = call_keyapp_id
                            bindparamnego.agent_call_uuid = reqData.uuidagentcall
                            bindparamnego.check_sec_detail = reqData.checksecdetail

                            if (appoint_date_dtype) {
                                addonfield1 = `, APPOINT_DATE `
                                addonfield2 = `, BTW.BUDDHIST_TO_CHRIS_F(:appoint_date) `
                                bindparamnego.appoint_date = (new Date(appoint_date_dtype)) ?? null
                            }

                            // uncomment for next deploy (19/02/2024)
                            if (timesplit.length == 2) {
                                addonfield1 += `, RECALL_DATETIME`
                                addonfield2 += `, TO_DATE(TO_CHAR(sysdate,'dd/mm/yyyy')||' '||:time,'dd/mm/yyyy hh24:mi')`
                                bindparamnego.time = reqData.recall_time
                            }

                            const finalqueryinsertnego = `${mainquerynego1}${addonfield1}${mainquerynego2}${addonfield2})`

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
                                    await connection.rollback()
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

                        // uncomment for next deploy (19/02/2024)
                        // === call aun procedure ====
                        if (reqData.uuidagentcall) {
                            try {
                                const callstore = await connection.execute(
                                    `
                                                            BEGIN BTW.NEGO_AGENT_CONTRACT_LIST_UPD (:user_code, :uuid, 'Y');
                                                            END;
                                                        `,
                                    {
                                        user_code: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: userid },
                                        uuid: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: reqData.uuidagentcall }
                                    })

                                console.log('Success call AUN Procedure !!!')

                            } catch (e) {
                                return res.status(200).send({
                                    status: 400,
                                    message: `Call Procedure Fail : ${e.mesasage ? e.message : `No message`}`
                                })
                            }
                        }

                        return res.status(200).send({
                            status: 200,
                            message: `สร้างรายการผลการติดตามเรียบร้อย (ระบบ Mobile Call Dial)`
                        })

                    }
                }
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




module.exports.callMobileDial = callMobileDial
module.exports.checkcallrecent = checkcallrecent
module.exports.createcalltrackdial = createcalltrackdial
module.exports.gettokenmobiledial = gettokenmobiledial
module.exports.updatefailcalldial = updatefailcalldial
module.exports.insertnegotocalltrack = insertnegotocalltrack