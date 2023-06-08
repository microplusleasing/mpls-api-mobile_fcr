const jwt = require('jsonwebtoken')
const config = process.env

const verifyToken = (req,res,next) => {
    // const token = req.body.token || req.query.token || req.headers['x-access-token']
    const token = req.headers.authorization

    if(!token) {
        return res.status(403).send('A token is require for authentication')
    }

    try {
        const splittoken = token.split(" ")[1]
        const decoded = jwt.verify(splittoken, config.JWT_KEY)
        req.user = decoded
    } catch (err) {
        // return res.status(401).send("Invalid Token")
        return res.status(401).send({
            status: 401,
            message: 'Token was expire, please login',
        })
    }

    return next();

}

module.exports = verifyToken