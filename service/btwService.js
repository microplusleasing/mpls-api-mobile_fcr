const oracledb = require('oracledb')
const config = require('./connectdb')
const jwt_decode = require('jwt-decode')
const tolowerService = require('./tolowerkey')

async function getpremrolemenu(req, res, next) {
    let connection;
    try {
        const token = req.user
        const userid = token.username
        const { menu_id } = req.query

        console.log(`userid : ${userid}`)

        // === check param ===

        if (!menu_id) {
            return res.status(200).send({
                status: 400,
                message: `missing menu_id param`,
                data: []
            })
        }

        if (!userid) {
            return res.status(200).send({
                status: 400,
                message: `missing userid param`,
                data: []
            })
        }

        connection = await oracledb.getConnection(config.database)

        const reusultpremcheck = await connection.execute(`
            SELECT XMC.AU_OPEN AS ROLE FROM
            BTW.USERS URS
            LEFT JOIN BTW.X_MENU_CONTROL_U XMC
            ON URS.USERNAME = XMC.USER_NAME
            WHERE URS.USERNAME = :userid
            AND XMC.MENU_ID = :menu_id
        `, {
            userid: userid,
            menu_id: menu_id
        }, {
            outFormat: oracledb.OBJECT
        })

        if (reusultpremcheck.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: `No premission (not found role premission)`,
                data: []
            })
        }

        const rolemenu = reusultpremcheck.rows[0]

        if (rolemenu.ROLE) {
            if (rolemenu.ROLE != 'Y') {
                return res.status(200).send({
                    status: 400,
                    message: `No premission (no premission allow)`,
                    data: []
                })
            }

            // === Have permission (ROLE = "Y") ====
            const resData = reusultpremcheck.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })

        } else {
            return res.status(200).send({
                status: 400,
                message: `No premission (not found role premission)`,
                data: []
            })
        }


    } catch (e) {
        console.error(e)
        return next(e)
    } finally {
        if (connection) {
            try {
                await connection.close()
            } catch (e) {
                console.error(e)
                return next(e)
            }
        }
    }
}

