const oracledb = require('oracledb')
const config = require('./connectdb')

function mapnewresponsearray(resArray) {

    if (!resArray.error) {
        resArray = {
            remaining_credit: resArray.remaining_credit ? resArray.remaining_credit : '',
            total_use_credit: resArray.total_use_credit ? resArray.total_use_credit : '',
            credit_type: resArray.credit_type ? resArray.credit_type : '',
            phonenumber: resArray.phone_number_list[0].number ? resArray.phone_number_list[0].number : '',
            message_id: resArray.phone_number_list[0].message_id ? resArray.phone_number_list[0].message_id : '',
            used_credit: resArray.phone_number_list[0].used_credit ? resArray.phone_number_list[0].used_credit : '',
            error_code: '',
            error_name: '',
            error_description: '',
        }
    } else {
        resArray = {
            remaining_credit: '',
            total_use_credit: '',
            credit_type: '',
            phonenumber: '',
            message_id: '',
            used_credit: '',
            error_code: resArray.error.code ? resArray.error.code : '',
            error_name: resArray.error.name ? resArray.error.name : '',
            error_description: resArray.error.description ? resArray.error.description : '',
        }
    }
    return resArray
}

async function internal_MPLS_get_refid() {

    let connection;
    try {

        connection = await oracledb.getConnection(config.database)
        const result = await connection.execute(`
        DECLARE

        refid  VARCHAR2(11);
        BEGIN

        BTW.PROC_GEN_QUO_APP_REF_NO(:refid);

        END;`
            , {
                refid: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }, {
            outFormat: oracledb.OBJECT
        })


        return result.outBinds.refid

    } catch (e) {
        console.error(e);
        return ''
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error(e);
                return ''
            }
        }
    }
}

module.exports.mapnewresponsearray = mapnewresponsearray
module.exports.internal_MPLS_get_refid = internal_MPLS_get_refid
