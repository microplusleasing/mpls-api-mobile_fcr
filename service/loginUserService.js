const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt = require('jsonwebtoken')
const nodemailer = require("nodemailer");
const moment = require('moment');
const { now } = require('moment');
const log4js = require("log4js");

log4js.configure({
    appenders: {
        login: { type: "file", filename: "user.log" },
        forgetpassword: { type: "file", filename: "user.log" },
        resetpassword: { type: "file", filename: "user.log" },
    },
    categories: {
        default: { appenders: ["login"], level: "info" },
        forgetpassword: { appenders: ["forgetpassword"], level: "info" },
        resetpassword: { appenders: ["resetpassword"], level: "info" },
    },
});

async function loginUser(req, res, next) {
    let connection;
    // const { username, password } = req.query
    const { username, password } = req.body
    // console.log(`this is userID : ${username}`)
    const logger = log4js.getLogger("login");

    try {


        // ==== encrypt password ==== 
        connection = await oracledb.getConnection(
            config.database
        )

        try {
            let queryStr = `
                    select a.userid ,a.username, (b.emp_name) as fname , (b.emp_lname) as lname, b.email, a.radmin , a.status, TO_CHAR(a.DATE_CHPWS, 'DD/MM/YYYY') AS EXPIRE_DATE
                    from btw.users a , BTW.EMP b
                    where a.username = :username
                    and a.password = BTW.TOOLKIT.encrypt (:password)
                    and a.userid = b.emp_id
                    and a.activate = 'T'
                    `


            const resultLogin = await connection.execute(queryStr,
                {
                    username: username,
                    password: password
                },
                {
                    outFormat: oracledb.OBJECT
                })

            if (resultLogin.rows.length == 0) {
                logger.error(`user ${username} fail to login : Not found user with ID/PW login`);
                const noresultFormatJson = {
                    status: 201,
                    message: 'Not found user with ID/PW login'
                }
                res.status(201).send(noresultFormatJson)
            } else {

                let resData = resultLogin.rows[0]

                // === log user login (04/09/2022) === 
                try {

                    // === check password expire date (19/10/2022) === 

                    // *** chage check expire date from field expire that plus auto from resetpassword to check with paremeter when login (P Thep Khor) (09/06/2023)

                    // === get expire time change from oracle X_CPS_INIT (25/10/2022) ===

                    const resultexpireduration = await connection.execute(`
                            SELECT DETAIL FROM BTW.X_CPS_INIT
                            WHERE HEADER = 'DAY_CHANGE_PWS'
                        `, {}, {
                        outFormat: oracledb.OBJECT
                    })

                    if (resultexpireduration.rows.length == 0) {
                        return res.status(200).send({
                            status: 400,
                            message: `ไม่พบการกำหนดค่าวันหมดอายุของระบบ, ไม่สามารถเข้าใช้งานได้`,
                            data: []
                        })
                    }

                    // === create expire duration ====

                    const expireduration = resultexpireduration.rows[0].DETAIL

                    console.log(`result expire duration : ${expireduration}`)

                    if (!expireduration) {
                        return res.status(200).send({
                            status: 400,
                            message: `ไม่พบการกำหนดค่า expire duration บนระบบ`,
                            data: []
                        })
                    }

                    const nowdate = moment().toDate()

                    // *** chage check expire date from field expire that plus auto from resetpassword to check with paremeter when login (P Thep Khor) (09/06/2023)\

                    // ***=== when 09/06/2023 chage field in sql DATE_CHPWS (in api is expire_date) that before is EXPIRE_DATE into keep date that change password (request fix by P Thep) ===***

                    // const expire_date = moment(resData.EXPIRE_DATE, 'DD/MM/YYYY').toDate()
                    const expire_date = moment(resData.EXPIRE_DATE, 'DD/MM/YYYY').add(90, 'days').toDate();


                    if (nowdate >= expire_date) {
                        return res.status(200).send({
                            status: 202,
                            message: `รหัสผ่านหมดอายุหรือยังไม่ได้ยืนยันตัวกรุณาเปลี่ยนรหัสผ่านใหม่`,
                            data: {
                                expire: 'Y'
                            }
                        })
                    }

                    console.log(`this is now (moment) : ${nowdate} , expire_date : ${expire_date}`)



                    const resultinsertloglogin = await connection.execute(`
                            INSERT INTO MPLS_LOGIN_LOG (
                                USERID
                            ) VALUES (:USERID)
                        `, {
                        USERID: resData.USERID
                    }, {
                        autoCommit: true
                    })

                    // *** update last login (08/06/2023) ***
                    const updatelastlogin = await connection.execute(`
                     UPDATE USERS  SET LAST_LOGIN = SYSDATE
                             WHERE USERNAME = :USERNAME
                 `, {
                        USERNAME: username
                    }, {
                        autoCommit: true
                    })

                    console.log(`success log login user : ${resultinsertloglogin.rowsAffected}`)
                    console.log(`success log last login : ${updatelastlogin.rowsAffected}`)
                } catch (e) {
                    console.log(`can't log login : ${e.message}`)
                }


                resData.expire = 'N'

                // === set full name (checker) === 
                resData.FULLNAME = `${resData.FNAME} ${resData.LNAME}`
                // === set ID (checker) ===
                resData.ID = resData.USERID
                // === set username ==== 
                resData.USERNAME = username
                resData.WITNESS_NAME = resData.FNAME
                resData.WITNESS_LNAME = resData.LNAME

                const token = jwt.sign(
                    {
                        ID: resData.ID,
                        user_id: resData.USERNAME,
                        password: resData.PASSWORD,
                        fullname: resData.FULLNAME,
                        email: resData.EMAIL,
                        radmin: resData.RADMIN ? resData.RADMIN : '',
                        role: resData.ROLE,
                        // channal: resData.channal,
                        channal: 'collector',
                        seller_id: resData.SELLER_ID,
                        username: resData.USERNAME,
                        witness_name: resData.WITNESS_NAME,
                        witness_lname: resData.WITNESS_LNAME
                    },
                    process.env.JWT_KEY, {
                    expiresIn: "24h",
                }
                )

                const dialer_token = jwt.sign(
                    {
                        userId: resData.USERNAME
                    },
                    process.env.MOBILE_DIAL_KEY, {
                    expiresIn: "24h",
                }
                )
                let returnData = new Object
                returnData.token = token
                returnData.dialer_token = dialer_token
                returnData.data = resData
                returnData.status = 200,
                    returnData.message = 'success'

                // === tran all upperCase to lowerCase === 
                let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                    result[key.toLowerCase()] = val;
                });

                // res.status(200).json(results.rows[0]);
                // logger.info(`user ${username} login successfully`);
                res.status(200).json(returnDatalowerCase);
            }
        } catch (e) {
            logger.error(`user ${username} fail to login : ${e}`);
            return res.status(400).send({
                status: 400,
                message: `fail : ${e}`,
                data: []
            })
        }


    } catch (e) {
        logger.error(`user ${username} fail to login : ${e}`);
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

function setchannalbyvalue(type) {

    switch (type) {
        case '0': {
            return 'dealer'
        }
            break;
        case '1': {

            return 'checker'
        }
            break;
        case '2': {
            return 'collector'
        }
            break;
        default:
        // code block
    }

}

async function forgetpassword(req, res, next) {

    let connection;
    try {

        // === get query params === 
        const { email } = req.body


        // === check params ====
        if (!email) {
            return res.status(200).send({
                status: 400,
                message: `missing parameters(email, message)`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        // === check email is valid 
        // *** email in database (EMP) ***

        let chkemailvalid = await connection.execute(`
            SELECT USERS.PASSWORD 
            FROM USERS 
            LEFT JOIN EMP 
            ON USERS.USERID = EMP.EMP_ID
            WHERE EMP.EMAIL = :email
        `, {
            email: email
        }, {
            outFormat: oracledb.OBJECT
        })

        if (chkemailvalid.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'ไม่พบ Email ในระบบ ติดต่อเจ้าหน้าที่',
                data: []
            })
        }

        // === get password adn decrypt ===
        const encryptpass = chkemailvalid.rows[0].PASSWORD
        const chkdecryptpass = await connection.execute(`
            select btw.TOOLKIT.decrypt (:encryptpass) as epassword from dual
        `, {
            encryptpass: encryptpass
        }, {
            outFormat: oracledb.OBJECT
        })

        if (chkdecryptpass.rows.length == 0) {
            return res.stats(200).send({
                status: 400,
                messgae: `เกิดข้อผิดพลาด กรุณาติดต่อแผนก IT`,
                data: []
            })
        }

        // === declare decryptpass === 
        const decryptpass = chkdecryptpass.rows[0].EPASSWORD

        // === check variable for send email (PASSWORD and email) ====

        if (!(email && decryptpass)) {
            return res.status(200).send({
                status: 400,
                message: `เกิดข้อผิดพลาด กรุณาติดต่อแผนก IT (No password)`,
                data: []
            })
        }

        // === send email with USER password === 
        try {

            let transporter = nodemailer.createTransport({
                host: "mail.online.inet.co.th",
                port: 587,
                secure: false, // true for 465, false for other ports
                tls:
                {
                    servername: 'mail.online.inet.co.th'
                },
                auth: {
                    user: 'info@microplusleasing.com', // generated ethereal user
                    pass: 'Mplus@2022', // generated ethereal password
                }

            })

            // send mail with defined transport object
            let info = await transporter.sendMail({
                from: 'info@microplusleasing.com', // sender address
                to: email, // list of receivers
                subject: "Recovery Password", // Subject line
                text: "รหัสผ่านสำหรับเข้าใช้งานระบบออกใบคำขอ (MPlus)", // plain text body
                html: `<b>รหัสผ่านสำหรับเข้าใช้งานของคุณคือ '${decryptpass}'</b>`, // html body
            })

            // === check success send email ===
            if (info.accepted.length == 0) {
                return res.status(200).send({
                    status: 400,
                    message: `ส่ง Email ไม่สำเร็จ : ${info.response}`
                })
            }

            // === finish send email ===

            return res.status(200).send({
                status: 200,
                message: `Email send successfuly`,
                data: []
            })

        } catch (e) {
            console.error(e);
            return res.status(400).send({
                status: 400,
                message: `Fail : ${e}`,
                data: []
            })
        }




    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : ${e}`,
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

async function resetpassword(req, res, next) {

    let connection;
    try {

        const { username, oldpassword, newpassword } = req.body

        // === check params ===

        if (!(username && oldpassword && newpassword)) {
            return res.status(200).send({
                status: 400,
                message: `ข้อมูลไม่ครบ ไม่สามารถเปลี่ยน password ได้`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        const resultchkpassword = await connection.execute(`
                select a.userid ,a.username, (b.emp_name) as fname , (b.emp_lname) as lname, b.email, a.radmin , a.status, TO_CHAR(a.DATE_CHPWS, 'DD/MM/YYYY') AS EXPIRE_DATE
                from btw.users a , BTW.EMP b
                where a.username = :username
                and a.password = btw.TOOLKIT.encrypt(:oldpassword)
                and a.userid = b.emp_id
                and a.activate = 'T'
        `, {
            username: username,
            oldpassword: oldpassword
        }, {
            outFormat: oracledb.OBJECT
        })

        // === check user is already exists === 

        if (resultchkpassword.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: `กรอก username, password ไม่ถูกต้อง`,
                data: []
            })
        }

        // === get username form check result (25/10/2022) ===

        const resultusername = resultchkpassword.rows[0].USERNAME // ext. 10654004

        const userid = resultchkpassword.rows[0].USERID

        console.log(`result username : ${resultusername}`)

        // === check password not-repeat 3 time === 

        const chkpasswordrepeat = await connection.execute(`
                    SELECT * FROM    
                        (
                            SELECT * FROM
                                (SELECT USER_NAME, PASSWORD_NEW  FROM BTW.PASSWORD_LOG
                                    WHERE USER_NAME = :username
                                    ORDER BY UPD_DATETIME DESC
                                ) LPW 
                            WHERE ROWNUM <= 3
                        ) ONPW
                    WHERE ONPW.PASSWORD_NEW = btw.TOOLKIT.encrypt(:newpassword)
                `, {
            username: resultusername,
            newpassword: newpassword
        }, {
            outFormat: oracledb.OBJECT
        })

        if (chkpasswordrepeat.rows.length !== 0) {
            // === password invalid (repeat last 3 time) ===
            return res.status(200).send({
                status: 400,
                message: `Password ซ้ำภายใน 3 ครั้งล่าสุด กรุณาเลือก Password ใหม่`
            })
        }

        // === get expire time change from oracle X_CPS_INIT (25/10/2022) ===

        const resultexpireduration = await connection.execute(`
            SELECT DETAIL FROM BTW.X_CPS_INIT
            WHERE HEADER = 'DAY_CHANGE_PWS'
        `, {}, {
            outFormat: oracledb.OBJECT
        })

        if (resultexpireduration.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: `ไม่พบการกำหนดค่า expire duration บนระบบ`,
                data: []
            })
        }

        // === create expire duration ====

        const expireduration = resultexpireduration.rows[0].DETAIL

        console.log(`result expire duration : ${expireduration}`)

        if (!expireduration) {
            return res.status(200).send({
                status: 400,
                message: `ไม่พบการกำหนดค่า expire duration บนระบบ`,
                data: []
            })
        }

        // === update with new password (and add expire date next 3 month.) === (deprecate) (09/06/2023) ===

        // *** chage check expire date from field expire that plus auto from resetpassword to check with paremeter when login (P Thep Khor) (09/06/2023) === instead 

        // **** ==== (replace 'DATE_CHPWS = SYSDATE' instead of 'DATE_CHPWS = SYSDATE + :expireduration') (09/06/2023) ****

        const resultupdatepassword = await connection.execute(`
                UPDATE BTW.USERS
                SET PASSWORD = btw.TOOLKIT.encrypt(:newpassword),
                    DATE_CHPWS = SYSDATE
                WHERE USERNAME = :resultusername
                AND ACTIVATE = 'T'
        `, {
            newpassword: newpassword,
            resultusername: resultusername
        }, {
            outFormat: oracledb.OBJECT
        })


        // === check update success === 

        if (resultupdatepassword.rowsAffected == 0) {
            return res.status(200).send({
                status: 400,
                message: `ไม่สามารถอัพเดทรหัสผ่านได้ตามเงื่อนไข`,
                data: []
            })
        }

        if (resultupdatepassword.rowsAffected !== 1) {
            return res.status(200).send({
                status: 400,
                message: `ไม่สามารถอัพเดทรหัสผ่านได้ เงื่อนไขไม่ถูกต้อง (Duplication rows update)`,
                data: []
            })
        }

        // === insert password_log record (26/10/2022) ===

        try {


            const insertpasswordlog = await connection.execute(`
            INSERT INTO BTW.PASSWORD_LOG (
                USER_NAME, 
                USER_ID, 
                PASSWORD_OLD, 
                PASSWORD_NEW, 
                UPD_DATETIME 
                )
            VALUES (
                :USER_NAME, 
                :USER_ID, 
                btw.TOOLKIT.encrypt(:PASSWORD_OLD), 
                btw.TOOLKIT.encrypt(:PASSWORD_NEW), 
                SYSDATE
                )
            `, {
                USER_NAME: username,
                USER_ID: userid,
                PASSWORD_OLD: oldpassword,
                PASSWORD_NEW: newpassword
            })

            console.log(`sussecc create password log record : ${insertpasswordlog.rowsAffected}`)

        } catch (e) {
            console.log(`error create password_log : ${e}`)
            logger.error(`user ${userid} : ข้อมูลเอกสารสัญญาไม่ถูกต้อง : ${e.message ? e.message : `No message`}`)
            return res.status(200).send({
                status: 400,
                message: `สร้าง password log record ไม่สำเร็จ : ${e.message ? e.message : `No message`}`
            })
        }

        // === success update password ==== 

        const commitall = await connection.commit();
        try {
            commitall
        } catch {
            console.err(err.message)
            res.send(200).send({
                status: 400,
                message: `เกิดข้อผิดพลาดที่ server : ${e.message ? e.message : 'No return message'}`
            })
        }

        return res.status(200).send({
            status: 200,
            message: `อัพเดทรหัสผ่านสำเร็จ, กลับหน้า login เพื่อเข้าสู่ระบบ`,
            data: []
        })



    } catch (e) {
        console.error(e);
        return res.status(400).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'no return message'}`,
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

async function sendemailsmtp(req, res, next) {

    const { message, email } = req.body

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "mail.online.inet.co.th",
        port: 587,
        secure: false, // true for 465, false for other ports
        tls:
        {
            servername: 'mail.online.inet.co.th'
        },
        auth: {
            user: 'info@microplusleasing.com', // generated ethereal user
            pass: 'Mplus@2022', // generated ethereal password
        }

    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: 'info@microplusleasing.com', // sender address
        to: "napat.rodniem1994@gmail.com", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: "<b>Hello world?</b>", // html body
    })

    console.log(`this is info : ${JSON.stringify(info)}`)

}

async function getcurrentUserFormToken(req, res, next) {

    let connection;
    try {

        const { token_oracle } = req.body
        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
            SElECT VALUE_1 AS USER_NAME
                FROM BTW.TOKEN
            WHERE TOKEN_ID = :TOKEN_ID
            `
            , {
                TOKEN_ID: token_oracle
            }, {
            outFormat: oracledb.OBJECT
        })

        if (result.rows.length == 0) {
            return res.status(200).send({
                status: 400,
                message: 'No user',
                data: []
            })
        } else {

            const userData = result.rows[0].USER_NAME

            if (!userData) {
                return res.status(200).send({
                    status: 400,
                    message: 'Not Found User_name with token',
                    data: []
                })
            } else {

                const passworddecode = await connection.execute(`
                    SELECT PASSWORD 
                    FROM BTW.USERS
                    WHERE USERNAME = :USERNAME
                `, {
                    USERNAME: userData
                }, {
                    outFormat: oracledb.OBJECT
                })

                if (passworddecode.rows.length == 0) {
                    return res.status(200).send({
                        status: 400,
                        message: 'Not found Password',
                        data: []
                    })
                } else {
                    const passwordValue = passworddecode.rows[0].PASSWORD

                    if (!passwordValue) {
                        return res.status(200).send({
                            status: 400,
                            message: 'No password include (not found with record)',
                            data: []
                        })
                    } else {
                        const username = userData
                        const password = passwordValue

                        console.log(`UserName : ${username}`)
                        console.log(`password : ${password}`)

                        try {
                            let queryStr = `
                                    select a.userid ,a.username, (b.emp_name) as fname , (b.emp_lname) as lname, b.email, a.radmin , a.status, TO_CHAR(a.DATE_CHPWS, 'DD/MM/YYYY') AS EXPIRE_DATE
                                    from btw.users a , BTW.EMP b
                                    where a.username = :username
                                    and a.password = :password
                                    and a.userid = b.emp_id
                                    and a.activate = 'T'
                                    `


                            const resultLogin = await connection.execute(queryStr,
                                {
                                    username: username,
                                    password: password
                                },
                                {
                                    outFormat: oracledb.OBJECT
                                })

                            if (resultLogin.rows.length == 0) {
                                // logger.error(`user ${username} fail to login : Not found user with ID/PW login`);
                                const noresultFormatJson = {
                                    status: 201,
                                    message: 'Not found user with ID/PW login (token)'
                                }
                                res.status(201).send(noresultFormatJson)
                            } else {

                                let resData = resultLogin.rows[0]

                                // === log user login (04/09/2022) === 
                                try {

                                    // === check password expire date (19/10/2022) === 

                                    // *** chage check expire date from field expire that plus auto from resetpassword to check with paremeter when login (P Thep Khor) (09/06/2023)

                                    // === get expire time change from oracle X_CPS_INIT (25/10/2022) ===

                                    const resultexpireduration = await connection.execute(`
                                            SELECT DETAIL FROM BTW.X_CPS_INIT
                                            WHERE HEADER = 'DAY_CHANGE_PWS'
                                        `, {}, {
                                        outFormat: oracledb.OBJECT
                                    })

                                    if (resultexpireduration.rows.length == 0) {
                                        return res.status(200).send({
                                            status: 400,
                                            message: `ไม่พบการกำหนดค่าวันหมดอายุของระบบ, ไม่สามารถเข้าใช้งานได้`,
                                            data: []
                                        })
                                    }

                                    // === create expire duration ====

                                    const expireduration = resultexpireduration.rows[0].DETAIL

                                    console.log(`result expire duration : ${expireduration}`)

                                    if (!expireduration) {
                                        return res.status(200).send({
                                            status: 400,
                                            message: `ไม่พบการกำหนดค่า expire duration บนระบบ`,
                                            data: []
                                        })
                                    }

                                    const nowdate = moment().toDate()

                                    // *** chage check expire date from field expire that plus auto from resetpassword to check with paremeter when login (P Thep Khor) (09/06/2023)\

                                    // ***=== when 09/06/2023 chage field in sql DATE_CHPWS (in api is expire_date) that before is EXPIRE_DATE into keep date that change password (request fix by P Thep) ===***

                                    // const expire_date = moment(resData.EXPIRE_DATE, 'DD/MM/YYYY').toDate()
                                    const expire_date = moment(resData.EXPIRE_DATE, 'DD/MM/YYYY').add(90, 'days').toDate();


                                    if (nowdate >= expire_date) {
                                        return res.status(200).send({
                                            status: 202,
                                            message: `รหัสผ่านหมดอายุหรือยังไม่ได้ยืนยันตัวกรุณาเปลี่ยนรหัสผ่านใหม่`,
                                            data: {
                                                expire: 'Y'
                                            }
                                        })
                                    }

                                    console.log(`this is now (moment) : ${nowdate} , expire_date : ${expire_date}`)



                                    const resultinsertloglogin = await connection.execute(`
                                            INSERT INTO MPLS_LOGIN_LOG (
                                                USERID
                                            ) VALUES (:USERID)
                                        `, {
                                        USERID: resData.USERID
                                    }, {
                                        autoCommit: true
                                    })

                                    // *** update last login (08/06/2023) ***
                                    const updatelastlogin = await connection.execute(`
                                     UPDATE USERS  SET LAST_LOGIN = SYSDATE
                                             WHERE USERNAME = :USERNAME
                                 `, {
                                        USERNAME: username
                                    }, {
                                        autoCommit: true
                                    })

                                    console.log(`success log login user : ${resultinsertloglogin.rowsAffected}`)
                                    console.log(`success log last login : ${updatelastlogin.rowsAffected}`)
                                } catch (e) {
                                    console.log(`can't log login : ${e.message}`)
                                }


                                resData.expire = 'N'

                                // === set full name (checker) === 
                                resData.FULLNAME = `${resData.FNAME} ${resData.LNAME}`
                                // === set ID (checker) ===
                                resData.ID = resData.USERID
                                // === set username ==== 
                                resData.USERNAME = username
                                resData.WITNESS_NAME = resData.FNAME
                                resData.WITNESS_LNAME = resData.LNAME

                                const token = jwt.sign(
                                    {
                                        ID: resData.ID,
                                        user_id: resData.USERNAME,
                                        password: resData.PASSWORD,
                                        fullname: resData.FULLNAME,
                                        email: resData.EMAIL,
                                        radmin: resData.RADMIN ? resData.RADMIN : '',
                                        role: resData.ROLE,
                                        // channal: resData.channal,
                                        channal: 'collector',
                                        seller_id: resData.SELLER_ID,
                                        username: resData.USERNAME,
                                        witness_name: resData.WITNESS_NAME,
                                        witness_lname: resData.WITNESS_LNAME
                                    },
                                    process.env.JWT_KEY, {
                                    expiresIn: "24h",
                                }
                                )

                                const dialer_token = jwt.sign(
                                    {
                                        userId: resData.USERNAME
                                    },
                                    process.env.MOBILE_DIAL_KEY, {
                                    expiresIn: "24h",
                                }
                                )
                                let returnData = new Object
                                returnData.token = token
                                returnData.dialer_token = dialer_token
                                returnData.data = resData
                                returnData.status = 200,
                                    returnData.message = 'success'

                                // === tran all upperCase to lowerCase === 
                                let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                                    result[key.toLowerCase()] = val;
                                });

                                // res.status(200).json(results.rows[0]);
                                // logger.info(`user ${username} login successfully`);


                                // **** delete token before return response (03/08/2023) ***
                                
                                const res_delete_token = await connection.execute(`
                                    DELETE FROM BTW.TOKEN WHERE TOKEN_ID = :TOKEN
                                `, {
                                    TOKEN: token_oracle
                                }, {
                                    autoCommit: true
                                })

                                
                                res.status(200).json(returnDatalowerCase);
                            }
                        } catch (e) {
                            return res.status(400).send({
                                status: 400,
                                message: `fail : ${e}`,
                                data: []
                            })
                        }
                    }
                }
            }
        }

    } catch (e) {
        console.error(e);
        return res.status(200).send({
            status: 400,
            message: `Fail : ${e.message ? e.message : 'No err msg'}`,
        })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return res.status(200).send({
                    status: 200,
                    message: `Error to close connection : ${e.message ? e.message : 'No err msg'}`
                })
            }
        }
    }
}






module.exports.loginUser = loginUser
module.exports.sendemailsmtp = sendemailsmtp
module.exports.forgetpassword = forgetpassword
module.exports.resetpassword = resetpassword
module.exports.getcurrentUserFormToken = getcurrentUserFormToken