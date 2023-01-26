const oracledb = require('oracledb')
const config = require('./connectdb')
// const thaibulksmsApi = require('thaibulksms-api')
const sdk = require('api')('@thaibulksms/v1.0#dfe7qml3crqtee');
const tolowerService = require('./tolowerkey')


async function sendsmscheck(req, res, next) {

    let connection;
    try {
        console.log(`trigger`)
        let responseSendsms;
        let mapvaluesms;
        const {
            quotationid,
            phone_no,
            sms_message,
            sender,
            force,
            smsserviceallow
        } = req.query

        try {

            if(smsserviceallow == 0) {
                return res.status(400).send({
                    status: 400,
                    message: `unallow to call service`,
                    data: []
                })
            }

            if (quotationid == '' && phone_no == '' && sms_message == '' && sender == '') {
                return res.status(400).send({
                    status: 400,
                    message: `missing arguement value`,
                    data: []
                })
            }

            sdk.auth(process.env.SMS_API_KEY, process.env.SMS_API_SECRET)

            responseSendsms = await sdk.post('/sms', {
                msisdn: phone_no,
                message: sms_message,
                sender: sender,
                force: force
            }, { Accept: 'application/json' })


            console.log(`response : ${responseSendsms}`)

            if (responseSendsms) {
                console.log(responseSendsms)
                mapvaluesms = mapnewresponsearray(responseSendsms)
                console.log(`this is mep new value : ${JSON.stringify(mapvaluesms)}`)
            }


        } catch (e) {
            return res.status(400).send({
                status: 400,
                message: `Fail to send sms service 1 : ${e}`,
                data: []
            })
        }

        try {
            // === check type data format === 
            if (!mapvaluesms) {
                return res.status(400).send({
                    status: 400,
                    message: `Wrong format data to create log`,
                    data: []
                })
            }

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
                REMAINING_CREDIT: mapvaluesms.remaining_credit,
                TOTAL_USE_CREDIT: mapvaluesms.total_use_credit,
                CREDIT_TYPE: mapvaluesms.credit_type,
                PHONENUMBER: mapvaluesms.phonenumber,
                MESSAGE_ID: mapvaluesms.message_id,
                USED_CREDIT: mapvaluesms.used_credit,
                ERROR_CODE: mapvaluesms.error_code,
                ERROR_NAME: mapvaluesms.error_name,
                ERROR_DESCRIPTION: mapvaluesms.error_description
            }, {
                // autoCommit: true
            })

            console.log(`stamp log success : ${JSON.stringify(resultLogsmsApi)}`)

            if (!resultLogsmsApi) {
                return res.status(400).send({
                    status: 400,
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
                    return res.status(400).send({
                        status: 400,
                        message: `can't stamp sms create status to quotation`,
                        data: []
                    })
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
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
                res.send(400).send(err.message)
            }

            if (resultselectsmslog) {
                if (resultselectsmslog.rows.length == 0) {
                    const noresultFormatJson = {
                        status: 400,
                        message: 'No sms log Record'
                    }
                    res.status(400).send(noresultFormatJson)
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
                return res.status(400).send({
                    status: 400,
                    message: `Can't find record sms id after stamp log`,
                    data: []
                })
            }
        } catch (e) {
            console.error(e);
            return res.status(400).send({
                status: 400,
                message: `Fail to send sms service 2`,
                data: []
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail to send sms service 3`,
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

async function bypasssms(req, res, next) {
    let connection;
    try {

        let responseSendsms;
        let mapvaluesms;


        const {message, phoneno} = req.body


        try {
            if(phoneno == '' && message == '') {
                    return res.status(400).send({
                        status: 400,
                        message: `missing arguement value`,
                        data: []
                    })
                }
                sdk.auth(process.env.SMS_API_KEY, process.env.SMS_API_SECRET)

            responseSendsms =  await sdk.post('/sms', {
              msisdn: phoneno,
              message: message,
              sender: 'MICROPLUS',
              force: `Corporate`
            }, {Accept: 'application/json'})


            console.log(`response : ${responseSendsms}`)

            if(responseSendsms) {
                console.log(responseSendsms)
                mapvaluesms = mapnewresponsearray(responseSendsms)
                console.log(`this is mep new value : ${JSON.stringify(mapvaluesms)}`)
            }

        } catch (e) {
            return res.status(400).send({
                status: 400,
                message: `Fail to send sms service 1 : ${e}`,
                data: []
            })
        }

        try {

            // === check type data format === 
            if(!mapvaluesms) {
                return res.status(400).send({
                    status: 400,
                    message: `Wrong format data to create log`,
                    data: []
                })
            }

            connection = await oracledb.getConnection(
                config.database
            )
            const resultLogsmsApi = await connection.execute(`
                INSERT INTO MPLS_SMS_RESPONSE_BYPASS (
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
                REMAINING_CREDIT: mapvaluesms.remaining_credit,
                TOTAL_USE_CREDIT: mapvaluesms.total_use_credit,
                CREDIT_TYPE: mapvaluesms.credit_type,
                PHONENUMBER: mapvaluesms.phonenumber,
                MESSAGE_ID: mapvaluesms.message_id,
                USED_CREDIT: mapvaluesms.used_credit,
                ERROR_CODE: mapvaluesms.error_code,
                ERROR_NAME: mapvaluesms.error_name,
                ERROR_DESCRIPTION: mapvaluesms.error_description
            }, {
                autoCommit: true
            })

            console.log(`stamp log success : ${JSON.stringify(resultLogsmsApi)}`)

            if (!resultLogsmsApi) {
                return res.status(400).send({
                    status: 400,
                    message: `Log Stamp error`,
                    data: []
                })
            } else {
                return res.status(200).send({
                    status: 200,
                    message: `success send sms`,
                    data: mapvaluesms
                })
            }


        } catch (e) {
            console.error(e);
            return res.status(400).send({
                status: 400,
                message: `Fail to send sms service 2`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail to send sms service 3 : ${e.message}`,
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

function mapnewresponsearray(resArray) {

    if (!resArray.error) {
        resArray = {
            remaining_credit: resArray.remaining_credit ? resArray.remaining_credit : '',
            total_use_credit: resArray.total_use_credit ? resArray.total_use_credit : '',
            credit_type: resArray.credit_type ? resArray.credit_type : '',
            phonenumber: resArray.phone_number_list[0].number ? resArray.phone_number_list[0].number : '',
            message_id: resArray.phone_number_list[0].message_id ? resArray.phone_number_list[0].message_id : '',
            used_credit: resArray.phone_number_list[0].used_credit ? resArray.phone_number_list[0].used_credit : '',
            error_code: '',
            error_name: '',
            error_description: '',
        }
    } else {
        resArray = {
            remaining_credit: '',
            total_use_credit: '',
            credit_type: '',
            phonenumber: '',
            message_id: '',
            used_credit: '',
            error_code: resArray.error.code ? resArray.error.code : '',
            error_name: resArray.error.name ? resArray.error.name : '',
            error_description: resArray.error.description ? resArray.error.description : '',
        }
    }
    return resArray
}

async function sendsmsconfirmpayment(req, res, next) {
    let connection;
    try {
        console.log(`trigger`)
        let responseSendsms;
        let mapvaluesms;
        const {
            phone_no,
            sms_message,
            sender,
            force,
            smsserviceallow
        } = req.query

        try {

            if(smsserviceallow == 0) {
                return res.status(400).send({
                    status: 400,
                    message: `unallow to call service`,
                    data: [0]
                })
            }

            if (phone_no == '' && sms_message == '' && sender == '') {
                return res.status(400).send({
                    status: 400,
                    message: `missing arguement value`,
                    data: []
                })
            }

            sdk.auth(process.env.SMS_API_KEY, process.env.SMS_API_SECRET)

            responseSendsms = await sdk.post('/sms', {
                msisdn: phone_no,
                message: sms_message,
                sender: sender,
                force: force
            }, { Accept: 'application/json' })


            console.log(`response : ${responseSendsms}`)

            if (responseSendsms) {
                console.log(responseSendsms)
                mapvaluesms = mapnewresponsearray(responseSendsms)
                console.log(`this is mep new value : ${JSON.stringify(mapvaluesms)}`)
            }


        } catch (e) {
            return res.status(400).send({
                status: 400,
                message: `Fail to send sms service 1 : ${JSON.stringify(e)}`,
                data: []
            })
        }

        try {
            // === check type data format === 
            if (!mapvaluesms) {
                return res.status(400).send({
                    status: 400,
                    message: `Wrong format data to create log`,
                    data: []
                })
            }

            connection = await oracledb.getConnection(
                config.database
            )
            const resultLogsmsApi = await connection.execute(`
                INSERT INTO MPLS_SMS_RESPONSE (
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
                REMAINING_CREDIT: mapvaluesms.remaining_credit,
                TOTAL_USE_CREDIT: mapvaluesms.total_use_credit,
                CREDIT_TYPE: mapvaluesms.credit_type,
                PHONENUMBER: mapvaluesms.phonenumber,
                MESSAGE_ID: mapvaluesms.message_id,
                USED_CREDIT: mapvaluesms.used_credit,
                ERROR_CODE: mapvaluesms.error_code,
                ERROR_NAME: mapvaluesms.error_name,
                ERROR_DESCRIPTION: mapvaluesms.error_description
            }, {
                // autoCommit: true
            })

            console.log(`stamp log success : ${JSON.stringify(resultLogsmsApi)}`)

            if (!resultLogsmsApi) {
                return res.status(400).send({
                    status: 400,
                    message: `Log Stamp error`,
                    data: []
                })
            }

            // === commit all execute === 
            const commitall = await connection.commit();

            try {
                commitall

                return res.status(200).send({
                    status: 200,
                    messgae: 'success',
                    data: []
                })
            } catch {
                console.err(err.message)
                res.send(400).send(err.message)
            }

        } catch (e) {
            console.error(e);
            return res.status(400).send({
                status: 400,
                message: `Fail to send sms service 2`,
                data: []
            })
        }

    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail to send sms service 3`,
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

module.exports.sendsmscheck = sendsmscheck
module.exports.bypasssms = bypasssms
module.exports.sendsmsconfirmpayment = sendsmsconfirmpayment
