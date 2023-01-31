const oracledb = require('oracledb')
const config = require('./connectdb')

async function generatetokenWelcomeCall(req, res, next) {

    let connection;
    try {

        // === get Username === 
        const token = req.user
        const username = token.username

        console.log(`username in welcome : ${username}`)

        // === get token and menuid === (query)
        const reqData = req.query

        // === check all param === 
        if (!(reqData.menu_id && reqData.token && username)) {
            return res.status(200).send({
                status: 500,
                message: `missiong parameter (menu_id, username, token)`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        // === insert token into BTW.TOKEN === 
        const insertToken = await connection.execute(`
            INSERT INTO BTW.TOKEN 
            (
                TOKEN_ID, 
                VALUE_1, 
                VALUE_2
            ) 
            VALUES 
            (
                :TOKEN_ID, 
                :VALUE_1, 
                :VALUE_2 
            )
        `
            , {
                TOKEN_ID: reqData.token,
                VALUE_1: username,
                VALUE_2: reqData.menu_id
            }, {})

        // === CHECK RESULT OF INSERT TOKEN ===

        if (insertToken.rowsAffected !== 1) {
            return res.status(200).send({
                status: 500,
                message: `สร้างรายการ TOKEN ไม่สำเร็จ : rowAffected: ${insertToken.rowsAffected}`,
                data: []
            })
        } else {
            // === created token success ===

            const commitall = await connection.commit();

            try {
                commitall
            } catch (e) {
                console.err(e.message)
                return res.status(200).send({
                    status: 500,
                    message: `Eror : ${e.message}`,
                    data: []
                })
            }
            
            return res.status(200).send({
                status: 200,
                message: `สร้างรายการ TOKEN สำเร็จ`,
                data: []
            })
        }


    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 500,
            message: `Fail : ${e.message ? e.message : 'No message'}`,
            data: []
        })
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


module.exports.generatetokenWelcomeCall = generatetokenWelcomeCall