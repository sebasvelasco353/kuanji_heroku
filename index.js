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
var refCategorias = db.ref('/categorias');
const clarifaiApp = new Clarifai.App({
  apiKey: 'b71dea8696994f2f896b4cfa9f667b7d'
});
var threshold = 0.90;
const MAXPREDICTION = 3;
var counter = 0;
var animalsArray = [];
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

//Tags that tell it is an animal
const ANIMALS_KNOWN = [
  "animal",
  "abeja",
  "aguila",
  "araña",
  "ardilla",
  "avispa",
  "babosa",
  "ballena",
  "búho",
  "buitre",
  "burro",
  "caballo",
  "cabra",
  "canario",
  "cangrejo",
  "crustáceo",
  "caracol",
  "cerdo",
  "chimpancé",
  "chinche",
  "ciempiés",
  "cocodrilo",
  "codorniz",
  "colibrí",
  "conejo",
  "cucaracha",
  "erizo",
  "escarabajo",
  "escorpión",
  "gallina",
  "gallo",
  "ganso",
  "gato",
  "garrapata",
  "lagartija",
  "libélula",
  "loro",
  "lombriz",
  "mosca",
  "mono",
  "murcielago",
  "pájaro",
  "paloma",
  "pez",
  "pescado",
  "rana",
  "rata",
  "sapo",
  "tortuga",
  "perro",
  "hamster",
  "reptil"
];


//Tags that tell it is a person
const PERSONAS_KNOWN = [
  "hombre",
  "mujer",
  "persona",
  "masculino",
  "femenino",
  "adulto"
];

//Tags that tell it is food
const COMIDA_KNOWN = [
  "comida",
  "pasta",
  "verdura",
  "asado",
  "carne",
  "fruto",
  "mariscos",
  "sopa",
  "ensalada",
  "bebida",
  "gaseosa",
  "sopa",
  "delicioso",
  "almuerzo",
  "desayuno",
  "cena",
  "especialidad culinaria",
  "arte culinario"
];

function sendCategoria(res, toSend) {
  res.json(toSend);
}

