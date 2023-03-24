// const { config } = require('dotenv')
// require('dotenv').config
require('dotenv').config()
const express = require('express')

// const https = require('https')
// const path = require('path')
// const fs = require('fs')

const swaggerUI = require('swagger-ui-express')
const YAML = require("yamljs")
const cors = require('cors')
const auth = require('./middleware/auth')
const portalauth = require('./middleware/portalauth')
const userservice = require('./service/UserService')
const loginUserservice = require('./service/loginUserService')
const quotationservice = require('./service/QuotationService')
const qeconsentService = require(`./service/q-econsentService`)
const imageService = require('./service/imageService')
const viewsignService = require('./service/viewsignService')
const productService = require('./service/productService')
const masterService = require('./service/masterData')
const MPLS_masterService = require('./service/MPLS_masterService')
const testService = require('./service/testService')
const calculateService = require('./service/calculateService')
const bypassService = require('./service/bypassquotationService')
const deliverApproveService = require('./service/approvedeliverService')
const smsService = require('./service/smsService')
const portalService = require('./service/portalService')
const negoService = require('./service/negoService')
const mrtaService = require('./service/mrtaService')
const dipchipService = require('./service/dipchipService')
const btwService = require('./service/btwService')
const imageUtilService = require('./service/_imageUtilService')
const welcomeCallService = require('./service/welcomeCallService')
const bodyParser = require("body-parser")
const swaggerJSDoc = YAML.load("./api.yaml")
const test2 = require('./service/test2')
// const ip = require('ip');


var _ = require('lodash');
global._ = _;

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204 
}

const app = express()

// app.set('trust proxy', process.env.IP_SERVER)
app.use(cors(corsOptions))
app.use(bodyParser.json());

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerJSDoc))

app.get('/user', auth, userservice.getuser)

app.get('/login', userservice.userlogin)

app.get('/portallogin', portalService.portallogin) // === deprecate ===

app.get('/viewportallogin', portalService.viewportallogin)

app.get('/loginuser', loginUserservice.loginUser) // === avalible === 

app.get('/getquotationlist', auth, quotationservice.getquotationlist)

app.post('/createquotation', auth, quotationservice.createquotation)

app.post('/MPLS_dipchip', auth, qeconsentService.MPLS_dipchip)

app.post('/MPLS_dipchipnoneconsent', auth, qeconsentService.MPLS_dipchipnoneconsent)

app.post('/MPLS_create_or_update_citizendata', auth, qeconsentService.MPLS_create_or_update_citizendata)

app.get('/MPLS_getimagetocompareiapp', auth, qeconsentService.MPLS_getimagetocompareiapp)

app.get('/MPLS_getimagetocompareiapp_unlock', qeconsentService.MPLS_getimagetocompareiapp_unlock)

app.get('/MPLS_cancle_quotation', auth, qeconsentService.MPLS_cancle_quotation)

app.get('/MPLS_get_refid', auth, qeconsentService.MPLS_get_refid)

app.get('/MPLS_create_otp_phoneno', auth, qeconsentService.MPLS_create_otp_phoneno)

app.get('/MPLS_check_phonevalid', auth, qeconsentService.MPLS_check_phonevalid)

app.get('/MPLS_validation_otp_phonenumber', auth, qeconsentService.MPLS_validation_otp_phonenumber)

app.get('/MPLS_check_econsent', auth, qeconsentService.MPLS_check_econsent)

app.get('/MPLS_get_witness_econsent', auth, qeconsentService.MPLS_get_witness_econsent)

app.get('/MPLS_create_otp_econsent', auth, qeconsentService.MPLS_create_otp_econsent)

app.post('/MPLS_validation_otp_econsent', auth, qeconsentService.MPLS_validation_otp_econsent)

app.get('/MPLS_validation_otp_econsent_non', auth, qeconsentService.MPLS_validation_otp_econsent_non)

app.get('/MPLS_update_phone_number', auth, qeconsentService.MPLS_update_phone_number)

app.get('/MPLS_check_application_no', auth, qeconsentService.MPLS_check_application_no)

