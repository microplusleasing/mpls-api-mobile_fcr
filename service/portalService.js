const oracledb = require('oracledb')
const config = require('./connectdbportal')
var JsBarcode = require('jsbarcode');
var QRCode = require('qrcode')
var Canvas = require("canvas")
const { Base64 } = require('js-base64');
const _util = require('./_selfutil');
const tolowerService = require('./tolowerkey')
const { jsPDF } = require("jspdf");
require('jspdf-autotable');
const imageToBase64 = require('image-to-base64');
const { rest } = require('lodash');
const jwt = require('jsonwebtoken')
const wordwrap = require('wordwrapjs')

async function portallogin(req, res, next) {
    let connection;
    const { birthdate, telephone_no } = req.query

    // console.log(`birthdate : ${birthdate}`)
    console.log(`telephone_no : ${telephone_no}`)

    try {

        connection = await oracledb.getConnection(
            config.database
        )
        const resultCustomerInfo = await connection.execute(`
            SELECT CONTRACT_NO, NAME, MONTHLY, DUE
            FROM MPLSC_CUSTOMER
            WHERE TELEPHONE_NO = :telephone_no
            AND BIRTHDATE = to_date(:birthdate, 'dd/mm/yyyy')
        `, {
            telephone_no: telephone_no,
            birthdate: birthdate
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultCustomerInfo.rows.length == 0) {
            const noresultFormatJson = {
                status: 400,
                message: 'No found contract'
            }
            return res.status(400).send(noresultFormatJson)
        } else {

            try {

                let resData = resultCustomerInfo.rows[0]

                const token = jwt.sign(
                    {
                        contract_no: resData.CONTRACT_NO,
                        name: resData.NAME
                    },
                    process.env.PORTAL_JWT_KET, {
                    expiresIn: 5 * 60,
                }
                )
                let returnData = new Object
                returnData.token = token;
                returnData.data = resData
                returnData.status = 200,
                    returnData.message = 'success'

                // === tran all upperCase to lowerCase === 
                let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                    result[key.toLowerCase()] = val;
                });

                // res.status(200).json(results.rows[0]);
                res.status(200).json(returnDatalowerCase);

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `Error to build token : ${e.message}`
                })
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

async function viewportallogin(req, res, next) {
    let connection;
    const { birthdate, telephone_no } = req.query

    // console.log(`birthdate : ${birthdate}`)
    console.log(`telephone_no : ${telephone_no}`)

    try {

        connection = await oracledb.getConnection(
            config.database
        )
        const resultCustomerInfo = await connection.execute(`
            SELECT CONTRACT_NO, NAME, MONTHLY, DUE
            FROM MPLUS_CUST_VIEW
            WHERE TELEPHONE_NO = :telephone_no
            AND BIRTHDATE = BTW.BUDDHIST_TO_CHRIS_F(to_date(:birthdate, 'dd/mm/yyyy'))
        `, {
            telephone_no: telephone_no,
            birthdate: birthdate
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultCustomerInfo.rows.length == 0) {
            const noresultFormatJson = {
                status: 400,
                message: 'No found contract'
            }
            return res.status(400).send(noresultFormatJson)
        } else {

            try {

                let resData = resultCustomerInfo.rows[0]

                const token = jwt.sign(
                    {
                        contract_no: resData.CONTRACT_NO,
                        name: resData.NAME
                    },
                    process.env.PORTAL_JWT_KET, {
                    expiresIn: 5 * 60,
                }
                )
                let returnData = new Object
                returnData.token = token;
                returnData.data = resData
                returnData.status = 200,
                    returnData.message = 'success'

                // === tran all upperCase to lowerCase === 
                let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                    result[key.toLowerCase()] = val;
                });

                // res.status(200).json(results.rows[0]);
                res.status(200).json(returnDatalowerCase);

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    message: `Error to build token : ${e.message}`
                })
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

async function genbarcodeqrold(req, res, next) {

    let connection;

    try {

        // === find paymentid of user === 
        const { birthdate, telephone_no } = req.query

        const d = new Date(birthdate);
        const datestr = _util.datetostring(d)

        // console.log(`birthdate : ${datestr}`)
        connection = await oracledb.getConnection(
            config.database
        )
        const resultCustomerInfo = await connection.execute(`
            SELECT CONTRACT_NO, NAME, MONTHLY, DUE, TERM
            FROM MPLSC_CUSTOMER
            WHERE TELEPHONE_NO = :telephone_no
            AND BIRTHDATE = to_date(:birthdate, 'dd/mm/yyyy')
        `, {
            telephone_no: telephone_no,
            birthdate: datestr
        }, {
            outFormat: oracledb.OBJECT
        })

        console.log(`${JSON.stringify(resultCustomerInfo)}`)

        if (resultCustomerInfo.rows == 0 || resultCustomerInfo.rows == undefined || resultCustomerInfo.rows == null) {
            return res.status(404).send({
                status: 404,
                message: `Not found bill payment`,
                data: []
            })
        } else {
            // === gen image barcode and qr ===
            try {
                const resData = resultCustomerInfo.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                const billerid = process.env.BILLER_ID
                const paymentid = resData[0].CONTRACT_NO // === get it form oracle MPLSCUST === 
                let char13 = String.fromCharCode(13);
                const bilpaymentformat = `${billerid}${char13}${paymentid}${char13}${char13}0`
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
                    type: 'png'
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
                    data: [lowerResData] // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                })
            } catch (e) {
                return res.status(405).send({
                    status: 405,
                    message: `can't bind image`,
                    data: []
                })
            }
        }

    } catch (e) {
        console.error(`error barcode gen : ${e}`)
        return res.status(400).send({
            status: 400,
            message: `error barcode gen`
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

async function genbarcodeqr(req, res, next) {

    let connection;

    try {

        // === find paymentid of user === 
        // const { contract_no } = req.query
        
        // const d = new Date(birthdate);
        // const datestr = _util.datetostring(d)

        const token = req.user
        const contract_no = token.contract_no


        // console.log(`birthdate : ${datestr}`)
        connection = await oracledb.getConnection(
            config.database
        )
        const resultCustomerInfo = await connection.execute(`
            SELECT CONTRACT_NO, NAME, MONTHLY, DUE, TERM
            FROM MPLSC_CUSTOMER
            WHERE CONTRACT_NO = :contract_no
        `, {
            contract_no: contract_no
        }, {
            outFormat: oracledb.OBJECT
        })

        console.log(`${JSON.stringify(resultCustomerInfo)}`)

        if (resultCustomerInfo.rows == 0 || resultCustomerInfo.rows == undefined || resultCustomerInfo.rows == null) {
            return res.status(404).send({
                status: 404,
                message: `Not found bill payment`,
                data: []
            })
        } else {
            // === gen image barcode and qr ===
            try {
                const resData = resultCustomerInfo.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                const billerid = process.env.BILLER_ID
                const paymentid = resData[0].CONTRACT_NO // === get it form oracle MPLSCUST === 
                let char13 = String.fromCharCode(13);
                const bilpaymentformat = `${billerid}${char13}${paymentid}${char13}${char13}0`
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
                    type: 'png'
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
                    data: [lowerResData] // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                })
            } catch (e) {
                return res.status(405).send({
                    status: 405,
                    message: `can't bind image`,
                    data: []
                })
            }
        }

    } catch (e) {
        console.error(`error barcode gen : ${e}`)
        return res.status(400).send({
            status: 400,
            message: `error barcode gen`
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

async function viewgenbarcodeqrrefpay(req, res, next) {

    let connection;

    try {

        // === replace instead viewgenbarcodeqr api (04/11/2022) ===
        // === find paymentid of user === 
        // const { contract_no } = req.query
        
        // const d = new Date(birthdate);
        // const datestr = _util.datetostring(d)

        const token = req.user
        const contract_no = token.contract_no


        // console.log(`birthdate : ${datestr}`)
        connection = await oracledb.getConnection(
            config.database
        )
        const resultCustomerInfo = await connection.execute(`
            SELECT CONTRACT_NO, NAME, MONTHLY, DUE, FIRST_DUE, TERM, REF_PAY_NUM
            FROM MPLUS_CUST_VIEW
            WHERE CONTRACT_NO = :contract_no
        `, {
            contract_no: contract_no
        }, {
            outFormat: oracledb.OBJECT
        })

        console.log(`${JSON.stringify(resultCustomerInfo)}`)

        if (resultCustomerInfo.rows == 0 || resultCustomerInfo.rows == undefined || resultCustomerInfo.rows == null) {
            return res.status(404).send({
                status: 404,
                message: `Not found bill payment`,
                data: []
            })
        } else {
            // === gen image barcode and qr ===
            try {
                const resData = resultCustomerInfo.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                const billerid = process.env.BILLER_ID
                const paymentid = resData[0].CONTRACT_NO // === get it form oracle MPLSCUST === 
                const refpaynum = resData[0].REF_PAY_NUM

                if (!refpaynum) {
                    return res.status(400).send({
                        status: 400,
                        message: `ไม่พบเลข Reference Payment`,
                        data: []
                    })
                }

                let char13 = String.fromCharCode(13);
                // const bilpaymentformat = `${billerid}${char13}${paymentid}${char13}${char13}0`
                const bilpaymentformat = `${billerid}${char13}02${refpaynum}${char13}${char13}0`
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
                    type: 'png'
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
                    data: [lowerResData] // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                })
            } catch (e) {
                return res.status(405).send({
                    status: 405,
                    message: `can't bind image`,
                    data: []
                })
            }
        }

    } catch (e) {
        console.error(`error barcode gen : ${e}`)
        return res.status(400).send({
            status: 400,
            message: `error barcode gen`
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

async function viewgenbarcodeqr(req, res, next) {

    let connection;

    try {

        // === find paymentid of user === 
        // const { contract_no } = req.query
        
        // const d = new Date(birthdate);
        // const datestr = _util.datetostring(d)

        const token = req.user
        const contract_no = token.contract_no


        // console.log(`birthdate : ${datestr}`)
        connection = await oracledb.getConnection(
            config.database
        )
        const resultCustomerInfo = await connection.execute(`
            SELECT CONTRACT_NO, NAME, MONTHLY, DUE, FIRST_DUE, TERM
            FROM MPLUS_CUST_VIEW
            WHERE CONTRACT_NO = :contract_no
        `, {
            contract_no: contract_no
        }, {
            outFormat: oracledb.OBJECT
        })

        console.log(`${JSON.stringify(resultCustomerInfo)}`)

        if (resultCustomerInfo.rows == 0 || resultCustomerInfo.rows == undefined || resultCustomerInfo.rows == null) {
            return res.status(404).send({
                status: 404,
                message: `Not found bill payment`,
                data: []
            })
        } else {
            // === gen image barcode and qr ===
            try {
                const resData = resultCustomerInfo.rows
                const lowerResData = tolowerService.arrayobjtolower(resData)
                const billerid = process.env.BILLER_ID
                const paymentid = resData[0].CONTRACT_NO // === get it form oracle MPLSCUST === 
                let char13 = String.fromCharCode(13);
                const bilpaymentformat = `${billerid}${char13}${paymentid}${char13}${char13}0`
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
                    type: 'png'
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
                    data: [lowerResData] // === return array of image barcode and qr (pos 1 : barcode , pos 2 : QR code)
                })
            } catch (e) {
                return res.status(405).send({
                    status: 405,
                    message: `can't bind image`,
                    data: []
                })
            }
        }

    } catch (e) {
        console.error(`error barcode gen : ${e}`)
        return res.status(400).send({
            status: 400,
            message: `error barcode gen`
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

async function genqr(req, res, next) {

    // ==== for text only ====

    try {
        const billerid = process.env.BILLER_ID
        const paymentid = `110202206020001` // === get it form oracle MPLSCUST === 
        let char13 = String.fromCharCode(13);
        const bilpaymentformat = `${billerid}${char13}${paymentid}${char13}${char13}0`
        const resultimg = await QRCode.toDataURL(bilpaymentformat)
        let bufferObj = Buffer.from(resultimg, "base64");
        // console.log(`bufferObj : ${bufferObj}`)

        // res.writeHead(
        //     200,
        //     {
        //         //content-type: image/png tells the browser to expect an image
        //         "Content-Type": "image/png",
        //     }
        // );

        // res.end(bufferObj);

        return res.status(200).send({
            status: 200,
            message: `success`,
            data: bufferObj
        })


    } catch (e) {
        console.error(`error barcode gen : ${e}`)
        return res.status(400).send({
            status: 400,
            message: `error barcode gen`
        })
    }

}

async function genpdfinsurance(req, res, next) {
    let connection;
    try {

        // ==== get data from contract_no === 
        // const { contract_no } = req.query

        // === DECODE toket get contract_no ===
        const token = req.user
        const contract_no = token.contract_no

        connection = await oracledb.getConnection(
            config.database
        )
        const resultInsuranceDetail = await connection.execute(`
                SELECT * FROM MPLSC_KROMMATHUN
                WHERE CONTRACT_NO = :contract_no          
        `, {
            contract_no: contract_no
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultInsuranceDetail.rows.length == 0) {
            const noresultFormatJson = {
                status: 400,
                message: 'No found contract'
            }
            return res.status(400).send(noresultFormatJson)
        } else {
            // === gen pdf by data (resultInsuranceDetail) ===
            const contractData = resultInsuranceDetail.rows[0]

            try {
                const doc = new jsPDF();

                const fontsize = 18

                var width = doc.internal.pageSize.getWidth()

                doc.addFont('./assets/fonts/THSarabun.ttf', 'THSarabun', 'normal');
                doc.addFont('./assets/fonts/THSarabun Bold.ttf', 'THSarabun', 'bold');
                doc.setFont('THSarabun');
                doc.setFontSize(fontsize)
                doc.text("บริษัท กรุงเทพประกันภัย จํากัด (มหาชน)", 10, 10)
                doc.line(10, 15, 200, 15);
                doc.setFont('THSarabun', '', 'bold');
                doc.text(`ใบรับรองการเอาประกันภัยเพื่อผู้ให้เช่าซื้อและผู้เช่าซื้อรถจักยานยนต์`, width / 2, 25, { align: 'center' })
                doc.setFont('THSarabun', '', 'normal');
                const firstparagraph = `หนังสือสัญญาเลขที่     ${contractData.CONTRACT_NO}     กรมธรรม์เลขที่     ${contractData.KROMMATHUN_NUMBER} 
ผู้เอาประกันภัย     ${contractData.CUST_NAME}
ที่อยู่   ${wordwrap.wrap(contractData.CUST_ADDR, { width: 100 })} 
ระยะเวลาเอาประกันภัย    ${contractData.EFFECT_EXPIRE_DATE} 
ผู้รับผลประโยชน์ บริษัท ไมโครพลัสลิสซิ่ง จำกัด`

                const headersecondparagraph = `รายการรถจักรยานยนต์ที่เอาประกันภัย`
                const secondpargraph = `ชื่อรถจักรยานยนต์    ${contractData.BRAND_NAME}      รุ่น       ${contractData.MODEL_NAME}      ทะเบียน       ${(contractData.REG_NO) ? (contractData.REG_NO) : '-'} 
ทุนประกันภัย      ${contractData.SUM_INS}  บาท      เลขตัวถัง        ${contractData.CHASSIS}
เลขเครื่องยนต์    ${contractData.ENGINE}       ขนาดเครื่องยนต์   ${contractData.CC} CC      ปีรุ่น     ${contractData.MODEL_YEAR}
        `
                doc.text(10, 35, firstparagraph, { align: 'left' });
                doc.setFont('THSarabun', '', 'bold');
                doc.text(10, 90, headersecondparagraph, { align: 'left' });
                doc.setFont('THSarabun', '', 'normal');
                doc.text(10, 100, secondpargraph, { align: 'left' });
                doc.autoTable({
                    body: [
                        ['ความคุ้มครอง', `คุ้มครองรถจักรยานยนต์สูญหายทั้งคัน จากการโจรกรรม ลักทรัพย์ ชิงทรัพย์  ปล้นทรัพย์คุ้มครองรถจักรยานยนต์เสียหายโดยสิ้นเชิงจากอุบัติเหตุ  บริษัทจะชดใช้ เมื่อประเมินความเสียโดยสิ้นเชิง ดังนี้ 
- รถจักรยานยนต์เสียหายเกินกว่า 60% ของปีที่ 1 
- รถจักรยานยนต์เสียหายเกินกว่า 80% ของปีที่ 2 และ 3 
(บริษัทฯจะชดใช้ค่าสินไหมทดแทน 100% ของทุนประกันภัยปีที่เกิดอุบัติเหตุ  ตามความคุ้มครองกรมธรรม์)`
                        ],
                        ['ความคุ้มครองเพิ่มเติม', `คุ้มครองเพิ่มเติม กรณีผู้เช่าซื้อเสียชีวิต หรือ ทุพพลภาพถาวร จากอุบัติเหตุทุกกรณี
(บริษัทฯจะชดใช้ค่าสินไหมทดแทน 100% ของทุนประกันภัยปีที่เกิดอุบัติเหตุ
ตามความคุ้มครองเพิ่มเติม)`
                        ]
                    ],
                    styles: {
                        font: 'THSarabun',
                        fontSize: fontsize,
                        fontStyle: 'normal',
                        textColor: [0, 0, 0]
                    },
                    theme: 'grid',
                    bodyStyles: {
                        lineColor: [0, 0, 0],

                    },
                    headStyles: {
                        fillColor: null
                    },
                    startY: 125

                })

                const footertext = `หมายเหตุ`
                const footertextdetail = `
1. การชดใช้ค่าสินไหมฯ กรณีใดกรณีหนึ่งให้ถือกรมธรรม์เป็นอันสิ้นสุดทันที
2. บริษัทฯ ไม่คุ้มครองกรณี ยักยอกทรัพย์, การนำรถไปจำนำ. การใช้ในทางที่ผิดกฏหมาย เช่น การนำไปใช้ปล้นทรัพย์
หรือขนยา-เสพติดหรือการใช้ในการแข่งขันความเร็ว เป็นต้น
                `
                doc.setFont('THSarabun', '', 'bold');
                doc.text(10, 215, footertext, { align: 'left' });
                doc.setFont('THSarabun', '', 'normal');
                doc.text(10, 220, footertextdetail, { align: 'left' });

                const signaturetab = `
.................................................
    (จักรกริช ชีวนันทพรชัย)
ผู้ช่วยกรรมการผู้อำนวยการใหญ่
    บมจ.กรุงเทพประกันภัย`
                const base64sigimg = await imageToBase64("./assets/image/signature.png")
                const imagedata = `data:image/png;base64,${base64sigimg}/`

                doc.addImage(imagedata, 'png', width / 1.4, 248, 30, 15)
                doc.text(width / 1.5, 255, signaturetab, { align: 'left' });
                // const myPDF = doc.output('', { filename: `CN${contractData.CONTRACT_NO}` })


                // === add on === 
                const enceypt = doc.output('dataurlstring', {})
                const newtext = enceypt.replace(`data:application/pdf;filename=generated.pdf;base64,`, '')
                
                res.status(200).json({
                    // data: doc.output('dataurlstring', { filename: `CN${contractData.CONTRACT_NO}` }),

                    data: doc.output('dataurlstring', {}),
                    filename: `CN${contractData.CONTRACT_NO}`,
                    newtext: newtext
                })
                // res.status(200).send(doc.output('pdfobjectnewwindow', { filename: `CN${contractData.CONTRACT_NO}` }))




                // return res.status(200).send({
                //     status: 200,
                //     message: `success gen pdf`
                // })
            } catch (e) {
                return next(e)
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `Error gen pdf : ${e.message}`
        })
    } finally {
        try {
            await connection.close()
        } catch (e) {
            console.error(e)
            return next(e)
        }
    }
}

async function viewgenpdfinsurance(req, res, next) {
    let connection;
    try {

        // ==== get data from contract_no === 
        // const { contract_no } = req.query

        // === DECODE toket get contract_no ===
        const token = req.user
        const contract_no = token.contract_no

        connection = await oracledb.getConnection(
            config.database
        )
        const resultInsuranceDetail = await connection.execute(`
                SELECT * FROM MPLUS_INSUR_VIEW
                WHERE CONTRACT_NO = :contract_no          
        `, {
            contract_no: contract_no
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultInsuranceDetail.rows.length == 0) {
            const noresultFormatJson = {
                status: 400,
                message: 'No found contract'
            }
            return res.status(400).send(noresultFormatJson)
        } else {
            // === gen pdf by data (resultInsuranceDetail) ===
            const contractData = resultInsuranceDetail.rows[0]

            try {
                const doc = new jsPDF();

                const fontsize = 18

                var width = doc.internal.pageSize.getWidth()

                doc.addFont('./assets/fonts/THSarabun.ttf', 'THSarabun', 'normal');
                doc.addFont('./assets/fonts/THSarabun Bold.ttf', 'THSarabun', 'bold');
                doc.setFont('THSarabun');
                doc.setFontSize(fontsize)
                doc.text("บริษัท กรุงเทพประกันภัย จํากัด (มหาชน)", 10, 10)
                doc.line(10, 15, 200, 15);
                doc.setFont('THSarabun', '', 'bold');
                doc.text(`ใบรับรองการเอาประกันภัยเพื่อผู้ให้เช่าซื้อและผู้เช่าซื้อรถจักยานยนต์`, width / 2, 25, { align: 'center' })
                doc.setFont('THSarabun', '', 'normal');
                const firstparagraph = `หนังสือสัญญาเลขที่     ${contractData.CONTRACT_NO}     กรมธรรม์เลขที่     ${contractData.KROMMATHUN_NUMBER} 
ผู้เอาประกันภัย     ${contractData.CUST_NAME}
ที่อยู่   ${wordwrap.wrap(contractData.CUST_ADDR, { width: 100 })} 
ระยะเวลาเอาประกันภัย    ${contractData.EFFECT_EXPIRE_DATE} 
ผู้รับผลประโยชน์ บริษัท ไมโครพลัสลิสซิ่ง จำกัด`

                const headersecondparagraph = `รายการรถจักรยานยนต์ที่เอาประกันภัย`
                const secondpargraph = `ชื่อรถจักรยานยนต์    ${contractData.BRAND_NAME}      รุ่น       ${contractData.MODEL_NAME}      ทะเบียน       ${(contractData.REG_NO) ? (contractData.REG_NO) : '-'} 
ทุนประกันภัย      ${contractData.SUM_INS}  บาท      เลขตัวถัง        ${contractData.CHASSIS}
เลขเครื่องยนต์    ${contractData.ENGINE}       ขนาดเครื่องยนต์   ${contractData.CC} CC      ปีรุ่น     ${contractData.MODEL_YEAR}
        `
                doc.text(10, 35, firstparagraph, { align: 'left' });
                doc.setFont('THSarabun', '', 'bold');
                doc.text(10, 90, headersecondparagraph, { align: 'left' });
                doc.setFont('THSarabun', '', 'normal');
                doc.text(10, 100, secondpargraph, { align: 'left' });
                doc.autoTable({
                    body: [
                        ['ความคุ้มครอง', `คุ้มครองรถจักรยานยนต์สูญหายทั้งคัน จากการโจรกรรม ลักทรัพย์ ชิงทรัพย์  ปล้นทรัพย์คุ้มครองรถจักรยานยนต์เสียหายโดยสิ้นเชิงจากอุบัติเหตุ  บริษัทจะชดใช้ เมื่อประเมินความเสียโดยสิ้นเชิง ดังนี้ 
- รถจักรยานยนต์เสียหายเกินกว่า 60% ของปีที่ 1 
- รถจักรยานยนต์เสียหายเกินกว่า 80% ของปีที่ 2 และ 3 
(บริษัทฯจะชดใช้ค่าสินไหมทดแทน 100% ของทุนประกันภัยปีที่เกิดอุบัติเหตุ  ตามความคุ้มครองกรมธรรม์)`
                        ],
                        ['ความคุ้มครองเพิ่มเติม', `คุ้มครองเพิ่มเติม กรณีผู้เช่าซื้อเสียชีวิต หรือ ทุพพลภาพถาวร จากอุบัติเหตุทุกกรณี
(บริษัทฯจะชดใช้ค่าสินไหมทดแทน 100% ของทุนประกันภัยปีที่เกิดอุบัติเหตุ
ตามความคุ้มครองเพิ่มเติม)`
                        ]
                    ],
                    styles: {
                        font: 'THSarabun',
                        fontSize: fontsize,
                        fontStyle: 'normal',
                        textColor: [0, 0, 0]
                    },
                    theme: 'grid',
                    bodyStyles: {
                        lineColor: [0, 0, 0],

                    },
                    headStyles: {
                        fillColor: null
                    },
                    startY: 125

                })

                const footertext = `หมายเหตุ`
                const footertextdetail = `
1. การชดใช้ค่าสินไหมฯ กรณีใดกรณีหนึ่งให้ถือกรมธรรม์เป็นอันสิ้นสุดทันที
2. บริษัทฯ ไม่คุ้มครองกรณี ยักยอกทรัพย์, การนำรถไปจำนำ. การใช้ในทางที่ผิดกฏหมาย เช่น การนำไปใช้ปล้นทรัพย์
หรือขนยา-เสพติดหรือการใช้ในการแข่งขันความเร็ว เป็นต้น
                `
                doc.setFont('THSarabun', '', 'bold');
                doc.text(10, 215, footertext, { align: 'left' });
                doc.setFont('THSarabun', '', 'normal');
                doc.text(10, 220, footertextdetail, { align: 'left' });

                const signaturetab = `
.................................................
    (จักรกริช ชีวนันทพรชัย)
ผู้ช่วยกรรมการผู้อำนวยการใหญ่
    บมจ.กรุงเทพประกันภัย`
                const base64sigimg = await imageToBase64("./assets/image/signature.png")
                const imagedata = `data:image/png;base64,${base64sigimg}/`

                doc.addImage(imagedata, 'png', width / 1.4, 248, 30, 15)
                doc.text(width / 1.5, 255, signaturetab, { align: 'left' });
                // const myPDF = doc.output('', { filename: `CN${contractData.CONTRACT_NO}` })


                // === add on === 
                const enceypt = doc.output('dataurlstring', {})
                const newtext = enceypt.replace(`data:application/pdf;filename=generated.pdf;base64,`, '')
                
                res.status(200).json({
                    // data: doc.output('dataurlstring', { filename: `CN${contractData.CONTRACT_NO}` }),

                    data: doc.output('dataurlstring', {}),
                    filename: `CN${contractData.CONTRACT_NO}`,
                    newtext: newtext
                })
                // res.status(200).send(doc.output('pdfobjectnewwindow', { filename: `CN${contractData.CONTRACT_NO}` }))




                // return res.status(200).send({
                //     status: 200,
                //     message: `success gen pdf`
                // })
            } catch (e) {
                return next(e)
            }
        }

    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `Error gen pdf : ${e.message}`
        })
    } finally {
        try {
            await connection.close()
        } catch (e) {
            console.error(e)
            return next(e)
        }
    }
}

async function checkjwtportal(req, res, next) {
    return res.status(200).send({
        status: 200,
        message: `Success`,
        data: []
    })
}

module.exports.genbarcodeqr = genbarcodeqr
module.exports.genbarcodeqrold = genbarcodeqrold
module.exports.genqr = genqr
module.exports.genpdfinsurance = genpdfinsurance
module.exports.portallogin = portallogin
module.exports.checkjwtportal = checkjwtportal
module.exports.viewgenbarcodeqr = viewgenbarcodeqr
module.exports.viewgenbarcodeqrrefpay = viewgenbarcodeqrrefpay
module.exports.viewgenpdfinsurance = viewgenpdfinsurance
module.exports.viewportallogin = viewportallogin