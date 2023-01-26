const ddata = [
    {
      "CREATED_TIME": "2022-04-06T09:58:09.000Z",
      "LAST_UPDATED_TIME": "2022-04-06T09:58:09.000Z",
      "APPROVED_TIME": null,
      "FACE_RECOG_API_ID": null,
      "LINE_NUMBER": 4
    },
    {
      "CREATED_TIME": "2022-04-06T09:57:43.000Z",
      "LAST_UPDATED_TIME": "2022-04-06T09:57:43.000Z",
      "APPROVED_TIME": null,
      "FACE_RECOG_API_ID": null,
      "LINE_NUMBER": 5
    },
    {

      "CREATED_TIME": "2022-04-06T09:57:20.000Z",
      "LAST_UPDATED_TIME": "2022-04-06T09:57:20.000Z",
      "APPROVED_TIME": null,
      "FACE_RECOG_API_ID": null,
      "LINE_NUMBER": 6
    }
  ]
  
  function loopObjtolowerkey(darray) {
  let arrayobjlower = []
  	for(i = 0; i< darray.length; i++) {
    	/* console.log(toLowerKeys(ddata[i])) */
      arrayobjlower.push(toLowerKeys(ddata[i]))
    }
    return arrayobjlower;
  }
  
  function toLowerKeys(obj) {
  return Object.keys(obj).reduce((accumulator, key) => {
    accumulator[key.toLowerCase()] = obj[key];
    return accumulator;
  }, {});
}
  
  console.log(loopObjtolowerkey(ddata));