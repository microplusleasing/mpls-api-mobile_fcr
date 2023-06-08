const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
var JsBarcode = require('jsbarcode');
var QRCode = require('qrcode')
var Canvas = require("canvas")
const queryService = require('./queryService')


async function checkmrtarecent(req, res, next) {

    let connection;
    try {

        const { quotationid } = req.query

        connection = await oracledb.getConnection(config.database)

        // === check QUOTATION parameter ===

        if (!quotationid) {
            return res.status(400).send({
                status: 400,
                message: `missing quotationid param`,
                data: []
            })
        }

        // === check QUOTATION is already exists ===

        try {

            const resultcheckquotation = await connection.execute(`
                    SELECT QUO.QUO_KEY_APP_ID , ACTIVE_STATUS
                    FROM MPLS_QUOTATION QUO
                    LEFT JOIN CONTRACT_INSURANCE CI
                    ON QUO.QUO_KEY_APP_ID = CI.QUOTATION_ID
                    WHERE QUO.QUO_KEY_APP_ID  = :quotationid
            `, {
                quotationid: quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // **** Should not found no quotation record (normally check on client)
            if (resultcheckquotation.rows.length == 0) {
                return res.status(400).send({
                    status: 400,
                    message: `ไม่พบเลข quotation`,
                    data: []
                })
            } else {
                const mrtarecent = resultcheckquotation.rows[0].ACTIVE_STATUS
                if (mrtarecent != 1) {
                    return res.status(200).send({
                        status: 200,
                        message: `no recent mrta record`,
                        data: []
                    })
                }

                // ==== get mrta data from CONTRACT_INSURANCE ====
                try {

                    const resultcheckmrta = await connection.execute(`
                            SELECT * FROM CONTRACT_INSURANCE
                            WHERE QUOTATION_ID = :quotationid
                    `, {
                        quotationid: quotationid
                    }, {
                        outFormat: oracledb.OBJECT
                    })

                    if (resultcheckmrta.rows.length == 0) {
                        return res.status(400).send({
                            status: 400,
                            message: `ไม่พบรายการ MRTA record`,
                            data: []
                        })
                    }

                    // === get data from MRTA record === 
                    const resData = resultcheckmrta.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    return res.status(200).send({
                        status: 200,
                        message: 'success',
                        data: lowerResData
                    })

                } catch (e) {
                    console.error(e)
                    return next(e)
                }
            }



        } catch (e) {
            console.error(e)
            return next(e)
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

async function getmrtainsurance(req, res, next) {
    let connection;
    let { out_stand, age, gender } = req.query
    try {
        connection = await oracledb.getConnection(config.database)
        const resultinsurance = await connection.execute(`
                SELECT A.INSURER_CODE , A.INSURER_NAME , B.INSURANCE_CODE , C.AGE_MIN ,C.AGE_MAX, C.YEARS_INSUR , C.RATE_INSUR,CEIL((:P_OUT_STAND* C.RATE_INSUR)/1000) PREMIUM_INSUR, C.PLAN 
                FROM X_INSURER_INFO A , X_INSURANCE B, BTW.X_INSURANCE_MRTA_DETAIL C
                WHERE A.INSURER_CODE = B.INSURER_CODE
                AND B.INSURANCE_CODE =C.INSURANCE_CODE
                AND A.CANCEL_STATUS = 'N'
                AND B.STATUS = 'Y'
                AND B.BUSINESS_CODE = '001'
                AND :P_AGE BETWEEN C.AGE_MIN AND C.AGE_MAX
                AND C.GENDER = :P_GENDER`,
            {
                P_OUT_STAND: out_stand,
                P_AGE: age,
                P_GENDER: gender

            }, {
            outFormat: oracledb.OBJECT
        })

        if (resultinsurance.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'No MRTA Insurance list',
                data: []
            })
        } else {
            const resData = resultinsurance.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
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

async function getmrtaseller(req, res, next) {
    let connection;
    try {
        connection = await oracledb.getConnection(config.database)
        const resultmrtaseller = await connection.execute(`
                SELECT A.emp_id ,BTW.PKG_HR_INFO.GET_EMP_FULLNAME (A.EMP_ID) AS FULLNAME , LIFE_LICENSED_NO ,LIFE_START_DATE , LIFE_END_DATE
                FROM emp a,BTW.X_LICENSED_INSURANCE B
                WHERE A.EMP_ID = B.EMP_ID
                AND NVL(A.LEAVE,'N')='N'
                AND TRUNC(SYSDATE) BETWEEN TRUNC(LIFE_START_DATE) AND TRUNC(LIFE_END_DATE)
                ORDER BY A.EMP_ID
        `,
            {
                //  NO BIND
            }, {
            outFormat: oracledb.OBJECT
        })

        if (resultmrtaseller.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No MRTA seller list',
                data: []
            })
        } else {
            const resData = resultmrtaseller.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
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

async function genmrtaqr(req, res, next) {

    let connection;


    try {

        const { application_num, premium_mrta } = req.query

        if (!application_num) {
            return res.status(400).send({
                status: 400,
                message: `missing application number`,
                data: []
            })
        }

        if (!premium_mrta) {
            return res.status(400).send({
                status: 400,
                message: `missing premium mrta insur`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        const resultREFpay = await connection.execute(`
                SELECT REF_PAY_NUM FROM BTW.X_CUST_MAPPING_EXT
                WHERE APPLICATION_NUM = :APPLICATION_NUM
        `, {
            APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultREFpay.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบเลข Reference Payment`,
                data: []
            })
        }

        if (resultREFpay.rows.length > 1) {
            return res.status(400).send({
                status: 400,
                message: `Can't Identity REF Payment (too many)`,
                data: []
            })
        }

        const REFPAYVALUE = resultREFpay.rows[0].REF_PAY_NUM

        if (!REFPAYVALUE) {
            return res.status(400).send({
                status: 400,
                messsage: `ไม่พบเลข Refernce Payment (No Value)`,
                data: []
            })
        }

        // === USE REFPAYVALUE to GEN QR Image === 

        try {
            const resData = resultREFpay.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            const refpay = resData[0].REF_PAY_NUM
            const billerid = process.env.BILLER_ID
            let char13 = String.fromCharCode(13);
            const bilpaymentformat = `${billerid}${char13}20${refpay}${char13}${char13}${premium_mrta}00`
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
            return res.status(400).send({
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

async function saveqrpayment(req, res, next) {
    let connection
    try {

        const token = req.user
        const userid = token.ID
        const username = token.user_id


        const {
            quotationid,
            application_num,
            insurance_code,
            insurance_year,
            insurer_code,
            insurance_seller,
            premium_mrta,
            out_stand,
            gender,
            age
        } = req.body

        if (!(quotationid && application_num && insurance_code &&
            insurance_year && insurer_code && insurance_seller &&
            premium_mrta && out_stand && gender && age && username)) {
            return res.status(400).send({
                status: 400,
                message: `missing parameters argument`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        const resultREFpay = await connection.execute(`
        SELECT REF_PAY_NUM FROM BTW.X_CUST_MAPPING_EXT
        WHERE APPLICATION_NUM = :APPLICATION_NUM
`, {
            APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultREFpay.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบเลข Reference Payment`,
                data: []
            })
        }

        if (resultREFpay.rows.length > 1) {
            return res.status(400).send({
                status: 400,
                message: `Can't Identity REF Payment (too many)`,
                data: []
            })
        }

        const REFPAYVALUE = resultREFpay.rows[0].REF_PAY_NUM

        if (!REFPAYVALUE) {
            return res.status(400).send({
                status: 400,
                messsage: `ไม่พบเลข Refernce Payment (No Value)`,
                data: []
            })
        }

        // === USE REFPAYVALUE to GEN QR Image === 

        try {
            const resData = resultREFpay.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            const refpay = resData[0].REF_PAY_NUM
            const billerid = process.env.BILLER_ID
            let char13 = String.fromCharCode(13);
            const bilpaymentformat = `${billerid}${char13}20${refpay}${char13}${char13}${premium_mrta}00`
            var canvas = new Canvas.Canvas()
            JsBarcode(canvas, bilpaymentformat, {
                width: 1,
                height: 50,
                fontSize: 10,
                displayValue: false,
                margin: 0
            })


            const resultimgqr = await QRCode.toBuffer(bilpaymentformat, {
                margin: 0,
                type: 'png',
                scale: 5
            })


            // const blobqr = new oracledb.BLOB([resultimgqr])
            // const blobqr = new Blob([resultimgqr]);
            // const blobqr = JSON.stringify({ blob: resultimgqr.toString("base64") });
            // === check mrta (INSERT/UPDATE) ====
            try {

                const resultcheckquotation = await connection.execute(`
                        SELECT QUO.QUO_KEY_APP_ID , ACTIVE_STATUS, QUOTATION_ID, ACTIVE_STATUS, PAY_STATUS
                        FROM MPLS_QUOTATION QUO
                        LEFT JOIN CONTRACT_INSURANCE CI
                        ON QUO.QUO_KEY_APP_ID = CI.QUOTATION_ID
                        WHERE QUO.QUO_KEY_APP_ID  = :quotationid
                `, {
                    quotationid: quotationid
                }, {
                    outFormat: oracledb.OBJECT
                })

                // **** Should not found no quotation record (normally check on client)
                if (resultcheckquotation.rows.length == 0) {
                    return res.status(400).send({
                        status: 400,
                        message: `ไม่พบเลข quotation`,
                        data: []
                    })
                } else {
                    // === reject when qr is already pay (PAY_STAUS == 1) ===
                    const mrtapaystatus = resultcheckquotation.rows[0].PAY_STATUS
                    if (mrtapaystatus == 1) {
                        return res.status(400).send({
                            status: 400,
                            message: `QR Code payment is already pay`,
                            data: []
                        })
                    } else {
                        // === check mrta (INSERT/UPDATE) ====
                        const mrtarecent = resultcheckquotation.rows[0].QUOTATION_ID
                        if (!mrtarecent) {
                            // === insert ===
                            try {
                                const insertmrtaselect = await connection.execute(`
                                INSERT INTO MOBILEMPLS.CONTRACT_INSURANCE
                                (APPLICATION_NUM,
                                 QUOTATION_ID,
                                 INSURANCE_T_CASH,
                                 INSURANCE_B_CASH,
                                 INSURER_CODE,
                                 INSURANCE_YEAR,
                                 ITEM_CODE,
                                 SELLER_ID,
                                 UPD_USER,
                                 UPD_DATETIME,
                                 OUT_STAND,
                                 AGE,
                                 GENDER,
                                 PAY_STATUS,
                                 ACTIVE_STATUS,
                                 INSURANCE_CODE,
                                 BARCODE_IMG,
                                 BILL_PAYMENT
                                )
                              Values
                                (
                                :APPLICATION_NUM,
                                :QUOTATION_ID,
                                :INSURANCE_T_CASH,
                                :INSURANCE_B_CASH,
                                :INSURER_CODE,
                                :INSURANCE_YEAR,
                                :ITEM_CODE,
                                :SELLER_ID,
                                :UPD_USER,
                                SYSDATE,
                                :OUT_STAND,
                                :AGE,
                                :GENDER,
                                :PAY_STATUS,
                                :ACTIVE_STATUS,
                                :INSURANCE_CODE,
                                :BARCODE_IMG,
                                :BILL_PAYMENT
                                )
                                `, {
                                    APPLICATION_NUM: application_num,
                                    QUOTATION_ID: quotationid,
                                    INSURANCE_T_CASH: out_stand,
                                    INSURANCE_B_CASH: premium_mrta,
                                    INSURER_CODE: insurer_code,
                                    INSURANCE_YEAR: insurance_year,
                                    ITEM_CODE: '014',
                                    SELLER_ID: insurance_seller,
                                    UPD_USER: username,
                                    OUT_STAND: out_stand,
                                    AGE: age,
                                    GENDER: gender,
                                    PAY_STATUS: 0,
                                    ACTIVE_STATUS: 1,
                                    INSURANCE_CODE: insurance_code,
                                    BARCODE_IMG: resultimgqr,
                                    BILL_PAYMENT: bilpaymentformat
                                }, {
                                    outFormat: oracledb.OBJECT,
                                    BARCODE_IMG: { type: oracledb.BLOB, maxSize: 5000000 }
                                })

                                console.log(`sussecc insert MRTA : ${insertmrtaselect.rowsAffected}`)



                                // lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
                                // lowerResData[0].bill_payment = bilpaymentformat
                                // return res.status(200).send({
                                //     status: 200,
                                //     message: `success`,
                                //     data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                                // })


                                // === commit all execute === 
                                const commitall = await connection.commit();
                                try {
                                    commitall
                                    // === return QR Image ===
                                    lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
                                    lowerResData[0].bill_payment = bilpaymentformat
                                    return res.status(200).send({
                                        status: 200,
                                        message: `success`,
                                        data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                                    })
                                } catch {
                                    console.err(err.message)
                                    res.send(400).send(err.message)
                                }


                            } catch (e) {
                                return res.status(400).send({
                                    status: 400,
                                    message: `fail to insert mrta record : ${e}`,
                                    data: []
                                })
                            }

                        } else {
                            // === update ===

                            try {

                                const updatemrtarecentrecord = await connection.execute(`
                                        UPDATE MOBILEMPLS.CONTRACT_INSURANCE
                                        SET INSURANCE_T_CASH = :INSURANCE_T_CASH,
                                            INSURANCE_B_CASH = :INSURANCE_B_CASH,
                                            INSURER_CODE = :INSURER_CODE,
                                            INSURANCE_YEAR = :INSURANCE_YEAR,
                                            ITEM_CODE = :ITEM_CODE,
                                            SELLER_ID = :SELLER_ID,
                                            UPD_USER = :UPD_USER,
                                            OUT_STAND = :OUT_STAND,
                                            AGE = :AGE,
                                            GENDER = :GENDER,
                                            PAY_STATUS = :PAY_STATUS,
                                            INSURANCE_CODE = :INSURANCE_CODE,
                                            BILL_PAYMENT = :BILL_PAYMENT,
                                            BARCODE_IMG = :BARCODE_IMG
                                        WHERE QUOTATION_ID = :QUOTATION_ID
                                        AND APPLICATION_NUM = :APPLICATION_NUM
                                `, {
                                    INSURANCE_T_CASH: out_stand,
                                    INSURANCE_B_CASH: premium_mrta,
                                    INSURER_CODE: insurer_code,
                                    INSURANCE_YEAR: insurance_year,
                                    ITEM_CODE: '014',
                                    SELLER_ID: insurance_seller,
                                    UPD_USER: username,
                                    OUT_STAND: out_stand,
                                    AGE: age,
                                    GENDER: gender,
                                    PAY_STATUS: 0,
                                    INSURANCE_CODE: insurance_code,
                                    BILL_PAYMENT: bilpaymentformat,
                                    BARCODE_IMG: resultimgqr,
                                    QUOTATION_ID: quotationid,
                                    APPLICATION_NUM: application_num
                                }, {
                                    outFormat: oracledb.OBJECT,
                                    BARCODE_IMG: { type: oracledb.BLOB, maxSize: 5000000 },
                                })

                                console.log(`sussecc update MRTA : ${updatemrtarecentrecord.rowsAffected}`)

                                // lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
                                // lowerResData[0].bill_payment = bilpaymentformat
                                // return res.status(200).send({
                                //     status: 200,
                                //     message: `success`,
                                //     data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                                // })

                                if (updatemrtarecentrecord.rowsAffected == 0) {
                                    return res.status(400).send({
                                        status: 400,
                                        message: `ไม่พบรายการอัพเดทตามเงื่อนไข`,
                                        data: []
                                    })
                                }

                                if (updatemrtarecentrecord.rowsAffected > 1) {

                                    return res.status(400).send({
                                        status: 400,
                                        message: `Duplicate contract insurance record`
                                    })
                                }

                                const commitall = await connection.commit();

                                try {
                                    commitall
                                    // === return QR Image ===
                                    lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
                                    lowerResData[0].bill_payment = bilpaymentformat
                                    return res.status(200).send({
                                        status: 200,
                                        message: `success`,
                                        data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                                    })

                                } catch {
                                    console.err(err.message)
                                    res.send(400).send(err.message)
                                }

                            } catch (e) {
                                console.error(e)
                                return res.status(400).send({
                                    status: 400,
                                    message: `fail to update mrta recent record`,
                                    data: []
                                })
                            }
                        }
                    }

                }
            } catch (e) {
                return res.status(400).send({
                    status: 400,
                    message: `fail to save MRTA Record : ${e}`
                })
            }

        } catch (e) {
            return res.status(400).send({
                status: 400,
                message: `can't bind image : ${e}`,
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

async function confirmqrpayment(req, res, next) {
    let connection;
    try {

        const token = req.user
        const userid = token.ID
        const username = token.username
        const radmin = token.radmin

        if (radmin != 'FI') {
            return res.status(400).send({
                status: 400,
                message: `ไม่มีสิทธิ์ยืนยันการชำระเงิน`,
                data: []
            })
        }
        if (!userid) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบ USER สำหรับ CONFIRM การชำระเงิน`,
                data: []
            })
        }

        if (!username) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบ USERNAME สำหรับ CONFIRM การชำระเงิน`,
                data: []
            })
        }

        let { application_num, contract_no } = req.query
        if (!application_num) {
            return res.status(400).send({
                status: 400,
                message: `missing parameter (application_num)`,
                data: []
            })
        }

        // === get record payment ===
        connection = await oracledb.getConnection(config.database)
        const resultpaymentrecord = await connection.execute(`
            SELECT * FROM CONTRACT_INSURANCE
            WHERE APPLICATION_NUM = :APPLICATION_NUM
        `, {
            APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultpaymentrecord.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบรายการชำระเงินตามเลข QUOTATION : ${application_num}`,
                data: []
            })
        }

        if (resultpaymentrecord.rows.length > 1) {
            return res.status(400).send({
                status: 400,
                message: `DUplicate payment record`,
                data: []
            })
        }

        if (resultpaymentrecord.rows.length == 1) {
            // === check payment status ===
            const paymentrecord = resultpaymentrecord.rows[0]
            const payment_status = paymentrecord.PAY_STATUS
            if (payment_status == 1) {
                return res.status(400).send({
                    status: 400,
                    message: `รายการ QR payment มีการชำระเงินแล้ว`,
                    data: []
                })
            }

            // === get data from oracle (check is match) (04/10/2022) ===

            let term;
            // let querystr;
            // let bind = {};
            const oracledata = await queryService.mappingdataUpdate(application_num)

            if (!oracledata) {
                return res.status(400).send({
                    status: 400,
                    message: `application_num doesn't math in oracle`,
                    data: []
                })
            } {
                term = oracledata.data[0].term
                console.log(`this is term : ${term}`)
            }

            // === stamp confrim user and status === 

            // console.log(`all data : ${contract_no}, ${term}, ${application_num}`)
            const updatepaymentstatus = await connection.execute(`
            DECLARE
            err_code  VARCHAR2(200);
            err_msg  VARCHAR2(200);
            status  NUMBER;
            
            P_PAY_STATUS NUMBER;
            P_APPLICATION_NUM VARCHAR2(25);
            P_CONTRACT_NO  VARCHAR2(25);
            P_TERM NUMBER;
            P_CONFIRM_BY  VARCHAR2(150);
            BEGIN
    
                    P_APPLICATION_NUM := :p_application_num;
                    P_CONTRACT_NO := :p_contract_no;
                    P_PAY_STATUS := :p_pay_status;
                    P_TERM := :p_term;
                    P_CONFIRM_BY := :p_confirm_by;
    
                    proc_confirm_PAY_INSURANCE(P_APPLICATION_NUM,P_CONTRACT_NO,P_PAY_STATUS,P_TERM,P_CONFIRM_BY,:err_code, :err_msg, :status);
    
            END;
    `,
                {
                    p_application_num: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: application_num },
                    p_contract_no: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: contract_no },
                    p_pay_status: { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: 1 },
                    p_term: { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: term },
                    p_confirm_by: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: username },
                    err_code: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                    err_msg: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                    status: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            )

            if (updatepaymentstatus.outBinds.status == 1) {

                // === call PKG_BUY_MRTA === 

                try {

                    const resultupdateMRTAoracle = await connection.execute(`
                        BEGIN 
                            BTW.PKG_BUY_MRTA.PROCESS_KEEP_MRTA(:P_APP_NUM);
                        END;
                    `, {
                        P_APP_NUM: { dir: oracledb.BIND_IN, val: application_num }
                    }, {
                        outFormat: oracledb.OBJECT
                    })

                    console.log(`result from update PKG : ${JSON.stringify(resultupdateMRTAoracle)}`)

                    // === check PKG success stamp product item (05/10/2022) ===

                    try {

                        const resultcheckupdateproduct = await connection.execute(`
                        select * from btw.x_product_item_list
                        where item_code = '014'
                        and application_num = :application_num
                    `, {
                            application_num: application_num
                        }, {
                            outFormat: oracledb.OBJECT
                        })

                        if (resultcheckupdateproduct.rows.length == 0) {
                            return res.status(400).send({
                                status: 400,
                                message: `อัพเดท X_PRODUCT_ITEM_LIST ไม่สำเร็จ (PKG_BUY_MRTA)`,
                                data: []
                            })
                        }

                    } catch (e) {
                        return res.status(400).send({
                            status: 400,
                            message: `Fail to execute check product item list (btw.x_product_item_list) : ${e}`,
                            data: []
                        })
                    }


                } catch (e) {
                    return res.status(400).send({
                        status: 400,
                        message: `Fail to execute PKG_BUY_MRTA : ${e}`,
                        data: []
                    })
                }

                // === return data to client ===
                await connection.commit()

                const resturndata = await connection.execute(`
                    SELECT * FROM MOBILEMPLS.CONTRACT_INSURANCE
                    WHERE APPLICATION_NUM = :APPLICATION_NUM
                `, {
                    APPLICATION_NUM: application_num
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resturndata.rows.length !== 0) {
                    const resData = resturndata.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    return res.status(200).send({
                        status: 200,
                        message: 'success',
                        data: lowerResData
                    })
                }

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

async function genadvanceqrpayment(req, res, next) {
    let connection;


    try {

        const { application_num } = req.query

        if (!application_num) {
            return res.status(400).send({
                status: 400,
                message: `missing application number`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        const resultREFpay = await connection.execute(`
                SELECT CME.REF_PAY_NUM, PIL.ITEM_PRICE, CI.NAME, CI.SNAME, CME.TERM, CME.MONTHLY, XSC.FIRST_DUE , TO_CHAR(XSC.FIRST_DUE, 'DD') AS DUE
                    FROM BTW.X_CUST_MAPPING_EXT CME
                    INNER JOIN BTW.X_PRODUCT_ITEM_LIST PIL
                    ON CME.APPLICATION_NUM = PIL.APPLICATION_NUM
                    AND CME.APPLICATION_NUM = :APPLICATION_NUM
                    AND PIL.ITEM_CODE = '012'
                    INNER JOIN BTW.X_CUST_MAPPING CM
                    ON CME.APPLICATION_NUM = CM.APPLICATION_NUM
                    INNER JOIN BTW.CUST_INFO CI
                    ON CM.CUST_NO = CI.CUST_NO
                    INNER JOIN BTW.X_SAMM_CONTRACT XSC
                    ON CME.APPLICATION_NUM = XSC.APPLICATION_NUM
        `, {
            APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultREFpay.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบเลข Reference Payment`,
                data: []
            })
        }

        if (resultREFpay.rows.length > 1) {
            return res.status(400).send({
                status: 400,
                message: `Can't Identity REF Payment (too many)`,
                data: []
            })
        }

        const REFPAYVALUE = resultREFpay.rows[0].REF_PAY_NUM
        const NAME = resultREFpay.rows[0].NAME
        const SNAME = resultREFpay.rows[0].SNAME

        if (!REFPAYVALUE) {
            return res.status(400).send({
                status: 400,
                messsage: `ไม่พบเลข Refernce Payment (No Value)`,
                data: []
            })
        }

        // === USE REFPAYVALUE to GEN QR Image === 

        try {
            const resData = resultREFpay.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            const refpay = resData[0].REF_PAY_NUM
            const billerid = process.env.BILLER_ID
            let char13 = String.fromCharCode(13);
            const bilpaymentformat = `${billerid}${char13}02${refpay}${char13}${char13}0`
            var canvas = new Canvas.Canvas()
            JsBarcode(canvas, bilpaymentformat, {
                width: 1,
                height: 50,
                fontSize: 10,
                displayValue: false,
                margin: 0
            })

            const resultimgqr = await QRCode.toBuffer(bilpaymentformat, {
                margin: 0,
                type: 'png',
                // scale: 5
            })

            lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
            lowerResData[0].bill_payment = bilpaymentformat
            lowerResData[0].name = NAME
            lowerResData[0].sname = SNAME
            return res.status(200).send({
                status: 200,
                message: `success`,
                data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
            })
        } catch (e) {
            return res.status(400).send({
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

async function gentotallossqrpayment(req, res, next) {
    let connection;


    try {

        const { application_num } = req.query

        if (!application_num) {
            return res.status(400).send({
                status: 400,
                message: `missing application number`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        const resultREFpay = await connection.execute(`
                SELECT CME.REF_PAY_NUM, PIL.ITEM_PRICE, CI.NAME, CI.SNAME
                    FROM BTW.X_CUST_MAPPING_EXT CME
                    INNER JOIN BTW.X_PRODUCT_ITEM_LIST PIL
                    ON CME.APPLICATION_NUM = PIL.APPLICATION_NUM
                    AND CME.APPLICATION_NUM = :APPLICATION_NUM
                    AND PIL.ITEM_CODE = '012'
                    INNER JOIN BTW.X_CUST_MAPPING CM
                    ON CME.APPLICATION_NUM = CM.APPLICATION_NUM
                    INNER JOIN BTW.CUST_INFO CI
                    ON CM.CUST_NO = CI.CUST_NO
        `, {
            APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultREFpay.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบเลข Reference Payment`,
                data: []
            })
        }

        if (resultREFpay.rows.length > 1) {
            return res.status(400).send({
                status: 400,
                message: `Can't Identity REF Payment (too many)`,
                data: []
            })
        }

        const REFPAYVALUE = resultREFpay.rows[0].REF_PAY_NUM
        const ITEM_PRICE = resultREFpay.rows[0].ITEM_PRICE
        const NAME = resultREFpay.rows[0].NAME
        const SNAME = resultREFpay.rows[0].SNAME

        if (!REFPAYVALUE) {
            return res.status(400).send({
                status: 400,
                messsage: `ไม่พบเลข Refernce Payment (No Value)`,
                data: []
            })
        }

        if (!ITEM_PRICE) {
            return res.status(400).send({
                status: 400,
                messsage: `ไม่พบค่างวด total loss (No Value)`,
                data: []
            })
        }

        // === USE REFPAYVALUE to GEN QR Image === 

        try {
            const resData = resultREFpay.rows
            let lowerResData = tolowerService.arrayobjtolower(resData)
            const refpay = resData[0].REF_PAY_NUM
            const billerid = process.env.BILLER_ID
            let char13 = String.fromCharCode(13);
            const bilpaymentformat = `${billerid}${char13}08${refpay}${char13}${char13}${ITEM_PRICE}00`
            var canvas = new Canvas.Canvas()
            JsBarcode(canvas, bilpaymentformat, {
                width: 1,
                height: 50,
                fontSize: 10,
                displayValue: false,
                margin: 0
            })

            const resultimgqr = await QRCode.toBuffer(bilpaymentformat, {
                margin: 0,
                type: 'png',
                scale: 5
            })

            lowerResData[0].image_file = [canvas.toBuffer("image/png"), resultimgqr]
            lowerResData[0].bill_payment = bilpaymentformat
            lowerResData[0].item_price = ITEM_PRICE
            lowerResData[0].name = NAME
            lowerResData[0].sname = SNAME
            return res.status(200).send({
                status: 200,
                message: `success`,
                data: lowerResData // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
            })
        } catch (e) {
            return res.status(400).send({
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

module.exports.getmrtainsurance = getmrtainsurance
module.exports.getmrtaseller = getmrtaseller
module.exports.genmrtaqr = genmrtaqr
module.exports.checkmrtarecent = checkmrtarecent
module.exports.saveqrpayment = saveqrpayment
module.exports.confirmqrpayment = confirmqrpayment
module.exports.genadvanceqrpayment = genadvanceqrpayment
module.exports.gentotallossqrpayment = gentotallossqrpayment