async function getsearchmrta(req, res, next) {
    let connection;

    try {

        const { customername, customersname, idcardnum, application_no, contractno, pageno } = req.query

        let _pageno;
        _pageno = pageno ? pageno : 1
        const indexstart = (_pageno - 1) * 5 + 1
        const indexend = (_pageno * 5)
        let rowCount;

        connection = await oracledb.getConnection(config.database)

        // === build query param === 

        let queryCondition;
        let bindData = {};

        let sqlcustomername = '';
        let sqlcustomersname = '';
        let sqlidcardnum = '';
        let sqlapplication_no = '';
        let sqlcontractno = '';

        if (customername) {
            sqlcustomername = ` AND CUST_INFO.NAME LIKE :customername `
            bindData.customername = `${customername}%`
        }
        if (customersname) {
            sqlcustomersname = ` AND CUST_INFO.SNAME LIKE :customersname `
            bindData.customersname = `${customersname}%`
        }
        if (idcardnum) {
            sqlidcardnum = ` AND CUST_INFO.IDCARD_NUM = :idcardnum `
            bindData.idcardnum = idcardnum
        }
        if (application_no) {
            sqlapplication_no = ` AND APP_EXT.APPLICATION_NUM = :application_no `
            bindData.application_no = application_no
        }
        if (contractno) {
            sqlcontractno = ` AND APP_EXT.CONTRACT_NO = :contractno `
            bindData.contractno = contractno
        }

        // === build complete sql (for count record) ====

        queryCondition = `
        SELECT COUNT(APPLICATION_NUM) AS COUNT FROM( 
            SELECT 
            ROWNUM AS SEQ_ITEM
            ,APP_EXT.APPLICATION_NUM
            ,BTW.GET_DL_BRANCH (APP_EXT.SL_CODE) AS DL_BRANCH
            ,(SELECT BRANCH_NAME
                FROM BRANCH_P
                WHERE BRANCH_CODE = BTW.GET_DL_BRANCH (APP_EXT.SL_CODE)) AS BRANCH_NAME
            ,APP_EXT.CONTRACT_NO
            ,TO_CHAR(APP_EXT.APPLICATION_DATE, 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS APPLICATION_DATE  --EX.05/06/2565
            ,TO_CHAR(APP_EXT.CREATE_CONTRACT_DATE, 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS CREATE_CONTRACT_DATE  --EX.05/06/2565
            ,CUST_INFO.CUST_NO
            ,TO_CHAR(BTW.BUDDHIST_TO_CHRIS_F(CUST_INFO.BIRTH_DATE),'DD/MM/YYYY','nls_calendar=''thai buddha'' nls_date_language=thai') AS BIRTH_DATE_TH
            ,BTW.BUDDHIST_TO_CHRIS_F(CUST_INFO.BIRTH_DATE) AS BIRTH_DATE
            ,CE.FAVORITE1 as sex --เพศ
            ,CUST_INFO.NAME AS FIRST_NAME
            ,CUST_INFO.SNAME AS LAST_NAME
            ,TITLE_P.TITLE_NAME||''||CUST_INFO.NAME||'  '||CUST_INFO.SNAME AS CUSTOMER_FULLNAME
            ,CUST_INFO.IDCARD_NUM
            ,BTW.func_GetCustAddr(APP_EXT.APPLICATION_NUM,CUST_INFO.CUST_NO,BTW.GET_ADDR_TYPE_ACTIVE_CUST(CUST_INFO.CUST_NO,'02')) AS ADDRESS1 --default ที่อยู่ตามบัตรประชาชน
            ,BTW.func_GetCustAddr(APP_EXT.APPLICATION_NUM,CUST_INFO.CUST_NO,'06') AS ADDRESS_LETTER --default ที่อยู่ส่งจดหมาย 06
            ,APP_EXT.SL_CODE
            ,DL.DL_FNAME||' '||DL.DL_NAME||' '||DL.DL_LNAME  AS DL_NAME  -- ชื่อดีลเลอร์
            ,UPPER(BTW.PKG_PRODUCT_DETAIL.GET_BRAND_NAME (APP_EXT.CONTRACT_NO)) AS MOTORCYCLE_BRANDS
            ,BTW.PKG_PRODUCT_DETAIL.GET_MODEL_NAME (APP_EXT.CONTRACT_NO) AS MOTORCYCLE_MODELS
            ,BTW.GET_MODEL_YEAR(APP_EXT.CONTRACT_NO) AS MODEL_YEAR
            ,BTW.PKG_PRODUCT_DETAIL.GET_CC (APP_EXT.CONTRACT_NO) AS MODEL_CC
            ,BTW.PKG_PRODUCT_DETAIL.GET_COLOR (APP_EXT.CONTRACT_NO) AS COLORS
            ,TO_CHAR(APP_CONTRACT.FIRST_DUE , 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS FIRST_INSTALLMENT_PAID_DATE
            ,TO_CHAR(ADD_MONTHS(APP_CONTRACT.FIRST_DUE,APP_EXT.TERM-1), 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')   AS LAST_INSTALLMENT_PAID_DATE
            ,TO_CHAR(APP_EXT.MONTHLY, 'fm999g999g990d00') AS  MONTHLY_TXT  --ค่างวด
            ,APP_EXT.MONTHLY
            ,APP_EXT.TERM AS  PERIOD --จำนวนงวด
            ,TO_CHAR(BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.'),'fm999g999g990d00')  as OUT_STAND_TXT --(9) out_stand ตั้งต้น  (ยอดกู้)
            ,BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.') AS OUT_STAND
            ,TO_CHAR(APP_CONTRACT.DOWN, 'fm999g999g990d00')  as DOWN_PAYMENT_AMOUNT  --3
            ,BTW.PKG_PRODUCT_DETAIL.GET_CHASIS (APP_EXT.CONTRACT_NO) AS CHASSIS_NUMBER
            ,BTW.PKG_PRODUCT_DETAIL.GET_ENGI (APP_EXT.CONTRACT_NO) AS MACHINE_NUMBER
            ,TO_CHAR(APP_CONTRACT.FIRST_DUE , 'dd', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS DUE
            ,BTW.GET_VALUE_CUST_INFO_EXT(CUST_INFO.CUST_NO,'E_MAIL','BTW.') AS EMAIL 
            ,TRIM(BTW.PHONE_NO (CUST_INFO.CUST_NO,'SMS' )) AS SMS_NUMBER
            ,TRIM(BTW.PHONE_NO (CUST_INFO.CUST_NO,'MP' )) AS PHONE_NUMBER
            ,APP_EXT.CHECKER_CODE
            -- ,DECODE(BTW.GET_E_PAPER(APP_EXT.CONTRACT_NO),'Y','edoc','paper') AS CHANNEL_TYPE
            ,APP_EXT.REPORT_DATE
            ,APP_EXT.INSURANCE_YEARS
            ,APP_EXT.COVERAGE_TOTAL_LOSS  AS INSURANCE_T1_CASH                                           
            from BTW.X_CUST_MAPPING_EXT APP_EXT,BTW.X_CUST_MAPPING CUST_MAPP,BTW.X_SAMM_CONTRACT APP_CONTRACT,BTW.CUST_INFO,BTW.TITLE_P
            ,BTW.X_PRODUCT_DETAIL PD,X_DEALER_P DL,CUST_INFO_EXT  CE
            where APP_EXT.APPLICATION_NUM = CUST_MAPP.APPLICATION_NUM
            AND APP_EXT.APPLICATION_NUM = APP_CONTRACT.APPLICATION_NUM
            AND APP_EXT.APPLICATION_NUM = PD.APPLICATION_NUM
            AND CUST_MAPP.CUST_NO = CUST_INFO.CUST_NO
            AND CUST_INFO.FNAME = TITLE_P.TITLE_ID(+)
            AND APP_EXT.SL_CODE = DL.DL_CODE
            AND CUST_MAPP.CUST_NO = CE.CUST_NO(+)
            AND APP_EXT.loan_result='Y'
            AND CUST_MAPP.CUST_STATUS='0'
            AND PD.PRODUCT_CODE = '01'
            ${sqlcustomername}
            ${sqlcustomersname}
            ${sqlidcardnum}
            ${sqlapplication_no}
            ${sqlcontractno}
            )`

        const resultdata = await connection.execute(queryCondition, bindData, { outFormat: oracledb.OBJECT })

        if (resultdata.rows == 0) {
            return res.status(200).send({
                status: 200,
                message: `ไม่พบรายการตามเงื่อนไข`,
                data: []
            })
        } else {
            rowCount = resultdata.rows[0].COUNT

            // === get datalist === 

            try {

                let sqlconditionlist = `
                            SELECT 
                            ROWNUM AS SEQ_ITEM
                            ,APP_EXT.APPLICATION_NUM
                            ,BTW.GET_DL_BRANCH (APP_EXT.SL_CODE) AS DL_BRANCH
                            ,(SELECT BRANCH_NAME
                                FROM BRANCH_P
                                WHERE BRANCH_CODE = BTW.GET_DL_BRANCH (APP_EXT.SL_CODE)) AS BRANCH_NAME
                            ,APP_EXT.CONTRACT_NO
                            ,TO_CHAR(APP_EXT.APPLICATION_DATE, 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS APPLICATION_DATE  --EX.05/06/2565
                            ,TO_CHAR(APP_EXT.CREATE_CONTRACT_DATE, 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS CREATE_CONTRACT_DATE  --EX.05/06/2565
                            ,CUST_INFO.CUST_NO
                            ,TO_CHAR(BTW.BUDDHIST_TO_CHRIS_F(CUST_INFO.BIRTH_DATE),'DD/MM/YYYY','nls_calendar=''thai buddha'' nls_date_language=thai') AS BIRTH_DATE_TH
                            ,BTW.BUDDHIST_TO_CHRIS_F(CUST_INFO.BIRTH_DATE) AS BIRTH_DATE
                            ,CE.FAVORITE1 as sex --เพศ
                            ,CUST_INFO.NAME AS FIRST_NAME
                            ,CUST_INFO.SNAME AS LAST_NAME
                            ,TITLE_P.TITLE_NAME||''||CUST_INFO.NAME||'  '||CUST_INFO.SNAME AS CUSTOMER_FULLNAME
                            ,CUST_INFO.IDCARD_NUM
                            ,BTW.func_GetCustAddr(APP_EXT.APPLICATION_NUM,CUST_INFO.CUST_NO,BTW.GET_ADDR_TYPE_ACTIVE_CUST(CUST_INFO.CUST_NO,'02')) AS ADDRESS1 --default ที่อยู่ตามบัตรประชาชน
                            ,BTW.func_GetCustAddr(APP_EXT.APPLICATION_NUM,CUST_INFO.CUST_NO,'06') AS ADDRESS_LETTER --default ที่อยู่ส่งจดหมาย 06
                            ,APP_EXT.SL_CODE
                            ,DL.DL_FNAME||' '||DL.DL_NAME||' '||DL.DL_LNAME  AS DL_NAME  -- ชื่อดีลเลอร์
                            ,UPPER(BTW.PKG_PRODUCT_DETAIL.GET_BRAND_NAME (APP_EXT.CONTRACT_NO)) AS MOTORCYCLE_BRANDS
                            ,BTW.PKG_PRODUCT_DETAIL.GET_MODEL_NAME (APP_EXT.CONTRACT_NO) AS MOTORCYCLE_MODELS
                            ,BTW.GET_MODEL_YEAR(APP_EXT.CONTRACT_NO) AS MODEL_YEAR
                            ,BTW.PKG_PRODUCT_DETAIL.GET_CC (APP_EXT.CONTRACT_NO) AS MODEL_CC
                            ,BTW.PKG_PRODUCT_DETAIL.GET_COLOR (APP_EXT.CONTRACT_NO) AS COLORS
                            ,TO_CHAR(APP_CONTRACT.FIRST_DUE , 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS FIRST_INSTALLMENT_PAID_DATE
                            ,TO_CHAR(ADD_MONTHS(APP_CONTRACT.FIRST_DUE,APP_EXT.TERM-1), 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')   AS LAST_INSTALLMENT_PAID_DATE
                            ,TO_CHAR(APP_EXT.MONTHLY, 'fm999g999g990d00') AS  MONTHLY_TXT  --ค่างวด
                            ,APP_EXT.MONTHLY
                            ,APP_EXT.TERM AS  PERIOD --จำนวนงวด
                            ,TO_CHAR(BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.'),'fm999g999g990d00')  as OUT_STAND_TXT --(9) out_stand ตั้งต้น  (ยอดกู้)
                            ,BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.') AS OUT_STAND
                            ,TO_CHAR(APP_CONTRACT.DOWN, 'fm999g999g990d00')  as DOWN_PAYMENT_AMOUNT  --3
                            ,BTW.PKG_PRODUCT_DETAIL.GET_CHASIS (APP_EXT.CONTRACT_NO) AS CHASSIS_NUMBER
                            ,BTW.PKG_PRODUCT_DETAIL.GET_ENGI (APP_EXT.CONTRACT_NO) AS MACHINE_NUMBER
                            ,TO_CHAR(APP_CONTRACT.FIRST_DUE , 'dd', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS DUE
                            ,BTW.GET_VALUE_CUST_INFO_EXT(CUST_INFO.CUST_NO,'E_MAIL','BTW.') AS EMAIL 
                            ,TRIM(BTW.PHONE_NO (CUST_INFO.CUST_NO,'SMS' )) AS SMS_NUMBER
                            ,TRIM(BTW.PHONE_NO (CUST_INFO.CUST_NO,'MP' )) AS PHONE_NUMBER
                            ,APP_EXT.CHECKER_CODE
                            -- ,DECODE(BTW.GET_E_PAPER(APP_EXT.CONTRACT_NO),'Y','edoc','paper') AS CHANNEL_TYPE
                            ,APP_EXT.REPORT_DATE
                            ,APP_EXT.INSURANCE_YEARS
                            ,APP_EXT.COVERAGE_TOTAL_LOSS  AS INSURANCE_T1_CASH                                           
                            from BTW.X_CUST_MAPPING_EXT APP_EXT,BTW.X_CUST_MAPPING CUST_MAPP,BTW.X_SAMM_CONTRACT APP_CONTRACT,BTW.CUST_INFO,BTW.TITLE_P
                            ,BTW.X_PRODUCT_DETAIL PD,X_DEALER_P DL,CUST_INFO_EXT  CE
                            where APP_EXT.APPLICATION_NUM = CUST_MAPP.APPLICATION_NUM
                            AND APP_EXT.APPLICATION_NUM = APP_CONTRACT.APPLICATION_NUM
                            AND APP_EXT.APPLICATION_NUM = PD.APPLICATION_NUM
                            AND CUST_MAPP.CUST_NO = CUST_INFO.CUST_NO
                            AND CUST_INFO.FNAME = TITLE_P.TITLE_ID(+)
                            AND APP_EXT.SL_CODE = DL.DL_CODE
                            AND CUST_MAPP.CUST_NO = CE.CUST_NO(+)
                            AND APP_EXT.loan_result='Y'
                            AND CUST_MAPP.CUST_STATUS='0'
                            AND PD.PRODUCT_CODE = '01'
                            ${sqlcustomername}
                            ${sqlcustomersname}
                            ${sqlidcardnum}
                            ${sqlapplication_no}
                            ${sqlcontractno}
                    `
                let finalsqlconditionlist = `
                    SELECT * FROM (
                        ${sqlconditionlist}
                    ) WHERE SEQ_ITEM BETWEEN :indexstart AND :indexend
                `

                // === add bind index to bindData ===
                bindData.indexstart = indexstart
                bindData.indexend = indexend

                const resultdatalist = await connection.execute(finalsqlconditionlist, bindData, { outFormat: oracledb.OBJECT })

                if (resultdatalist.rows.length == 0) {
                    return res.status(200).send({
                        status: 200,
                        message: 'No mrta list',
                        data: []
                    })
                } else {

                    const resData = resultdatalist.rows
                    const lowerResData = tolowerService.arrayobjtolower(resData)
                    let returnData = new Object
                    returnData.data = lowerResData
                    returnData.status = 200
                    returnData.message = 'success'
                    returnData.CurrentPage = Number(_pageno)
                    returnData.pageSize = 5
                    returnData.rowCount = rowCount
                    returnData.pageCount = Math.ceil(rowCount / 5);

                    // === tran all upperCase to lowerCase === 
                    let returnDatalowerCase = _.transform(returnData, function (result, val, key) {
                        result[key.toLowerCase()] = val;
                    });

                    // res.status(200).json(results.rows[0]);
                    res.status(200).json(returnDatalowerCase);
                }

            } catch (e) {
                return res.status(400).send({
                    status: 400,
                    message: `เกิดข้อผิดพลาด : ${e}`,
                    data: []
                })
            }
        }

    } catch (e) {
        console.error(e)
        return next(e)
    } finally {
        if (connection) {
            try {
                await connection.close()
            } catch (e) {
                console.error(e)
                return next(e)
            }
        }
    }
}

