const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
var multiparty = require('multiparty');
const fs = require('fs');
const _util = require('./_selfutil');
const log4js = require("log4js");
const sdk = require('api')('@thaibulksms/v1.0#dfe7qml3crqtee');
const e = require('express');
const _mplsUtil = require('./_MPLSutil');

log4js.configure({
    appenders: {
        view: { type: "file", filename: "quotation-econsent.log" },
        create: { type: "file", filename: "quotation-econsent.log" },
        update: { type: "file", filename: "quotation-econsent.log" },
        cancle: { type: "file", filename: "quotation-econsent.log" }
    },
    categories: {
        default: { appenders: ["view"], level: "info" },
        create: { appenders: ["create"], level: "info" },
        update: { appenders: ["update"], level: "info" },
        cancle: { appenders: ["cancle"], level: "info" }
    }
});




// ***** step 1 (dipchip : MPLSP_QUOTATION) *****
async function MPLS_dipchip(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID

    const logger = log4js.getLogger("create");
    try {

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

        const reqData = JSON.parse(formData.item)

        // === check dopa status 500 return fail ===
        connection = await oracledb.getConnection(config.database)

        const dopastatuschk = await connection.execute(`
            SELECT * FROM DIPCHIP_CARD_READER_DOPA_LOG
            WHERE UUID = :UUID
        `, {
            UUID: reqData.dipchipuuid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (dopastatuschk.rows.length !== 1) {
            if (dopastatuschk.rows.length == 0) {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่พบรายการสืบค้น DOPA`,
                    data: []
                })
            } else {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถระบุรายการ DIPCHIP ได้`,
                    data: []
                })
            }
        } else {
            // === check status !== 500 ===
            const dopareturndata = dopastatuschk.rows[0]
            const dopastatus = dopareturndata.STATUS_CODE
            if (dopastatus == '500' || dopastatus == null || dopastatus == '') {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถทำรายการได้เนื่องจาก Server ตรวจสอบสถานะบัตรมีปัญหา ${dopastatus == `500` ? `(can't connect Server)` : `Timeout`}`,
                    data: []
                })
            }

            // ===  (incert more condition of dopad status check) check list of allow dopa status ===
            try {

                const rec_status_code = dopastatuschk.rows[0].STATUS_CODE
                const dopastatuslist = await connection.execute(`
                    select DISTINCT checkcardstatus_id as status_code from  dopa_checkcardstatus_p
                    where ECONSENT_STATUS = 'Y'
                    order by checkcardstatus_id asc`,
                    {}, { outFormat: oracledb.OBJECT })

                const statusCodelist = (dopastatuslist.rows).map((object) => object.STATUS_CODE);
                const statusCodelistString = statusCodelist.map((number) => number.toString());
                console.log(`list check : ${statusCodelistString}`)
                console.log(`rec check : ${rec_status_code}`)

                if (!(statusCodelistString.includes(rec_status_code))) {
                    return res.status(200).send({
                        status: 500,
                        message: `สถานะ DOPA ไม่ได้อยู่ในเงื่อนไขที่กำหนด`,
                        data: []
                    })
                }

                // ==== do next ===
            } catch (e) {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถตรวจสอบเงื่อนไข DOPA ที่อนุญาตได้ : ${e.message ? e.message : 'No return message'}`
                })
            }
        }


        const quotationKeyid = uuidv4()
        const living_place_key_id = uuidv4()
        const contact_place_key_id = uuidv4()
        const house_regis_place_key_id = uuidv4()
        const work_place_key_id = uuidv4()


        const otprefid = await _mplsUtil.internal_MPLS_get_refid()

        if (otprefid == '') {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถสร้างเลข ref_otp_id ได้`,
                data: []
            })
        }

        let cizcard_null = [];
        let cizcard_array;
        let cizcard_image_blob;
        if (reqData.cizcardImage) {
            cizcard_image_blob = reqData.cizcardImage ? cizcard_array = Buffer.from(reqData.cizcardImage, "base64") : cizcard_null
        }


        // console.log(`request body : ${JSON.stringify(reqData)}`)
        // console.log(`quotationid : ${quotationKeyid}`)
        // console.log(`userid: ${userid}`)

        const quotation_econsent = await connection.execute(`
            INSERT INTO MPLS_QUOTATION 
            (
                QUO_KEY_APP_ID,
                DIPCHIP_UUID,
                USER_ID,
                CIZCARD_IMAGE,
                TITLE_CODE,
                TITLE_NAME,
                FIRST_NAME,
                LAST_NAME,
                CIZ_GENDER,
                IDCARD_NUM,
                BIRTH_DATE,
                CIZ_ISSUED_DATE,
                CIZ_EXPIRED_DATE,
                CIZ_ISSUED_PLACE,
                CIZ_ADDRESS,
                CIZ_DISTRICT,
                CIZ_SUB_DISTRICT,
                CIZ_PROVINCE_NAME,
                CIZ_PROVINCE_CODE,
                CIZ_POSTAL_CODE,
                QUO_APP_REF_NO,
                CHANNAL_TYPE,
                CIZ_AGE,
                IS_DIPCHIP_CHANNAL,
                QUO_DOPA_STATUS,
                QUO_ECONSENT_FLAG,
                QUO_LIVING_PLACE_ID,
                QUO_CONTRACT_PLACE_ID,
                QUO_WORKING_PLACE_ID,
                QUO_HOUSE_REGIS_PLACE_ID,
                QUO_STATUS
            )
            VALUES 
            (
                :QUO_KEY_APP_ID,
                :DIPCHIP_UUID,
                :USER_ID,
                :CIZCARD_IMAGE,
                :TITLE_CODE,
                :TITLE_NAME,
                :FIRST_NAME,
                :LAST_NAME,
                :CIZ_GENDER,
                :IDCARD_NUM,
                :BIRTH_DATE,
                :CIZ_ISSUED_DATE,
                :CIZ_EXPIRED_DATE,
                :CIZ_ISSUED_PLACE,
                :CIZ_ADDRESS,
                :CIZ_DISTRICT,
                :CIZ_SUB_DISTRICT,
                :CIZ_PROVINCE_NAME,
                :CIZ_PROVINCE_CODE,
                :CIZ_POSTAL_CODE,
                :QUO_APP_REF_NO,
                :CHANNAL_TYPE,
                :CIZ_AGE,
                :IS_DIPCHIP_CHANNAL,
                :QUO_DOPA_STATUS,
                :QUO_ECONSENT_FLAG,
                :QUO_LIVING_PLACE_ID,
                :QUO_CONTRACT_PLACE_ID,
                :QUO_WORKING_PLACE_ID,
                :QUO_HOUSE_REGIS_PLACE_ID,
                :QUO_STATUS
            )
        `
            , {

                QUO_KEY_APP_ID: quotationKeyid,
                DIPCHIP_UUID: reqData.dipchipuuid,
                USER_ID: userid,
                CIZCARD_IMAGE: cizcard_image_blob,
                TITLE_CODE: reqData.titleCode,
                TITLE_NAME: reqData.titleName,
                FIRST_NAME: reqData.firstName,
                LAST_NAME: reqData.lastName,
                CIZ_GENDER: reqData.gender,
                IDCARD_NUM: reqData.citizenId,
                BIRTH_DATE: (new Date(reqData.birthDate)) ?? null,
                CIZ_ISSUED_DATE: (new Date(reqData.issueDate)) ?? null,
                CIZ_EXPIRED_DATE: (new Date(reqData.expireDate)) ?? null,
                CIZ_ISSUED_PLACE: reqData.issuePlace,
                CIZ_ADDRESS: reqData.address,
                CIZ_DISTRICT: reqData.district,
                CIZ_SUB_DISTRICT: reqData.subDistrict,
                CIZ_PROVINCE_NAME: reqData.provinceName,
                CIZ_PROVINCE_CODE: reqData.provinceCode,
                CIZ_POSTAL_CODE: reqData.postalCode,
                QUO_APP_REF_NO: otprefid,
                CHANNAL_TYPE: 'C',
                CIZ_AGE: reqData.age ?? null,
                IS_DIPCHIP_CHANNAL: 'Y',
                QUO_DOPA_STATUS: 'Y',
                QUO_ECONSENT_FLAG: 'Y',
                QUO_LIVING_PLACE_ID: living_place_key_id,
                QUO_CONTRACT_PLACE_ID: contact_place_key_id,
                QUO_WORKING_PLACE_ID: work_place_key_id,
                QUO_HOUSE_REGIS_PLACE_ID: work_place_key_id,
                QUO_STATUS: 4


            }, {
            outFormat: oracledb.OBJECT
        })

        console.log("quotation e-consent was create " + quotation_econsent.rowsAffected);

        const recLivingplace = await connection.execute(`
        INSERT INTO MPLS_LIVING_PLACE (
            LIV_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :LIV_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            LIV_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: living_place_key_id
        })
        console.log(`living place create : ${recLivingplace.rowsAffected}`)

        const recContactplace = await connection.execute(`
        INSERT INTO MPLS_CONTACT_PLACE (
            CONT_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :CONT_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            CONT_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: contact_place_key_id
        })
        console.log(`contact place create : ${recContactplace.rowsAffected}`)

        const recHouseregisplace = await connection.execute(`
        INSERT INTO MPLS_HOUSE_REGIS_PLACE (
            HRP_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :HRP_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            HRP_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: house_regis_place_key_id
        })
        console.log(`house regis place create : ${recHouseregisplace.rowsAffected}`)

        const recWorkplace = await connection.execute(`
        INSERT INTO MPLS_WORK_PLACE (
            WORK_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :WORK_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            WORK_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: work_place_key_id
        })
        console.log(`work place create : ${recWorkplace.rowsAffected}`)


        if (
            quotation_econsent.rowsAffected !== 1 &&
            recLivingplace.rowsAffected !== 1 &&
            recContactplace.rowsAffected !== 1 &&
            recHouseregisplace.rowsAffected !== 1 &&
            recWorkplace.rowsAffected !== 1
        ) {
            return res.status(200).send({
                status: 500,
                message: `สร้าง quotation econsent ไม่สำเร็จ`,
                data: []
            })
        } else {
            // == succeess create quotation econsent flow (DIPCHIP) ==
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                logger.error(`user ${userid}, quotationid: ${quotationKeyid} : commit fail : ${e.message ? e.message : 'No return message'}`)
                console.err(e.message)
                return res.status(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }

            // === End ===
            const sqlstring_getquotationkeyid = `SELECT * FROM MPLS_QUOTATION WHERE QUO_KEY_APP_ID = '${quotationKeyid}'`
            const resultQuotation = await connection.execute(sqlstring_getquotationkeyid, [],
                {
                    outFormat: oracledb.OBJECT
                })

            if (resultQuotation) {

                if (resultQuotation.rows.length == 0) {
                    logger.error(`user ${userid} : No quotation Record`)
                    const noresultFormatJson = {
                        status: 500,
                        message: 'No quotation Record'
                    }
                    res.status(200).send(noresultFormatJson)
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
                return res.status(200).send({
                    status: 500,
                    message: `Can't find record quotation id after select`,
                    data: []
                })
            }


        }


    } catch (e) {
        console.error(e);
        logger.error(`user ${userid} : สร้างใบคำขอไม่สำเร็จ : ${e.message ? e.message : `No message`}`)
        return res.status(200).send({
            status: 500,
            message: `Fail create quotation econsent : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail close connection : ${e.message ? e.message : 'No message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_dipchipnoneconsent(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID

    const logger = log4js.getLogger("create");
    try {

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

        const reqData = JSON.parse(formData.item)

        // === check dopa status 500 return fail ===
        connection = await oracledb.getConnection(config.database)


        const quotationKeyid = uuidv4()
        const living_place_key_id = uuidv4()
        const contact_place_key_id = uuidv4()
        const house_regis_place_key_id = uuidv4()
        const work_place_key_id = uuidv4()


        const otprefid = await _mplsUtil.internal_MPLS_get_refid()

        if (otprefid == '') {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถสร้างเลข ref_otp_id ได้`,
                data: []
            })
        }

        let cizcard_null = [];
        let cizcard_array;
        let cizcard_image_blob;
        if (reqData.cizcardImage) {
            cizcard_image_blob = reqData.cizcardImage ? cizcard_array = Buffer.from(reqData.cizcardImage, "base64") : cizcard_null
        }


        // console.log(`request body : ${JSON.stringify(reqData)}`)
        // console.log(`quotationid : ${quotationKeyid}`)
        // console.log(`userid: ${userid}`)

        const quotation_econsent = await connection.execute(`
            INSERT INTO MPLS_QUOTATION 
            (
                QUO_KEY_APP_ID,
                USER_ID,
                CIZCARD_IMAGE,
                TITLE_CODE,
                TITLE_NAME,
                FIRST_NAME,
                LAST_NAME,
                CIZ_GENDER,
                IDCARD_NUM,
                BIRTH_DATE,
                CIZ_ISSUED_DATE,
                CIZ_EXPIRED_DATE,
                CIZ_ISSUED_PLACE,
                CIZ_ADDRESS,
                CIZ_DISTRICT,
                CIZ_SUB_DISTRICT,
                CIZ_PROVINCE_NAME,
                CIZ_PROVINCE_CODE,
                CIZ_POSTAL_CODE,
                QUO_APP_REF_NO,
                CHANNAL_TYPE,
                CIZ_AGE,
                POLICY_AGE,
                IS_DIPCHIP_CHANNAL,
                QUO_DOPA_STATUS,
                DIPCHIP_UUID,
                QUO_LIVING_PLACE_ID,
                QUO_CONTRACT_PLACE_ID,
                QUO_WORKING_PLACE_ID,
                QUO_HOUSE_REGIS_PLACE_ID,
                QUO_STATUS
            )
            VALUES 
            (
                :QUO_KEY_APP_ID,
                :USER_ID,
                :CIZCARD_IMAGE,
                :TITLE_CODE,
                :TITLE_NAME,
                :FIRST_NAME,
                :LAST_NAME,
                :CIZ_GENDER,
                :IDCARD_NUM,
                :BIRTH_DATE,
                :CIZ_ISSUED_DATE,
                :CIZ_EXPIRED_DATE,
                :CIZ_ISSUED_PLACE,
                :CIZ_ADDRESS,
                :CIZ_DISTRICT,
                :CIZ_SUB_DISTRICT,
                :CIZ_PROVINCE_NAME,
                :CIZ_PROVINCE_CODE,
                :CIZ_POSTAL_CODE,
                :QUO_APP_REF_NO,
                :CHANNAL_TYPE,
                :CIZ_AGE,
                :POLICY_AGE,
                :IS_DIPCHIP_CHANNAL,
                :QUO_DOPA_STATUS,
                :DIPCHIP_UUID,
                :QUO_LIVING_PLACE_ID,
                :QUO_CONTRACT_PLACE_ID,
                :QUO_WORKING_PLACE_ID,
                :QUO_HOUSE_REGIS_PLACE_ID,
                :QUO_STATUS
            )
        `
            , {

                QUO_KEY_APP_ID: quotationKeyid,
                USER_ID: userid,
                CIZCARD_IMAGE: cizcard_image_blob,
                TITLE_CODE: reqData.titleCode,
                TITLE_NAME: reqData.titleName,
                FIRST_NAME: reqData.firstName,
                LAST_NAME: reqData.lastName,
                CIZ_GENDER: reqData.gender,
                IDCARD_NUM: reqData.citizenId,
                BIRTH_DATE: (new Date(reqData.birthDate)) ?? null,
                CIZ_ISSUED_DATE: (new Date(reqData.issueDate)) ?? null,
                CIZ_EXPIRED_DATE: (new Date(reqData.expireDate)) ?? null,
                CIZ_ISSUED_PLACE: reqData.issuePlace,
                CIZ_ADDRESS: reqData.address,
                CIZ_DISTRICT: reqData.district,
                CIZ_SUB_DISTRICT: reqData.subDistrict,
                CIZ_PROVINCE_NAME: reqData.provinceName,
                CIZ_PROVINCE_CODE: reqData.provinceCode,
                CIZ_POSTAL_CODE: reqData.postalCode,
                QUO_APP_REF_NO: otprefid,
                CHANNAL_TYPE: 'C',
                CIZ_AGE: reqData.age ?? null,
                POLICY_AGE: (reqData.age && reqData.age < 20) ? 'N' : 'Y',
                IS_DIPCHIP_CHANNAL: 'Y',
                QUO_DOPA_STATUS: 'N',
                DIPCHIP_UUID: reqData.dipchipuuid,
                QUO_LIVING_PLACE_ID: living_place_key_id,
                QUO_CONTRACT_PLACE_ID: contact_place_key_id,
                QUO_WORKING_PLACE_ID: work_place_key_id,
                QUO_HOUSE_REGIS_PLACE_ID: house_regis_place_key_id,
                QUO_STATUS: 4

            }, {
            outFormat: oracledb.OBJECT
        })

        console.log("quotation e-consent was create " + quotation_econsent.rowsAffected);

        const recLivingplace = await connection.execute(`
        INSERT INTO MPLS_LIVING_PLACE (
            LIV_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :LIV_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            LIV_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: living_place_key_id
        })
        console.log(`living place create : ${recLivingplace.rowsAffected}`)

        const recContactplace = await connection.execute(`
        INSERT INTO MPLS_CONTACT_PLACE (
            CONT_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :CONT_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            CONT_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: contact_place_key_id
        })
        console.log(`contact place create : ${recContactplace.rowsAffected}`)

        const recHouseregisplace = await connection.execute(`
        INSERT INTO MPLS_HOUSE_REGIS_PLACE (
            HRP_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :HRP_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            HRP_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: house_regis_place_key_id
        })
        console.log(`house regis place create : ${recHouseregisplace.rowsAffected}`)

        const recWorkplace = await connection.execute(`
        INSERT INTO MPLS_WORK_PLACE (
            WORK_QUO_KEY_APP_ID, APP_KEY_ID
        )
        VALUES (
            :WORK_QUO_KEY_APP_ID, :APP_KEY_ID
        )
        `, {
            WORK_QUO_KEY_APP_ID: quotationKeyid,
            APP_KEY_ID: work_place_key_id
        })
        console.log(`work place create : ${recWorkplace.rowsAffected}`)


        if (
            quotation_econsent.rowsAffected !== 1 &&
            recLivingplace.rowsAffected !== 1 &&
            recContactplace.rowsAffected !== 1 &&
            recHouseregisplace.rowsAffected !== 1 &&
            recWorkplace.rowsAffected !== 1
        ) {
            return res.status(200).send({
                status: 500,
                message: `สร้าง quotation econsent ไม่สำเร็จ`,
                data: []
            })
        } else {
            // == succeess create quotation econsent flow (DIPCHIP) ==
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                logger.error(`user ${userid}, quotationid: ${quotationKeyid} : commit fail : ${e.message ? e.message : 'No return message'}`)
                console.err(e.message)
                return res.status(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }

            // === End ===
            const sqlstring_getquotationkeyid = `SELECT * FROM MPLS_QUOTATION WHERE QUO_KEY_APP_ID = '${quotationKeyid}'`
            const resultQuotation = await connection.execute(sqlstring_getquotationkeyid, [],
                {
                    outFormat: oracledb.OBJECT
                })

            if (resultQuotation) {

                if (resultQuotation.rows.length == 0) {
                    logger.error(`user ${userid} : No quotation Record`)
                    const noresultFormatJson = {
                        status: 500,
                        message: 'No quotation Record'
                    }
                    res.status(200).send(noresultFormatJson)
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
                return res.status(200).send({
                    status: 500,
                    message: `Can't find record quotation id after select`,
                    data: []
                })
            }


        }


    } catch (e) {
        console.error(e);
        logger.error(`user ${userid} : สร้างใบคำขอไม่สำเร็จ : ${e.message ? e.message : `No message`}`)
        return res.status(200).send({
            status: 500,
            message: `Fail create quotation econsent : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail close connection : ${e.message ? e.message : 'No message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_create_or_update_citizendata(req, res, next) {


    // === จัดการการบันทึก quotation หน้าแรก โดนแบ่งเป็๋น 3 ประเภทของการทำรายการได้แก้
    // 1. บันทึกรายการจากการแก้ไข quotation ที่สร้างผ่าน dipchip (dipchip_uuid is not null)
    // 2. บันทึกรายการจากการแก้ไข quotation ที่สร้างผ่านการ key ข้อมูลเอง (manual) (dipchip_uuid = '')
    // 3. สร้าง quotation โดยการ key ข้อมูลเอง (quotationid = '' and dipchip_uuid = '')

    // *** ไม่ได้รองรับการสร้างเคสผ่าน dipchip (ใช้ api MPLS_dipchip แทน) เช็คจาก (quotationid = '' and dipchip_uuid is not null) ***

    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    const logger = log4js.getLogger("create");
    try {
        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
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
            })
            return
        })

        const reqData = JSON.parse(formData.item)

        // === check create or update with (QUO_KEY_APP_ID)

        let stageflowtxt;
        let createorupdateQuery;
        let createorupdateBind;
        let createorupdateCondition;

        // === boolean for fact is 'UPDATE' or 'CREATE' orther schema === (true : update, false : create) ===
        let isUpdate;

        let createorupdate_living_place_query;
        let createorupdate_living_place_bind;

        let createorupdate_contact_place_query;
        let createorupdate_contact_place_bind;

        let createorupdate_house_regis_place_query;
        let createorupdate_house_regis_place_bind;

        let createorupdate_work_regis_place_query;
        let createorupdate_work_regis_place_bind;

        const quotationKeyid = uuidv4()
        const living_place_key_id = uuidv4()
        const contact_place_key_id = uuidv4()
        const house_regis_place_key_id = uuidv4()
        const work_place_key_id = uuidv4()



        connection = await oracledb.getConnection(config.database)

        const otprefid = await _mplsUtil.internal_MPLS_get_refid()


        // ==== check if refid is null === 
        if (otprefid == '') {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถสร้างเลข ref_otp_id ได้`,
                data: []
            })
        }

        if (reqData.quotationid) {

            const resultquodata = await connection.execute(`
                SELECT DIPCHIP_UUID, QUO_STATUS, APPLICATION_NUM FROM MPLS_QUOTATION
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
            `, {
                QUO_KEY_APP_ID: reqData.quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // === เช็คว่าเลข quotationid ตรงกับเงื่อนไขในการอัพเดท record ในระบบไหม  ===

            if (resultquodata.rows.length !== 1) {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถระบุกรายการใบคำขอที่ต้องการ update ได้`,
                    data: []
                })
            } else {

                try {


                    // === ตรวจสอบสถานะ quotation (quo_status) ถ้าเกิด APPLICATION_NUM NOT NULL จะไม่สามารถทำการ update ได้ ===
                    // *** เปลี่ยนมาดูจาก quo_status แทน (quo_status !== 1 && quo_status !== 3) ***
                    const quostatus = resultquodata.rows[0].QUO_STATUS
                    console.log(`quo_status : ${quostatus}`)
                    if (quostatus == 1 || quostatus == 3) {
                        return res.status(200).send({
                            status: 500,
                            message: `สถานะรายการใบคำขออยู่ในขั้นส่งพิจารณาแล้วไม่สามารถแก้ไขข้อมูลได้`
                        })
                    } else {

                        // === เช็คช่องทางการ update ว่า update quotation จากสถานะไหน ===
                        const dipchipid = resultquodata.rows[0].DIPCHIP_UUID
                        const isdipchip = (dipchipid !== null && dipchipid !== '') ? true : false


                        if (isdipchip) {
                            // === 1. update record (dipchip) ===   
                            // === build mpls_quotation data only (other schema set next stage) ====
                            isUpdate = true
                            stageflowtxt = `update record (dipchip)`
                            createorupdateQuery = `
                            UPDATE MPLS_QUOTATION
                            SET
                                EMAIL = :EMAIL,
                                PHONE_NUMBER = :PHONE_NUMBER,
                                CIZ_MARIED_STATUS = :CIZ_MARIED_STATUS,
                                CIZ_NICKNAME = :CIZ_NICKNAME,
                                CIZ_HOUSE_TYPE = :CIZ_HOUSE_TYPE,
                                CIZ_HOUSE_OWNER_TYPE = :CIZ_HOUSE_OWNER_TYPE,
                                CIZ_STAYED_YEAR = :CIZ_STAYED_YEAR,
                                CIZ_STAYED_MONTH = :CIZ_STAYED_MONTH
                            WHERE
                                QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                                AND DIPCHIP_UUID = :DIPCHIP_UUID       
                            `
                            createorupdateBind = {

                                EMAIL: reqData.email,
                                PHONE_NUMBER: reqData.phone_number,
                                CIZ_MARIED_STATUS: reqData.maried_status,
                                CIZ_NICKNAME: reqData.nick_name,
                                CIZ_HOUSE_TYPE: reqData.house_type,
                                CIZ_HOUSE_OWNER_TYPE: reqData.house_owner_type,
                                CIZ_STAYED_YEAR: reqData.stayed_year,
                                CIZ_STAYED_MONTH: reqData.stayed_month,
                                QUO_KEY_APP_ID: reqData.quotationid,
                                DIPCHIP_UUID: dipchipid
                            }

                        } else {
                            // === 2. update record (manual) ===
                            // === build mpls_quotation data only (other schema set next stage) ====
                            isUpdate = true
                            stageflowtxt = `update record (manual)`
                            createorupdateQuery = `
                            UPDATE MPLS_QUOTATION
                            SET 
                                USER_ID = :USER_ID,
                                TITLE_CODE = :TITLE_CODE,
                                TITLE_NAME = :TITLE_NAME,
                                FIRST_NAME = :FIRST_NAME,
                                LAST_NAME = :LAST_NAME,
                                CIZ_GENDER = :CIZ_GENDER,
                                IDCARD_NUM = :IDCARD_NUM,
                                BIRTH_DATE = :BIRTH_DATE,
                                CIZ_ISSUED_DATE = :CIZ_ISSUED_DATE,
                                CIZ_EXPIRED_DATE = :CIZ_EXPIRED_DATE,
                                CIZ_ISSUED_PLACE = :CIZ_ISSUED_PLACE,
                                CIZ_ADDRESS = :CIZ_ADDRESS,
                                CIZ_DISTRICT = :CIZ_DISTRICT,
                                CIZ_SUB_DISTRICT = :CIZ_SUB_DISTRICT,
                                CIZ_PROVINCE_NAME = :CIZ_PROVINCE_NAME,
                                CIZ_PROVINCE_CODE = :CIZ_PROVINCE_CODE,
                                CIZ_POSTAL_CODE = :CIZ_POSTAL_CODE,
                                CHANNAL_TYPE = :CHANNAL_TYPE,
                                CIZ_AGE = :CIZ_AGE,
                                POLICY_AGE = :POLICY_AGE,
                                EMAIL = :EMAIL,
                                PHONE_NUMBER = :PHONE_NUMBER,
                                CIZ_MARIED_STATUS = :CIZ_MARIED_STATUS,
                                CIZ_NICKNAME = :CIZ_NICKNAME,
                                CIZ_HOUSE_TYPE = :CIZ_HOUSE_TYPE,
                                CIZ_HOUSE_OWNER_TYPE = :CIZ_HOUSE_OWNER_TYPE,
                                CIZ_STAYED_YEAR = :CIZ_STAYED_YEAR,
                                CIZ_STAYED_MONTH = :CIZ_STAYED_MONTH
                            WHERE 
                                QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                            `

                            createorupdateBind = {
                                USER_ID: userid,
                                TITLE_CODE: reqData.titleCode,
                                TITLE_NAME: reqData.titleName,
                                FIRST_NAME: reqData.firstName,
                                LAST_NAME: reqData.lastName,
                                CIZ_GENDER: reqData.gender,
                                IDCARD_NUM: reqData.citizenId,
                                BIRTH_DATE: (new Date(reqData.birthDate)) ?? null,
                                CIZ_ISSUED_DATE: (new Date(reqData.issueDate)) ?? null,
                                CIZ_EXPIRED_DATE: (new Date(reqData.expireDate)) ?? null,
                                CIZ_ISSUED_PLACE: reqData.issuePlace,
                                CIZ_ADDRESS: reqData.address,
                                CIZ_DISTRICT: reqData.district,
                                CIZ_SUB_DISTRICT: reqData.subDistrict,
                                CIZ_PROVINCE_NAME: reqData.provinceName,
                                CIZ_PROVINCE_CODE: reqData.provinceCode,
                                CIZ_POSTAL_CODE: reqData.postalCode,
                                CHANNAL_TYPE: 'C',
                                CIZ_AGE: reqData.age ?? null,
                                POLICY_AGE: (reqData.age && reqData.age < 20) ? 'N' : 'Y',
                                EMAIL: reqData.email,
                                PHONE_NUMBER: reqData.phone_number,
                                CIZ_MARIED_STATUS: reqData.maried_status,
                                CIZ_NICKNAME: reqData.nick_name,
                                CIZ_HOUSE_TYPE: reqData.house_type,
                                CIZ_HOUSE_OWNER_TYPE: reqData.house_owner_type,
                                CIZ_STAYED_YEAR: reqData.stayed_year,
                                CIZ_STAYED_MONTH: reqData.stayed_month,
                                QUO_KEY_APP_ID: reqData.quotationid
                            }
                        }
                    }
                } catch (e) {
                    console.error(e)
                    return res.satus(200).send({
                        status: 500,
                        message: `ไม่สามารถอัพเดทข้อมูลได้ : ${e.message ? e.message : 'No return message'}`
                    })
                }


            }


        } else {
            // === creatd ===

            // === เช็คการสร้างเคสผ่านช่องทาง dipchip ====
            // *** กรณีมีเลข dipchip_uuid ไม่รองรับ ***
            if (reqData.dipchipuuid) {
                // *** กรณีนี้ให้ไปใช่ MPLS_dipchip แทน ***
                return res.statsu(200).send({
                    satatus: 500,
                    message: `ระบบไม่รองรับการทำรายการด้วยข้อมูลดังกล่าว ติดต่อเจ้าหน้าที่`
                })
            } else {
                // ==== 3. create quotation manual ====
                isUpdate = false
                stageflowtxt = `create quotation manual`
                createorupdateQuery = `
                INSERT INTO MPLS_QUOTATION 
                (
                    QUO_KEY_APP_ID,
                    USER_ID,
                    TITLE_CODE,
                    TITLE_NAME,
                    FIRST_NAME,
                    LAST_NAME,
                    CIZ_GENDER,
                    IDCARD_NUM,
                    BIRTH_DATE,
                    CIZ_ISSUED_DATE,
                    CIZ_EXPIRED_DATE,
                    CIZ_ISSUED_PLACE,
                    CIZ_ADDRESS,
                    CIZ_DISTRICT,
                    CIZ_SUB_DISTRICT,
                    CIZ_PROVINCE_NAME,
                    CIZ_PROVINCE_CODE,
                    CIZ_POSTAL_CODE,
                    QUO_APP_REF_NO,
                    CHANNAL_TYPE,
                    CIZ_AGE,
                    POLICY_AGE,
                    EMAIL, 
                    PHONE_NUMBER, 
                    CIZ_MARIED_STATUS, 
                    CIZ_NICKNAME,
                    CIZ_HOUSE_TYPE, 
                    CIZ_HOUSE_OWNER_TYPE, 
                    CIZ_STAYED_YEAR, 
                    CIZ_STAYED_MONTH,
                    IS_DIPCHIP_CHANNAL,
                    QUO_DOPA_STATUS,
                    QUO_LIVING_PLACE_ID,
                    QUO_CONTRACT_PLACE_ID,
                    QUO_WORKING_PLACE_ID,
                    QUO_HOUSE_REGIS_PLACE_ID
                )
                VALUES 
                (
                    :QUO_KEY_APP_ID,
                    :USER_ID,
                    :TITLE_CODE,
                    :TITLE_NAME,
                    :FIRST_NAME,
                    :LAST_NAME,
                    :CIZ_GENDER,
                    :IDCARD_NUM,
                    :BIRTH_DATE,
                    :CIZ_ISSUED_DATE,
                    :CIZ_EXPIRED_DATE,
                    :CIZ_ISSUED_PLACE,
                    :CIZ_ADDRESS,
                    :CIZ_DISTRICT,
                    :CIZ_SUB_DISTRICT,
                    :CIZ_PROVINCE_NAME,
                    :CIZ_PROVINCE_CODE,
                    :CIZ_POSTAL_CODE,
                    :QUO_APP_REF_NO,
                    :CHANNAL_TYPE,
                    :CIZ_AGE,
                    :POLICY_AGE,
                    :EMAIL, 
                    :PHONE_NUMBER, 
                    :CIZ_MARIED_STATUS, 
                    :CIZ_NICKNAME, 
                    :CIZ_HOUSE_TYPE, 
                    :CIZ_HOUSE_OWNER_TYPE, 
                    :CIZ_STAYED_YEAR, 
                    :CIZ_STAYED_MONTH,
                    :IS_DIPCHIP_CHANNAL,
                    :QUO_DOPA_STATUS,
                    :QUO_LIVING_PLACE_ID,
                    :QUO_CONTRACT_PLACE_ID,
                    :QUO_WORKING_PLACE_ID,
                    :QUO_HOUSE_REGIS_PLACE_ID
                )`

                createorupdateBind = {
                    QUO_KEY_APP_ID: quotationKeyid,
                    USER_ID: userid,
                    TITLE_CODE: reqData.titleCode,
                    TITLE_NAME: reqData.titleName,
                    FIRST_NAME: reqData.firstName,
                    LAST_NAME: reqData.lastName,
                    CIZ_GENDER: reqData.gender,
                    IDCARD_NUM: reqData.citizenId,
                    BIRTH_DATE: (new Date(reqData.birthDate)) ?? null,
                    CIZ_ISSUED_DATE: (new Date(reqData.issueDate)) ?? null,
                    CIZ_EXPIRED_DATE: (new Date(reqData.expireDate)) ?? null,
                    CIZ_ISSUED_PLACE: reqData.issuePlace,
                    CIZ_ADDRESS: reqData.address,
                    CIZ_DISTRICT: reqData.district,
                    CIZ_SUB_DISTRICT: reqData.subDistrict,
                    CIZ_PROVINCE_NAME: reqData.provinceName,
                    CIZ_PROVINCE_CODE: reqData.provinceCode,
                    CIZ_POSTAL_CODE: reqData.postalCode,
                    QUO_APP_REF_NO: otprefid,
                    CHANNAL_TYPE: 'C',
                    CIZ_AGE: reqData.age ?? null,
                    POLICY_AGE: (reqData.age && reqData.age < 20) ? 'N' : 'Y',
                    EMAIL: reqData.email,
                    PHONE_NUMBER: reqData.phone_number,
                    CIZ_MARIED_STATUS: reqData.maried_status,
                    CIZ_NICKNAME: reqData.nick_name,
                    CIZ_HOUSE_TYPE: reqData.house_type,
                    CIZ_HOUSE_OWNER_TYPE: reqData.house_owner_type,
                    CIZ_STAYED_YEAR: reqData.stayed_year,
                    CIZ_STAYED_MONTH: reqData.stayed_month,
                    IS_DIPCHIP_CHANNAL: 'N',
                    QUO_DOPA_STATUS: 'N',
                    QUO_LIVING_PLACE_ID: living_place_key_id,
                    QUO_CONTRACT_PLACE_ID: contact_place_key_id,
                    QUO_WORKING_PLACE_ID: work_place_key_id,
                    QUO_HOUSE_REGIS_PLACE_ID: work_place_key_id
                }
            }
        }

        try {
            // === combine query and bind paremeter here ===

            // === update or create quotation ===

            // === bind other schema with check isUpdate ====

            if (isUpdate) {
                // === update ===

                // === MPLS_LIVING_PLACE ===
                createorupdate_living_place_query = `
                    UPDATE MPLS_LIVING_PLACE
                    SET 
                        ADDRESS = :ADDRESS,
                        SUB_DISTRICT = :SUB_DISTRICT,
                        DISTRICT = :DISTRICT,
                        PROVINCE_NAME = :PROVINCE_NAME,
                        PROVINCE_CODE = :PROVINCE_CODE,
                        POSTAL_CODE = :POSTAL_CODE,
                        LATITUDE = :LA,
                        LONDTIUDE = :LON,
                        LALON = :LALON
                    WHERE
                        LIV_QUO_KEY_APP_ID = :LIV_QUO_KEY_APP_ID
                `

                createorupdate_living_place_bind = {
                    ADDRESS: reqData.liv_address,
                    SUB_DISTRICT: reqData.liv_sub_district,
                    DISTRICT: reqData.liv_district,
                    PROVINCE_NAME: reqData.liv_province_name,
                    PROVINCE_CODE: reqData.liv_province_code,
                    POSTAL_CODE: reqData.liv_postal_code,
                    LA: reqData.liv_la,
                    LON: reqData.liv_lon,
                    LALON: reqData.liv_lalon,
                    LIV_QUO_KEY_APP_ID: reqData.quotationid
                }

                // === MPLS_CONTACT_PLACE ===

                createorupdate_contact_place_query = `
                    UPDATE MPLS_CONTACT_PLACE
                    SET 
                        ADDRESS = :ADDRESS,
                        SUB_DISTRICT = :SUB_DISTRICT,
                        DISTRICT = :DISTRICT,
                        PROVINCE_NAME = :PROVINCE_NAME,
                        PROVINCE_CODE = :PROVINCE_CODE,
                        POSTAL_CODE = :POSTAL_CODE
                    WHERE
                        CONT_QUO_KEY_APP_ID = :CONT_QUO_KEY_APP_ID
                `

                createorupdate_contact_place_bind = {
                    ADDRESS: reqData.cont_address,
                    SUB_DISTRICT: reqData.cont_sub_district,
                    DISTRICT: reqData.cont_district,
                    PROVINCE_NAME: reqData.cont_province_name,
                    PROVINCE_CODE: reqData.cont_province_code,
                    POSTAL_CODE: reqData.cont_postal_code,
                    CONT_QUO_KEY_APP_ID: reqData.quotationid,
                }

                // === MPLS_HOUSE_REGIS_PLACE ===

                createorupdate_house_regis_place_query = `
                    UPDATE MPLS_HOUSE_REGIS_PLACE
                    SET 
                        ADDRESS = :ADDRESS,
                        SUB_DISTRICT = :SUB_DISTRICT,
                        DISTRICT = :DISTRICT,
                        PROVINCE_NAME = :PROVINCE_NAME,
                        PROVINCE_CODE = :PROVINCE_CODE,
                        POSTAL_CODE = :POSTAL_CODE
                    WHERE
                        HRP_QUO_KEY_APP_ID = :HRP_QUO_KEY_APP_ID
                `

                createorupdate_house_regis_place_bind = {
                    ADDRESS: reqData.hrp_address,
                    SUB_DISTRICT: reqData.hrp_sub_district,
                    DISTRICT: reqData.hrp_district,
                    PROVINCE_NAME: reqData.hrp_province_name,
                    PROVINCE_CODE: reqData.hrp_province_code,
                    POSTAL_CODE: reqData.hrp_postal_code,
                    HRP_QUO_KEY_APP_ID: reqData.quotationid,
                }

                // === MPLS_WORK_PLACE ===

                createorupdate_work_regis_place_query = `
                    UPDATE MPLS_WORK_PLACE
                        SET 
                            ADDRESS = :ADDRESS,
                            SUB_DISTRICT = :SUB_DISTRICT,
                            DISTRICT = :DISTRICT,
                            PROVINCE_NAME = :PROVINCE_NAME,
                            PROVINCE_CODE = :PROVINCE_CODE,
                            POSTAL_CODE = :POSTAL_CODE
                        WHERE
                            WORK_QUO_KEY_APP_ID = :WORK_QUO_KEY_APP_ID`

                createorupdate_work_regis_place_bind = {
                    ADDRESS: reqData.work_address,
                    SUB_DISTRICT: reqData.work_sub_district,
                    DISTRICT: reqData.work_district,
                    PROVINCE_NAME: reqData.work_province_name,
                    PROVINCE_CODE: reqData.work_province_code,
                    POSTAL_CODE: reqData.work_postal_code,
                    WORK_QUO_KEY_APP_ID: reqData.quotationid,
                }


            } else {
                // === create ===

                // === MPLS_LIVING_PLACE ===
                createorupdate_living_place_query = `
                    INSERT INTO MPLS_LIVING_PLACE (
                        LIV_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, 
                        DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE, LATITUDE, LONDTIUDE, LALON
                    )
                    VALUES (
                        :LIV_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, 
                        :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE, :LATITUDE, :LONDTIUDE, :LALON
                    )`

                createorupdate_living_place_bind = {
                    LIV_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: living_place_key_id,
                    ADDRESS: reqData.liv_address,
                    SUB_DISTRICT: reqData.liv_sub_district,
                    DISTRICT: reqData.liv_district,
                    PROVINCE_NAME: reqData.liv_province_name,
                    PROVINCE_CODE: reqData.liv_province_code,
                    POSTAL_CODE: reqData.liv_postal_code,
                    LATITUDE: reqData.liv_la,
                    LONDTIUDE: reqData.liv_lon,
                    LALON: reqData.liv_lalon
                }

                // === MPLS_CONTACT_PLACE ===
                createorupdate_contact_place_query = `
                INSERT INTO MPLS_CONTACT_PLACE (
                    CONT_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, 
                    DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE
                )
                VALUES (
                    :CONT_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, 
                    :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE
                )`

                createorupdate_contact_place_bind = {
                    CONT_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: contact_place_key_id,
                    ADDRESS: reqData.cont_address,
                    SUB_DISTRICT: reqData.cont_sub_district,
                    DISTRICT: reqData.cont_district,
                    PROVINCE_NAME: reqData.cont_province_name,
                    PROVINCE_CODE: reqData.cont_province_code,
                    POSTAL_CODE: reqData.cont_postal_code
                }

                // === MPLS_HOUSE_REGIS_PLACE ===

                createorupdate_house_regis_place_query = `
                INSERT INTO MPLS_HOUSE_REGIS_PLACE (
                    HRP_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, 
                    DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE
                )
                VALUES (
                    :HRP_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, 
                    :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE
                )`

                createorupdate_house_regis_place_bind = {
                    HRP_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: house_regis_place_key_id,
                    ADDRESS: reqData.hrp_address,
                    SUB_DISTRICT: reqData.hrp_sub_district,
                    DISTRICT: reqData.hrp_district,
                    PROVINCE_NAME: reqData.hrp_province_name,
                    PROVINCE_CODE: reqData.hrp_province_code,
                    POSTAL_CODE: reqData.hrp_postal_code
                }

                // === MPLS_WORK_PLACE ====

                createorupdate_work_regis_place_query = `
                INSERT INTO MPLS_WORK_PLACE (
                    WORK_QUO_KEY_APP_ID, APP_KEY_ID, ADDRESS, SUB_DISTRICT, 
                    DISTRICT, PROVINCE_NAME, PROVINCE_CODE, POSTAL_CODE
                )
                VALUES (
                    :WORK_QUO_KEY_APP_ID, :APP_KEY_ID, :ADDRESS, :SUB_DISTRICT, 
                    :DISTRICT, :PROVINCE_NAME, :PROVINCE_CODE, :POSTAL_CODE
                )`

                createorupdate_work_regis_place_bind = {
                    WORK_QUO_KEY_APP_ID: quotationKeyid,
                    APP_KEY_ID: work_place_key_id,
                    ADDRESS: reqData.work_address,
                    SUB_DISTRICT: reqData.work_sub_district,
                    DISTRICT: reqData.work_district,
                    PROVINCE_NAME: reqData.work_province_name,
                    PROVINCE_CODE: reqData.work_province_code,
                    POSTAL_CODE: reqData.work_postal_code
                }
            }

            // === MPLS_QUOTATION ===

            let quotationexecute;
            let livingplaceexcecute;
            let contactplaceexecute;
            let houseregisplaceexecute;
            let workplaceexecute;

            try {
                quotationexecute = await connection.execute(createorupdateQuery, createorupdateBind, { outFormat: oracledb.OBJECT })
                console.log(`success ${stageflowtxt} (MPLS_QUOTATION) : ${quotationexecute.rowsAffected}`)
            } catch (e) {

                console.log(`error ${stageflowtxt} (MPLS_QUOTATION) : ${e.message ? e.message : `No return message`}`)
                return res.status(200).send({
                    status: 500,
                    message: `ข้อมูล MPLS_QUOTATION ไม่ถูกต้อง : ${e.message ? e.message : `No return message`}`
                })
            }

            // === MPLS_LIVING_PLACE ====

            try {
                livingplaceexcecute = await connection.execute(createorupdate_living_place_query, createorupdate_living_place_bind, { outFormat: oracledb.OBJECT })
                console.log(`success ${stageflowtxt} (MPLS_LIVING_PLACE) : ${livingplaceexcecute.rowsAffected}`)
            } catch (e) {
                console.log(`error ${stageflowtxt} (MPLS_LIVING_PLACE) : ${e.message ? e.message : `No return message`}`)
                return res.status(200).send({
                    status: 500,
                    message: `ข้อมูล MPLS_LIVING_PLACE ไม่ถูกต้อง : ${e.message ? e.message : `No return message`}`
                })
            }

            // === MPLS_CONTACT_PLACE ====

            try {
                contactplaceexecute = await connection.execute(createorupdate_contact_place_query, createorupdate_contact_place_bind, { outFormat: oracledb.OBJECT })
                console.log(`success ${stageflowtxt} (MPLS_CONTACT_PLACE) : ${contactplaceexecute.rowsAffected}`)
            } catch (e) {
                console.log(`error ${stageflowtxt} (MPLS_CONTACT_PLACE) : ${e}`)
                return res.status(200).send({
                    status: 500,
                    message: `ข้อมูล MPLS_CONTACT_PLACE ไม่ถูกต้อง : ${e.message ? e.message : `No return message`}`
                })
            }

            // === MPLS_HOUSE_REGIS_PLACE ====

            try {
                houseregisplaceexecute = await connection.execute(createorupdate_house_regis_place_query, createorupdate_house_regis_place_bind, { outFormat: oracledb.OBJECT })
                console.log(`success ${stageflowtxt} (MPLS_HOUSE_REGIS_PLACE) : ${houseregisplaceexecute.rowsAffected}`)
            } catch (e) {
                console.log(`error ${stageflowtxt} (MPLS_HOUSE_REGIS_PLACE) : ${e}`)
                return res.status(200).send({
                    status: 500,
                    message: `ข้อมูล MPLS_HOUSE_REGIS_PLACE ไม่ถูกต้อง : ${e.message ? e.message : `No return message`}`
                })
            }
            // === MPLS_WORK_PLACE ====

            try {
                workplaceexecute = await connection.execute(createorupdate_work_regis_place_query, createorupdate_work_regis_place_bind, { outFormat: oracledb.OBJECT })
                console.log(`success ${stageflowtxt} (MPLS_WORK_PLACE) : ${workplaceexecute.rowsAffected}`)
            } catch (e) {
                console.log(`error ${stageflowtxt} (MPLS_WORK_PLACE) : ${e}`)
                return res.status(200).send({
                    status: 500,
                    message: `ข้อมูล MPLS_WORK_PLACE ไม่ถูกต้อง : ${e.message ? e.message : `No return message`}`
                })
            }


            // === check all result ==== 

            if (
                quotationexecute.rowsAffected !== 1 &&
                livingplaceexcecute.rowsAffected !== 1 &&
                contactplaceexecute.rowsAffected !== 1 &&
                houseregisplaceexecute.rowsAffected !== 1 &&
                workplaceexecute.rowsAffected !== 1
            ) {
                // === fail to update citizen info data to database ===
                return res.status(200).send({
                    status: 500,
                    message: `fail to create or update citizen info data`,
                    data: []
                })


            } else {
                // ==== success update all (MPLS_quotation and all place relate) ====
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
                const returnquotationid = isUpdate ? reqData.quotationid : quotationKeyid

                return res.status(200).send({
                    status: 200,
                    message: `success all create or update citizen info data`,
                    data: {
                        quotationid: returnquotationid
                    }
                })
            }


        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 200,
                message: `Fail (execute all) with error : ${e.message ? e.message : `No return message`}`
            })
        }

    } catch (e) {
        console.error(e);
        logger.error(`user ${userid} : สร้างใบคำขอไม่สำเร็จ : ${e.message ? e.message : `No message`}`)
        return res.status(200).send({
            status: 500,
            message: `Fail create quotation econsent : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail close connection : ${e.message ? e.message : 'No message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_cancle_quotation(req, res, next) {
    let connection;

    try {

        const reqData = req.query

        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 200,
                message: `ไม่พบรายการ paremeter (quotationid)`
            })
        }

        connection = await oracledb.getConnection(config.database)

        let resultFlagCancle = await connection.execute(`\
            UPDATE MPLS_QUOTATION
            SET QUO_STATUS = '3'
            WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, {
            QUO_KEY_APP_ID: reqData.quotationid
        })

        // === CHECK RESULT OF FLAG CANCLE QUOTATION ====
        if (resultFlagCancle.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถยืนยัน identity ของ quotation ได้ (rowAffected : ${resultFlagCancle.rowsAffected})`,
                data: []
            })
        } else {
            // ==== success ====


            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 500,
                    message: `Faill during comit to database : ${e.message ? e.message : 'No message return'}`
                })
            }
            return res.status(200).send({
                status: 200,
                message: `success`,
                data: []
            })
        }

    } catch (e) {
        console.error(e)
        return res.status(200).send({
            status: 5000,
            message: `Error : ${e.message ? e.message : 'No message return'}`
        })
    } finally {
        try {
            connection.close()
        } catch (e) {
            console.error(e)
            return res.status(200).send({
                status: 500,
                message: `fail between close connection `
            })
        }
    }
}

