const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')


async function getdipchiptoken(req, res, next) {

    let connection;
    try {

        const token = req.user
        const userid = token.ID


        console.log(`this is userid for check token : ${userid}`)
        if(!userid) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบเลข USERID (TOKEN)`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)
        const dcToken = await connection.execute(`
            SELECT USERID , TOKEN_KEY
            FROM BTW.USERS
            WHERE USERID = :USERID
        `, {
            USERID: userid
        }, {
            outFormat: oracledb.OBJECT
        })

        if(dcToken.rows.length == 0) {
            return res.status(400).send({
                status: 400,
                message: `ไม่พบ USERID (DB)`
            })
        }

        if(dcToken.rows.length > 1) {
            return res.status(400).send({
                status: 400,
                message: `DUPLICATE USERID (DB)`
            }) 
        }

        if(dcToken.rows.length == 1) {
            const resData = dcToken.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }


    } catch (e) {
        console.error(e)
        return res.status(400).send({
            status: 400,
            message: `Fail to Get DIP CHIP token`,
            data: []
        })
    }
}

module.exports.getdipchiptoken = getdipchiptoken