const oracledb = require('oracledb')
const config = require('./connectdb')
const tolowerService = require('./tolowerkey')

async function MPLS_master_term(req, res, next) {
    let connection;
    const { pro_code, size_model } = req.query
    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT TERM
            FROM BTW.TENOR_P 
            WHERE SIZE_CODE = :size_model
            AND PRO_CODE = :pro_code
            AND TRUNC(SYSDATE) BETWEEN TRUNC(ST_DATE) AND TRUNC(NVL(EN_DATE,SYSDATE))
            ORDER BY TERM
        `, {
            pro_code: '01', // fix code
            size_model: size_model
        }, {
            outFormat: oracledb.OBJECT
        })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No Payment count',
                data: []
            })
        } else {
            const resData = results.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            const updatedArray = lowerResData.map(item => {
                // Use Number() to convert the string to a number
                item.term = Number(item.term);
                return item;
              });
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: updatedArray
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

module.exports.MPLS_master_term = MPLS_master_term