async function MPLS_check_phonevalid(req, res, next) {

    let connection;

    // const token = req.user
    // const userid = token.ID

    const { quotationid } = req.query

    try {

        if (quotationid == '') {
            return res.status(400).send({
                status: 400,
                message: `missing arguement quotationid value`,
                data: []
            })
        }

        // === check otp status ===
        console.log(`quotationid : ${quotationid}`)

        connection = await oracledb.getConnection(config.database)
        const checkphonevalid = await connection.execute(`
                SELECT *
                FROM MPLS_OTP_LOG
                WHERE OTP_QUO_KEY_APP_ID = :QUOTATIONID
                AND TYPE = '1'
                AND STATUS = '1'
        `, {
            QUOTATIONID: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (checkphonevalid.rows.length !== 0) {
            return res.status(200).send({
                validation: true,
                message: `phone number is already activate`
            })
        } else {
            return res.status(200).send({
                validation: false,
                message: `Phone number is not valid`
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_create_otp_phoneno(req, res, next) {

    let connection;
    let responseSendsms;

    const token = req.user
    const userid = token.ID

    // === phone_no of customer to valid ===
    // === refid of runnung no of quotation in db (MPLS_QUOTATION.QUO_ID) ===

    const { phone_no, refid, quotationid } = req.query

    try {

        const otpnumber = Math.floor(100000 + Math.random() * 900000)

        if (phone_no == '' || refid == '' || quotationid == '') {
            return res.status(400).send({
                status: 400,
                message: `missing arguement value`,
                data: []
            })
        }

        sdk.auth(process.env.SMS_API_KEY, process.env.SMS_API_SECRET)

        const message = `OTP Code: ${otpnumber} (RefCode ${refid}) เพื่อยืนยันตัวตนขอสินเชื่อกับไมโครพลัสลิสซิ่ง (ภายใน 5 นาที)`

        responseSendsms = await sdk.post('/sms', {
            msisdn: phone_no,
            message: message,
            sender: 'MICROPLUS',
            force: `Corporate`
        }, { Accept: 'application/json' })


        console.log(`response : ${responseSendsms}`)

        const otplogid = uuidv4()

        // === create otp log ===

        connection = await oracledb.getConnection(config.database)
        const resultotplog = await connection.execute(`
        INSERT INTO MPLS_OTP_LOG 
            (
                OTP_QUO_KEY_APP_ID,
                TYPE,
                CREATED_DATE,
                OTP_VALUE,
                STATUS,
                UPD_USER,
                EXPIRE_DATE,
                OTP_APP_ID,
                OTP_REF_ID
            )
            VALUES 
            (
                :OTP_QUO_KEY_APP_ID,
                :TYPE,
                SYSTIMESTAMP,
                :OTP_VALUE,
                :STATUS,
                :UPD_USER,
                SYSDATE + INTERVAL '5' MINUTE,
                :OTP_APP_ID,
                :OTP_REF_ID
            )
        `
            , {
                OTP_QUO_KEY_APP_ID: quotationid,
                TYPE: '1', // type 1 : validate phone number
                OTP_VALUE: otpnumber,
                STATUS: '0',
                UPD_USER: userid,
                OTP_APP_ID: otplogid,
                OTP_REF_ID: refid
            }, {
            outFormat: oracledb.OBJECT
        })

        console.log("OTP record was create " + resultotplog.rowsAffected);

        if (resultotplog.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `สร้าง OTP LOG ไม่สำเร็จ`,
                data: []
            })
        } else {
            // == succeess create quotation econsent flow (DIPCHIP) ==
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.send(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }

            // === End ===
            const sqlstring_getotplog = `
            SELECT * FROM
            (
                SELECT * 
                FROM MPLS_OTP_LOG 
                WHERE OTP_QUO_KEY_APP_ID = :quotationid
                ORDER BY CREATED_DATE DESC
            )
            WHERE ROWNUM = 1
            `
            const resultOTP = await connection.execute(sqlstring_getotplog, { quotationid: { val: quotationid } },
                {
                    outFormat: oracledb.OBJECT
                })

            if (resultOTP) {

                if (resultOTP.rows.length == 0) {
                    const noresultFormatJson = {
                        status: 500,
                        message: 'No OTP log Record'
                    }
                    res.status(200).send(noresultFormatJson)
                } else {
                    let resData = resultOTP.rows
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
                return res.status(200).send({
                    status: 500,
                    message: `Can't find record quotation id after select`,
                    data: []
                })
            }


        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_validation_otp_phonenumber(req, res, next) {

    let connection;
    try {


        const { phone_no, quotationid, otp_value } = req.query

        if (phone_no == '' || quotationid == '' || otp_value == '') {
            return res.status(200).send({
                status: false,
                message: `missing arguement value`
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SELECT * FROM
            (
                SELECT * 
                FROM MPLS_OTP_LOG 
                WHERE OTP_QUO_KEY_APP_ID = :quotationid
                AND TYPE = '1'
                ORDER BY CREATED_DATE DESC
            )
            WHERE ROWNUM = 1`
            , {
                quotationid: quotationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.ststus(200).send({
                status: false,
                message: `ไม่พบรายการ OTP log ของ quotationid นี้`
            })
        } else {


            // === check already valid ===

            const isValid = result.rows[0].STATUS
            if (isValid == '1') {
                return res.status(200).send({
                    status: false,
                    message: `รายการนี้ได้รับการ verify แล้ว`
                })
            }


            // === check OTP match === 
            const otplogvalue = result.rows[0].OTP_VALUE
            if (otp_value !== otplogvalue) {
                return res.status(200).send({
                    status: false,
                    message: `รหัส OTP ไม่ตรงกันกับข้อมูลในระบบ`
                })
            } else {
                // === check expire ===
                const expiredate = moment(result.rows[0].EXPIRE_DATE).format()
                // const currentdate = moment.now() 
                const currentdate = moment().format();

                console.log(`expire Date : ${expiredate}`)
                console.log(`current Date : ${currentdate}`)

                const expire = (expiredate < currentdate)

                if (expire) {
                    return res.status(200).send({
                        status: false,
                        message: `ไม่สามารถยืนยันเลข OTP ได้เนื่องจากเลยเวลาที่กำหนด`
                    })
                } else {
                    // === flag OTP log and update quotation status 
                    const otpid = result.rows[0].OTP_APP_ID
                    console.log(`otpid : ${otpid}`)
                    console.log(`quotatioid : ${quotationid}`)
                    if (otpid == '' && quotationid == '') {
                        return res.status(200).send({
                            status: 500,
                            message: `ข้อมูลไม่เพียงพอในกาอัพเดทสถานะ (otpid, quotationid)`
                        })
                    } else {
                        // MPLS_OTP_LOG
                        let updateotplog;
                        let updatequotation
                        try {
                            updateotplog = await connection.execute(`
                                    UPDATE MPLS_OTP_LOG 
                                    SET STATUS = '1', 
                                        VERIFIED_SUCCESS_DATE = SYSDATE 
                                    WHERE OTP_APP_ID = :OTP_APP_ID
                                `, {
                                OTP_APP_ID: otpid
                            }, {
                                outFormat: oracledb.OBJECT
                            })

                            // MPLS_QUOTATION
                            updatequotation = await connection.execute(`
                                    UPDATE MPLS_QUOTATION  
                                    SET CIZ_PHONE_VALID_STATUS = 'Y' ,
                                        OTP_PHONE_VERIFY = 'Y' ,
                                        QUO_STATUS = 4
                                    WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                                `, {
                                QUO_KEY_APP_ID: quotationid
                            }, {
                                outFormat: oracledb.OBJECT
                            })

                        } catch (e) {
                            return res.status(200).send({
                                status: false,
                                message: `error trigger : ${JSON.stringify(e)}`
                            })
                        }

                        console.log(`updateotplog.rowsAffected : ${updateotplog.rowsAffected}`)
                        console.log(`updatequotation.rowsAffected : ${updatequotation.rowsAffected}`)


                        if (!(updateotplog.rowsAffected == 1 && updatequotation.rowsAffected == 1)) {
                            return res.status(200).send({
                                status: false,
                                message: `ไม่สามารถบันทึกค่าสถานะได้ (update status fail)`
                            })
                        } else {
                            // === commit and return ====
                            console.log(`all valid`)
                            const commitall = await connection.commit();

                            try {
                                commitall
                            } catch (e) {
                                console.err(e.message)
                                return res.send(200).send({
                                    status: 500,
                                    message: `Eror : ${e.message}`,
                                    data: []
                                })
                            }

                            // === finish ===
                            console.log(`return true`)
                            return res.status(200).send({
                                status: true,
                                message: `success`
                            })
                        }
                    }
                }
            }
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

async function MPLS_update_phone_number(req, res, next) {

    let connection;
    try {

        const { quotationid, phone_number } = req.query

        if (quotationid == '' || phone_number == '') {
            return res.status(200).send({
                status: 500,
                message: `mission param arguement`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            UPDATE MPLS_QUOTATION  
            SET PHONE_NUMBER = :phone_number 
            WHERE QUO_KEY_APP_ID = :quotationid
        `
            , {
                phone_number: phone_number,
                quotationid: quotationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `เงื่อนไขในการอัพเดทไม่ถูกต้อง`,
                data: []
            })
        } else {

            // === commit and return ====

            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.send(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }

            // === finish ===
            console.log(`return true`)
            return res.status(200).send({
                status: true,
                message: `success`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                return res.status(200).send({
                    status: 500,
                    message: `Fail : ${e.message ? e.message : 'No message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_check_econsent(req, res, next) {

    let connection;

    // const token = req.user
    // const userid = token.ID

    const { quotationid } = req.query

    try {

        if (quotationid == '') {
            return res.status(400).send({
                status: 400,
                message: `missing arguement quotationid value`,
                data: []
            })
        }

        // === check otp status ===
        console.log(`quotationid : ${quotationid}`)

        connection = await oracledb.getConnection(config.database)
        const checkphonevalid = await connection.execute(`
                SELECT *
                FROM MPLS_OTP_LOG
                WHERE OTP_QUO_KEY_APP_ID = :QUOTATIONID
                AND TYPE = '2'
                AND STATUS = '1'
        `, {
            QUOTATIONID: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (checkphonevalid.rows.length !== 0) {
            return res.status(200).send({
                validation: true,
                message: `Econsent is already activate`
            })
        } else {
            return res.status(200).send({
                validation: false,
                message: `Econsentis not valid`
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_get_witness_econsent(req, res, next) {

    // === only use for get witness name in channal type = store only ===
    let connection;
    try {

        const token = req.user
        const userid = token.username
        const channal = token.channal

        if (userid == '' || userid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบข้อมูล username ของ user`,
                data: []
            })
        }

        if (channal == 'checker') {
            return res.status(200).send({
                statsu: 500,
                message: `ไม่สามารถทำรายการได้เนื่องจาก channal type ไม่ตรงกับประเภทการ login`,
                data: []
            })
        }


        connection = await oracledb.getConnection(config.database)

        const returnName = await connection.execute(`
                SELECT  E.EMP_NAME AS FNAME, E.EMP_LNAME AS LNAME, E.EMP_NAME ||' '|| E.EMP_LNAME AS CHECKER_NAME
                FROM  BTW.X_DEALER_P DP,BTW.EMP E
                WHERE  E.EMP_ID = DP.CHECKER_CODE
                AND   DP.DL_CODE = :username
                `, {
            username: userid
        }, { outFormat: oracledb.OBJECT })

        if (returnName.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบชื่อพนักงานที่ประจำอยู่ที่ร้านนี้`
            })
        } else {
            // === success get witness name (employee name) ===
            const resData = returnName.rows
            console.log(`resData : ${JSON.stringify(resData)}`)
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: `ทำรายการสำเร็จ`,
                data: lowerResData
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_create_otp_econsent(req, res, next) {

    let connection;
    let responseSendsms;

    const token = req.user
    const userid = token.ID


    const { phone_no, refid, quotationid } = req.query

    try {

        const otpnumber = Math.floor(100000 + Math.random() * 900000)

        if (phone_no == '' || refid == '' || quotationid == '') {
            return res.status(400).send({
                status: 400,
                message: `missing arguement value`,
                data: []
            })
        }

        sdk.auth(process.env.SMS_API_KEY, process.env.SMS_API_SECRET)

        const message = `OTP Code: ${otpnumber} (RefCode ${refid}) เพื่อยืนยันตัวตนขอสินเชื่อกับไมโครพลัสลิสซิ่ง (ภายใน 5 นาที)`

        responseSendsms = await sdk.post('/sms', {
            msisdn: phone_no,
            message: message,
            sender: 'MICROPLUS',
            force: `Corporate`
        }, { Accept: 'application/json' })


        console.log(`response : ${responseSendsms}`)

        const otplogid = uuidv4()

        // === create otp log ===

        connection = await oracledb.getConnection(config.database)
        const resultotplog = await connection.execute(`
        INSERT INTO MPLS_OTP_LOG 
            (
                OTP_QUO_KEY_APP_ID,
                TYPE,
                CREATED_DATE,
                OTP_VALUE,
                STATUS,
                UPD_USER,
                EXPIRE_DATE,
                OTP_APP_ID
            )
            VALUES 
            (
                :OTP_QUO_KEY_APP_ID,
                :TYPE,
                SYSTIMESTAMP,
                :OTP_VALUE,
                :STATUS,
                :UPD_USER,
                SYSDATE + INTERVAL '5' MINUTE,
                :OTP_APP_ID
            )
        `
            , {
                OTP_QUO_KEY_APP_ID: quotationid,
                TYPE: '2', // type 2 : validate econsent
                OTP_VALUE: otpnumber,
                STATUS: '0',
                UPD_USER: userid,
                OTP_APP_ID: otplogid
            }, {
            outFormat: oracledb.OBJECT
        })

        console.log("OTP record was create " + resultotplog.rowsAffected);

        if (resultotplog.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `สร้าง OTP LOG ไม่สำเร็จ`,
                data: []
            })
        } else {
            // == succeess create quotation econsent flow (DIPCHIP) ==
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.send(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }

            // === End ===
            const sqlstring_getotplog = `
            SELECT * FROM
            (
                SELECT * 
                FROM MPLS_OTP_LOG 
                WHERE OTP_QUO_KEY_APP_ID = :quotationid
                ORDER BY CREATED_DATE DESC
            )
            WHERE ROWNUM = 1
            `
            const resultOTP = await connection.execute(sqlstring_getotplog, { quotationid: { val: quotationid } },
                {
                    outFormat: oracledb.OBJECT
                })

            if (resultOTP) {

                if (resultOTP.rows.length == 0) {
                    const noresultFormatJson = {
                        status: 500,
                        message: 'No OTP log Record'
                    }
                    res.status(200).send(noresultFormatJson)
                } else {
                    let resData = resultOTP.rows
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
                return res.status(200).send({
                    status: 500,
                    message: `Can't find record quotation id after select`,
                    data: []
                })
            }


        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_validation_otp_econsent(req, res, next) {

    let connection;
    try {

        // === Get data on multipart/form-data === 

        let fileData
        let formData

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

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        const parseFormdata = JSON.parse(formData.item)
        const econsentimage = fileData.econsentimage ? fileData.econsentimage : null

        const econsentbuffer = econsentimage ? imagetobuffer(econsentimage) : null

        const {
            quotationid,
            otp_value,
            phone_no,
            consent_datetime,
            application_no,
            transaction_no,
            citizen_id
        } = parseFormdata

        if (quotationid == '' || otp_value == '' && phone_no !== '' && econsentimage) {
            return res.status(200).send({
                status: false,
                message: `missing arguement value`
            })
        }
        connection = await oracledb.getConnection(config.database)

        const result = await connection.execute(`
            SELECT * FROM           (
                SELECT * 
                FROM MPLS_OTP_LOG 
                WHERE OTP_QUO_KEY_APP_ID = :quotationid
                AND TYPE = '2'
                ORDER BY CREATED_DATE DESC
            )
            WHERE ROWNUM = 1`
            , {
                quotationid: quotationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.ststus(200).send({
                status: false,
                message: `ไม่พบรายการ OTP log ของ quotationid นี้`
            })
        } else {


            // === check already valid ===

            const isValid = result.rows[0].STATUS
            if (isValid == '1') {
                return res.status(200).send({
                    status: false,
                    message: `รายการนี้ได้รับการ verify แล้ว`
                })
            }


            // === check OTP match === 
            const otplogvalue = result.rows[0].OTP_VALUE
            if (otp_value !== otplogvalue) {
                return res.status(200).send({
                    status: false,
                    message: `รหัส OTP ไม่ตรงกันกับข้อมูลในระบบ`
                })
            } else {
                // === check expire ===
                const expiredate = moment(result.rows[0].EXPIRE_DATE).format()
                // const currentdate = moment.now() 
                const currentdate = moment().format();

                console.log(`expire Date : ${expiredate}`)
                console.log(`current Date : ${currentdate}`)

                const expire = (expiredate < currentdate)

                if (expire) {
                    return res.status(200).send({
                        status: false,
                        message: `ไม่สามารถยืนยันเลข OTP ได้เนื่องจากเลยเวลาที่กำหนด`
                    })
                } else {
                    // === flag OTP log and update quotation status 
                    const otpid = result.rows[0].OTP_APP_ID
                    console.log(`otpid : ${otpid}`)
                    console.log(`quotatioid : ${quotationid}`)
                    if (otpid == '' && quotationid == '') {
                        return res.status(200).send({
                            status: false,
                            message: `ข้อมูลไม่เพียงพอในกาอัพเดทสถานะ (otpid, quotationid)`
                        })
                    } else {
                        // MPLS_OTP_LOG
                        console.log(`log_otP_cretae`)

                        let updateotplog;
                        let updatequotation;
                        let createlogeconsent;
                        try {
                            updateotplog = await connection.execute(`
                                    UPDATE MPLS_OTP_LOG 
                                    SET STATUS = '2', 
                                        VERIFIED_SUCCESS_DATE = SYSDATE 
                                    WHERE OTP_APP_ID = :OTP_APP_ID
                                `, {
                                OTP_APP_ID: otpid
                            }, {
                                outFormat: oracledb.OBJECT
                            })

                            console.log(`update MPLS_OTP_LOG Success : ${updateotplog.rowsAffected}`)

                            // MPLS_QUOTATION
                            updatequotation = await connection.execute(`
                                    UPDATE MPLS_QUOTATION
                                    SET OTP_CONSENT_VERIFY = 'Y', 
                                        ECONSENT_IMAGE = :ECONSENT_IMAGE
                                    WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                                `, {
                                ECONSENT_IMAGE: econsentbuffer,
                                QUO_KEY_APP_ID: quotationid
                            })

                            console.log(`update quotaiton success : ${updatequotation.rowsAffected}`)

                            // === create  econsent log ====

                            createlogeconsent = await connection.execute(`
                                INSERT INTO MPLS_ECONSENT_LOG (
                                    TRANSACTION_NO,
                                    CONSENT_DATETIME,
                                    CITIZEN_ID,
                                    QUOTATION_ID,
                                    APPLICATION_NUM 
                                ) 
                                VALUES 
                                ( 
                                    :TRANSACTION_NO,
                                    :CONSENT_DATETIME,
                                    :CITIZEN_ID,
                                    :QUOTATION_ID,
                                    :APPLICATION_NUM 
                                 )
                            `, {
                                TRANSACTION_NO: transaction_no,
                                CONSENT_DATETIME: (new Date(consent_datetime)) ?? null,
                                CITIZEN_ID: citizen_id,
                                QUOTATION_ID: quotationid,
                                APPLICATION_NUM: application_no
                            })

                            console.log(`create econsent log success : ${createlogeconsent.rowsAffected}`)

                        } catch (e) {
                            console.error(e)
                            return res.status(200).send({
                                status: false,
                                message: `error trigger : ${JSON.stringify(e)}`
                            })
                        }

                        console.log(`updateotplog.rowsAffected : ${updateotplog.rowsAffected}`)
                        console.log(`updatequotation.rowsAffected : ${updatequotation.rowsAffected}`)


                        if (!(updateotplog.rowsAffected == 1 && updatequotation.rowsAffected == 1 && createlogeconsent.rowsAffected == 1)) {
                            return res.status(200).send({
                                status: false,
                                message: `ไม่สามารถบันทึกค่าสถานะได้ (update status fail)`
                            })
                        } else {

                            try {

                                // *** send sms for verify success ***
                                sdk.auth(process.env.SMS_API_KEY, process.env.SMS_API_SECRET)

                                const urlimage = `https://web-portal-uat.microplusleasing.com/e-consent?application_num=${application_no}`
                                const message = `ดูหลักฐานเอกสารการให้ความยินยอม คลิก ${urlimage}`

                                responseSendsms = await sdk.post('/sms', {
                                    msisdn: phone_no,
                                    message: message,
                                    sender: 'MICROPLUS',
                                    force: `Corporate`
                                }, { Accept: 'application/json' })


                                console.log(`response : ${responseSendsms}`)
                            } catch (e) {
                                return res.status(200).send({
                                    status: false,
                                    message: `Error during send sms : ${e.message ? e.message : 'No message'}`
                                })
                            }

                            // === commit and return ====


                            console.log(`all valid`)
                            const commitall = await connection.commit();

                            try {
                                commitall
                            } catch (e) {
                                console.err(e.message)
                                return res.send(200).send({
                                    status: false,
                                    message: `Error : ${e.message ? e.message : 'No message'}`,
                                })
                            }

                            // === finish ===
                            console.log(`return true`)
                            return res.status(200).send({
                                status: true,
                                message: `success`
                            })
                        }
                    }
                }
            }
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: false,
            message: `Fail : ${e.message ? e.message : 'No message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: false,
                    message: `Error : ${e.message ? e.message : 'No message'}`
                })
            }
        }
    }
}

async function MPLS_validation_otp_econsent_non(req, res, next) {

    let connection;
    try {

        const reqData = req.query


        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: false,
                message: `ไม่พบ quotationid`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                UPDATE MPLS_QUOTATION
                SET OTP_CONSENT_VERIFY = 'N'
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                `
            , {
                QUO_KEY_APP_ID: reqData.quotationid
            }, {

        })
        console.log(`flag non-econsent success : ${result.rowsAffected}`)

        if (result.rowsAffected !== 1) {
            return res.status(200).send({
                status: false,
                message: `can't intizialise record`,
                data: []
            })
        } else {


            // === success flag non-econsent ====

            const commitall = await connection.commit();
            try {
                commitall
            } catch (e) {
                return res.status(200).send({
                    status: 500,
                    message: `Fail with Error : ${e.message ? e.message : 'No return message'}`,
                    data: []
                })
            }

            return res.status(200).send({
                status: true,
                message: `success`
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: false,
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

// *** for check or gen application_no before open dialog econsent OTP ****
async function MPLS_check_application_no(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {
        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

        const { quotationid } = req.query

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SELECT APPLICATION_NUM
            FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :quotationid
        `
            , {
                quotationid: quotationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No application_no',
                data: []
            })
        } else {

            const applicationidvalue = result.rows[0].APPLICATION_NUM

            if (applicationidvalue == '' || applicationidvalue == null) {
                return res.status(200).send({
                    status: 200,
                    message: `ยังไม่มีเลข application_num`,
                    data: [{
                        application_no: ''
                    }]
                })
            } else {
                return res.status(200).send({
                    status: 200,
                    message: `มีเลข application_num อยู่แล้ว`,
                    data: [{
                        application_no: applicationidvalue
                    }]
                })
            }
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Error (close) : ${e.message ?? 'No message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_gen_application_no(req, res, next) {

    let connection;
    try {

        const token = req.user
        const userid = token.ID
        const { quotationid } = req.query

        if (userid == '' || quotationid == '') {
            return res.status(200).send({
                status: 500,
                message: `missing variable argument`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                DECLARE 

                application_no VARCHAR(30);
                status VARCHAR(150);
            
            begin
            BTW.OPEN_APP_CUST_IF_MOBILEMPLS.MOBILEMPLS_DATA_INTERFACE (
                    '10',
                    :userid,
                    :quotationid,
                    '001',
                :application_no,
                :status);
            end;
        `
            , {
                userid: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: userid },
                quotationid: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: quotationid },
                application_no: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }

            })

        if (result.outBinds.status == 'SUCCESSED') {
            const applicationid = result.outBinds.application_no
            console.log(`for create applicationid gen when econsent : ${applicationid}`)
            if (applicationid == '') {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่พบเลข applicationid ที่สร้าง`,
                    data: [{
                        application_no: applicationid,
                        status: result.outBinds.status
                    }]
                })
            } else {
                return res.status(200).send({
                    status: 200,
                    message: `success`,
                    data: [{
                        application_no: applicationid
                    }]
                })
            }
        } else {
            return res.status(200).send({
                status: 500,
                message: `Error : ไม่สามารถสร้างเลข applicationid ได้`,
                data: [{
                    application_no: applicationid,
                    status: result.outBinds.status
                }]
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail : ${e.message ?? 'No message'}`,
                    data: []
                })
            }
        }
    }
}

// *** USE _mplsUtil.internal_MPLS_get_refid instead ***
async function MPLS_get_refid(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
        DECLARE

        refid  VARCHAR2(11);
        BEGIN

        BTW.PROC_GEN_QUO_APP_REF_NO(:refid);

        END;`
            , {
                refid: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }, {
            outFormat: oracledb.OBJECT
        })


        if (result.outBinds.refid == '') {
            return res.status(201).send({
                status: 201,
                message: 'No refid',
                data: []
            })
        } else {
            const refid = result.outBinds.refid
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    refid: refid
                }
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

// *** get current time ***
async function MPLS_getservertime(req, res, next) {
    // let dateselect = `18 เม.ย. 2537`
    try {

        var date = moment()

        return res.status(200).send({
            status: 200,
            message: `success`,
            date: date
        })
    } catch (e) {
        return res.status(200).send({
            status: 500,
            message: `server error with status : ${e.message}`,
            data: []
        })
    }
}

// ***** step 2 (credit: MPLS_CREDIT) *****
async function MPLS_create_or_update_credit(req, res, next) {
    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {
        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        connection = await oracledb.getConnection(config.database)

        // === check parameter quotationid === 
        const chkquotation = await connection.execute(`
            SELECT QUO_KEY_APP_ID, QUO_STATUS FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :QUOTATIONID
        `, {
            QUOTATIONID: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        // console.log(`this is result : ${JSON.stringify(chkquotation)}`)
        // console.log(`this is result : ${JSON.stringify(chkquotation.rows.length)}`)

        if (chkquotation.rows.length != 1) {
            return res.status(200).send({
                status: false,
                message: `เลข quotaion ไอดี ไม่สามารถระบุใบคำขอได้`
            })
        } else {

            // === record is already exists ===

            const chkdup = await connection.execute(`
                SELECT * FROM MPLS_CREDIT
                WHERE CRE_QUO_KEY_APP_ID = :QUOTATIONID
            `, {
                QUOTATIONID: reqData.quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            if (chkdup.rows.length !== 0) {

                // === check quo_status === (if MPLS_QUOTATION.QUO_STATUS = 1 : can't update record)
                if (chkquotation.rows[0].QUO_STATUS == 1) {
                    return res.status(200).send({
                        status: false,
                        message: `สถานะใบคำขออยู่ในขั้นพิจารณา ไม่สามารถแก้ไขข้อมูลได้`,
                        data: []
                    })
                }

                // *** update record MPLS_CREDIT with SQL *** 
                console.log(`reqData : ${JSON.stringify(reqData)}`)
                const creid = chkdup.rows[0].APP_KEY_ID
                const quoid = chkdup.rows[0].CRE_QUO_KEY_APP_ID

                const updatecredit = await connection.execute(`
                UPDATE MPLS_CREDIT
                SET
                    BRAND_CODE = :BRAND_CODE, 
                    BRAND_NAME = :BRAND_NAME, 
                    MODEL_CODE = :MODEL_CODE,
                    MODEL_NAME = :MODEL_NAME, 
                    COLOR_NAME = :COLOR_NAME, 
                    LOAN_AMOUNT = :LOAN_AMOUNT, 
                    PRODUCT_VALUE = :PRODUCT_VALUE,
                    INTEREST_RATE = :INTEREST_RATE, 
                    PAYMENT_VALUE = :PAYMENT_VALUE, 
                    PAYMENT_ROUND_COUNT = :PAYMENT_ROUND_COUNT, 
                    INSURANCE_CODE = :INSURANCE_CODE,
                    INSURANCE_NAME = :INSURANCE_NAME,
                    INSURANCE_YEAR = :INSURANCE_YEAR, 
                    INSURANCE_PLAN_PRICE = :INSURANCE_PLAN_PRICE, 
                    IS_INCLUDE_LOANAMOUNT = :IS_INCLUDE_LOANAMOUNT, 
                    FACTORY_PRICE = :FACTORY_PRICE, 
                    SIZE_MODEL = :SIZE_MODEL, 
                    INSURER_CODE = :INSURER_CODE, 
                    INSURER_NAME = :INSURER_NAME,
                    COVERAGE_TOTAL_LOSS = :COVERAGE_TOTAL_LOSS,
                    MAX_LTV = :MAX_LTV,
                    ENGINE_NUMBER = :ENGINE_NUMBER,
                    CHASSIS_NUMBER = :CHASSIS_NUMBER,
                    ENGINE_NO_RUNNING = :ENGINE_NO_RUNNING,
                    CHASSIS_NO_RUNNING = :CHASSIS_NO_RUNNING,
                    PRICE_INCLUDE_VAT = :PRICE_INCLUDE_VAT,
                    SL_CODE = :SL_CODE
                WHERE
                    CRE_QUO_KEY_APP_ID = :CRE_QUO_KEY_APP_ID
                    AND APP_KEY_ID = :APP_KEY_ID
                `, {

                    BRAND_CODE: reqData.brand_code,
                    BRAND_NAME: reqData.brand_name,
                    MODEL_CODE: reqData.model_code,
                    MODEL_NAME: reqData.model_name,
                    COLOR_NAME: reqData.color_name,
                    LOAN_AMOUNT: reqData.loan_amount,
                    PRODUCT_VALUE: reqData.product_value,
                    INTEREST_RATE: reqData.interest_rate,
                    PAYMENT_VALUE: reqData.payment_value,
                    PAYMENT_ROUND_COUNT: reqData.payment_round_count,
                    INSURANCE_CODE: reqData.insurance_code,
                    INSURANCE_NAME: reqData.insurance_name,
                    INSURANCE_YEAR: reqData.insurance_year,
                    INSURANCE_PLAN_PRICE: reqData.insurance_plan_price,
                    IS_INCLUDE_LOANAMOUNT: reqData.is_include_loanamount,
                    FACTORY_PRICE: reqData.factory_price,
                    SIZE_MODEL: reqData.size_model,
                    INSURER_CODE: reqData.insurer_code,
                    INSURER_NAME: reqData.insurer_name,
                    COVERAGE_TOTAL_LOSS: reqData.coverage_total_loss,
                    MAX_LTV: reqData.max_ltv,
                    ENGINE_NUMBER: reqData.engine_number,
                    CHASSIS_NUMBER: reqData.chassis_number,
                    ENGINE_NO_RUNNING: reqData.engine_no_running,
                    CHASSIS_NO_RUNNING: reqData.chassis_no_running,
                    PRICE_INCLUDE_VAT: reqData.price_include_vat,
                    SL_CODE: reqData.dealer_code,
                    CRE_QUO_KEY_APP_ID: quoid,
                    APP_KEY_ID: creid,
                })

                // === update sl_code to MPLS_QUOTATION ===
                const update_sl_code_quotation_result = await connection.execute(`
                                UPDATE MPLS_QUOTATION
                                SET
                                    SL_CODE = :SL_CODE,
                                    CHECKER_CODE = :CHECKER_CODE 
                                WHERE
                                    QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                        `, {
                    SL_CODE: reqData.dealer_code,
                    CHECKER_CODE: reqData.checker_id,
                    QUO_KEY_APP_ID: reqData.quotationid
                })

                if (updatecredit.rowsAffected !== 1 && update_sl_code_quotation_result.rowsAffected !== 1) {
                    return res.status(200).send({
                        status: false,
                        message: `อัพเดทรายการ MPLS_CREDIT ผิดพลาด (rowAffected : ${updatecredit.rowsAffected}, (quotation) : ${update_sl_code_quotation_result.rowsAffected})`
                    })
                } else {
                    // === update success ===
                    const commitall = await connection.commit();

                    try {
                        commitall
                    } catch (e) {
                        console.err(e.message)
                        return res.send(200).send({
                            status: false,
                            message: `Error : ${e.message ? e.message : 'No message'}`,
                        })
                    }

                    // === finish ===

                    return res.status(200).send({
                        status: true,
                        message: `บันทึกรายการ credit เรียบร้อย`
                    })
                }

            } else {

                // *** create record MPLS_CREDIT with SQL ***
                const creditid = uuidv4()

                const credit_create_result = await connection.execute(`
                INSERT INTO MPLS_CREDIT 
                (
                    BRAND_CODE, 
                    BRAND_NAME, 
                    MODEL_CODE,
                    MODEL_NAME, 
                    COLOR_NAME, 
                    LOAN_AMOUNT, 
                    PRODUCT_VALUE,
                    INTEREST_RATE, 
                    PAYMENT_VALUE, 
                    PAYMENT_ROUND_COUNT, 
                    INSURANCE_CODE,
                    INSURANCE_NAME,
                    INSURANCE_YEAR, 
                    INSURANCE_PLAN_PRICE, 
                    IS_INCLUDE_LOANAMOUNT, 
                    FACTORY_PRICE, 
                    SIZE_MODEL, 
                    INSURER_CODE, 
                    INSURER_NAME,
                    COVERAGE_TOTAL_LOSS,
                    MAX_LTV,
                    ENGINE_NUMBER,
                    CHASSIS_NUMBER,
                    ENGINE_NO_RUNNING,
                    CHASSIS_NO_RUNNING,
                    PRICE_INCLUDE_VAT,
                    SL_CODE,
                    CRE_QUO_KEY_APP_ID,
                    APP_KEY_ID
                )
                VALUES 
                (
                    :BRAND_CODE, 
                    :BRAND_NAME, 
                    :MODEL_CODE, 
                    :MODEL_NAME, 
                    :COLOR_NAME, 
                    :LOAN_AMOUNT, 
                    :PRODUCT_VALUE,
                    :INTEREST_RATE, 
                    :PAYMENT_VALUE, 
                    :PAYMENT_ROUND_COUNT, 
                    :INSURANCE_CODE,
                    :INSURANCE_NAME,
                    :INSURANCE_YEAR, 
                    :INSURANCE_PLAN_PRICE, 
                    :IS_INCLUDE_LOANAMOUNT, 
                    :FACTORY_PRICE, 
                    :SIZE_MODEL, 
                    :INSURER_CODE, 
                    :INSURER_NAME,
                    :COVERAGE_TOTAL_LOSS,
                    :MAX_LTV,
                    :ENGINE_NUMBER,
                    :CHASSIS_NUMBER,
                    :ENGINE_NO_RUNNING,
                    :CHASSIS_NO_RUNNING,
                    :PRICE_INCLUDE_VAT,
                    :SL_CODE,
                    :CRE_QUO_KEY_APP_ID,
                    :APP_KEY_ID
                )
            `, {
                    BRAND_CODE: reqData.brand_code,
                    BRAND_NAME: reqData.brand_name,
                    MODEL_CODE: reqData.model_code,
                    MODEL_NAME: reqData.model_name,
                    COLOR_NAME: reqData.color_name,
                    LOAN_AMOUNT: reqData.loan_amount,
                    PRODUCT_VALUE: reqData.product_value,
                    INTEREST_RATE: reqData.interest_rate,
                    PAYMENT_VALUE: reqData.payment_value,
                    PAYMENT_ROUND_COUNT: reqData.payment_round_count,
                    INSURANCE_CODE: reqData.insurance_code,
                    INSURANCE_NAME: reqData.insurance_name,
                    INSURANCE_YEAR: reqData.insurance_year,
                    INSURANCE_PLAN_PRICE: reqData.insurance_plan_price,
                    IS_INCLUDE_LOANAMOUNT: reqData.is_include_loanamount,
                    FACTORY_PRICE: reqData.factory_price,
                    SIZE_MODEL: reqData.size_model,
                    INSURER_CODE: reqData.insurer_code,
                    INSURER_NAME: reqData.insurer_name,
                    COVERAGE_TOTAL_LOSS: reqData.coverage_total_loss,
                    MAX_LTV: reqData.max_ltv,
                    ENGINE_NUMBER: reqData.engine_number,
                    CHASSIS_NUMBER: reqData.chassis_number,
                    ENGINE_NO_RUNNING: reqData.engine_no_running,
                    CHASSIS_NO_RUNNING: reqData.chassis_no_running,
                    PRICE_INCLUDE_VAT: reqData.price_include_vat,
                    SL_CODE: reqData.dealer_code,
                    CRE_QUO_KEY_APP_ID: reqData.quotationid,
                    APP_KEY_ID: creditid
                })

                // === update sl_code to MPLS_QUOTATION ===
                const update_sl_code_quotation_result = await connection.execute(`
                        UPDATE MPLS_QUOTATION
                        SET
                            SL_CODE = :SL_CODE, 
                            QUO_CREDIT_ID = :QUO_CREDIT_ID,
                            CHECKER_CODE = :CHECKER_CODE
                        WHERE
                            QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                `, {
                    SL_CODE: reqData.dealer_code,
                    QUO_CREDIT_ID: creditid,
                    CHECKER_CODE: reqData.checker_id,
                    QUO_KEY_APP_ID: reqData.quotationid
                })


                if (credit_create_result.rowsAffected !== 1 && update_sl_code_quotation_result !== 1) {
                    return res.sattus(200).send({
                        status: false,
                        message: `สร้างรายการ MPLS_CREDIT ผิดพลาด (rowAffected (credit) : ${credit_create_result.rowsAffected}, (quotation) : ${update_sl_code_quotation_result.rowsAffected})`
                    })
                } else {
                    // *** success ***

                    const commitall = await connection.commit();

                    try {
                        commitall
                    } catch (e) {
                        console.err(e.message)
                        return res.send(200).send({
                            status: false,
                            message: `Error : ${e.message ? e.message : 'No message'}`,
                        })
                    }

                    // === finish ===

                    return res.status(200).send({
                        status: true,
                        message: `สร้างรายการ credit เรียบร้อย`
                    })
                }

            }

        }



    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: false,
            message: `Fail create quotation econsent : ${e.message ? e.message : 'No message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: false,
                    message: `Fail close connection : ${e.message ? e.message : 'No message'}`
                })
            }
        }
    }
}

// ***** step 3 (career: MPLS_Career) *****
async function MPLS_create_or_update_careerandpurpose(req, res, next) {
    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        connection = await oracledb.getConnection(config.database)

        // === check parameter quotationid === 
        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter quotationid`,
                data: []
            })
        }

        // === check quotation is already exist ===
        const chkquotation = await connection.execute(`
            SELECT QUO_KEY_APP_ID, QUO_STATUS FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :QUOTATIONID
        `, {
            QUOTATIONID: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (chkquotation.rows.length != 1) {
            return res.status(200).send({
                status: false,
                message: `เลข QUOTATION ID ไม่สามารถระบุใบคำขอได้`
            })
        } else {
            // === record is already exists ===

            // === career ===
            const chkdupcareer = await connection.execute(`
                SELECT * FROM MPLS_CAREER
                WHERE CARE_QUO_APP_KEY_ID = :QUOTATIONID
            `, {
                QUOTATIONID: reqData.quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // === purpose ===
            const chkduppurpose = await connection.execute(`
                SELECT * FROM MPLS_PURPOSE
                WHERE PURP_QUO_APP_KEY_ID = :QUOTATIONID
            `, {
                QUOTATIONID: reqData.quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            if (chkdupcareer.rows.length !== 0 && chkduppurpose.rows.length !== 0) {

                // === UPDATE FLOW ===

                // === check quo_status === (if MPLS_QUOTATION.QUO_STATUS = 1 : can't update record)
                if (chkquotation.rows[0].QUO_STATUS == 1) {
                    return res.status(200).send({
                        status: false,
                        message: `สถานะใบคำขออยู่ในขั้นพิจารณา ไม่สามารถแก้ไขข้อมูลได้`,
                        data: []
                    })
                }


                const careerid = chkdupcareer.rows[0].APP_KEY_ID
                const purposeid = chkduppurpose.rows[0].APP_KEY_ID
                const quoid = chkdupcareer.rows[0].CARE_QUO_APP_KEY_ID

                // *** update record MPLS_CAREER with SQL *** 
                const updatecareer = await connection.execute(`
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
                WHERE CARE_QUO_APP_KEY_ID = :CARE_QUO_APP_KEY_ID
                AND APP_KEY_ID = :APP_KEY_ID
                `, {

                    MAIN_CAREER_NAME: reqData.main_career_name,
                    MAIN_CAREER_CODE: reqData.main_career_code,
                    MAIN_WORKPLACE_NAME: reqData.main_workplace_name,
                    MAIN_POSITION: reqData.main_position,
                    MAIN_DEPARTMENT: reqData.main_department,
                    MAIN_EXPERIENCE_YEAR: reqData.main_experience_year,
                    MAIN_EXPERIENCE_MONTH: reqData.main_experience_month,
                    MAIN_SALARY_PER_MONTH: reqData.main_salary_per_month,
                    MAIN_SALARY_PER_DAY: reqData.main_salary_per_day,
                    MAIN_LEADER_NAME: reqData.main_leader_name,
                    MAIN_WORK_PER_WEEK: reqData.main_work_per_week,
                    IS_SUB_CAREER: reqData.is_sub_career,
                    SUB_CAREER_NAME: reqData.sub_career_name,
                    SUB_CAREER_CODE: reqData.sub_career_code,
                    SUB_WORKPLACE_NAME: reqData.sub_workplace_name,
                    SUB_POSITION: reqData.sub_position,
                    SUB_DEPARTMENT: reqData.sub_department,
                    SUB_EXPERIENCE_YEAR: reqData.sub_experience_year,
                    SUB_EXPERIENCE_MONTH: reqData.sub_experience_month,
                    SUB_SALARY_PER_MONTH: reqData.sub_salary_per_month,
                    SUB_SALARY_PER_DAY: reqData.sub_salary_per_day,
                    SUB_LEADER_NAME: reqData.sub_leader_name,
                    SUB_WORK_PER_WEEK: reqData.sub_work_per_week,
                    CARE_QUO_APP_KEY_ID: quoid,
                    APP_KEY_ID: careerid,
                })

                // *** update record MPLS_PURPOSE with SQL ***
                const updatepurpose = await connection.execute(`
                        UPDATE MPLS_PURPOSE
                        SET 
                            PURPOSE_OF_BUY = :PURPOSE_OF_BUY, 
                            PURPOSE_OF_BUY_NAME = :PURPOSE_OF_BUY_NAME, 
                            REASON_OF_BUY = :REASON_OF_BUY, 
                            REASON_OF_BUY_NAME = :REASON_OF_BUY_NAME, 
                            CAR_USER = :CAR_USER, 
                            CAR_USER_RELATION = :CAR_USER_RELATION, 
                            CAR_USER_NAME = :CAR_USER_NAME, 
                            CAR_USER_FULLNAME = :CAR_USER_FULLNAME, 
                            CAR_USER_CITIZENCARD_ID = :CAR_USER_CITIZENCARD_ID, 
                            CAR_USER_HOME_NO = :CAR_USER_HOME_NO, 
                            CAR_USER_HOME_NAME = :CAR_USER_HOME_NAME, 
                            CAR_USER_SOI = :CAR_USER_SOI, 
                            CAR_USER_MOO = :CAR_USER_MOO, 
                            CAR_USER_ROAD = :CAR_USER_ROAD, 
                            CAR_USER_SUB_DISTRICT = :CAR_USER_SUB_DISTRICT, 
                            CAR_USER_DISTRICT = :CAR_USER_DISTRICT, 
                            CAR_USER_PROVINCE_NAME = :CAR_USER_PROVINCE_NAME, 
                            CAR_USER_PROVINCE_CODE = :CAR_USER_PROVINCE_CODE, 
                            CAR_USER_POSTAL_CODE = :CAR_USER_POSTAL_CODE, 
                            CAR_USER_ROOM_NO = :CAR_USER_ROOM_NO, 
                            CAR_USER_FLOOR = :CAR_USER_FLOOR, 
                            CAR_USER_PHONENO = :CAR_USER_PHONENO, 
                            FIRST_REFERRAL_FULLNAME = :FIRST_REFERRAL_FULLNAME, 
                            FIRST_REFERRAL_PHONENO = :FIRST_REFERRAL_PHONENO, 
                            FIRST_REFERRAL_RELATION = :FIRST_REFERRAL_RELATION, 
                            SECOND_REFERRAL_FULLNAME = :SECOND_REFERRAL_FULLNAME, 
                            SECOND_REFERRAL_PHONENO = :SECOND_REFERRAL_PHONENO, 
                            SECOND_REFERRAL_RELATION = :SECOND_REFERRAL_RELATION
                        WHERE PURP_QUO_APP_KEY_ID = :PURP_QUO_APP_KEY_ID
                        AND APP_KEY_ID = :APP_KEY_ID
                `, {

                    PURPOSE_OF_BUY: reqData.purpose_buy,
                    PURPOSE_OF_BUY_NAME: reqData.purpose_buy_name,
                    REASON_OF_BUY: reqData.reason_buy,
                    REASON_OF_BUY_NAME: reqData.reason_buy_etc,
                    CAR_USER: reqData.car_user,
                    CAR_USER_RELATION: reqData.car_user_relation,
                    CAR_USER_NAME: reqData.car_user_name,
                    CAR_USER_FULLNAME: reqData.car_user_name_2,
                    CAR_USER_CITIZENCARD_ID: reqData.car_user_citizen_id,
                    CAR_USER_HOME_NO: reqData.car_user_home_no,
                    CAR_USER_HOME_NAME: reqData.car_user_home_name,
                    CAR_USER_SOI: reqData.car_user_soi,
                    CAR_USER_MOO: reqData.car_user_moo,
                    CAR_USER_ROAD: reqData.car_user_road,
                    CAR_USER_SUB_DISTRICT: reqData.car_user_sub_district,
                    CAR_USER_DISTRICT: reqData.car_user_district,
                    CAR_USER_PROVINCE_NAME: reqData.car_user_province_name,
                    CAR_USER_PROVINCE_CODE: reqData.car_user_province_code,
                    CAR_USER_POSTAL_CODE: reqData.car_user_postal_code,
                    CAR_USER_ROOM_NO: reqData.car_user_room_no,
                    CAR_USER_FLOOR: reqData.car_user_floor,
                    CAR_USER_PHONENO: reqData.car_user_phone_no,
                    FIRST_REFERRAL_FULLNAME: reqData.first_referral_fullname,
                    FIRST_REFERRAL_PHONENO: reqData.first_referral_phone_no,
                    FIRST_REFERRAL_RELATION: reqData.first_referral_relation,
                    SECOND_REFERRAL_FULLNAME: reqData.second_referral_fullname,
                    SECOND_REFERRAL_PHONENO: reqData.second_referral_phone_no,
                    SECOND_REFERRAL_RELATION: reqData.second_referral_relation,
                    PURP_QUO_APP_KEY_ID: quoid,
                    APP_KEY_ID: purposeid
                })


                if (updatecareer.rowsAffected !== 1 && updatepurpose.rowsAffected !== 1) {
                    return res.status(200).send({
                        status: false,
                        message: `อัพเดทรายการ MPLS_CAREER, MPLS_PURPOSE ผิดพลาด (Career : rowAffected : ${updatecareer.rowsAffected}, \n
                            Purpose : rowsAffected : ${updatepurpose.rowsAffected}`
                    })
                } else {
                    // === update success ===
                    const commitall = await connection.commit();

                    try {
                        commitall
                    } catch (e) {
                        console.err(e.message)
                        return res.send(200).send({
                            status: false,
                            message: `Error : ${e.message ? e.message : 'No message'}`,
                        })
                    }

                    // === finish ===

                    return res.status(200).send({
                        status: true,
                        message: `บันทึกรายการ career, purpose เรียบร้อย`
                    })
                }

            } else if (chkdupcareer.rows.length == 0 && chkduppurpose.rows.length == 0) {

                // === CREATE FLOW ===

                const careerid = uuidv4()
                const purposeid = uuidv4()

                // *** create record MPLS_CAREER with SQL ***
                const career_create_result = await connection.execute(`
                INSERT INTO MPLS_CAREER (
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
                    :SUB_SALARY_PER_MONTH, :SUB_SALARY_PER_DAY, :SUB_LEADER_NAME, :SUB_WORK_PER_WEEK)
            `, {
                    CARE_QUO_APP_KEY_ID: reqData.quotationid,
                    APP_KEY_ID: careerid,
                    MAIN_CAREER_NAME: reqData.main_career_name,
                    MAIN_CAREER_CODE: reqData.main_career_code,
                    MAIN_WORKPLACE_NAME: reqData.main_workplace_name,
                    MAIN_POSITION: reqData.main_position,
                    MAIN_DEPARTMENT: reqData.main_department,
                    MAIN_EXPERIENCE_YEAR: reqData.main_experience_year,
                    MAIN_EXPERIENCE_MONTH: reqData.main_experience_month,
                    MAIN_SALARY_PER_MONTH: reqData.main_salary_per_month,
                    MAIN_SALARY_PER_DAY: reqData.main_salary_per_day,
                    MAIN_LEADER_NAME: reqData.main_leader_name,
                    MAIN_WORK_PER_WEEK: reqData.main_work_per_week,
                    IS_SUB_CAREER: reqData.is_sub_career,
                    SUB_CAREER_NAME: reqData.sub_career_name,
                    SUB_CAREER_CODE: reqData.sub_career_code,
                    SUB_WORKPLACE_NAME: reqData.sub_workplace_name,
                    SUB_POSITION: reqData.sub_position,
                    SUB_DEPARTMENT: reqData.sub_department,
                    SUB_EXPERIENCE_YEAR: reqData.sub_experience_year,
                    SUB_EXPERIENCE_MONTH: reqData.sub_experience_month,
                    SUB_SALARY_PER_MONTH: reqData.sub_salary_per_month,
                    SUB_SALARY_PER_DAY: reqData.sub_salary_per_day,
                    SUB_LEADER_NAME: reqData.sub_leader_name,
                    SUB_WORK_PER_WEEK: reqData.sub_work_per_week
                })

                // *** create record MPLS_PURPOSE with SQL ***
                const purpose_create_result = await connection.execute(`
                INSERT INTO MPLS_PURPOSE (
                    PURP_QUO_APP_KEY_ID, APP_KEY_ID, PURPOSE_OF_BUY, PURPOSE_OF_BUY_NAME, REASON_OF_BUY,
                    REASON_OF_BUY_NAME, CAR_USER, CAR_USER_RELATION, CAR_USER_NAME, CAR_USER_FULLNAME, CAR_USER_CITIZENCARD_ID,
                    CAR_USER_HOME_NO, CAR_USER_HOME_NAME, CAR_USER_SOI, CAR_USER_MOO, CAR_USER_ROAD, CAR_USER_SUB_DISTRICT,
                    CAR_USER_DISTRICT, CAR_USER_PROVINCE_NAME, CAR_USER_PROVINCE_CODE, CAR_USER_POSTAL_CODE, CAR_USER_ROOM_NO,
                    CAR_USER_FLOOR, CAR_USER_PHONENO, FIRST_REFERRAL_FULLNAME,
                    FIRST_REFERRAL_PHONENO, FIRST_REFERRAL_RELATION, SECOND_REFERRAL_FULLNAME,
                    SECOND_REFERRAL_PHONENO, SECOND_REFERRAL_RELATION)
                VALUES (:PURP_QUO_APP_KEY_ID, :APP_KEY_ID, :PURPOSE_OF_BUY, :PURPOSE_OF_BUY_NAME, :REASON_OF_BUY,
                    :REASON_OF_BUY_NAME, :CAR_USER, :CAR_USER_RELATION, :CAR_USER_NAME, :CAR_USER_FULLNAME, :CAR_USER_CITIZENCARD_ID,
                    :CAR_USER_HOME_NO, :CAR_USER_HOME_NAME, :CAR_USER_SOI, :CAR_USER_MOO, :CAR_USER_ROAD, :CAR_USER_SUB_DISTRICT,
                    :CAR_USER_DISTRICT, :CAR_USER_PROVINCE_NAME, :CAR_USER_PROVINCE_CODE, :CAR_USER_POSTAL_CODE, :CAR_USER_ROOM_NO,
                    :CAR_USER_FLOOR, :CAR_USER_PHONENO, :FIRST_REFERRAL_FULLNAME,
                    :FIRST_REFERRAL_PHONENO, :FIRST_REFERRAL_RELATION, :SECOND_REFERRAL_FULLNAME,
                    :SECOND_REFERRAL_PHONENO, :SECOND_REFERRAL_RELATION)
                `, {
                    PURP_QUO_APP_KEY_ID: reqData.quotationid,
                    APP_KEY_ID: purposeid,
                    PURPOSE_OF_BUY: reqData.purpose_buy, PURPOSE_OF_BUY_NAME: reqData.purpose_buy_name, REASON_OF_BUY: reqData.reason_buy, // valid
                    REASON_OF_BUY_NAME: reqData.reason_buy_etc, CAR_USER: reqData.car_user, CAR_USER_RELATION: reqData.car_user_relation, CAR_USER_NAME: reqData.car_user_name, CAR_USER_FULLNAME: reqData.car_user_name_2, CAR_USER_CITIZENCARD_ID: reqData.car_user_citizen_id, // valid
                    CAR_USER_HOME_NO: reqData.car_user_home_no, CAR_USER_HOME_NAME: reqData.car_user_home_name, CAR_USER_SOI: reqData.car_user_soi, CAR_USER_MOO: reqData.car_user_moo, CAR_USER_ROAD: reqData.car_user_road, CAR_USER_SUB_DISTRICT: reqData.car_user_sub_district, // valid
                    CAR_USER_DISTRICT: reqData.car_user_district, CAR_USER_PROVINCE_NAME: reqData.car_user_province_name, CAR_USER_PROVINCE_CODE: reqData.car_user_province_code, CAR_USER_POSTAL_CODE: reqData.car_user_postal_code, CAR_USER_ROOM_NO: reqData.car_user_room_no, // valid
                    CAR_USER_FLOOR: reqData.car_user_floor, CAR_USER_PHONENO: reqData.car_user_phone_no, FIRST_REFERRAL_FULLNAME: reqData.first_referral_fullname, // last 2 field (FIRST_REFERRAL_HOUSE_NO, FIRST_REFERRAL_MOO) // valid
                    FIRST_REFERRAL_PHONENO: reqData.first_referral_phone_no, FIRST_REFERRAL_RELATION: reqData.first_referral_relation, SECOND_REFERRAL_FULLNAME: reqData.second_referral_fullname, // 3-4 valid // valid
                    SECOND_REFERRAL_PHONENO: reqData.second_referral_phone_no, SECOND_REFERRAL_RELATION: reqData.second_referral_relation
                })

                // === upate quotation with key id ==== 

                const update_key_to_quotation = await connection.execute(`
                    UPDATE MPLS_QUOTATION
                        SET
                            QUO_CAREER_ID = :QUO_CAREER_ID,
                            QUO_PURPOSE_ID = :QUO_PURPOSE_ID
                        WHERE
                            QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                `, {
                    QUO_CAREER_ID: careerid,
                    QUO_PURPOSE_ID: purposeid,
                    QUO_KEY_APP_ID: reqData.quotationid
                })



                if (career_create_result.rowsAffected !== 1 && purpose_create_result.rowsAffected !== 1 && update_key_to_quotation.rowsAffected !== 1) {
                    return res.sattus(200).send({
                        status: false,
                        message: `สร้างรายการ MPLS_CAREER, MPLS_PURPOSE ผิดพลาด (rowAffected (MPLS_CAREER) : ${career_create_result.rowsAffected}, (MPLS_PURPOSE) : ${purpose_create_result.rowsAffected}, (update field quotation (keyid) : ${update_key_to_quotation.rowsAffected}))`
                    })
                } else {
                    // *** success ***

                    const commitall = await connection.commit();

                    try {
                        commitall
                    } catch (e) {
                        console.err(e.message)
                        return res.send(200).send({
                            status: false,
                            message: `Error : ${e.message ? e.message : 'No message'}`,
                        })
                    }

                    // === finish ===
                    return res.status(200).send({
                        status: true,
                        message: `สร้างรายการ MPLS_CAREER, MPLS_PURPOSE เรียบร้อย`
                    })
                }

            } else {
                return res.status(200).send({
                    status: false,
                    message: `ไม่สามารถกำหนดเงื่อนไขในการบันทึกค่าได้ Carreer row : ${chkdupcareer}, Purpuse row : ${chkduppurpose}`,
                    data: []
                })
            }

        }

    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

// **** step 4 (image attach) ****
async function MPLS_getimagefilebyid(req, res, next) {
    let connection;
    try {

        const reqData = req.query

        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `missig paremeter`,
                data: []
            })
        }

        // === check record is exist ===
        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(config.database)

        const checkquotation = await connection.execute(`
            SELECT QUO_KEY_APP_ID FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, {
            QUO_KEY_APP_ID: reqData.quotationid
        }, { outFormat: oracledb.OBJECT })

        if (checkquotation.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการ quotation ได้ (rows : ${checkquotation.rows.length})`,
                data: []
            })
        }

        // ===  GET IMAGE FILE LIST OF QUOTATION ===

        const imagelist = await connection.execute(`
                SELECT FS.IMAGE_NAME, FS.IMAGE_TYPE, FS.IMAGE_CODE, FS.IMAGE_FILE , MS.IMAGE_HEADER
                FROM MPLS_IMAGE_FILE FS
                LEFT JOIN MPLS_MASTER_IMAGE_P MS
                ON FS.IMAGE_CODE = MS.IMAGE_CODE
                WHERE ACTIVE_STATUS = 'Y'
                AND FS.IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
                AND FS.IMAGE_CODE IN ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10')
        `, {
            IMGF_QUO_APP_KEY_ID: reqData.quotationid
        }, { outFormat: oracledb.OBJECT })

        const resData = imagelist.rows
        const lowerResData = tolowerService.arrayobjtolower(resData)
        let returnData = new Object
        returnData.data = lowerResData
        returnData.status = 200
        returnData.message = 'success'

        let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
            result[key.toLowerCase()] = val;
        });
        return res.status(200).json(returnDatalowerCase)

    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

async function MPLS_create_image_attach_file(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        // === check quotation id param ===
        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter quotationid`,
                data: []
            })
        }

        // === check image code param === 
        if (reqData.image_code == '' || reqData.image_code == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter image_code`,
                data: []
            })
        }
        // === check image name param === 
        if (reqData.image_name == '' || reqData.image_name == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter image_name`,
                data: []
            })
        }


        // console.log(`file_image : ${JSON.stringify(fileData.image_file)}`)
        const create_image_attach = fileData.image_file ? fileData.image_file : null

        if (create_image_attach == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ paremeter image_file`,
                data: []
            })
        }

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        const createimagebuffer = create_image_attach ? imagetobuffer(create_image_attach) : null

        if (!createimagebuffer) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถแปลงข้อมูลไฟล์แนบได้ (fail to convert to buffer)`,
                data: []
            })
        }

        const filetype = create_image_attach[0].headers['content-type']
        const readfileimage = fs.readFileSync(create_image_attach[0].path)

        connection = await oracledb.getConnection(config.database)

        // === check quotation is already exist ===
        const quocheck = await connection.execute(`
                SELECT QUO_KEY_APP_ID FROM MPLS_QUOTATION
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, { QUO_KEY_APP_ID: reqData.quotationid }, { outFormat: oracledb.OBJECT })

        if (quocheck.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการ quotation ได้ (rows : ${quocheck.rows.length})`
            })
        }

        // === check image file is already exist (should not) ===

        const imagefile = await connection.execute(`
                SELECT * FROM MPLS_IMAGE_FILE
                WHERE IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
                AND IMAGE_CODE = :IMAGE_CODE
        `, {
            IMGF_QUO_APP_KEY_ID: reqData.quotationid,
            IMAGE_CODE: reqData.image_code
        }, { outFormat: oracledb.OBJECT })

        // === check file is exist === 

        if (imagefile.rows.length !== 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถสร้างรายการไฟล์แนบประเภทนี้ได้ เนื่องจากมีการ upload ไปแล้ว`,
                data: []
            })
        }

        // === create image attach file === 
        const imageuuid = uuidv4()

        const createimage = await connection.execute(`
            INSERT INTO MPLS_IMAGE_FILE (
                    IMGF_QUO_APP_KEY_ID, 
                    APP_KEY_ID, 
                    IMAGE_FILE, 
                    IMAGE_NAME, 
                    IMAGE_TYPE,
                    IMAGE_CODE, 
                    STATUS, 
                    ACTIVE_STATUS
                )
                VALUES 
                (
                    :IMGF_QUO_APP_KEY_ID,
                    :APP_KEY_ID, 
                    :IMAGE_FILE, 
                    :IMAGE_NAME, 
                    :IMAGE_TYPE, 
                    :IMAGE_CODE, 
                    0, 
                    'Y'
                )
        `, {
            IMGF_QUO_APP_KEY_ID: { val: reqData.quotationid, type: oracledb.STRING, maxSize: 50 },
            APP_KEY_ID: { val: imageuuid, type: oracledb.STRING, maxSize: 50 },
            IMAGE_FILE: { val: readfileimage, type: oracledb.BLOB, maxSize: 5000000 },
            IMAGE_NAME: { val: reqData.image_name, type: oracledb.STRING, maxSize: 200 },
            IMAGE_TYPE: { val: filetype, type: oracledb.STRING, maxSize: 200 },
            IMAGE_CODE: { val: reqData.image_code, type: oracledb.STRING, maxSize: 4 },
        })

        // === CHECK RESULT UPDATE ===

        if (createimage.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถสร้างรายการไฟล์แนบได้ (rows : ${updateimage.rowsAffected})`,
                data: []
            })
        } else {
            // === update success ===
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.send(200).send({
                    status: 500,
                    message: `Error : ${e.message ? e.message : 'No message'}`,
                })
            }

            // === finish ===

            return res.status(200).send({
                status: 200,
                message: `แนบเอกสารประกอบการขอสินเชื่อสำเร็จ`
            })
        }



    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

