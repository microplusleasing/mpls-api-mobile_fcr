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
const e = require('express');

async function savestage(req, res, next) {

    const { stageindex } = req.query

    let connection;
    try {

        // === begin here (create variable from request [clone form updatequotation]) === 
        let app_no
        let e_paper = ''
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
            car_user_relation, car_user_name_2, car_user_citizen_id, car_user_house_no,
            car_user_house_name, car_user_room_no, car_user_floor, car_user_soi, car_user_moo,
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
            engine_no_running, chassis_no_running
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
        // === check stageindex ==== 
        switch (stageindex) {
            case 0: {
                // === stage 1 ==== 
                try {

                } catch (e) {
                    return res.status(400).send({
                        status: 200,
                        message: `ไม่สามารถ save stage ${stageindex + 1} ได้`
                    })
                }
            }
                break;
            case 1: {
                // === stage 1 ==== 
                try {

                } catch (e) {
                    return res.status(400).send({
                        status: 200,
                        message: `ไม่สามารถ save stage ${stageindex + 1} ได้`
                    })
                }
            }
                break;
            case 2: {
                // === stage 1 ==== 
                try {

                } catch (e) {
                    return res.status(400).send({
                        status: 200,
                        message: `ไม่สามารถ save stage ${stageindex + 1} ได้`
                    })
                }
            }
                break;
            case 3: {
                // === stage 1 ==== 
                try {

                } catch (e) {
                    return res.status(400).send({
                        status: 200,
                        message: `ไม่สามารถ save stage ${stageindex + 1} ได้`
                    })
                }
            }
                break;
            case 4: {
                // === stage 1 ==== 
                try {

                } catch (e) {
                    return res.status(400).send({
                        status: 200,
                        message: `ไม่สามารถ save stage ${stageindex + 1} ได้`
                    })
                }
            }
                break;

            default:
                break;
        }

    } catch (e) {
        console.error(e)
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
    let connection;
    try {
        let app_no
        let e_paper = ''
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
            car_user_relation, car_user_name_2, car_user_citizen_id, car_user_house_no,
            car_user_house_name, car_user_room_no, car_user_floor, car_user_soi, car_user_moo,
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
            engine_no_running, chassis_no_running
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
            return res.status(405).send({
                status: 405,
                message: `Record is in another stage, cant't update Data`,
                data: []
            })
        } else if (resultChkValidate.rows.length !== 1) {
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
                return res.status(400).send({
                    status: 400,
                    message: `Error between Check recent upload image. : ${e.message}`,
                    data: []
                })
            }
        }

        if (app_no) {
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
                    // image.code = code
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
                                IMAGE_TYPE = :filetype
                            WHERE IMGF_QUO_APP_KEY_ID = :quokeyid
                    `
                        const bindsUpdate = imageDataUpdate;

                        const options = {
                            bindDefs: {
                                filedata: { type: oracledb.BLOB, maxSize: 5000000 },
                                filetype: { type: oracledb.STRING, maxSize: 200 },
                                quokeyid: { type: oracledb.STRING, maxSize: 50 }
                            }
                        }

                        const resultUpdateImage = await connection.executeMany(sqlupdate, bindsUpdate, options)

                        console.log(`sussecc update image attach file : ${resultUpdateImage.rowsAffected}`)
                    } catch (e) {
                        console.error(e)
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
                        IMAGE_CODE, IMAGE_FILE, STATUS)
                        VALUES (:quokeyid, :keyid, :filename, :filetype, 
                        :code, :filedata, :status)`
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
                            message: `อัพโหลดไฟล์ภาพไม่สำเร็จ : ${e.message ? e.message : `no status`}`
                        })
                    }

                    // === update quotation record (main column) ===

                }

                if (!app_no) {
                    // console.log(`quotation id is : ${quotationid}`)
                    try {
                        const update_quotation = await connection.execute(`
                            UPDATE MPLS_QUOTATION
                            SET QUO_STATUS = :QUO_STATUS,
                                E_PAPER = :E_PAPER,
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
                                CIZ_POSTAL_CODE = :CIZ_POSTAL_CODE
                            WHERE QUO_KEY_APP_ID = :quotationid
                            `, {
                            QUO_STATUS: quo_status,
                            E_PAPER: e_paper,
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลทั่วไป) ได้`
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้`
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่) ได้`
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่อยู่ตามทะเบียนบ้านได้) ได้`
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้ากรอกบัตรประชาชน (ข้อมูลที่ทำงาน) ได้`
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
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (ข้อมูลอาชีพ) ได้`
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้าข้อมูลผลิตภัณฑ์/วงเงินสินเชื่อได้`
                        })
                    }
                    // === update purpose record ==== 
                    try {
                        const update_purpose = await connection.execute(`
                            UPDATE MPLS_PURPOSE
                            SET PURPOSE_OF_BUY  = :PURPOSE_OF_BUY, PURPOSE_OF_BUY_NAME  = :PURPOSE_OF_BUY_NAME, REASON_OF_BUY  = :REASON_OF_BUY,
                                REASON_OF_BUY_NAME  = :REASON_OF_BUY_NAME, CAR_USER  = :CAR_USER, CAR_USER_RELATION  = :CAR_USER_RELATION, CAR_USER_FULLNAME  = :CAR_USER_FULLNAME, CAR_USER_CITIZENCARD_ID  = :CAR_USER_CITIZENCARD_ID,
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
                            REASON_OF_BUY_NAME: reason_buy_etc, CAR_USER: car_user, CAR_USER_RELATION: car_user_relation, CAR_USER_FULLNAME: car_user_name, CAR_USER_CITIZENCARD_ID: car_user_citizen_id,
                            CAR_USER_HOME_NO: car_user_house_no, CAR_USER_HOME_NAME: car_user_house_name, CAR_USER_SOI: car_user_soi, CAR_USER_MOO: car_user_moo, CAR_USER_ROAD: car_user_road, CAR_USER_SUB_DISTRICT: car_user_sub_district,
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
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่สามารถอัพเดทข้อมูลหน้าอาชีพและรายได้ (วัตถุประสงค์ในการเช่าซื้อ/บุคคลอ้างอิง) ได้`
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
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value
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
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value
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
                                            E_PAPER_CONSENT_VALUE = :e_paper_consent_value
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
                                    consentid: consent_id
                                }

                                // console.log(`sqlsig : ${sqlsig}`)
                                // console.log(`bindparamsig : ${JSON.stringify(bindparamsig)}`)
                            }

                            const update_consent = await connection.execute(sqlsig, bindparamsig, { outFormat: oracledb.OBJECT })

                            console.log(`sussecc update consent : ${update_consent.rowsAffected}`)
                        } catch (e) {
                            console.error(e)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (รูปภาพลายเซ็นต์หรือ PDPA)`
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
                                                E_PAPER_CONSENT_VALUE = :e_paper_consent_value
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
                                consentid: consent_id
                            }
                            const update_consent = await connection.execute(sqlsig, bindparamsig, { outFormat: oracledb.OBJECT })

                            console.log(`sussecc update consent (PDPA consent only) : ${update_consent.rowsAffected}`)
                        } catch (e) {
                            console.error(e)
                            return res.status(400).send({
                                status: 400,
                                message: `ไม่สามารถอัพเดทข้อมูลหน้าเอกสารสัญญาได้ (PDPA only)`
                            })
                        }

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

module.exports.savestage = savestage