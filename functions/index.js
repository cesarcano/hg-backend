var functions =  require('firebase-functions');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var db = admin.database();

/**
 *  EXTRAS
 */
const httpsReq = require('https');

// REFERENCES
var usersRef = db.ref("/users");
var favoritesRef = db.ref("/favoritos");
var gstationsRef = db.ref("/gasolineras");
var combustiblesRef = db.ref("/combustibles");
var marcasRef = db.ref("/marcas");
var comentarioRef = db.ref("/comentarios");
var servicioRef = db.ref("/servicios");
var preferenciasRef = db.ref("/preferencias");
var likesref = db.ref("/reacciones");

// RESPONSE 
var mResponse = {
    status: "",
    response: "",
    message: ""
};

var msg_ok = "ok";
var msg_error = "error";
var msg_tryAgain = "again";

/**
 *  AUTH
 */

/**
 *  GASOLINERAS
 */

 // Agregar Gasolinera
 function addgstation(id, nombre, direccion, lat, lng) {
    return gstationsRef.child(id).once('value', (snapshot) => {
        let exist = (snapshot.val() !== null); 
        if (!exist) { 
            return gstationsRef
            .child(id)
            .set({  
                nombre: nombre, // Nombre que viene en PLACES API
                marca: "¡Actualiza este lugar!",
                direccion: direccion,
                latitud: lat,
                longitud: lng,
                calificacion: 0,
                promocion: 0,
                actualizacion: {
                    fecha: 0,
                    usuario: 0
                }
            });
        }
    });
 }
// OBTENER INFO DE LA GASOLINERA
exports.getgstation = functions.https.onRequest((request, response) => {
    let id = request.query.id;
    gstationsRef.child(id).once("value", (snapshot) => {
        if (snapshot.val() !== null) {
            let values = snapshot.val();
            return response.send({
                status: 1,
                response: {
                    id: snapshot.key,
                    actualizacion: {
                        fecha: values.actualizacion.fecha,
                        usuario: values.actualizacion.usuario
                    },
                    calificacion: values.calificacion,
                    direccion: values.direccion,
                    latitud: values.latitud,
                    longitud: values.longitud,
                    marca: values.marca,
                    nombre: values.nombre,
                    promocion: values.promocion
                }
            });
        } else {
            return response.send({
                status: 0,
                reponse: snapshot.val()
            });
        }
    });
});

// OBTENER GASOLINERAS CERCANAS DESDE API GOOGLE
function getPlaces(lat, lng, name) {
    let gstations = [];
    let googleApiKey = 'AIzaSyAoeIJWYdCLDklb4dTlCD2-MFAtOtctCsY';
    let radius = '3000'; // en metros
    let data = '';
    let url = 
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json?"+
    "location="+ lat + "," + lng + 
    "&radius=" + radius +"&type=gas_station" +
    "&name=" + name + "&key=" + googleApiKey;
    httpsReq.get(url, (res) => {
        res.on("data", (subr) => {
            data += subr;
        });
        res.on('end', () => {
            console.log("obteniendo gasolineras");
            updateGStns(JSON.parse(data));
            });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        return 0;
    });
}
function updateGStns(data) {
    console.log(data);
    data.results.forEach(gs => {
        addgstation(gs.place_id, gs.name, gs.vicinity, 
                gs.geometry.location.lat, gs.geometry.location.lng );
    });
}

// OBTENER GASOLINERAS EN UN AREA
exports.getgstations = functions.https.onRequest((req, res) => {
    let lat = req.query.lat;
    let lng = req.query.lng;
    let lat_inf = lat - 0.05;
    let lng_inf = lng - 0.05;
    let lat_sup = parseFloat(lat) + parseFloat(0.05);
    let lng_sup = parseFloat(lng) + parseFloat(0.05);

    let response = [];

    getPlaces(lat, lng, " ");

    return gstationsRef.once("value", (snapshot) => {
        snapshot.forEach(gst => {
            let values = gst.val();
            let isLat = ( values.latitud < lat_sup && values.latitud > lat_inf);
            let isLng = ( values.longitud < lng_sup && values.longitud > lng_inf);
            if (isLat && isLng) {   
                let value = {
                    id: gst.key,
                    actualizacion: {
                        fecha: values.actualizacion.fecha,
                        usuario: values.actualizacion.usuario
                    },
                    calificacion: values.calificacion,
                    direccion: values.direccion,
                    latitud: values.latitud,
                    longitud: values.longitud,
                    marca: values.marca,
                    nombre: values.nombre,
                    promocion: values.promocion
                };
                response.push(value);
            }
        });
    }).then(() => {
        mResponse.response = response;
        mResponse.status = res.statusCode;
        if (res.statusCode === 200) {
            mResponse.message = msg_ok;
        } else {
            mResponse.response = null;
            mResponse.message = msg_error;
        }
        return res.send(mResponse);
    });
});

// Trigger calcular calificacion a gasolinera (cada que se agrega un comentario)

/**
 *  USUARIOS
 */
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

/**
 *  FAVORITOS
 */
// Obtener todos los favoritos
exports.getfavoritos = functions.https.onRequest((request, response) => {
    let iduser = request.query.id;
    let res = [];
    return favoritesRef.child(iduser).once("value", (snapshot) => {
        snapshot.forEach(element => {
            gstationsRef.on("value", (snap) => {
                snap.forEach(e => {
                    if (e.key === element.key) {
                        console.log(e.key);
                        let values = e.val();
                        let data = {
                            id: e.key,
                            marca: values.marca,
                            lat: values.latitud,
                            lng: values.longitud,
                            direccion: values.direccion
                        };
                        res.push(data);
                    }
                });
            });
        }); 
    }).then(() => {
        mResponse.message = msg_ok;
        mResponse.response = res;
        mResponse.status = response.statusCode;
        return response.send(mResponse);
    });
});