async function MPLS_update_image_attach_file(req, res, next) {
    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        // === check quotation id param ===
        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter quotationid`,
                data: []
            })
        }

        // === check image file param === 
        if (reqData.image_code == '' || reqData.image_code == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter image_code`,
                data: []
            })
        }


        const update_image_attach = fileData.image_file ? fileData.image_file : null

        if (update_image_attach == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ paremeter image_file`,
                data: []
            })
        }

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        const updateimagebuffer = update_image_attach ? imagetobuffer(update_image_attach) : null

        if (!updateimagebuffer) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถแปลงข้อมูลไฟล์แนบได้ (fail to convert to buffer)`,
                data: []
            })
        }

        const filetype = update_image_attach[0].headers['content-type']
        const readfileimage = fs.readFileSync(update_image_attach[0].path)

        connection = await oracledb.getConnection(config.database)


        // === check quotation is already exist ===
        const quocheck = await connection.execute(`
                SELECT QUO_KEY_APP_ID , QUO_STATUS FROM MPLS_QUOTATION
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, { QUO_KEY_APP_ID: reqData.quotationid }, { outFormat: oracledb.OBJECT })

        if (quocheck.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการ quotation ได้ (rows : ${quocheck.rows.length})`
            })
        }

        // === check quo_status === (if MPLS_QUOTATION.QUO_STATUS = 1 : can't update record)
        if (quocheck.rows[0].QUO_STATUS == 1) {
            return res.status(200).send({
                status: false,
                message: `สถานะใบคำขออยู่ในขั้นพิจารณา ไม่สามารถแก้ไขข้อมูลได้`,
                data: []
            })
        }

        // === get file attach ===

        const imagefile = await connection.execute(`
                SELECT * FROM MPLS_IMAGE_FILE
                WHERE IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID 
                AND IMAGE_CODE = :IMAGE_CODE
        `, {
            IMGF_QUO_APP_KEY_ID: reqData.quotationid,
            IMAGE_CODE: reqData.image_code
        }, { outFormat: oracledb.OBJECT })

        // === check file is exist === 

        if (imagefile.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการไฟล์แนบตาม image_code , quotationid`,
                data: []
            })
        }

        // === update image attach file === 

        const updateimage = await connection.execute(`
                UPDATE MPLS_IMAGE_FILE
                SET IMAGE_FILE = :IMAGE_FILE,
                    IMAGE_TYPE = :IMAGE_TYPE,
                    ACTIVE_STATUS = 'Y'
                WHERE IMAGE_CODE = :IMAGE_CODE
                AND IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
        `, {
            IMAGE_FILE: { val: readfileimage, type: oracledb.BLOB, maxSize: 5000000 },
            IMAGE_TYPE: { val: filetype, type: oracledb.STRING, maxSize: 200 },
            IMAGE_CODE: { val: reqData.image_code, type: oracledb.STRING, maxSize: 4 },
            IMGF_QUO_APP_KEY_ID: { val: reqData.quotationid, type: oracledb.STRING, maxSize: 50 }
        })

        // === CHECK RESULT UPDATE ===

        if (updateimage.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถอัพเดทรายการไฟล์แนบได้ (rows : ${updateimage.rowsAffected})`,
                data: []
            })
        } else {
            // === update success ===
            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.send(200).send({
                    status: 500,
                    message: `Error : ${e.message ? e.message : 'No message'}`,
                })
            }

            // === finish ===

            return res.status(200).send({
                status: 200,
                message: `อัพเดทรายการไฟล์แนบสำเร็จ`
            })
        }



    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

