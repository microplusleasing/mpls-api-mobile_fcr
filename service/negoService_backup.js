const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
// const formidable = require('formidable');
// var multiparty = require('multiparty');
// const { result } = require('lodash');
// const fs = require('fs');
// var util = require('util');
const _util = require('./_selfutil');
const { result } = require('lodash');
const e = require('cors');

async function getcontractlist(req, res, next) {
    let connection;
    try {
        // let cust_id = [];
        const { name, surname, applicationid } = req.query
        connection = await oracledb.getConnection(
            config.database
        )

        // console.log(`this is name : ${name}`)

        // ==== step 1 find cust_no from schema `CUST_INFO` ==== 

        const testsur = surname ? `${surname}%` : `${surname}`


        let finishsql;
        let bindparams = {};
        let queryname = ''
        let querysurname = ''
        let queryappid = ''
        // ==== build query string form execute ====
        const sqlbase = `SELECT AP.HP_NO, AP.MONTHLY, AP.FIRST_DUE, CI.NAME, CI.SNAME , QUO.LATITUDE, QUO.LONDTIUDE, QUO.ADDRESS
                            FROM BTW.AC_PROVE AP
                            LEFT JOIN BTW.CUST_INFO CI
                            ON AP.CUST_NO_0 = CI.CUST_NO
                            LEFT JOIN
                            (
                            SELECT quo.application_num,LP.ADDRESS, lp.LATITUDE, lp.LONDTIUDE  from
                            mpls_quotation quo
                            LEFT JOIN mpls_living_place lp
                            ON QUO.QUO_LIVING_PLACE_ID = lp.app_key_id
                            ) QUO
                            ON AP.HP_NO = QUO.APPLICATION_NUM
                        `
        if (name) {
            queryname = `WHERE CI.NAME LIKE :custname`
            bindparams.custname = `${name}%`
        }
        if (surname) {

            if (!name) {
                querysurname = `WHERE CI.SNAME LIKE :surname`
            } else {
                querysurname = ` AND CI.SNAME LIKE :surname`
            }

            bindparams.surname = `${surname}%`
        }

        if (applicationid) {

            if (!(name || surname)) {
                queryappid = `WHERE AP.HP_NO = :applicationid`
            } else {
                queryappid = ` AND AP.HP_NO = :applicationid`
            }

            bindparams.applicationid = applicationid

        }

        finishsql = `${sqlbase}${queryname}${querysurname}${queryappid}`

        // console.log(`finishsql : ${finishsql}`)
        // console.log(`bindparams : ${JSON.stringify(bindparams)}`)

        const resultnego = await connection.execute(finishsql, bindparams, { outFormat: oracledb.OBJECT })

        if (resultnego.rows.length == 0) {
            return res.status(404).send({
                status: 404,
                message: 'NO RECORD FOUND',
                data: []
            })
        } else {
            const resData = resultnego.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
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

async function getnegotiationlist(req, res, next) {
    let connection;
    try {

        const { pageno } = req.query

        const indexstart = (pageno - 1) * 5 + 1
        const indexend = (pageno * 5)
        let rowCount;

        // === GETUSER ID AND CHANNAL_TYPE (25/05/2022) ===
        const token = req.user
        const userid = token.ID
        const radmin = token.radmin

        connection = await oracledb.getConnection(
            config.database
        )

        const resultnegoinfo = await connection.execute(`
        select COUNT(hp_no) as count 
        from btw.nego_info
        where staff_id = :userid
        `, {
            userid: userid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultnegoinfo.rows[0].count == 0) {
            return res.status(200).send({
                status: 200,
                message: `no data`,
                data: []
            })
        } else {

            try {

                // === get record of negotiation === 
                rowCount = resultnegoinfo.rows[0].COUNT

                const resultList = await connection.execute(`
                SELECT * FROM (select rec_date, status_recall, appoint_date, message1, 
                            message2, pay ,ROW_NUMBER() OVER (ORDER BY rec_date DESC) LINE_NUMBER
                from btw.nego_info
                where staff_id = :userid
                ) WHERE LINE_NUMBER BETWEEN :indexstart AND :indexend 
                `, {
                    userid: userid,
                    indexstart: indexstart,
                    indexend: indexend
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (resultList.rows.length == 0) {
                    return res.status(404).send({
                        status: 404,
                        message: 'No negotaiation record',
                        data: []
                    })
                } else {

                    const resData = resultList.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(pageno)
                    returnData.pageSize = 10
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                console.error(e)
                return res.status(400).send({
                    status: 400,
                    mesasage: `error during get list data of colletion : ${e.message}`,
                    data: []
                })
            }
        }
    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            mesasage: `error during count record colletion : ${e.message}`,
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

module.exports.getcontractlist = getcontractlist
module.exports.getnegotiationlist = getnegotiationlist