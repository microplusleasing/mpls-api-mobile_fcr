const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const path = require('path');
const { database } = require('./connectdb');
const { result } = require('lodash');
const { getiappdata } = require('./../data/iappmockdata')
const fetch = require('node-fetch')
const { v4: uuidv4 } = require('uuid');

function testTime(req, res, next) {
    // let dateselect = `18 เม.ย. 2537`
    try {
        let dateselect = `18 Apr 1994`
        dateselect = dateselect.replaceAll(' ', '-');
        console.log(`tran date : ${dateselect}`)


        var date = moment(dateselect, 'DD-MMM-YYYY')
        // var date = moment('15-06-2010', 'DD-MM-YYYY')
        console.log(date.format('MM-DD-YYYY'))
        // let dateselect = `18 เม.ย. 2537`

        return res.status(200).send({
            date: date
        })
    } catch (e) {
        return res.status(500).send({
            status: 500,
            message: `server error with status : ${e.message}`
        })
    }
}

function testiappservice(req, res, next) {

    try {
        const iappdata = getiappdata()
        setTimeout(() => {
            return res.status(200).send(
                iappdata
            )
        }, 1500);
    } catch (e) {
        return res.status(500).send({
            status: 500,
            message: `server error with status : ${e.message}`
        })
    }
}

async function bypasssendcarhandlecase(req, res, next) {
    let connection;
    try {

    } catch (e) {

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

async function genid(req, res, next) {
    let connection;
    try {
        const figen = uuidv4();
        const segen = uuidv4();

        console.log(`figen : ${figen}`)
        console.log(`segen : ${segen}`)

    } catch (e) {

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

async function smssendtest(req, res, next) {
    try {

        let formData

        let { value1, value2, value3 } = req.body.items

        return res.status(200).send({
            status: 200,
            message: `This is value return to client value1 : ${value1} , value2: ${value2} , value3: ${value3}`,
            data: []
        })


    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `return error with message : ${e.message}`
        })
    }
}

async function getipserver(req, res, next) {
    try {

        var ipserver = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
        // var ipserver = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        // var ipserver =  req.ip;
        if (ipserver.substr(0, 7) == "::ffff:") {
            ipserver = ipserver.substr(7)
        }
        return res.status(200).send({
            status: 200,
            message: `success`,
            data: `${ipserver}`
        })
    } catch (e) {

        return res.status(400).send({
            status: 400,
            message: `fail with message : ${JSON.stringify(e)}`
        })
    }
}

async function getipfromhttp(req, res, next) {
    try {
        const apiResponse = await fetch(
            'http://api.ipify.org/?format=json'
        )
        const apiResponseJson = await apiResponse.json()
        // await db.collection('collection').insertOne(apiResponseJson)
        return res.status(200).send({
            status: 200,
            message: `success`,
            data: apiResponseJson
        })
        // res.send('Done – check console log')
    } catch (e) {
        return res.status(400).send({
            status: 400,
            message: `fail with message : ${e}`
        })
    }
}

async function testexcecuteresponse(req, res, next) {
    let connection;

    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )

        // === build mock data ===
        const p_application_num = '0110202210070003'
        const p_contract_no = null
        const p_pay_status = 1
        const p_term = 36
        const p_confirm_by = 'TEST3'
        const results = await connection.execute(`
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
                p_application_num: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: p_application_num },
                p_contract_no: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: p_contract_no },
                p_pay_status: { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: p_pay_status },
                p_term: { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: p_term },
                p_confirm_by: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: p_confirm_by },
                err_code: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                err_msg: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                status: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            }
        )


        if (results) {
            return res.status(200).send({
                status: 200,
                message: results
            })
        } else {
            return res.status(400).send({
                status: 400,
                message: '`NO return`'
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

module.exports.testTime = testTime
module.exports.testiappservice = testiappservice
module.exports.genid = genid
module.exports.smssendtest = smssendtest
module.exports.getipserver = getipserver
module.exports.getipfromhttp = getipfromhttp
module.exports.testexcecuteresponse = testexcecuteresponse