async function MPLS_delete_image_attach_file(req, res, next) {
    let connection;
    try {

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

        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ quotation ตามเลข ID`,
                data: []
            })
        }

        // === check image code parameter ===

        if (reqData.image_code == '' || reqData.image_code == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter image_code`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        // === check quotation is already exist ===
        const quocheck = await connection.execute(`
                SELECT QUO_KEY_APP_ID, QUO_STATUS FROM MPLS_QUOTATION
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, { QUO_KEY_APP_ID: reqData.quotationid }, { outFormat: oracledb.OBJECT })

        if (quocheck.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการ quotation ได้ (rows : ${quocheck.rows.length})`
            })
        }

        // === CHECK QUOTATION STATUS (QUO_STATUS = '1') CAN NOT DELETE IMAGE

        const quo_status = quocheck.rows[0].QUO_STATUS
        if (quo_status == 1 || quo_status == 3) {
            return res.status(200).send({
                status: 500,
                message: `เงื่อนไขรายการไม่สามารถลบไฟล์แนบได้ : สถาะนะ : ${quo_status == 1 ? 'ส่งเคส' : 'ยกเลิก'}`,
                data: []
            })
        }

        // === delete image attach ===

        const deleteimage = await connection.execute(`
            DELETE FROM MPLS_IMAGE_FILE
            WHERE IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
            AND IMAGE_CODE = :IMAGE_CODE
        `, {
            IMGF_QUO_APP_KEY_ID: reqData.quotationid,
            IMAGE_CODE: reqData.image_code
        })


        // === check result === 
        if (deleteimage.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถลบรายการไฟล์แนบตามเงื่อนไขที่เลือกได้ : (rowsAffected : ${deleteimage.rowsAffected})`,
                data: []
            })
        }

        // === commit ===

        // === update success ===
        const commitall = await connection.commit();

        try {
            commitall
        } catch (e) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถยืนยันการลบไฟล์แนบได้ Error : ${e.message ? e.meesasge : 'No return message'}`,
                data: []
            })
        }

        // === finish ===

        return res.status(200).send({
            status: 200,
            message: `ลบรายการไฟล์แนบสำเร็จ`
        })


    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