app.post('/MPLS_create_or_update_credit', auth, qeconsentService.MPLS_create_or_update_credit)

app.post('/MPLS_create_or_update_careerandpurpose', auth, qeconsentService.MPLS_create_or_update_careerandpurpose)

app.get('/MPLS_getimagefilebyid', auth, qeconsentService.MPLS_getimagefilebyid)

app.post('/MPLS_create_image_attach_file', auth, qeconsentService.MPLS_create_image_attach_file)

app.post('/MPLS_update_image_attach_file', auth, qeconsentService.MPLS_update_image_attach_file)

app.post('/MPLS_delete_image_attach_file', auth, qeconsentService.MPLS_delete_image_attach_file)

app.get('/MPLS_update_flag_image_attach_file', auth, qeconsentService.MPLS_update_flag_image_attach_file)

app.post('/MPLS_create_consent', auth, qeconsentService.MPLS_create_consent)

app.post('/MPLS_create_send_car_deliver_and_loyalty_consent', auth, qeconsentService.MPLS_create_send_car_deliver_and_loyalty_consent)

app.get('/MPLS_gen_application_no', auth, qeconsentService.MPLS_gen_application_no)

app.get('/MPLS_getservertime', auth, qeconsentService.MPLS_getservertime)

app.get('/MPLS_getbrand', auth, masterService.MPLS_getbrand)

app.get('/MPLS_getmodel', auth, masterService.MPLS_getmodel)

app.post('/MPLS_getsecondhandcarbyreg', auth, masterService.MPLS_getsecondhandcarbyreg)

app.post('/MPLS_upload_customer_face', auth, qeconsentService.MPLS_upload_customer_face)

app.get('/MPLS_is_check_face_valid', auth, qeconsentService.MPLS_is_check_face_valid)

app.get('/MPLS_is_check_face_valid_unlock', qeconsentService.MPLS_is_check_face_valid_unlock)

app.post('/MPLS_stamp_check_face_valid', auth, qeconsentService.MPLS_stamp_check_face_valid)

app.post('/MPLS_stamp_face_verification_log_iapp', auth, qeconsentService.MPLS_stamp_face_verification_log_iapp)

app.get('/MPLS_get_dopa_valid_status', auth, qeconsentService.MPLS_get_dopa_valid_status)

app.get('/MPLS_get_dopa_valid_status_unlock', qeconsentService.MPLS_get_dopa_valid_status_unlock)

app.get('/MPLS_canclequotation/:quotationid', auth,  qeconsentService.MPLS_canclequotation)

app.post('/MPLS_gen_econsent_image',  auth,  qeconsentService.MPLS_gen_econsent_image)

app.post('/MPLS_fix_gen_econsent_image',  auth,  qeconsentService.MPLS_fix_gen_econsent_image)

app.get('/MPLS_test_gen_econsent_image',  qeconsentService.MPLS_test_gen_econsent_image)

app.post('/updatequotationimage', auth, quotationservice.updateQuotationImage)

app.post('/updatedraft', auth, quotationservice.updatedraft)

app.get('/getinsurancedetailbyid', auth, quotationservice.getinsurancedetailbyid)

app.get('/getviewsignimage', viewsignService.getviewsignimage)

app.get('/verifyviewsignimage', viewsignService.verifyviewsignimage)

app.post('/updateQuotationImageonlyinsert', auth, quotationservice.updateQuotationImageonlyinsert)

app.get('/checkimagerequire', auth, quotationservice.checkimagerequire)

app.post('/bypassquotation', auth, bypassService.bypassquotation)

app.get('/testiappservice', testService.testiappservice)

app.get('/getattachfile1/:id', auth, imageService.getattachfile1)

app.get('/getimagebyid/:id', auth, imageService.getimagebyid)

app.get('/getimagelistbyid/:id', auth, imageService.getimagelistbyid)

app.get('/getquotationbyid/:id', auth, quotationservice.getquotationbyid)

app.get('/getbrand', auth, productService.getbrand)

app.get('/getmodel', auth, productService.getmodel)