async function getmrtainfo(req, res, next) {
    let connection;
    try {

        const { application_num } = req.query

        if (!application_num) {
            return res.status(400).send({
                status: 400,
                message: `missing application_num param`,
                data: []
            })
        }


        connection = await oracledb.getConnection(config.database)

        const reulstmrtainfo = await connection.execute(`
                    SELECT 
                    ROWNUM AS SEQ_ITEM
                    ,NVL(QUO_KEY_APP_ID,APP_EXT.APPLICATION_NUM) AS QUO_KEY_APP_ID
                    ,APP_EXT.APPLICATION_NUM
                    ,BTW.GET_DL_BRANCH (APP_EXT.SL_CODE) AS DL_BRANCH
                    ,(SELECT BRANCH_NAME
                        FROM BRANCH_P
                        WHERE BRANCH_CODE = BTW.GET_DL_BRANCH (APP_EXT.SL_CODE)) AS BRANCH_NAME
                    ,APP_EXT.CONTRACT_NO
                    ,TO_CHAR(APP_EXT.APPLICATION_DATE, 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS APPLICATION_DATE  --EX.05/06/2565
                    ,TO_CHAR(APP_EXT.CREATE_CONTRACT_DATE, 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS CREATE_CONTRACT_DATE  --EX.05/06/2565
                    ,CUST_INFO.CUST_NO
                    ,TO_CHAR(BTW.BUDDHIST_TO_CHRIS_F(CUST_INFO.BIRTH_DATE),'DD/MM/YYYY','nls_calendar=''thai buddha'' nls_date_language=thai') AS BIRTH_DATE_TH
                    ,BTW.BUDDHIST_TO_CHRIS_F(CUST_INFO.BIRTH_DATE) AS BIRTH_DATE
                    ,CE.FAVORITE1 as sex --เพศ
                    ,CUST_INFO.NAME AS FIRST_NAME
                    ,CUST_INFO.SNAME AS LAST_NAME
                    ,TITLE_P.TITLE_NAME||''||CUST_INFO.NAME||'  '||CUST_INFO.SNAME AS CUSTOMER_FULLNAME
                    ,CUST_INFO.IDCARD_NUM
                    ,BTW.func_GetCustAddr(APP_EXT.APPLICATION_NUM,CUST_INFO.CUST_NO,BTW.GET_ADDR_TYPE_ACTIVE_CUST(CUST_INFO.CUST_NO,'02')) AS ADDRESS1 --default ที่อยู่ตามบัตรประชาชน
                    ,BTW.func_GetCustAddr(APP_EXT.APPLICATION_NUM,CUST_INFO.CUST_NO,'06') AS ADDRESS_LETTER --default ที่อยู่ส่งจดหมาย 06
                    ,APP_EXT.SL_CODE
                    ,DL.DL_FNAME||' '||DL.DL_NAME||' '||DL.DL_LNAME  AS DL_NAME  -- ชื่อดีลเลอร์
                    --,UPPER(BTW.PKG_PRODUCT_DETAIL.GET_BRAND_NAME (APP_EXT.CONTRACT_NO)) AS MOTORCYCLE_BRANDs
                    --,BTW.PKG_PRODUCT_DETAIL.GET_MODEL_NAME (APP_EXT.CONTRACT_NO) AS MOTORCYCLE_MODELS
                    ,BD.BRAND_NAME AS MOTORCYCLE_BRANDS
                    ,MD.MODEL  AS MOTORCYCLE_MODELS
                    --,BTW.GET_MODEL_YEAR(APP_EXT.CONTRACT_NO) AS MODEL_YEAR
                    ,MD.MODEL_YEAR
                    ,MD.CC AS MODEL_CC
                    --,BTW.PKG_PRODUCT_DETAIL.GET_CC (APP_EXT.CONTRACT_NO) AS MODEL_CC
                    --,BTW.PKG_PRODUCT_DETAIL.GET_COLOR (APP_EXT.CONTRACT_NO) AS COLORS
                    ,PD.COLOR AS COLORS
                    ,TO_CHAR(APP_CONTRACT.FIRST_DUE , 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS FIRST_INSTALLMENT_PAID_DATE
                    ,TO_CHAR(ADD_MONTHS(APP_CONTRACT.FIRST_DUE,APP_EXT.TERM-1), 'dd/mm/yyyy', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')   AS LAST_INSTALLMENT_PAID_DATE
                    ,TO_CHAR(APP_EXT.MONTHLY, 'fm999g999g990d00') AS  MONTHLY_TXT  --ค่างวด
                    ,APP_EXT.MONTHLY
                    ,APP_EXT.TERM AS  PERIOD --จำนวนงวด
                    --,TO_CHAR(BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.'),'fm999g999g990d00')  as OUT_STAND_TXT --(9) out_stand ตั้งต้น  (ยอดกู้)
                    ,DECODE(BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.'), 0, APP_EXT.MONTHLY* APP_EXT.TERM, BTW.PKG_MONTH_END.GET_OUT_STAND('N',APP_EXT.CONTRACT_NO,NULL,'BTW.')) AS OUT_STAND
                    ,TO_CHAR(APP_CONTRACT.DOWN, 'fm999g999g990d00')  as DOWN_PAYMENT_AMOUNT  --3
                    ,BTW.PKG_PRODUCT_DETAIL.GET_CHASIS (APP_EXT.CONTRACT_NO) AS CHASSIS_NUMBER
                    ,BTW.PKG_PRODUCT_DETAIL.GET_ENGI (APP_EXT.CONTRACT_NO) AS MACHINE_NUMBER
                    ,TO_CHAR(APP_CONTRACT.FIRST_DUE , 'dd', 'NLS_CALENDAR=''THAI BUDDHA'' NLS_DATE_LANGUAGE=THAI')  AS DUE
                    ,BTW.GET_VALUE_CUST_INFO_EXT(CUST_INFO.CUST_NO,'E_MAIL','BTW.') AS EMAIL 
                    ,TRIM(BTW.PHONE_NO (CUST_INFO.CUST_NO,'SMS' )) AS SMS_NUMBER
                    ,TRIM(BTW.PHONE_NO (CUST_INFO.CUST_NO,'MP' )) AS PHONE_NUMBER
                    ,APP_EXT.CHECKER_CODE
                    -- ,DECODE(BTW.GET_E_PAPER(APP_EXT.CONTRACT_NO),'Y','edoc','paper') AS CHANNEL_TYPE
                    ,APP_EXT.REPORT_DATE
                    ,APP_EXT.INSURANCE_YEARS
                    ,APP_EXT.COVERAGE_TOTAL_LOSS  AS INSURANCE_T1_CASH                                           
                    from BTW.X_CUST_MAPPING_EXT APP_EXT,BTW.X_CUST_MAPPING CUST_MAPP,BTW.X_SAMM_CONTRACT APP_CONTRACT,BTW.CUST_INFO,BTW.TITLE_P
                    ,BTW.X_PRODUCT_DETAIL PD,X_DEALER_P DL,CUST_INFO_EXT  CE
                    ,BTW.X_BRAND_P BD
                    ,BTW.X_MODEL_P MD
                    where APP_EXT.APPLICATION_NUM = CUST_MAPP.APPLICATION_NUM
                    AND APP_EXT.APPLICATION_NUM = APP_CONTRACT.APPLICATION_NUM
                    AND APP_EXT.APPLICATION_NUM = PD.APPLICATION_NUM
                    AND CUST_MAPP.CUST_NO = CUST_INFO.CUST_NO
                    AND CUST_INFO.FNAME = TITLE_P.TITLE_ID(+)
                    AND APP_EXT.SL_CODE = DL.DL_CODE
                    AND CUST_MAPP.CUST_NO = CE.CUST_NO(+)
                    AND PD.BRAND_CODE = BD.BRAND_CODE
                    AND PD.MODELCODE = MD.MODEL_CODE
                    AND PD.BRAND_CODE  = MD.BRAND_CODE
                    AND MD.PRO_CODE = '01'
                    AND BD.PRO_CODE = '01'
                    AND APP_EXT.loan_result='Y'
                    AND CUST_MAPP.CUST_STATUS='0'
                    AND PD.PRODUCT_CODE = '01'
                    AND APP_EXT.APPLICATION_NUM = :application_num
        `, {
            application_num: application_num
        }, {
            outFormat: oracledb.OBJECT
        })

        if (reulstmrtainfo.rows.length == 0) {
            return res.status(200).send({
                status: 200,
                message: 'Not found record',
                data: []
            })
        } else {
            const resData = reulstmrtainfo.rows
            const lowerResData = tolowerService.arrayobjtolower(resData)
            return res.status(200).send({
                status: 200,
                message: 'success',
                data: lowerResData
            })
        }

    } catch (e) {
        console.error(e)
        return next(e)
    } finally {
        if (connection) {
            try {
                await connection.close()
            } catch (e) {
                console.error(e)
                return next(e)
            }
        }
    }
}

module.exports.getpremrolemenu = getpremrolemenu
module.exports.getsearchmrta = getsearchmrta
module.exports.getmrtainfo = getmrtainfo