async function MPLS_update_flag_image_attach_file(req, res, next) {
    let connection;
    try {

        const reqData = req.query

        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ quotation ตามเลข ID`,
                data: []
            })
        }


        connection = await oracledb.getConnection(config.database)

        // === check quotation is already exist ===
        const quocheck = await connection.execute(`
                SELECT QUO_KEY_APP_ID, QUO_STATUS FROM MPLS_QUOTATION
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, { QUO_KEY_APP_ID: reqData.quotationid }, { outFormat: oracledb.OBJECT })

        if (quocheck.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการ quotation ได้ (rows : ${quocheck.rows.length})`
            })
        }

        // === check image type for verify ('01', '03', '09', '10') ===

        const checkvalidimagetype = await connection.execute(`
            SELECT IMAGE_CODE FROM MPLS_IMAGE_FILE
            WHERE IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
        `, {
            IMGF_QUO_APP_KEY_ID: reqData.quotationid
        }, { outFormat: oracledb.OBJECT })

        if (checkvalidimagetype.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการไฟล์แนบ`,
                data: []
            })
        }

        // === check image type contain all require ===
        const countvalidtype = checkvalidimagetype.rows.filter((item) => { return (item.IMAGE_CODE == '01' || item.IMAGE_CODE == '03' || item.IMAGE_CODE == '09' || item.IMAGE_CODE == '10') })


        const flagvalue = countvalidtype.length < 4 ? '' : 'Y';

        // === update flag to quotation (QUO_IMAGE_ATTACH_VERIFY) ===
        const updateflag = await connection.execute(`
            UPDATE MPLS_QUOTATION
            SET QUO_IMAGE_ATTACH_VERIFY = :QUO_IMAGE_ATTACH_VERIFY 
            WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, {
            QUO_IMAGE_ATTACH_VERIFY: flagvalue,
            QUO_KEY_APP_ID: reqData.quotationid
        })

        if (updateflag.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการไฟล์แนบได้ (update) , rowsAffected : ${updateflag.rowsAffected}`,
                data: []
            })
        }

        // === commit ===

        // === update success ===
        const commitall = await connection.commit();
        try {
            commitall
        } catch (e) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถอัพเดท FLAG vertify ได้ Error : ${e.message ? e.meesasge : 'No return message'}`,
                data: []
            })
        }

        // === finish ===

        return res.status(200).send({
            status: 200,
            message: `อัพเดทสถานะสำเร็จ (Status : ${flagvalue == 'Y' ? 'ไฟล์แนบครบ' : 'ไฟล์แนบยังไม่ครบ'})`
        })


    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

async function MPLS_create_consent(req, res, next) {
    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin
    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        const signature_image = fileData.signature_image ? fileData.signature_image : null
        const witness_image = fileData.witness_image ? fileData.witness_image : null

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        const signatureBuffer = signature_image ? imagetobuffer(signature_image) : null
        const witnessBuffer = witness_image ? imagetobuffer(witness_image) : null



        const reqData = JSON.parse(formData.item)

        connection = await oracledb.getConnection(config.database)

        // === check parameter quotationid === 
        if (reqData.quotationid == '' || reqData.quotationid == null) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบ parameter quotationid`,
                data: []
            })
        }

        // === check quotation is already exist ===
        const chkquotation = await connection.execute(`
            SELECT QUO_KEY_APP_ID FROM MPLS_QUOTATION
            WHERE QUO_KEY_APP_ID = :QUOTATIONID
        `, {
            QUOTATIONID: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (chkquotation.rows.length != 1) {
            return res.status(200).send({
                status: false,
                message: `เลข QUOTATION ID ไม่สามารถระบุใบคำขอได้`
            })
        }

        // === check consent is not already exist ===
        const checkexistconsent = await connection.execute(`
            SELECT * FROM MPLS_CONSENT 
            WHERE CONS_QUO_KEY_APP_ID = :CONS_QUO_KEY_APP_ID
        `, {
            CONS_QUO_KEY_APP_ID: reqData.quotationid
        }, { outFormat: oracledb.OBJECT })

        if (checkexistconsent.rows.length !== 0) {
            return res.status(200).send({
                status: 500,
                message: `มีการทำรายการสร้าง Consent ไปแล้ว`,
                data: []
            })
        }

        // === create MPLS_CONSENT ===
        const consentuuid = uuidv4()
        let create_consent;
        try {
            create_consent = await connection.execute(`
            INSERT INTO MPLS_CONSENT (
                CONS_QUO_KEY_APP_ID, APP_KEY_ID, 
                CUSTOMER_NAME, FRIST_NAME, LAST_NAME, 
                IS_CREDIT_CONSENT,
                IDENTITY_APPROVE_CONSENT_VALUE, 
                MOTOR_INSURANCE_CONSENT_VALUE, 
                NMOTOR_INSURANCE_CONSENT_VALUE, 
                ANALYZE_CONSENT_VALUE, INFO_CONSENT_VALUE, 
                INFO_PARTY_CONSENT_VALUE, ANALYZE_PARTY_CONSENT_VALUE, 
                PRDT_INFO_PARTY_CONSENT_VALUE, 
                FOLLOWUP_CONSENT_VALUE, INFO_DEVELOP_CONSENT_VALUE, 
                E_PAPER_CONSENT_VALUE, 
                SIGNATURE_IMAGE, 
                WITNESS_IMAGE 
              ) 
              VALUES 
                (
                  :CONS_QUO_KEY_APP_ID, :APP_KEY_ID, 
                  :CUSTOMER_NAME, :FRIST_NAME, :LAST_NAME, 
                  :IS_CREDIT_CONSENT, 
                :IDENTITY_APPROVE_CONSENT_VALUE, 
                  :MOTOR_INSURANCE_CONSENT_VALUE, 
                  :NMOTOR_INSURANCE_CONSENT_VALUE, 
                  :ANALYZE_CONSENT_VALUE, :INFO_CONSENT_VALUE, 
                  :INFO_PARTY_CONSENT_VALUE, :ANALYZE_PARTY_CONSENT_VALUE, 
                  :PRDT_INFO_PARTY_CONSENT_VALUE, 
                  :FOLLOWUP_CONSENT_VALUE, :INFO_DEVELOP_CONSENT_VALUE, 
                  :E_PAPER_CONSENT_VALUE,
                  :SIGNATURE_IMAGE, 
                  :WITNESS_IMAGE 
                )
        `, {
                CONS_QUO_KEY_APP_ID: reqData.quotationid,
                APP_KEY_ID: consentuuid,
                CUSTOMER_NAME: reqData.consent_customer_name,
                FRIST_NAME: reqData.consent_first_name,
                LAST_NAME: reqData.consent_last_name,
                IS_CREDIT_CONSENT: reqData.is_credit_consent,
                IDENTITY_APPROVE_CONSENT_VALUE: reqData.identity_approve_consent_value,
                MOTOR_INSURANCE_CONSENT_VALUE: reqData.motor_insurance_consent_value,
                NMOTOR_INSURANCE_CONSENT_VALUE: reqData.nmotor_insurance_consent_value,
                ANALYZE_CONSENT_VALUE: reqData.analyze_consent_value,
                INFO_CONSENT_VALUE: reqData.info_consent_value,
                INFO_PARTY_CONSENT_VALUE: reqData.info_party_consent_value,
                ANALYZE_PARTY_CONSENT_VALUE: reqData.analyze_party_consent_value,
                PRDT_INFO_PARTY_CONSENT_VALUE: reqData.prdt_info_party_consent_value,
                FOLLOWUP_CONSENT_VALUE: reqData.followup_consent_value,
                INFO_DEVELOP_CONSENT_VALUE: reqData.info_develop_consent_value,
                E_PAPER_CONSENT_VALUE: reqData.e_paper_consent_value,
                SIGNATURE_IMAGE: signatureBuffer,
                WITNESS_IMAGE: witnessBuffer,
            }, {
                outFormat: oracledb.OBJECT
            })
        } catch (e) {
            console.log(`Fail create consent : ${e}`)
            return res.status(200).send({
                status: 500,
                message: `ข้อมูลเอกสารสัญญาไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })
        }

        // === update MPLS_QUOTATION (QUO_STATUS = '1') ===
        let update_quotation;
        try {
            update_quotation = await connection.execute(`
                UPDATE MPLS_QUOTATION 
                SET QUO_STATUS = :QUO_STATUS, 
                    QUO_CONSENT_ID = :QUO_CONSENT_ID
                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
        `, {
                QUO_STATUS: 0,
                QUO_CONSENT_ID: consentuuid,
                QUO_KEY_APP_ID: reqData.quotationid

            }, {
                outFormat: oracledb.OBJECT
            })

        } catch (e) {
            console.log(`Fail create consent : ${e}`)
            return res.status(200).send({
                status: 500,
                message: `ข้อมูลเอกสารสัญญาไม่ถูกต้อง : ${e.message ? e.message : `No message`}`
            })
        }

        // === check all update and create success ===

        if (update_quotation.rowsAffected !== 1 && create_consent.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ทำรายการไม่สำเร็จ Update record  : ${update_quotation.rowsAffected} , Create record (consent) : ${create_consent.rowsAffected}`,
                data: []
            })
        }

        // === commit ===

        // === update success ===
        const commitall = await connection.commit();
        try {
            commitall
        } catch (e) {
            return res.status(200).send({
                status: 500,
                message: `Commit data fail : ${e.message ? e.meesasge : 'No return message'}`,
                data: []
            })
        }

        // === finish ===

        return res.status(200).send({
            status: 200,
            message: `ทำรายการสำเร็จ`,
            data: []
        })


        // === End try ===
    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

// **** step 6 (send car deliver and loyalty consent (tab 6)) ****
async function MPLS_create_send_car_deliver_and_loyalty_consent(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin;

    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        const quotationid = formData.quotationid[0]
        const dealername = formData.dealername[0]

        // === new loyalty consent add value (19/08/2022) ===
        const loyaltyformdata = JSON.parse(formData.loyaltyitem)
        let {
            is_check_sale_sheet_explain,
            is_check_product_detail,
            is_check_payment_rule,
            is_check_contract_explain,
            is_check_total_loss_explain,
            is_check_total_loss_company,
            lalon,
            latitude,
            londtiude
        } = loyaltyformdata

        const firstImage = fileData.firstImage ? fileData.firstImage : null
        const dealerSign = fileData.dealerSign ? fileData.dealerSign : null

        // === reject when dealer sign null === 
        if (!dealerSign) {
            return res.status(201).send({
                status: 201,
                message: `Signature image not found`,
                data: []
            })
        }

        imagetobuffer = (file) => {
            return fs.readFileSync(file[0].path);
        }

        var imageData = [];
        const firstImageBuffer = firstImage ? imagetobuffer(firstImage) : null
        const dealerSignBuffer = dealerSign ? imagetobuffer(dealerSign) : null

        createImageInfo = (fileinfo, code) => {
            let image = {}
            const filename = fileinfo[0].fieldName
            const filetype = fileinfo[0].headers['content-type']
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
            imageData.push(image)
        }

        if (firstImageBuffer) await createImageInfo(firstImage, '15');
        if (dealerSignBuffer) await createImageInfo(dealerSign, '14');


        // *** connect oracle database ***

        connection = await oracledb.getConnection(
            config.database
        )

        // === check duplicate reference record ===
        const resultCheckDup = await connection.execute(`
            select (IMGF_QUO_APP_KEY_ID) as items FROM MPLS_IMAGE_FILE
            WHERE IMGF_QUO_APP_KEY_ID = :quotationid
            AND IMAGE_CODE = '15'
        `, {
            quotationid: quotationid
        })

        // === Duplicate Reference deliver image ===
        if (resultCheckDup.rows.length !== 0) {
            return res.status(200).send({
                status: 500,
                message: 'มีการแนบไฟล์ไปเรียบร้อยแล้ว',
                data: []
            })
        }

        // === insert image  (dealersign : [image_code = '14'] , sendcarimage : [iamge_code = '15'] ) ====
        try {

            const sql = `
                INSERT INTO MPLS_IMAGE_FILE (
                IMGF_QUO_APP_KEY_ID, APP_KEY_ID, IMAGE_NAME, IMAGE_TYPE,
                IMAGE_CODE, IMAGE_FILE, STATUS)
                VALUES (:quokeyid, :keyid, :filename, :filetype, 
                    :code, :filedata, :status)
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

            const resultCreateRefAttachDeliver = await connection.executeMany(sql, binds, options)
            console.log(`sussecc create deliver attach record : ${resultCreateRefAttachDeliver.rowsAffected}`)

            // === save loyalty consent value (19/08/2022) ========

            try {

                // === update consent loyalty === 
                let sqlloyalty;
                let bindparamloyalty;
                sqlloyalty = `
                    UPDATE MPLS_CONSENT
                    SET IS_CHECK_SALE_SHEET_EXPLAIN = :IS_CHECK_SALE_SHEET_EXPLAIN,
                        IS_CHECK_PRODUCT_DETAIL = :IS_CHECK_PRODUCT_DETAIL,
                        IS_CHECK_PAYMENT_RULE = :IS_CHECK_PAYMENT_RULE,
                        IS_CHECK_CONTRACT_EXPLAIN = :IS_CHECK_CONTRACT_EXPLAIN,
                        IS_CHECK_TOTAL_LOSS_EXPLAIN = :IS_CHECK_TOTAL_LOSS_EXPLAIN,
                        IS_CHECK_TOTAL_LOSS_COMPANY = :IS_CHECK_TOTAL_LOSS_COMPANY
                    WHERE CONS_QUO_KEY_APP_ID = :quotationid
                    `

                bindparamloyalty = {
                    IS_CHECK_SALE_SHEET_EXPLAIN: is_check_sale_sheet_explain,
                    IS_CHECK_PRODUCT_DETAIL: is_check_product_detail,
                    IS_CHECK_PAYMENT_RULE: is_check_payment_rule,
                    IS_CHECK_CONTRACT_EXPLAIN: is_check_contract_explain,
                    IS_CHECK_TOTAL_LOSS_EXPLAIN: is_check_total_loss_explain,
                    IS_CHECK_TOTAL_LOSS_COMPANY: is_check_total_loss_company,
                    quotationid: quotationid
                }
                const update_loyalty_consent = await connection.execute(sqlloyalty, bindparamloyalty, { outFormat: oracledb.OBJECT })

                console.log(`sussecc update loyalty consent : ${update_loyalty_consent.rowsAffected}`)

            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถอัพเดทข้อมูล loyalty consent ได้`
                })
            }
            // ====================================================

            // === save la lon place value (19/08/2022) ========

            try {

                // === update la lon living place  === 
                let sqllalon;
                let bindparamlalon;
                sqllalon = `
                        UPDATE MPLS_LIVING_PLACE
                            SET LALON = :lalon,
                            LATITUDE = :latitude,
                            LONDTIUDE = :londtiude

                            WHERE LIV_QUO_KEY_APP_ID = :quotationid
                    `

                bindparamlalon = {
                    lalon: lalon,
                    latitude: latitude,
                    londtiude: londtiude,
                    quotationid: quotationid
                }
                const update_lalon_consent = await connection.execute(sqllalon, bindparamlalon, { outFormat: oracledb.OBJECT })

                console.log(`sussecc update lalon consent : ${update_lalon_consent.rowsAffected}`)

            } catch (e) {
                console.error(e)
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถอัพเดทข้อมูล lalon living place ได้`
                })
            }
            // ====================================================

            // === check count of image insert (now 4 infuture should be 5 cause add one more signature image) ====
            // === chage to 2 image atlease (sig image and 1 photo) (02/06/2022) ==== 
            if (resultCreateRefAttachDeliver.rowsAffected >= 2) {
                console.log(`row affect trigger`)
                try {
                    // ==== stamp dealer signature owner to quotation
                    const resultUpdateQuotation = await connection.execute(`
                    UPDATE MPLS_QUOTATION SET DEALER_SIGNATURE_OWNER = :dealername
                    WHERE QUO_KEY_APP_ID = :quotationid
                `, {
                        dealername: dealername,
                        quotationid: quotationid
                    }, {})

                    // === check update quotation dealer signatrue owner success ===
                    if (resultUpdateQuotation.rowsAffected !== 1) {
                        return res.status(200).send({
                            status: 500,
                            message: `ระบบขัดข้อง (can't update quotation signature owner)`,
                            data: []
                        })
                    }

                    // === commit all record if all created record success ====
                    const commitall = await connection.commit();
                    try {
                        commitall
                    } catch {
                        console.err(err.message)
                        res.send(200).send({
                            status: 500,
                            message: `Error during commit data : ${e.message ? e.message : 'No return message'}`,
                            data: []
                        })
                    }

                    console.log(`result Update Quotaion : ${resultUpdateQuotation}`)
                    console.log(`result Update Quotaion : ${JSON.stringify(resultUpdateQuotation)}`)

                    console.log(`commit success`);
                    // == success create deliver approve === 
                    return res.status(200).send({
                        status: 200,
                        messgae: 'success created deliver approve',
                        data: []
                    })


                } catch (e) {
                    console.log(`catch last execute`)
                    return res.status(200).send({
                        status: 500,
                        message: `Fail to add dealer owner to quotation`,
                        data: []
                    })
                }


            } else {
                // ==== missing some image ====
                return res.status(200).send({
                    status: 500,
                    message: 'missing image deliver approve',
                    data: []
                })
            }
        } catch (e) {
            console.log(`Fail to INSERT deliver approve to Database`)
            return res.status(201).send({
                status: 201,
                message: `Fail to INSERT deliver approve to Database : ${e}`,
                data: []
            })
        }




    } catch (e) {
        console.error(e)
        res.status(200).send({
            status: false,
            message: `Error : ${e.message ? e.message : 'No return message'}`
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                // return next(e);
                return res.status(200).send({
                    status: false,
                    message: `Error when close connection : ${e.message ? e.message : 'No return message'}`
                })
            }
        }
    }
}

