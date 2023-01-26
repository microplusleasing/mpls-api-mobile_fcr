const oracledb = require('oracledb')
const config = require('./connectdb')
// const thaibulksmsApi = require('thaibulksms-api')
const tolowerService = require('./tolowerkey')


async function testsendsms(req, res, next) {

    let connection;
    try {
        console.log(`trigger`)
        let responseSendsms;
        const {
            quotationid,
            phone_no,
            sms_message,
            sender,
            force
        } = req.query

        const dataSend = {
            remaining_credit: 2,
            total_use_credit: 1,
            credit_type: 'corporate',
            phone_number_list: [
                {
                    number: '66952483338',
                    message_id: 'btv151h3NUhTlmXzLoUH7v',
                    used_credit: 1
                }
            ],
            bad_phone_number_list: []
        }

        try {
            connection = await oracledb.getConnection(
                config.database
            )
            const resultLogsmsApi = await connection.execute(`
                INSERT INTO MPLS_SMS_RESPONSE (
                    SMS_QUO_KEY_ID,
                    REMAINING_CREDIT,
                    TOTAL_USE_CREDIT,
                    CREDIT_TYPE,
                    PHONENUMBER,
                    MESSAGE_ID,
                    USED_CREDIT,
                    ERROR_CODE,
                    ERROR_NAME,
                    ERROR_DESCRIPTION
                ) VALUES (
                    :SMS_QUO_KEY_ID,
                    :REMAINING_CREDIT,
                    :TOTAL_USE_CREDIT,
                    :CREDIT_TYPE,
                    :PHONENUMBER,
                    :MESSAGE_ID,
                    :USED_CREDIT,
                    :ERROR_CODE,
                    :ERROR_NAME,
                    :ERROR_DESCRIPTION
                )
            `, {
                SMS_QUO_KEY_ID: quotationid,
                REMAINING_CREDIT: 2,
                TOTAL_USE_CREDIT: 1,
                CREDIT_TYPE: 'corporate',
                PHONENUMBER: '66952483338',
                MESSAGE_ID: 'btv151h3NUhTlmXzLoUH7v',
                USED_CREDIT: 1,
                ERROR_CODE: '',
                ERROR_NAME: '',
                ERROR_DESCRIPTION: ''
            }, {
                // autoCommit: true
            })

            console.log(`stamp log success : ${JSON.stringify(resultLogsmsApi)}`)

            if (!resultLogsmsApi) {
                return res.status(460).send({
                    status: 460,
                    message: `Log Stamp error`,
                    data: []
                })
            }

            // === update quotaion flag send sms === 

            try {
                const resultUpdateQuotation = connection.execute(`
                    UPDATE MPLS_QUOTATION  
                    SET SMS_SEND_STATUS = 'Y' 
                    WHERE QUO_KEY_APP_ID = :quotationid
                `, {
                    quotationid: quotationid
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (!resultUpdateQuotation) {
                    return res.status(460).send({
                        status: 460,
                        message: `can't stamp sms create status to quotation`,
                        data: []
                    })
                }

            } catch (e) {
                console.error(e)
                return res.status(460).send({
                    status: 460,
                    message: `can't stamp sms create status to quotation`,
                    data: []
                })
            }

            // === success send sms api and save log === 
            (`trigger check record`)
            const resultselectsmslog = await connection.execute(`
            SELECT * FROM MPLS_SMS_RESPONSE WHERE SMS_QUO_KEY_ID = :quotationid
            `, {
                quotationid: quotationid
            }, {
                outFormat: oracledb.OBJECT
            })

            // === commit all execute === 
            const commitall = await connection.commit();

            try {
                commitall
            } catch {
                console.err(err.message)
                res.send(404).send(err.message)
            }

            if (resultselectsmslog) {
                if (resultselectsmslog.rows.length == 0) {
                    const noresultFormatJson = {
                        status: 460,
                        message: 'No sms log Record'
                    }
                    res.status(460).send(noresultFormatJson)
                } else {
                    let resData = resultselectsmslog.rows
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
                return res.status(460).send({
                    status: 460,
                    message: `Can't find record sms id after stamp log`,
                    data: []
                })
            }
        } catch (e) {
            console.error(e);
            return res.status(460).send({
                status: 460,
                message: `Fail to send sms service`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(460).send({
            status: 460,
            message: `Fail to send sms service outside`,
            data: []
        })
    } finally {
        if (connection) {
            try {
                console.log(`trigger finally`)
                await connection.close()
            } catch (e) {
                console.error(e)
                return next(e)
            }
        }
    }
}

module.exports.testsendsms = testsendsms
