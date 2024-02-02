const moment = require('moment');

const datestr = '2022-05-06';
function convertstringtodate(datestring) {
    try {
        let dateselect = datestring.replaceAll(' ', '-');
        var date = moment(dateselect, 'DD-MMM-YYYY').format('LL')
        console.log(`date before return : ${date}`)
        return date;
    } catch (e) {
        console.log(`before return null: ${date}`)
        return null;
    }
}

function convertstringtodate_date_field(datestring) {
    try {
        let dateselect = datestring.replaceAll(' ', '-');
        // var date = moment(dateselect, 'DD-MMM-YYYY')
        var date = moment(dateselect, 'YYYY-MM-DD').format('LL')
        console.log(`date before return : ${date}`)
        return date;
    } catch (e) {
        console.log(`before return null: ${date}`)
        return null;
    }
}

function removeTime(date) {
}

function changeDateFormat(date) {

}

function datetostring(date) {
    try {
        // console.log(`date before : ${date}`)
        let idate = new Date(date)
        let strdate = moment(idate).format("DD/MM/YYYY")
        // console.log(`str date : ${strdate}`)
        return strdate;
    } catch (e) {
        // console.log(`before return null: ${date}`)
        return null;
    }
}

function build2digitstringdate(str) {
    const digitchk = str.length
    if (digitchk == 1) {
        return `0${str}`
    } else {
        return str
    }
}


function getnextmonth(date) {
    if (date) {

        try {
            console.log(`this is date data : ${date}`)
            const dateValue = moment(date).date()
            let currentDate = moment()
            const paymentdate = moment(currentDate).set('date', dateValue)
            // console.log(`this is payment date : ${paymentdate}`)
            return paymentdate
        } catch (e) {
            return null
        }
    } else {
        return null
    }
}

module.exports.convertstringtodate = convertstringtodate
module.exports.changeDateFormat = changeDateFormat
module.exports.convertstringtodate_date_field = convertstringtodate_date_field
module.exports.removeTime = removeTime
module.exports.datetostring = datetostring
module.exports.build2digitstringdate = build2digitstringdate
module.exports.getnextmonth = getnextmonth