app.get('/MasterRate', auth, masterService.getRate)

app.get('/MasterTerm', auth, masterService.getTerm)

app.get('/getTermNew', auth, masterService.getTermNew)

app.get('/MPLS_master_term', auth, MPLS_masterService.MPLS_master_term)

app.get('/MasterPaymentCount', auth, masterService.getPaymentCount) // === not available (21/11/2022) === 

app.get('/MasterImageType', auth, masterService.getImageType)

app.get('/getImageTypeAttach', auth, masterService.getImageTypeAttach)

app.get('/MasterTitle', auth, masterService.getTitle)

app.get('/getTitletimeout', auth, masterService.getTitletimeout)

app.get('/MasterDealer', auth, masterService.getDealer)

app.get('/getMasterProvince', auth, masterService.getMasterProvince)

app.get('/testGetTime', testService.testTime)

app.get('/getMaxLtv', auth, calculateService.getMaxLtv)

app.get('/getcoverageTotallossold', auth, calculateService.getcoverageTotallossold)

app.get('/getcoverageTotalloss', auth, calculateService.getcoverageTotalloss)

app.get('/getInsuranceold', auth, masterService.getInsuranceold)

app.get('/getInsurance', auth, masterService.getInsurance)

app.get('/getmrtainsurance', auth, mrtaService.getmrtainsurance)

app.get('/getInsurer', auth, masterService.getInsurer)

app.get('/getInsuranceYear', auth, masterService.getInsuranceYear)

app.get('/getPaymentValue', auth, calculateService.getpaymentValue)

app.get('/getagefrombirthdate', auth, calculateService.getagefrombirthdate)

app.get('/getoracleoutstand', auth, calculateService.getoracleoutstand)

app.post('/calculateage', auth, calculateService.calculateage)

app.post('/calculateage_db', auth, calculateService.calculateage_db)

app.get('/getSizeModel', auth, masterService.getSizeModel)

app.get('/getOccupation', auth, masterService.getOccupation)

app.get('/getMasterStatus', auth, masterService.getMasterStatus)

app.get('/getRateSheet', auth, masterService.getRateSheet)

app.post('/attachdeliverapprove', auth, deliverApproveService.attachimagedeliver) // old function replace by attachimagedeliverandconsent

app.post('/attachdeliverapproveandconsent', auth, deliverApproveService.attachimagedeliverandconsent) // new function replace attachdeliverapprove function

app.get('/getattachimagedeliverbyid/:id', auth, deliverApproveService.getattachimagedeliverbyid)

app.get('/getsignImgbyid/:id', auth, imageService.getsignImgbyid)

app.get('/getDealerSignaturebyid/:id', auth, imageService.getDealerSignaturebyid)

app.post('/bypassquotationbychecker', auth, bypassService.bypassquotationbychecker)

app.get('/genid', testService.genid)

app.get('/sendsmscheck', auth, smsService.sendsmscheck)

app.get('/sendsmsconfirmpayment', auth, smsService.sendsmsconfirmpayment)

app.get('/testsendsmscheck', test2.testsendsms)

app.get('/activeepaper', quotationservice.activeEpaper)

app.get('/canclequotation/:quotationid', auth, quotationservice.canclequotation)

app.post(`/smssendtest`, testService.smssendtest)

app.get(`/getipserver`, testService.getipserver)

app.get(`/getipfromhttp`, testService.getipfromhttp)

app.post(`/bypasssms`, smsService.bypasssms)

app.post(`/testsmsenv`, smsService.testsmsenv)

app.post(`/sendemailsmtp`, loginUserservice.sendemailsmtp)

app.post(`/forgetpassword`, loginUserservice.forgetpassword)

app.post(`/resetpassword`, loginUserservice.resetpassword)

// app.get('/getcontractlist',auth,  negoService.getcontractlist)

app.get('/getviewcontractlist', auth, negoService.getviewcontractlist)

app.get('/getnegotiationlist', auth, negoService.getnegotiationlist)

app.get('/getnegotiationbyid', auth, negoService.getnegotiationbyid)