// AGREGAR/QUITAR DE FAVORITOS
exports.setfavorito = functions.https.onRequest((request, response) => {
    let id = request.query.id;
    let user = request.query.uid;
    return favoritesRef.child(user).child(id)
        .once("value", (snapshot) => {
            let exist = (snapshot.val() !== null);
            if (!exist) {
                return favoritesRef.child(user).child(id).set("true").then(() => {
                    mResponse.response = null;
                    mResponse.status = response.statusCode;
                    mResponse.message = true;
                    return response.send(mResponse);
                });
            } else {
                return favoritesRef.child(user).child(id).remove()
                    .then(() => {
                        mResponse.response = null;
                        mResponse.status = response.statusCode;
                        mResponse.message = false;
                        return response.send(mResponse);
                    });
            }
    });
});

/**
 *  COMENTARIOS
 */

// Agregar comentario / por medio de este se califica las gasolineras
exports.addcomment = functions.https.onRequest((req, res) => {
    let texto = req.query.texto;
    let uid = req.query.uid;
    let gid = req.query.gid;
    let rank = req.query.rank;

    let usersIds = [];

    if (texto === '') {
        texto = 0;
    }
    // Revisando si se ha comentado en esa gasolinera
    return comentarioRef.child(gid).once("value", (snapshot) => {
        if (snapshot.val() === null) {
            return comentarioRef.child(gid).push({
                calificacion: rank,
                dislikes: 0,
                likes: 0,
                texto: texto,
                user: uid,
                frecha: 0 // PONER FECHA
            }).then(()=> {
                mResponse.message = "Comentario enviado";
                mResponse.response = null;
                mResponse.status = res.statusCode;
                return res.send(mResponse);
            });
        } else {
            snapshot.forEach(element => {
                let values = element.val();
                console.log(values.user);
                if (values.user === uid) {
                    return comentarioRef.child(gid).child(element.key).set({
                        calificacion: rank,
                        dislikes: 0,
                        likes: 0,
                        texto: texto,
                        user: uid
                    }).then(()=> {
                        mResponse.message = "Comentario actualizado";
                        mResponse.response = null;
                        mResponse.status = res.statusCode;
                        return res.send(mResponse);
                    });      
                }
            });
        }
    });
});
// Eliminar comentario (Trigger) cuando los dislikes superan los likes

// Eliminar mi comentario
exports.delmcomment = functions.https.onRequest((req, res) => {
    let uid = req.query.uid;
    let gid = req.query.gid;
    return comentarioRef.child(gid).once("value", (snapshot) => {
        if (snapshot.val() !== null) {
            snapshot.forEach(element => {
                let value = element.val();
                if (value.user === uid) {
                    return element.ref.remove().then(
                        res.send({
                            status: 1,
                            response: "done"
                        })
                    );
                }
            });
        } else {
            mResponse.message = msg_ok;
            mResponse.response = null;
            mResponse.status = res.statusCode;
            return res.send(mResponse);
        }
    });
});

// Dar like/dislike
exports.likeit = functions.https.onRequest((req, res) => {
    let commid = req.query.id;
    let gid = req.query.gid;
    let uid = req.query.uid;
    let cl = 0;
    try {
        return likesref.child(commid).child("likes").child(uid).set("true").then(() => {
            likesref.child(commid).child("likes").once("value", (snap) => {
                cl = snap.numChildren();
            });
            return comentarioRef.child(gid).child(commid).update({
                "likes": cl
            }).then(() => {
                return comentarioRef.child(gid).child(commid).once("value", (sn) => {
                    let vals = sn.val();
                    res.send({
                        status: 1,
                        response: vals.likes
                    });
                });
            });
        }).catch(() => {
            likesref.child(commid).child("likes").on("value", (snap) => {
                cl = snap.numChildren();
            });
            return comentarioRef.child(gid).child(commid).update({
                "likes": cl
            }).then(() => {
                return comentarioRef.child(gid).child(commid).on("value", (sn) => {
                    let vals = sn.val();
                    res.send({
                        status: 1,
                        response: vals.likes
                    });
                });
            });             
        });
    } catch (error) {
        console.log(error);
        res.send({
            status: 1,
            response: 0
        });
    }
});

// Obtener comentarios de una gasolinera (incluir JSON array de mi comentario si no lo hay poner un default)
exports.getcomentarios = functions.https.onRequest((req, res) => {
    let gid = req.query.gid;
    let response = [];
    return comentarioRef.child(gid).once("value", (snapshot) => {
        snapshot.forEach(element => {
            let values = element.val();
            return usersRef.child(values.user).once("value", (s) => {
                let val = s.val();
                let data = {
                    calificacion: values.calificacion,
                    dislikes: values.dislikes,
                    likes: values.likes,
                    texto: values.texto,
                    titulo: values.titulo,
                    gid: snapshot.key,
                    id: element.key,
                    uid: values.user,
                    user: val.nombre,
                    fecha: values.fecha
                };
            response.push(data);
            }).then(() => {
                mResponse.response = response;
                mResponse.status = res.statusCode;
                mResponse.message = msg_ok;
                return res.send(mResponse);
            });
           
        });
    });
});

/**
 * SERVICIOS
 */

// Calificar un servicio

// Reportar un servicio (Si existe o no existe)

// Trigger para calcular la calificación del servicio 
//(cada que se agrega una calificacion se hace promedio)

// Trigger para poner los servicios en false cuando se da de alta una gasolinera



/**
 *  COMBUSTIBLES
 */

/**
 *  MARCAS
 */