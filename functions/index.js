var functions = require('firebase-functions');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var db = admin.database();

// REFERENCES
var usersRef = db.ref("/users");
var favoritesRef = db.ref("/favorites");
var gstationsRef = db.ref("/gstations");

exports.adduser = functions.https.onRequest((request, response) => {
    let id = request.query.id;
    let email = request.query.email;
    let nombre = request.query.nombre;
    let sexo = request.query.sexo;
    let edad = request.query.edad;
    return usersRef
        .child(id)
        .set({
            email: email, 
            nombre: nombre,
            sexo: sexo,
            edad: edad
        }).then( response.send({
                status: "1"
        }));
});

exports.addgstation = functions.https.onRequest((request, response) => {
    let id = request.query.id;
    let direccion = request.query.direccion;
    let nombre = request.query.nombre;
    let latitud = request.query.lat;
    let longitud = request.query.lng;
    // Se verifica si la gasolinera ya existe
    gstationsRef.child(id).once('value', function (snapshot) {
        let exist = (snapshot.val() !== null); 
        if (!exist) { 
            return gstationsRef
            .child(id)
            .set({  
                nombre: nombre,
                marca: "¡Agrega este lugar!",
                direccion: direccion,
                latitud: latitud,
                longitud: longitud
            }).then( response.send(
                {
                status: "1",
                exist : exist
            })); 
        } else {
            return response.send(
                {
                    status: "0",
                    exist : exist
            });  
        }
      });
});

exports.getGStation = functions.https.onRequest((request, response) => {
    let idgst = request.query.id;
    gstationsRef.orderByKey().equalTo(idgst).on("value", function (snapshot) {
        if (snapshot.val() !== null) {
            return response.send({
                status: 1,
                id: idgst,
                properties: snapshot.toJSON()
            });
        } else {
            return response.send({
                status: 0,
                reponse: snapshot.val()
            });
        }
    });
});

exports.getfavorites = functions.https.onRequest((request, response) => {
    let iduser = request.query.id;
    favoritesRef.orderByKey().equalTo(iduser).on("value", function (snapshot) {  
        if (snapshot.val() !== null) {
            return response.send({
                status: 1,
                id: iduser,
                properties: snapshot.toJSON()
            });
        } else {
            return response.send({
                status: 0,
                reponse: snapshot.val()
            });
        }
    });
});