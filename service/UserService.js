const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt = require('jsonwebtoken')

async function getuser(req, res, next) {
    let connection;

    try {
        oracledb.fetchAsString = []
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT * FROM USER_MOBILE
        `, [], // NO Bind
            {
                outFormat: oracledb.OBJECT
            })
        if (results.rows.length == 0) {
            return res.status(201).send({
                status: 201,
                message: 'No User',
                data: []
            })
        } else {
            const resData = results.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
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

async function loginService(req, res, next) {
    let connection;
    const {username, password} = req.query

    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT ID, USERNAME, PASSWORD, FULLNAME, EMAIL, ROLE FROM USER_MOBILE 
            WHERE USERNAME = :username AND PASSWORD = :password
        `, {
            username: username,
            password: password
        }, 
            {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            const noresultFormatJson = {
                status: 201,
                message: 'Not found Your ID'
            }
            res.status(201).send(noresultFormatJson)
        } else {
            let resData = results.rows[0]
            const token = jwt.sign(
                {
                    ID: resData.ID,
                    user_id: resData.USERNAME,
                    password: resData.PASSWORD,
                    fullname: resData.FULLNAME,
                    email: resData.EMAIL,
                    role: resData.ROLE
                },
                process.env.JWT_KEY, {
                expiresIn: "24h",
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

async function changePasswordSerivce(req, res, next) {
    let connection;
    const {username, password} = req.query

    try {
        connection = await oracledb.getConnection(
            config.database
        )
        const results = await connection.execute(`
            SELECT ID, USERNAME, PASSWORD, FULLNAME, EMAIL, ROLE FROM USER_MOBILE 
            WHERE USERNAME = :username AND PASSWORD = :password
        `, {
            username: username,
            password: password
        }, 
            {
                outFormat: oracledb.OBJECT
            })

        if (results.rows.length == 0) {
            const noresultFormatJson = {
                status: 201,
                message: 'Not found Your ID'
            }
            res.status(201).send(noresultFormatJson)
        } else {
            let resData = results.rows[0]
            const token = jwt.sign(
                {
                    ID: resData.ID,
                    user_id: resData.USERNAME,
                    password: resData.PASSWORD,
                    fullname: resData.FULLNAME,
                    email: resData.EMAIL,
                    role: resData.ROLE
                },
                process.env.JWT_KEY, {
                expiresIn: "24h",
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


module.exports.getuser = getuser
module.exports.userlogin = loginService
module.exports.changePasswordSerivce = changePasswordSerivce