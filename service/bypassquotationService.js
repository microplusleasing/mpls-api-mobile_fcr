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

async function bypassquotation(req, res, next) {
    let connection;
    oracledb.fetchAsString = []

    try {
        let validateQuo = false

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

        const customersig_image = fileData.customersig_image ? fileData.customersig_image : null
        const witnesssig_image = fileData.witnesssig_image ? fileData.witnesssig_image : null

        const customersigbuffer = customersig_image ? imagetobuffer(customersig_image) : null
        const witnesssigbuffer = witnesssig_image ? imagetobuffer(witnesssig_image) : null

        let quotationid = JSON.parse(formData.quotationid)
        quotationid = quotationid.toString()

        // === check validation ===
        connection = await oracledb.getConnection(
            config.database
        )
        const resultCheck = await connection.execute(`
            SELECT QUO_KEY_APP_ID, CONTRACT_NO, LOAN_RESULT FROM
            MPLS_QUOTATION WHERE 
            QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultCheck.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No quotation found',
                data: []
            })
        } else {
            const resCheckData = resultCheck.rows[0]
            console.log(`this is contract_no : ${resCheckData.CONTRACT_NO}`)
            validateQuo = resCheckData.LOAN_RESULT == 'Y' ? false : true
            if (validateQuo) {
                return res.status(200).send({
                    status: 200,
                    message: 'quotation record not valid',
                    data: resCheckData
                })
            } else {
                try {

                    const resultCheckDuplicate = await connection.execute(`
                        SELECT CONS_QUO_KEY_APP_ID FROM MPLS_CONSENT
                        WHERE CONS_QUO_KEY_APP_ID = :quotationid
                    `, {
                        quotationid: quotationid
                    }, {
                        outFormat: oracledb.OBJECT
                    })
                    console.log(`this is resultCheckDup : ${JSON.stringify(resultCheckDuplicate)}`)
                    if (resultCheckDuplicate.rows.length == 0) {
                        // === allow bypass ===
                        try {
                            const consentkeyid = uuidv4();
                            // === insert consent record to link with quotation recotd === 
                            const resultsUpdate = await connection.execute(`INSERT INTO MPLS_CONSENT (
                                CONS_QUO_KEY_APP_ID, APP_KEY_ID, SIGNATURE_IMAGE, WITNESS_IMAGE)
                            VALUES (:CONS_QUO_KEY_APP_ID, :APP_KEY_ID, :SIGNATURE_IMAGE, :WITNESS_IMAGE)`,
                                {
                                    CONS_QUO_KEY_APP_ID: quotationid,
                                    APP_KEY_ID: consentkeyid,
                                    SIGNATURE_IMAGE: customersigbuffer,
                                    WITNESS_IMAGE: witnesssigbuffer
                                },
                                {
                                    autoCommit: true
                                }
                            )

                            console.log(`sussecc create consent bypass : ${resultsUpdate.rowsAffected}`)

                            const resResultUpdate = resultsUpdate.rows

                            return res.status(200).send({
                                status: 200,
                                message: 'create consent bypass success',
                                data: resResultUpdate
                            })

                        } catch (e) {
                            console.log(`error create consent bypass : ${e}`)
                            console.error(e);
                            return next(e)
                        } 
                        
                    } else {
                        // === duplicate record ===
                        return res.status(201).send({
                            status: 201,
                            message: `Can't create, Record was Duplicate`,
                            data: []
                        })
                    }

                } catch (e) {
                    console.log(`error check validate consent bypass : ${e}`)
                    console.error(e);
                    return next(e)
                }
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

async function bypassquotationbychecker(req, res, next) {

    let connection;
    try {

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

        const customersig_image = fileData.customersig_image ? fileData.customersig_image : null
        const witnesssig_image = fileData.witnesssig_image ? fileData.witnesssig_image : null

        const customersigbuffer = customersig_image ? imagetobuffer(customersig_image) : null
        const witnesssigbuffer = witnesssig_image ? imagetobuffer(witnesssig_image) : null

        let quotationid = JSON.parse(formData.quotationid)
        quotationid = quotationid.toString()
        const firstname = formData.firstname[0]
        const lastname = formData.lastname[0]

        console.log(`this is quotation id : ${quotationid}`)
        console.log(`this is firstname : ${firstname}`)
        console.log(`this is lastname : ${lastname}`)


        connection = await oracledb.getConnection(
            config.database
        )
        const resultChkDup = await connection.execute(`
            SELECT APP_KEY_ID FROM MPLS_CONSENT
            WHERE CONS_QUO_KEY_APP_ID = :quotationid
        `, {
            quotationid: quotationid
        }, {
            outFormat: oracledb.OBJECT
        })

        if (resultChkDup.rows.length !== 0) {
            return res.status(201).send({
                status: 201,
                message: `Consent was duplicate`,
                data: []
            })
        } else {
            // === create consent record bypass ====
            const consentkeyid = uuidv4();
            const resultsInsertConsent = await connection.execute(`
                INSERT INTO MPLS_CONSENT (
                CONS_QUO_KEY_APP_ID, APP_KEY_ID, FRIST_NAME, LAST_NAME, IS_DISCLOSURE_CONSENT, 
                IS_PERSONAL_DISCLOSURE_CONSENT, IS_CREDIT_CONSENT, SIGNATURE_IMAGE, WITNESS_IMAGE)
                VALUES (:CONS_QUO_KEY_APP_ID, :APP_KEY_ID, :FRIST_NAME, :LAST_NAME, :IS_DISCLOSURE_CONSENT, 
                :IS_PERSONAL_DISCLOSURE_CONSENT, :IS_CREDIT_CONSENT, :SIGNATURE_IMAGE, :WITNESS_IMAGE)
            `, {
                CONS_QUO_KEY_APP_ID: quotationid,
                APP_KEY_ID: consentkeyid,
                FRIST_NAME: firstname,
                LAST_NAME: lastname,
                IS_DISCLOSURE_CONSENT: '1',
                IS_PERSONAL_DISCLOSURE_CONSENT: '1',
                IS_CREDIT_CONSENT: '1',
                SIGNATURE_IMAGE: customersigbuffer,
                WITNESS_IMAGE: witnesssigbuffer
            }, {
                autoCommit: true
            })

            if (resultsInsertConsent.rowsAffected == 1) {
                // === success create ref ===
                return res.status(200).send({
                    status: 200,
                    message: `Success create consent record reference`,
                    data: resultsInsertConsent.rows
                })
            } else {
                return res.status(201).send({
                    status: 201,
                    message: `Fail to create consent record reference`,
                    data: []
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


module.exports.bypassquotation = bypassquotation
module.exports.bypassquotationbychecker = bypassquotationbychecker