app.get('/getmotocyclenego', auth, negoService.getmotocyclenego)

// app.get('/getholdermaster', auth, negoService.getholdermaster)

app.get('/gethistorypaymentlist', auth, negoService.gethistorypaymentlist)

app.get('/getaddresscustlist', auth, negoService.getaddresscustlist)

app.get('/getaddressncblist', auth, negoService.getaddressncblist)

app.get('/getfollowuppaymentlist', auth, negoService.getfollowuppaymentlist)

app.get('/getlalon', auth, negoService.getlalon)

app.get('/getaddressinfo', auth, negoService.getaddressinfo)

app.post('/updatenegolalon', auth, negoService.updatenegolalon)

app.get('/getnegomasterstatus', auth, masterService.getnegomasterstatus)

app.get('/getphonenolist', auth, negoService.getphonenolist)

app.get('/getphonenolistcust', auth, negoService.getphonenolistcust)

app.post('/insertnegolist', auth, negoService.insertnegolist)

app.post('/createaddressInfo', auth, negoService.createaddressInfo)

app.get('/getbranch', auth, masterService.getbranch)

app.get('/getcarcheckstatus', auth, masterService.getcarcheckstatus)

app.get('/genbarcodeqrold', portalService.genbarcodeqrold) // === no client yaml === 

app.get('/genbarcodeqr', portalauth, portalService.genbarcodeqr) // === deprecate ===

app.get('/viewgenbarcodeqr', portalauth, portalService.viewgenbarcodeqr) // === no client yaml

app.get('/viewgenbarcodeqrrefpay', portalauth, portalService.viewgenbarcodeqrrefpay) // === no client yaml

app.get('/genpdfinsurance', portalauth, portalService.genpdfinsurance) // === deprecate ===

app.get('/viewgenpdfinsurance', portalauth, portalService.viewgenpdfinsurance)

app.get('/bkisignature.png', function (req, res) {
  res.sendFile(__dirname + '/' + "assets/image" + '/' + "signature.png");
});

app.get('/checkjwtportal', portalauth, portalService.checkjwtportal)

app.get('/genmrtaqr', auth, mrtaService.genmrtaqr)

app.get('/genqrcodenego', auth, negoService.genqrcodenego)

app.get('/checkmrtarecent', auth, mrtaService.checkmrtarecent)

app.get('/getmrtaseller', auth, mrtaService.getmrtaseller)

app.post('/saveqrpayment', auth, mrtaService.saveqrpayment)

app.get('/getdipchiptoken', auth, dipchipService.getdipchiptoken)

app.get('/confirmqrpayment', auth, mrtaService.confirmqrpayment)

app.get('/genadvanceqrpayment', auth, mrtaService.genadvanceqrpayment)

app.get('/gentotallossqrpayment', auth, mrtaService.gentotallossqrpayment)

app.get('/getpremrolemenu', auth, btwService.getpremrolemenu)

app.get('/getsearchmrta', auth, btwService.getsearchmrta)

app.get('/getmrtainfo', auth, btwService.getmrtainfo)

app.get('/testexcecuteresponse', testService.testexcecuteresponse)

app.get('/getdopastatusbyid', quotationservice.getdopastatusbyid)

app.get('/getMariedStatus', auth, masterService.getMariedStatus)

app.get('/getHouseType', auth, masterService.getHouseType)

app.get('/getHouseOwnerType', auth, masterService.getHouseOwnerType)

// === util service ===

// === welcome call service ===
app.get('/generatetokenWelcomeCall', auth, welcomeCallService.generatetokenWelcomeCall)


// *** image util ***

app.post('/compressimage', imageUtilService.compressimage)

// app.get('/genqr', barcodeService.genqr)
// switch on lissten port 
// process.env.PORT
// process.env.API_PORT

// app.listen(process.env.API_PORT, () => {
//   // console.log(ip.address());
//   console.log(`UP & running on port ${process.env.API_PORT}`)
// })


app.listen(process.env.PORT, () => {
  // console.log(ip.address());
  console.log(`UP & running on port ${process.env.PORT}`)
})
 



