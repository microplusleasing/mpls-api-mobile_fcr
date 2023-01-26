const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')


async function mappingdataUpdate(application_num) {

    let connection;
    try {
        connection = await oracledb.getConnection(config.database)

        const resultdata = await connection.execute(`
            SELECT * FROM BTW.X_CUST_MAPPING_EXT
            WHERE APPLICATION_NUM = :APPLICATION_NUM
        `, {
            APPLICATION_NUM: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if(resultdata.rows.length !== 0) {
            const resData = resultdata.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return {
                data: lowerResData,
                message: `success`
            }
        }

    } catch (e) {
        console.error(e)
        return {
            data: [],
            message: `error with message : ${e}`
        }
    }

}

module.exports.mappingdataUpdate = mappingdataUpdate