async function MPLS_getimagetocompareiapp(req, res, next) {

    let connection;
    try {

        const reqData = req.query

        if (!reqData.quotationid) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบเลข quotation`,
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(config.database)

        const resultsimage = await connection.execute(`
                            SELECT quo.CIZCARD_IMAGE AS file1, mif.IMAGE_FILE AS file2, quo.IS_DIPCHIP_CHANNAL 
                            FROM mpls_quotation quo
                            LEFT JOIN (select 
                                        IMGF_QUO_APP_KEY_ID,IMAGE_FILE 
                                        from mpls_image_file
                                        where image_code = '11'
                                        and active_status = 'Y'
                                    ) mif
                            ON quo.quo_key_app_id = mif.IMGF_QUO_APP_KEY_ID
                            WHERE quo.quo_key_app_id = :quotationid
        `, {
            quotationid: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        // === valid data ===

        if (resultsimage.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ quotation ตามเลขที่กำหนด`,
                data: []
            })
        }

        const fileimage = resultsimage.rows[0]


        const b64 = fileimage.FILE1 !== null ? Buffer.from(fileimage.FILE1).toString('base64') : null
        const b64_2 = fileimage.FILE2 !== null ? Buffer.from(fileimage.FILE2).toString('base64') : null
        const isdipchipchannal = fileimage.IS_DIPCHIP_CHANNAL

        return res.status(200).send({
            status: 200,
            message: `success`,
            data: {
                file1: b64,
                file2: b64_2,
                is_dipchip_channal: isdipchipchannal
            }
        })



    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : e ${e.message ? e.message : 'no message'}`,
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

async function MPLS_getimagetocompareiapp_unlock(req, res, next) {

    let connection;
    try {

        const reqData = req.query

        if (!reqData.quotationid) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบเลข quotation`,
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(config.database)

        const resultsimage = await connection.execute(`
                            SELECT quo.CIZCARD_IMAGE AS file1, mif.IMAGE_FILE AS file2, quo.IS_DIPCHIP_CHANNAL 
                            FROM mpls_quotation quo
                            LEFT JOIN (select 
                                        IMGF_QUO_APP_KEY_ID,IMAGE_FILE 
                                        from mpls_image_file
                                        where image_code = '11'
                                        and active_status = 'Y'
                                    ) mif
                            ON quo.quo_key_app_id = mif.IMGF_QUO_APP_KEY_ID
                            WHERE quo.quo_key_app_id = :quotationid
        `, {
            quotationid: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        // === valid data ===

        if (resultsimage.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ quotation ตามเลขที่กำหนด`,
                data: []
            })
        }

        const fileimage = resultsimage.rows[0]


        const b64 = fileimage.FILE1 !== null ? Buffer.from(fileimage.FILE1).toString('base64') : null
        const b64_2 = fileimage.FILE2 !== null ? Buffer.from(fileimage.FILE2).toString('base64') : null
        const isdipchipchannal = fileimage.IS_DIPCHIP_CHANNAL

        return res.status(200).send({
            status: 200,
            message: `success`,
            data: {
                file1: b64,
                file2: b64_2,
                is_dipchip_channal: isdipchipchannal
            }
        })



    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : e ${e.message ? e.message : 'no message'}`,
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

async function MPLS_getimagetocompareiappbuffer(req, res, next) {

    let connection;
    try {

        const reqData = req.query

        if (!quotationid) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบเลข quotation`,
                data: []
            })
        }

        oracledb.fetchAsBuffer = [oracledb.BLOB];
        connection = await oracledb.getConnection(config.database)

        const resultsimage = await connection.execute(`
            select quo.CIZCARD_IMAGE as file1 , mif.IMAGE_FILE as file2
            from mpls_quotation quo
            left join mpls_image_file mif
            on quo.quo_key_app_id  = mif.IMGF_QUO_APP_KEY_ID
            where quo.quo_key_app_id = :quotationid
            and mif.image_code = '03'
            and mif.active_status = 'Y'
        `, {
            quotationid: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        // === valid data ===

        if (resultsimage.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการ quotation ตามเลขที่กำหนด`,
                data: []
            })
        }

        const fileimage = resultsimage.rows[0]


        // === check valid fileimage ===
        if (!(fileimage.FILE1 !== null && fileimage.FILE2 !== null)) {
            return res.status(200).send({
                status: 500,
                message: `รูปภาพไม่ครบ`,
                data: []
            })
        }


        return res.status(200).send({
            status: 200,
            message: `success`,
            data: {
                file1: fileimage.FILE1,
                file2: fileimage.FILE2
            }
        })



    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : e ${e.message ? e.message : 'no message'}`,
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

async function MPLS_upload_customer_face(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        connection = await oracledb.getConnection(config.database)


        if (reqData.quotationid == null || reqData.quotationid == '') {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบเลข quotationid ที่ส่งมา`,
                data: []
            })
        }

        // const citizenface_image = fileData.citizen_image ? fileData.citizen_image : null
        // const customerface_image = fileData.customer_image ? fileData.customer_image : null

        // imagetobuffer = (file) => {
        //     return fs.readFileSync(file[0].path);
        // }

        // const citizenfaceBuffer = citizenface_image ? imagetobuffer(citizenface_image) : null
        // const customerfaceBuffer = customerface_image ? imagetobuffer(customerface_image) : null

        // === check image recent contain ===
        let cizcard_null = [];
        let cizcard_array;
        let cizcard_image_blob;
        if (reqData.cizcardImage) {
            cizcard_image_blob = reqData.cizcardImage ? cizcard_array = Buffer.from(reqData.cizcardImage, "base64") : cizcard_null
        }

        // console.log(`cizcard_image_blob : ${cizcard_image_blob}`)

        let customer_null = []
        let customer_array;
        let customer_image_blob;
        if (reqData.customerImage) {
            customer_image_blob = reqData.customerImage ? customer_array = Buffer.from(reqData.customerImage, "base64") : customer_null
        }
        // console.log(`customer_image_blob : ${customer_image_blob}`)

        console.log(`quotationid : ${reqData.quotationid}`)


        const checkimage = await connection.execute(`
        SELECT quo.CIZCARD_IMAGE AS FILE1, mif.IMAGE_FILE AS FILE2
        FROM mpls_quotation quo
        LEFT JOIN (select 
                    IMGF_QUO_APP_KEY_ID,IMAGE_FILE 
                    from mpls_image_file
                    where image_code = '11'
                    and active_status = 'Y'
                ) mif
        ON quo.quo_key_app_id = mif.IMGF_QUO_APP_KEY_ID
        WHERE quo.quo_key_app_id = :quotationid
        `, {
            quotationid: reqData.quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        // === check record is already exits ===
        if (checkimage.rows.length !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถระบุรายการ quotation ตามเลข quotationid ได้`
            })
        } else {
            // === manage stage create update customer face === (include citizen_image too ) 
            const image1 = checkimage.rows[0].FILE1
            const image2 = checkimage.rows[0].FILE2

            // let checkimage1success;
            // let checkimage2success;

            if (image1) {

                if (image2) {
                    // === update CUSTOMER ONLY === (IMAGE2)
                    console.log(`se1`)
                    const updateimage2result = await connection.execute(`
                                UPDATE MPLS_IMAGE_FILE
                                SET IMAGE_FILE = :IMAGE_FILE
                                WHERE IMAGE_CODE = '11' AND
                                IMGF_QUO_APP_KEY_ID = :IMGF_QUO_APP_KEY_ID
                        `, {
                        IMAGE_FILE: customer_image_blob,
                        IMGF_QUO_APP_KEY_ID: reqData.quotationid
                    })

                    if (updateimage2result.rowsAffected !== 1) {
                        return res.status(200).send({
                            status: 500,
                            message: `ไม่สามารถอัพเดทรายการรูปภาพ customer face image ได้`,
                            data: []
                        })
                    } else {

                        const commitall = await connection.commit();

                        try {
                            commitall
                        } catch (e) {
                            return res.status(200).send({
                                status: 500,
                                message: `Fail during commmit data : ${e.message ? e.message : `No return message`}`
                            })
                        }
                        // === success ===
                        return res.status(200).send({
                            status: 200,
                            message: `success`,
                            data: []
                        })
                    }

                } else {
                    console.log('se2')
                    // === CREATE CITIZEN ONLY === (IMAGE2)
                    const imagekeyid = uuidv4();
                    const createimage2result = await connection.execute(`
                                INSERT INTO MPLS_IMAGE_FILE 
                                (
                                    ACTIVE_STATUS,
                                    IMAGE_CODE,
                                    IMAGE_FILE,
                                    IMAGE_TYPE,
                                    IMAGE_NAME,
                                    IMGF_QUO_APP_KEY_ID,
                                    APP_KEY_ID
                                )
                            VALUES 
                                (
                                    :ACTIVE_STATUS,
                                    :IMAGE_CODE, 
                                    :IMAGE_FILE,
                                    :IMAGE_TYPE, 
                                    :IMAGE_NAME,
                                    :IMGF_QUO_APP_KEY_ID,
                                    :APP_KEY_ID
                                )
                    `, {

                        ACTIVE_STATUS: 'Y',
                        IMAGE_CODE: '11',
                        IMAGE_FILE: customer_image_blob,
                        IMAGE_TYPE: `image/jpeg`,
                        IMAGE_NAME: `facecompare_image`,
                        IMGF_QUO_APP_KEY_ID: reqData.quotationid,
                        APP_KEY_ID: imagekeyid
                    })

                    if (createimage2result.rowsAffected !== 1) {
                        return res.status(200).send({
                            status: 500,
                            message: `ไม่สามารถสร้างรายการรูปภาพ customer face image ได้`,
                            data: []
                        })
                    } else {
                        // === success ===
                        const commitall = await connection.commit();

                        try {
                            commitall
                        } catch (e) {
                            return res.status(200).send({
                                status: 500,
                                message: `Fail during commmit data : ${e.message ? e.message : `No return message`}`
                            })
                        }
                        return res.status(200).send({
                            status: 200,
                            message: `success`,
                            data: []
                        })
                    }
                }
            } else {
                if (image2) {
                    console.log(`se3 (no)`)
                    // *** ไม่สามาเป็นไปได้ ***
                    return res.status(200).send({
                        status: 500,
                        message: `ไม่สามารถอัพเดทรายการได้เนื้องจากเงื่อนไข quotation ไม่ถูกต้อง`,
                        data: []
                    })
                } else {
                    console.log(`se4`)
                    // === create all === (IMAGE1, IMAGE2)
                    const createimage1result = await connection.execute(`
                                UPDATE MPLS_QUOTATION
                                SET CIZCARD_IMAGE = :CIZCARD_IMAGE
                                WHERE QUO_KEY_APP_ID = :QUO_KEY_APP_ID
                        `, {
                        CIZCARD_IMAGE: cizcard_image_blob,
                        QUO_KEY_APP_ID: reqData.quotationid
                    })

                    const imagekeyid = uuidv4();

                    const createimage2result = await connection.execute(`
                                INSERT INTO MPLS_IMAGE_FILE 
                                    (
                                        ACTIVE_STATUS,
                                        IMAGE_CODE,
                                        IMAGE_FILE,
                                        IMAGE_TYPE,
                                        IMAGE_NAME,
                                        IMGF_QUO_APP_KEY_ID,
                                        APP_KEY_ID
                                    )
                                VALUES 
                                    (
                                        :ACTIVE_STATUS,
                                        :IMAGE_CODE, 
                                        :IMAGE_FILE,
                                        :IMAGE_TYPE, 
                                        :IMAGE_NAME,
                                        :IMGF_QUO_APP_KEY_ID,
                                        :APP_KEY_ID
                                    )
                        `, {

                        ACTIVE_STATUS: 'Y',
                        IMAGE_CODE: '03',
                        IMAGE_FILE: customer_image_blob,
                        IMAGE_TYPE: `image/jpeg`,
                        IMAGE_NAME: `face_image`,
                        IMGF_QUO_APP_KEY_ID: reqData.quotationid,
                        APP_KEY_ID: imagekeyid
                    })

                    // === CHECK CREATE SUCCESS ALL ===
                    if (!(createimage1result.rowsAffected == 1 && createimage2result.rowsAffected == 1)) {
                        return res.status(200).send({
                            status: 500,
                            message: `สร้างรายการไม่สำเร็จ : image1 : ${createimage1result.rowsAffected}, image 2 : ${createimage2result.rowsAffected}`,
                            data: []
                        })
                    } else {

                        const commitall = await connection.commit();

                        try {
                            commitall
                        } catch (e) {
                            return res.status(200).send({
                                status: 500,
                                message: `Fail during commmit data : ${e.message ? e.message : `No return message`}`
                            })
                        }

                        return res.status(200).send({
                            status: 200,
                            message: `success`,
                            data: []
                        })
                    }
                }
            }
        }


    } catch (e) {
        console.error(e)
        return res.status(200).send({
            status: 500,
            message: `Fail to upload customer face : ${e.message ? e.message : 'No message return'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail during close oracledb : ${e.message ? e.message : 'No message return'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_is_check_face_valid(req, res, next) {

    let connection;
    try {

        const reqData = req.query

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SELECT * FROM MPLS_FACE_COMPARE
            WHERE FC_QUO_KEY_APP_ID = :QUOTATIONID
        `
            , {
                QUOTATIONID: reqData.quotationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    isvalid: false
                }
            })
        } else {

            const isdipchip = result.rows[0].IS_DIPCHIP == 'Y' ? true : false
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    isvalid: true,
                    isdipchip: isdipchip,
                    reason: result.rows[0].REASON,
                    status: result.rows[0].STATUS
                }
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail during close connection (oracledb) : ${e.message ? e.message : 'No return message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_is_check_face_valid_unlock(req, res, next) {

    let connection;
    try {

        const reqData = req.query

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SELECT * FROM MPLS_FACE_COMPARE
            WHERE FC_QUO_KEY_APP_ID = :QUOTATIONID
        `
            , {
                QUOTATIONID: reqData.quotationid
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    isvalid: false
                }
            })
        } else {

            const isdipchip = result.rows[0].IS_DIPCHIP == 'Y' ? true : false
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    isvalid: true,
                    isdipchip: isdipchip,
                    reason: result.rows[0].REASON,
                    status: result.rows[0].STATUS
                }
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail during close connection (oracledb) : ${e.message ? e.message : 'No return message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_stamp_check_face_valid(req, res, next) {

    let connection;
    const token = req.user
    const userid = token.ID
    // const username = token.username
    const radmin = token.radmin

    try {

        // === check permission ===
        if (radmin == 'Y') {
            return res.status(403).send({
                status: 403,
                message: `Forbidden`,
                data: []
            })
        }

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

        const reqData = JSON.parse(formData.items)

        if (reqData.is_dipchip == 'Y') {
            if (!(reqData.quotationid && reqData.result)) {
                return res.status(200).send({
                    status: 500,
                    message: `parameter ไม่ครบ`,
                    data: []
                })
            }
        }

        const facekeyid = uuidv4()

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            INSERT INTO MPLS_FACE_COMPARE 
                    (
                    FC_QUO_KEY_APP_ID, APP_KEY_ID, REASON, STATUS, IS_DIPCHIP
                    )
                    VALUES 
                    (
                    :FC_QUO_KEY_APP_ID, :APP_KEY_ID, :REASON, :STATUS, :IS_DIPCHIP
                    )
        `
            , {
                FC_QUO_KEY_APP_ID: reqData.quotationid,
                APP_KEY_ID: facekeyid,
                REASON: reqData.reason,
                STATUS: reqData.result,
                IS_DIPCHIP: reqData.is_dipchip
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `ไม่สามารถบันทึกรายการยืนยันหน้าบุคคลได้`,
                data: []
            })
        } else {

            // === update MPLS_QUOTATION (QUO_FACE_COMPARE_VERIFY) ===

            const updatequoresult = await connection.execute(`
                    UPDATE MPLS_QUOTATION
                    SET QUO_FACE_COMPARE_VERIFY = :QUO_FACE_COMPARE_VERIFY
                    WHERE QUO_KEY_APP_ID = :QUOTATIONID
            `, {
                QUO_FACE_COMPARE_VERIFY: reqData.result ? reqData.result : 'N',
                QUOTATIONID: reqData.quotationid
            })

            if (updatequoresult.rowsAffected !== 1) {
                return res.status(200).send({
                    status: 500,
                    message: `ไม่สามารถบันทึกรายการยืนยันหน้าบุคคลได้ (update flag to MPLS_QUOTATION)`,
                    data: []
                })
            } else {
                // === success create face compare log and update MPLS_QUOTATION ===

                const commitall = await connection.commit();

                try {
                    commitall
                } catch (e) {
                    console.err(e.message)
                    res.send(500).send(e.message)
                }


                return res.status(200).send({
                    status: 200,
                    message: `สร้างรายการยืนยันหน้าบุคคลสำเร็จ`,
                    data: {
                        isvalid: reqData.status
                    }
                })
            }


        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 500,
                    message: `Fail during close connection (oracledb) : ${e.message ? e.message : 'No return message'}`,
                    data: []
                })
            }
        }
    }
}

async function MPLS_get_dopa_valid_status(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                select DISTINCT checkcardstatus_id as status_code from  dopa_checkcardstatus_p
                where ECONSENT_STATUS = 'Y'
                order by checkcardstatus_id asc
`
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        const statusCodes = (result.rows).map((object) => object.STATUS_CODE);
        const statusCodesstrings = statusCodes.map((number) => number.toString());


        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No dopa valid status',
                data: []
            })
        } else {
            const resData = result.rows
            // const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    status_code: statusCodesstrings
                }
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_get_dopa_valid_status_unlock(req, res, next) {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
                select DISTINCT checkcardstatus_id as status_code from  dopa_checkcardstatus_p
                where ECONSENT_STATUS = 'Y'
                order by checkcardstatus_id asc
`
            , {

            }, {
            outFormat: oracledb.OBJECT
        })

        const statusCodes = (result.rows).map((object) => object.STATUS_CODE);
        const statusCodesstrings = statusCodes.map((number) => number.toString());


        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 500,
                message: 'No dopa valid status',
                data: []
            })
        } else {
            const resData = result.rows
            // const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: {
                    status_code: statusCodesstrings
                }
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
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

async function MPLS_canclequotation(req, res, next) {

    let connection;

    try {
        const quotationid = req.params.quotationid
        const token = req.user
        const userid = token.username

        connection = await oracledb.getConnection(config.database)

        if (!quotationid) {
            return res.status(200).send({
                status: 500,
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
            const quoitem = resultQuo.rows[0]

            if (quoitem.APPLICATION_NUM && quoitem.QUO_STATUS == 1) {
                // logger.error("")
                return res.status(200).send({
                    status: 500,
                    message: `ใบคำขอได้ถูกสร้างในระบบ ORACLE แล้ว ไม่สามารถยกเลิกได้`,
                    data: []
                })
            } else {
                // === valid pass ===

                // ==== update status to quotation for cancle quotation ====
                // === ORACLE cancle (only case contain application_id (e-consent)) add-on (13/02/2023) ===

                if (quoitem.application_no !== '' || quoitem.application_no !== null) {

                    // === call function from oracle here ====
                    const updateOracleStatus = await connection.execute(`
                    DECLARE
                        status VARCHAR(1);
    
                        BEGIN
                        :status := BTW.FUNC_CANCELAPP_BY_TABLET (:quotaitonid , 'ยกเลิกจากฝั่งTablet' , :userid );
    
                        END;
                    `, {
                        quotaitonid: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: quotationid },
                        userid: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: userid },
                        status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }

                    })

                    if (updateOracleStatus.outBinds.status == 'Y') {
                        // === update flag (mpls_quotation) when update function on oracle success ===
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
                            // console.log(`update quotation status (cancle) success : ${resultUpdatequotation.rowsAffected}`)
                            return res.status(200).send({
                                status: 200,
                                message: `ยกเลิกเคสสำเร็จ`,
                                data: []
                            })
                        } else {
                            return res.status(200).send({
                                status: 500,
                                message: `อัพเดทสถานะใบคำขอไม่สำเร็จ (MPLS_QUOTATION)`
                            })
                        }
                    } else if (updateOracleStatus.outBinds.status == 'N') {
                        return res.status(200).send({
                            status: 500,
                            message: `ยกเลิกใบคำขอไม่สำเร็จ (update FUNC_CANCLEAPP_BY_TABLET return 'N')`,
                            data: []
                        })
                    } else {
                        return res.status(200).send({
                            status: 500,
                            message: `ยกเลิกใบคำขอไม่สำเร็จ (status return : ${updateOracleStatus.outBinds.status ? updateOracleStatus.outBinds.status : 'No status return'}`,
                            data: []
                        })
                    }
                } else {
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
                        // console.log(`update quotation status (cancle) success : ${resultUpdatequotation.rowsAffected}`)
                        return res.status(200).send({
                            status: 200,
                            message: `ยกเลิกเคสสำเร็จ`,
                            data: []
                        })
                    } else {
                        return res.status(200).send({
                            status: 500,
                            message: `อัพเดทสถานะใบคำขอไม่สำเร็จ (MPLS_QUOTATION)`
                        })
                    }
                }
            }

        } else {
            return res.status(200).send({
                status: 500,
                message: `ไม่พบรายการใบคำขอนี้ ยกเลิกไม่ได้`
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

module.exports.MPLS_dipchip = MPLS_dipchip
module.exports.MPLS_dipchipnoneconsent = MPLS_dipchipnoneconsent
module.exports.MPLS_create_or_update_citizendata = MPLS_create_or_update_citizendata
module.exports.MPLS_cancle_quotation = MPLS_cancle_quotation

module.exports.MPLS_check_phonevalid = MPLS_check_phonevalid
module.exports.MPLS_create_otp_phoneno = MPLS_create_otp_phoneno
module.exports.MPLS_validation_otp_phonenumber = MPLS_validation_otp_phonenumber

module.exports.MPLS_check_econsent = MPLS_check_econsent
module.exports.MPLS_get_witness_econsent = MPLS_get_witness_econsent
module.exports.MPLS_create_otp_econsent = MPLS_create_otp_econsent
module.exports.MPLS_validation_otp_econsent = MPLS_validation_otp_econsent
module.exports.MPLS_validation_otp_econsent_non = MPLS_validation_otp_econsent_non
module.exports.MPLS_update_phone_number = MPLS_update_phone_number

module.exports.MPLS_check_application_no = MPLS_check_application_no
module.exports.MPLS_gen_application_no = MPLS_gen_application_no

module.exports.MPLS_getservertime = MPLS_getservertime

module.exports.MPLS_create_or_update_credit = MPLS_create_or_update_credit
module.exports.MPLS_create_or_update_careerandpurpose = MPLS_create_or_update_careerandpurpose
module.exports.MPLS_getimagefilebyid = MPLS_getimagefilebyid
module.exports.MPLS_create_image_attach_file = MPLS_create_image_attach_file
module.exports.MPLS_update_image_attach_file = MPLS_update_image_attach_file
module.exports.MPLS_delete_image_attach_file = MPLS_delete_image_attach_file
module.exports.MPLS_update_flag_image_attach_file = MPLS_update_flag_image_attach_file
module.exports.MPLS_create_consent = MPLS_create_consent
module.exports.MPLS_create_send_car_deliver_and_loyalty_consent = MPLS_create_send_car_deliver_and_loyalty_consent


module.exports.MPLS_get_refid = MPLS_get_refid // === USE _mplsUtil.internal_MPLS_get_refid instead ===


// === face comparison ===
module.exports.MPLS_getimagetocompareiapp = MPLS_getimagetocompareiapp
module.exports.MPLS_getimagetocompareiapp_unlock = MPLS_getimagetocompareiapp_unlock
module.exports.MPLS_getimagetocompareiappbuffer = MPLS_getimagetocompareiappbuffer
module.exports.MPLS_upload_customer_face = MPLS_upload_customer_face
module.exports.MPLS_is_check_face_valid = MPLS_is_check_face_valid
module.exports.MPLS_is_check_face_valid_unlock = MPLS_is_check_face_valid_unlock
module.exports.MPLS_stamp_check_face_valid = MPLS_stamp_check_face_valid
module.exports.MPLS_get_dopa_valid_status = MPLS_get_dopa_valid_status
module.exports.MPLS_get_dopa_valid_status_unlock = MPLS_get_dopa_valid_status_unlock

module.exports.MPLS_canclequotation = MPLS_canclequotation