//Gets
//------------ Function used for predicting the image sent by the front end to firebase
app.get('/predict', function(req, res) {
  counter = 0;
  var toPredict = req.query.link;
  clarifaiApp.models.predict(Clarifai.GENERAL_MODEL, toPredict).then(function(response) {
    // todos los tags
    var tags = response.rawData.outputs[0].data.concepts;
    // filtro por el threshold de 90%
    var filtered = tags.filter(function(tag) {
      if (tag.value > threshold) {
        // si el tag no es nulo ni undefined
        if ((tag.name != null) || (tag.name != undefined)) {
          for (var i = 0; i < WORDSTOFILTER_ARRAY.length; i++) { //for to loop over the array
            if (!tag.name.includes(WORDSTOFILTER_ARRAY[i])) { //i check if the tagname includes one of the words i have to filter
              // if the tag is this then change it to that
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
            } else {
              return false;
            }
          }
          // y despues de filtrar y cambiar las palabras necesarias devuelvo un true es decir que lo agrego al array filtered
          return true;
        } else { //cierro if de !tg.name array
          return false;
        }
      }
    });

    // inicio proceso de sacar solo una cantidad especifica de tags, en este caso 3
    var cantidadPorEliminar = filtered.length - MAXPREDICTION;
    if (cantidadPorEliminar > 0) {
      filtered.splice(3, cantidadPorEliminar);
    }

    // categorizacion pelao
    // esta variable es para saber si encontro algun tag que sea coincidencia de una categoria y asi no agregarlo varias veces
    var encontro = false;
    for (var i = 0; i < filtered.length && !encontro; i++) {
      console.log("analizando animals");
      if (ANIMALS_KNOWN.includes(filtered[i].name)) {
        encontro = true;
        console.log("encontro");
        var imgTemp = {
          link: toPredict,
          tag1: filtered[0].name,
          tag2: filtered[1].name,
          tag3: filtered[2].name,
          tag4: "animal"
        }

        var tempLink = {
          link: toPredict,
          tag1: filtered[0].name,
          tag2: filtered[1].name,
          tag3: filtered[2].name,
          tag4: "animal"
        }
        //add the imgLink json to the links on db
        refLinks.push(imgTemp);
        //Add the link to the corresponding tag on db
        refTags.child(filtered[0].name).push(tempLink);
        refTags.child(filtered[1].name).push(tempLink);
        refTags.child(filtered[2].name).push(tempLink);
        refCategorias.child("animal").push(tempLink);
        res.send("added " + imgTemp + "as animal To db successfully");

      } else if (PERSONAS_KNOWN.includes(filtered[i].name)) {
        encontro = true;
        console.log("encontro");
        var imgTemp = {
          link: toPredict,
          tag1: filtered[0].name,
          tag2: filtered[1].name,
          tag3: filtered[2].name,
          tag4: "persona"
        }

        var tempLink = {
          link: toPredict,
          tag1: filtered[0].name,
          tag2: filtered[1].name,
          tag3: filtered[2].name,
          tag4: "persona"
        }
        //add the imgLink json to the links on db
        refLinks.push(imgTemp);
        //Add the link to the corresponding tag on db
        refTags.child(filtered[0].name).push(tempLink);
        refTags.child(filtered[1].name).push(tempLink);
        refTags.child(filtered[2].name).push(tempLink);
        refCategorias.child("persona").push(tempLink);
        res.send("added " + imgTemp + "as persona To db successfully");

      } else if (COMIDA_KNOWN.includes(filtered[i].name)) {
        encontro = true;
        console.log("encontro");
        var imgTemp = {
          link: toPredict,
          tag1: filtered[0].name,
          tag2: filtered[1].name,
          tag3: filtered[2].name,
          tag4: "comida"
        }

        var tempLink = {
          link: toPredict,
          tag1: filtered[0].name,
          tag2: filtered[1].name,
          tag3: filtered[2].name,
          tag4: "comida"
        }
        //add the imgLink json to the links on db
        refLinks.push(imgTemp);
        //Add the link to the corresponding tag on db
        refTags.child(filtered[0].name).push(tempLink);
        refTags.child(filtered[1].name).push(tempLink);
        refTags.child(filtered[2].name).push(tempLink);
        refCategorias.child("comida").push(tempLink);
        res.send("added " + imgTemp + "as comida To db successfully");
      }
    }
    console.log("finaliza busqueda animales");
    //TODO: repetir para todas las categorias con el mismo encontro

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

app.get('/getAnimals', function(req, res) {
  animalsArray = [];
  var query = refCategorias.ref.child("animal");
  query.once("value", function(data) {
    data.forEach(function(cadaImgSnapshot) {
      var snapTemp = cadaImgSnapshot.val();
      if (snapTemp != undefined) {
        animalsArray.push(snapTemp);
      }
    });
  }).then(function(data) {
    sendCategoria(res, animalsArray);
  });
});

app.get('/getPersonas', function(req, res) {
  personasArray = [];
  var query = refCategorias.ref.child("persona");
  query.once("value", function(data) {
    data.forEach(function(cadaImgSnapshot) {
      var snapTemp = cadaImgSnapshot.val();
      if (snapTemp != undefined) {
        personasArray.push(snapTemp);
      }
    });
  }).then(function(data) {
    sendCategoria(res, personasArray);
  });
});

app.get('/getComidas', function(req, res) {
  comidaArray = [];
  var query = refCategorias.ref.child("comida");
  query.once("value", function(data) {
    data.forEach(function(cadaImgSnapshot) {
      var snapTemp = cadaImgSnapshot.val();
      if (snapTemp != undefined) {
        comidaArray.push(snapTemp);
      }
    });
  }).then(function(data) {
    sendCategoria(res, comidaArray);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
