
// ==== not available servic ====

const oracledb = require('oracledb')
const config = require('./connectdb')

  async function setPagination(pageNum, tableName, userid, pkfield) {
    const pageno = pageNum ? pageNum : 0
    await oracledb.getConnection(
         config.database,
         async (err, connection) => {
             if (err) {
                return {}
             }
             const sqlstring = `SELECT  COUNT (${pkfield}) FROM ${tableName} WHERE USER_ID = ${userid}`;
             console.log(`sqlstring : ${sqlstring}`);
             const totalCount = await connection.execute(
                 sqlstring,
                 []
             );
             console.log(`totalCount : ${JSON.stringify(totalCount)}`);
             const rowCount = totalCount.rows[0][0];
             const pagination = {
                 rowCount: rowCount,
                 CurrentPage: pageNum,
                 pageSize: 10
             }
         }
     )
}

module.exports.setpagination = setPagination