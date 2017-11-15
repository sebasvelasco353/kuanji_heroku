const Clarifai = require('clarifai');
const dbConnection = require('./firebaseConnection.js'); //js file that connects to database
const functions = require('firebase-functions'); //Functions
const admin = require("firebase-admin");
const express = require('express');
const http = require('http');
const app = express();
var db = admin.database();
var refLinks = db.ref('/links');
var refTags = db.ref('/tags');
const clarifaiApp = new Clarifai.App({apiKey: 'b71dea8696994f2f896b4cfa9f667b7d'});
var threshold = 0.90;
const MAXPREDICTION = 3;
// Array for me to store all the links that are in a category
// var categoryArray = [];
app.set('port', (process.env.PORT || 5000));

//Arrray of words im going to use to filter the tags given to me by the A.I
const WORDSTOFILTER_ARRAY = [
  "delicioso",
  "almuerzo",
  "desayuno",
  "cena",
  "especialidad culinaria",
  "arte culinario",
  "fragaria",
  "nutrición",
  "salud",
  "bodegón",
  "productos",
  "insalubre",
  "solanum tuberosum",
  "tradicional",
  "cocción",
  "musa × paradisiaca",
  "contenedor de vidrio)",
  "expresión facial",
  "grupo (abstracción)",
  "pueblo",
  "sexy",
  "erótico",
  "uno",
  "tapa (recipiente)",
  "chica",
  "educación",
  "retrato",
  "gatito",
  "fondo de pantalla",
  "cricetinae",
  "psittaciformes",
  "exoesqueleto",
  "linda",
  "conejito",
  "adentro",
  "habitación",
  "ninguna persona",
  "linda",
  "theraphosidae",
  "arácnido"
];

const ANIMALS_KNOWN = [];

//Gets
//------------ Function used for predicting the image sent by the front end to firebase
app.get('/predict', function(req, res) {
  var toPredict = req.query.link;
  clarifaiApp.models.predict(Clarifai.GENERAL_MODEL, toPredict).then(function(response) {
    // todos los tags
    var tags = response.rawData.outputs[0].data.concepts;
    // filtro por el threshold
    var filtered = tags.filter(function(tag) {
      if (tag.value > threshold) {
        if (!tag.name.includes("ninguna persona")) { //i check if the tagname includes the
          for (var i = 0; i < WORDSTOFILTER_ARRAY.length; i++) { //for to loop over the array
            console.log(WORDSTOFILTER_ARRAY[i] + " es en la pos numero " + i);
            if ((tag.name.includes("canis lupus familiaris")) || (tag.name.includes("canidae"))) {
              tag.name = "perro";
            } else if (tag.name.includes("animalia")) {
              tag.name = "animal";
            } else if (tag.name.includes("Testudines")) {
              tag.name = "tortuga";
            } else if (tag.name.includes("masculina")) {
              tag.name = "hombre";
            } else if (tag.name.includes("reptilia")) {
              tag.name = "reptil";
            } else if (tag.name.includes("elephantidae")) {
              tag.name = "elefante";
            } else if (tag.name.includes("pyrus")) {
              tag.name = "pera";
            } else if (tag.name.includes("malus domestica")) {
              tag.name = "manzana";
            } else if (tag.name.includes("solanum tuberosum")) {
              tag.name = "papa";
            } else if (tag.name.includes("lactuca sativa")) {
              tag.name = "lechuga";
            }
          }
          return true;
        } else { //cierro if de !tg.name array
          return false;
        }
      }
    });

    var cantidadPorEliminar = filtered.length - MAXPREDICTION;
    if (cantidadPorEliminar > 0) {
      filtered.splice(3, cantidadPorEliminar);
    }

    // Temporal image with the tags
    var imgTemp = {
      link: toPredict,
      tag1: filtered[0].name,
      tag2: filtered[1].name,
      tag3: filtered[2].name
    }

    var tempLink = {
      link: toPredict,
      tag1: filtered[0].name,
      tag2: filtered[1].name,
      tag3: filtered[2].name
    }

    //add the imgLink json to the links on db
    refLinks.push(imgTemp);
    //Add the link to the corresponding tag on db
    refTags.child(filtered[0].name).push(tempLink);
    refTags.child(filtered[1].name).push(tempLink);
    refTags.child(filtered[2].name).push(tempLink);

    res.send("added " + imgTemp + "To db successfully");
  }, function(err) {
    // there was an error
    res.send("Error");
  });
});

//------------ Function used for retreiving all image links in the format link -> tag 1, 2 and 3
app.get('/getAllLinks', function(req, res) {
  console.log("llego");
  // arreglo donde guardo los links temporalmente para enviarlos
  var arreglo_links = [];
  refLinks.once("value", function(data) {
    data.forEach(function(cadaLinkSnapshot) {
      var snapTemp = cadaLinkSnapshot.val();
      arreglo_links.push(snapTemp);
    });
  }).then(function(data) {
    res.json(arreglo_links);
  });
});

//------------ Function used for retreiving all image links from All tags in the format tag -> link 1, 2 ... n
app.get('/getAllTags', function(req, res) {
  // arreglo donde guardo los links temporalmente para enviarlos
  var arreglo_tags = [];
  refTags.once("value", function(data) {
    data.forEach(function(cadaTagSnapshot) {
      var tagPadre = cadaTagSnapshot.key;
      var snapTemp = {
        tag: tagPadre,
        link: cadaTagSnapshot.val()
      }
      arreglo_tags.push(snapTemp);
    });
  }).then(function(data) {
    res.json(arreglo_tags);
  });
});

//------------ This part is in charge of selecting the photos according to the categories
// TODO: finish the get tag for the categories: animales, personas, comida
// function getTag(tagToSearch) {
//   console.log("holi desde getTag con tag = " + tagToSearch);
//   // categoryArray = [];
//   // query for calling all images onspecific tag
//   const query = refTags.ref.child(tagToSearch);
//   query.once("value", function(data) {
//     data.forEach(function(cadaImgSnapshot) {
//       var snapTemp = cadaImgSnapshot.val();
//       categoryArray.push(snapTemp);
//     });
//   }).then(function(data) {
//     // console.log(categoryArray);
//     return categoryArray;
//   });
//   // return categoryArray;
// }

//------------ Function used for retreiving all image links where the tags are animals -> link 1, 2 ... n
app.get('/getAnimals', function(req, res) {
  // arreglo donde guardo los links temporalmente para enviarlos
  var animalsArray = [];
  // var categoryArray = [];
  //TODO: Llenar animalsArray con los datos que retorna getTag con cada animal de un array, y despues enviarlo como respuesta
  // getTag("animal de compañía");
  var query = refTags.ref.child("animal de compañía");
  query.once("value", function(data) {
    data.forEach(function(cadaImgSnapshot) {
      var snapTemp = cadaImgSnapshot.val();
      console.log(snapTemp);
      animalsArray.push(snapTemp);
    });
  }).then(function(data) {
    // for (var i = 0; i < categoryArray.length; i++) {
    //   animalsArray.push(categoryArray[i]);
    // }
    // return animalsArray;
    res.json(animalsArray);
  });

  //
  //   console.log(categoryArray);
  //   for (var i = 0; i < categoryArray.length; i++) {
  //   console.log("categoryArray en la posicion #" + i + "tiene a " + categoryArray[i]);
  //   animalsArray.push(categoryArray[i]);
  //   }
  //   res.json(animalsArray);
});


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// exports.app = functions.https.onRequest(app);
