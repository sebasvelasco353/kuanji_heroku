// TODO: Subir a heroku


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
const clarifaiApp = new Clarifai.App({
  apiKey: 'b71dea8696994f2f896b4cfa9f667b7d'
});
var threshold = 0.90;
const MAXPREDICTION = 3;

app.set('port', (process.env.PORT || 5000));

//Gets
//------------ Function used for predicting the image sent by the front end to firebase
app.get('/predict', function(req, res) {
  var toPredict = req.query.link;
  clarifaiApp.models.predict(Clarifai.GENERAL_MODEL, toPredict).then(
    function(response) {
      // todos los tags
      var tags = response.rawData.outputs[0].data.concepts;
      // filtro por el threshold
      var filtered = tags.filter(function (tag) {
        if (tag.value > threshold && !tag.name.includes("Ninguna persona") && !tag.name.includes("pueblo")) {
          if (tag.name.includes("canis lupus familiaris")) {
            tag.name = "perro"
          }
          return true;
        } else {
          return false;
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
        tag3: filtered[2].name,
      }

      var tempLink = {
        link: toPredict,
        tag1: filtered[0].name,
        tag2: filtered[1].name,
        tag3: filtered[2].name,
      }

      //add the imgLink json to the links on db
      refLinks.push(imgTemp);
      //Add the link to the corresponding tag on db
      refTags.child(filtered[0].name).push(tempLink);
      refTags.child(filtered[1].name).push(tempLink);
      refTags.child(filtered[2].name).push(tempLink);


      res.send("added " + imgTemp + "To db successfully");
    },
    function(err) {
      // there was an error
      res.send("Error");
    }
  );
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
        link: cadaTagSnapshot.val(),
      }
      arreglo_tags.push(snapTemp);
    });
  }).then(function(data) {
    res.json(arreglo_tags);
  });
});

//------------ Function used for retreiving all image links from one specific tag in the format tag -> link 1, 2 ... n
app.get('/getSpecificTag', function(req, res) {
  // arreglo donde guardo los links temporalmente para enviarlos
  var arreglo_imagenesPorTag = [];
  //get the tag needed
  var tagSearch = req.query.tagSearch;
  // query for calling all images onspecific tag
  const query = refTags.ref.child(tagSearch);
  query.once("value", function(data) {
    data.forEach(function(cadaImgSnapshot) {
      var snapTemp = cadaImgSnapshot.val();
      arreglo_imagenesPorTag.push(snapTemp);
    });
  }).then(function(data) {
    res.json(arreglo_imagenesPorTag);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// exports.app = functions.https.onRequest(app);
