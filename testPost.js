const axios = require('axios');

const requestPath = 'http://statistici.insse.ro:8077/tempo-ins/matrix/AGR112B';
const postBody = {
  "language": "ro",
  "arr": [
      [
          {
              "label": "Municipiul Bucuresti",
              "nomItemId": 3104,
              "offset": 43,
              "parentId": null
          }
      ],
      [
          {
              "label": "179132 MUNICIPIUL BUCURESTI",
              "nomItemId": 3048,
              "offset": 16921,
              "parentId": 3104
          }
      ],
      [
          {
              "label": "Anul 2003",
              "nomItemId": 4494,
              "offset": 14,
              "parentId": null
          }
      ],
      [
          {
              "label": "Tone",
              "nomItemId": 9729,
              "offset": 1,
              "parentId": null
          }
      ]
  ],
  "matrixName": "Productia totala de struguri pe judete si localitati",
  "matrixDetails": {
      "nomJud": 1,
      "nomLoc": 2,
      "matMaxDim": 4,
      "matUMSpec": 0,
      "matSiruta": 1,
      "matCaen1": 0,
      "matCaen2": 0,
      "matRegJ": 0,
      "matCharge": 0,
      "matViews": 0,
      "matDownloads": 0,
      "matActive": 1,
      "matTime": 3
  }
}

function postRequest() {
  return axios.get(requestPath, postBody);
};

postRequest()
.then((res) => {
  console.log(res.data);
})
