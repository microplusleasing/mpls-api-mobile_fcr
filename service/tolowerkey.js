function loopObjtolowerkey(darray) {
    let arrayobjlower = []
        for(i = 0; i< darray.length; i++) {
        arrayobjlower.push(toLowerKeys(darray[i]))
      }
      return arrayobjlower;
    }
    
    function toLowerKeys(obj) {
    return Object.keys(obj).reduce((accumulator, key) => {
      accumulator[key.toLowerCase()] = obj[key];
      return accumulator;
    }, {});
  }
  
module.exports.arrayobjtolower = loopObjtolowerkey