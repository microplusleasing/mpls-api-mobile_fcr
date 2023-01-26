// const { config } = require('dotenv')
// require('dotenv').config
require('dotenv').config()
const express = require('express')
const swaggerUI = require('swagger-ui-express')
const YAML = require("yamljs")
const cors = require('cors')
const auth = require('./middleware/auth')
const portalauth = require('./middleware/portalauth')
const userservice = require('./service/UserService')
const loginUserservice = require('./service/loginUserService')
const quotationservice = require('./service/QuotationService')
const imageService = require('./service/imageService')
const productService = require('./service/productService')
const masterService = require('./service/masterData')
const testService = require('./service/testService')
const calculateService = require('./service/calculateService')
const bypassService = require('./service/bypassquotationService')
const deliverApproveService = require('./service/approvedeliverService')
const smsService = require('./service/smsService')
const portalService = require('./service/portalService')
const negoService = require('./service/negoService')
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
app.use(cors(corsOptions))
app.use(bodyParser.json());


app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerJSDoc))

app.get('/user', auth, userservice.getuser)

app.get('/login', userservice.userlogin)

app.get('/portallogin', portalService.portallogin) // === deprecate ===

app.get('/viewportallogin', portalService.viewportallogin)

app.get('/loginuser', loginUserservice.loginUserService)

app.get('/quotation', auth, quotationservice.getquotation)

app.post('/quotation', auth, quotationservice.createquotation)

app.post('/updatequotationimage', auth , quotationservice.updateQuotationImage)

app.post('/updateQuotationImageonlyinsert', auth , quotationservice.updateQuotationImageonlyinsert)

app.post('/bypassquotation', auth, bypassService.bypassquotation)

app.get('/testiappservice', testService.testiappservice)

app.get('/getattachfile1/:id', auth, imageService.getattachfile1)

app.get('/getimagebyid/:id', auth, imageService.getimagebyid)

app.get('/getimagelistbyid/:id', auth, imageService.getimagelistbyid)

app.get('/quotationbyid/:id', auth, quotationservice.getquotationbyid)

app.get('/brand', auth, productService.getbrand)

app.get('/model', auth, productService.getmodel)

app.get('/MasterRate', auth, masterService.getRate)

app.get('/MasterTerm', auth, masterService.getTerm)

app.get('/MasterPaymentCount', auth, masterService.getPaymentCount)

app.get('/MasterImageType', auth, masterService.getImageType)

app.get('/MasterTitle', auth, masterService.getTitle)

app.get('/MasterDealer', auth, masterService.getDealer)

app.get('/MasterProvince', auth, masterService.getProvince)

app.get('/testGetTime', testService.testTime)

app.get('/getMaxLtv', auth , calculateService.getMaxLtv)

app.get('/getInsurance' , auth , masterService.getInsurance)

app.get('/getInsurer', auth , masterService.getInsurer)

app.get('/getInsuranceYear', auth , masterService.getInsuranceYear)

app.get('/getPaymentValue', auth , calculateService.getpaymentValue)

app.get('/getSizeModel', auth, masterService.getSizeModel)

app.get('/getOccupation', auth , masterService.getOccupation)

app.get('/getMasterStatus', auth, masterService.getMasterStatus)

app.get('/getRateSheet', auth , masterService.getRateSheet)

app.post('/attachdeliverapprove', auth, deliverApproveService.attachimagedeliver)

app.get('/getattachimagedeliverbyid/:id', auth , deliverApproveService.getattachimagedeliverbyid)

app.get('/getsignImgbyid/:id', auth , imageService.getsignImgbyid)

app.get('/getDealerSignaturebyid/:id', auth , imageService.getDealerSignaturebyid)

app.post('/bypassquotationbychecker', auth, bypassService.bypassquotationbychecker)

app.get('/genid', testService.genid)

app.get('/sendsmscheck', auth, smsService.sendsmscheck)

app.get('/testsendsmscheck', test2.testsendsms)

app.get('/activeepaper' , quotationservice.activeEpaper)

app.get('/canclequotation/:quotationid', auth, quotationservice.canclequotation)

app.post(`/smssendtest` , testService.smssendtest)

app.post(`/bypasssms` , smsService.bypasssms)

// app.get('/getcontractlist',auth,  negoService.getcontractlist)

app.get('/getviewcontractlist',auth,  negoService.getviewcontractlist)

app.get('/getnegotiationlist', auth, negoService.getnegotiationlist)

app.get('/getnegotiationbyid', auth , negoService.getnegotiationbyid)

app.get('/getmotocycle', auth , negoService.getmotocycle)

app.get('/gethistorypaymentlist', auth , negoService.gethistorypaymentlist)

app.get('/getaddresscustlist', auth , negoService.getaddresscustlist)

app.get('/getfollowuppaymentlist', auth , negoService.getfollowuppaymentlist)

app.get('/getlalon', auth , negoService.getlalon)

app.get('/getaddressinfo', auth , negoService.getaddressinfo)

app.get('/getnegomasterstatus', auth ,masterService.getnegomasterstatus)

app.get('/getphonenolist', auth , negoService.getphonenolist)

app.post('/insertnegolist', auth, negoService.insertnegolist)

app.get('/getbranch', auth, masterService.getbranch)

app.get('/genbarcodeqrold', portalService.genbarcodeqrold) // === no client yaml

app.get('/genbarcodeqr',portalauth, portalService.genbarcodeqr) // === deprecate ===

app.get('/viewgenbarcodeqr',portalauth, portalService.viewgenbarcodeqr) // === no client yaml

app.get('/genpdfinsurance',portalauth, portalService.genpdfinsurance) // === deprecate ===

app.get('/viewgenpdfinsurance',portalauth, portalService.viewgenpdfinsurance)

app.get('/bkisignature.png', function (req, res) {
  res.sendFile(__dirname + '/' + "assets/image" + '/' + "signature.png");
});

app.get('/checkjwtportal', portalauth, portalService.checkjwtportal)


// app.get('/genqr', barcodeService.genqr)

app.listen(process.env.API_PORT, () => {
  // console.log(ip.address());
  console.log("UP & running")
})


