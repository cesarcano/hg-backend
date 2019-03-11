const functions = require('firebase-functions');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var dba = admin.database();
/**
 *  EXTRAS
 */
const httpsReq = require('http');

const gasolinerasNodo = dba.ref("/gasolineras");
const coordenadasNodo = dba.ref("/coordenadas");
const comentariosNodo = dba.ref("/comentarios");
const preferenciasNodo = dba.ref("/preferencias");
const serviciosNodo = dba.ref("/servicios");
const usersNodo = dba.ref("/users");

exports.getGasDetalle = functions.https.onRequest((request, response) => {
    if(request.method !== "POST"){
        response.send(405, 'HTTP Method ' + request.method +' not allowed');
    }
    const gasId = request.body.gasId;
    let body = new Object();
    return gasolinerasNodo.child(gasId).once("value", (snapshot) => {
        let shot = snapshot.val();
        body["id"] = gasId;
        body["direccion"] = shot.direccion;
        body["combustibles"] = shot.combustibles;
        body["marca"] = shot.marca;
        body["lat"] = shot.lat;
        body["lng"] = shot.lng;
    }).then(() => {
        //comentarios & calificacion
        return comentariosNodo.child(gasId).once("value", (snap) => {
            if (snap.val() !== null) {
                let promedio = 0;
                let i = 0;
                snap.forEach(element => {
                    i++;
                    let e = element.val()
                    promedio += e.calificacion; 
                });
                body["comentarios"] = snap.val();
               
                body["calificacion"] = Math.round(promedio / i);
            } else {    
                body["comentarios"] = "null";
                body["calificacion"] = 0;
            }
        }).then(()=> {
            return serviciosNodo.child(gasId).once("value", (s) => {
                if (s.val() !== null) {
                    let servicios = [];
                    s.forEach(element => {
                        servicios.push(element.key);
                    });
                    body["servicios"] = servicios;
                } else {
                    body["servicios"] = "null";
                }
            }).then(() => {
                return response.send(body);
            });
        });
    });
});

exports.getGasCalificacion = functions.https.onRequest((request, response) => {
    if(request.method !== "POST"){
        response.send(405, 'HTTP Method ' + request.method +' not allowed');
    }
    const gasId = request.body.gasId;
    let body = new Object();
    return comentariosNodo.child(gasId).once("value", (snap) => {
        if (snap.val() !== null) {
            let promedio = 0;
            let i = 0;
            snap.forEach(element => {
                i++;
                let e = element.val()
                promedio += e.calificacion;
            });
            body["calificacion"] = Math.round(promedio / i);
        } else {    
            body["calificacion"] = 0;
        }
    }).then(()=> {
        body["id"] = gasId;
        return response.send(body);
    });
});

exports.getstations = functions.https.onRequest((request, response) => {
    if(request.method !== "POST"){
        response.send(405, 'HTTP Method ' + request.method +' not allowed');
    }
    // se buscan los combustibles
    const lat = request.body.lat;
    const lng = request.body.lng;
    const distance = request.body.distance;
    const marcas = request.body.marcas;
    const filtro = request.body.filtro;
    const combustibles = request.body.combustibles;
    const dpi = request.body.dpi;
    const uId = typeof request.body.uId !== "undefined"? request.body.uId : null;
    
    let mlat = Math.trunc(lat);
    let mlng = Math.trunc(lng);
    let combId = combustibles[0];

    let respuesta = [];
    return coordenadasNodo.child(mlat - 1).child(mlng - 1).once("value", (snapshot) => {
        if(snapshot.val() !== null) {
            snapshot.forEach(snap => {
                let g = snap.val();
                let tieneDistancia = estaCerca(g.lat, g.lng, lat, lng, distance);
                if (tieneDistancia) {
                    let isMarca = esDeLaMarca(g.marca, marcas);
                    let hasCombustibles = tieneCombustibles(combustibles, g.combustibles);
                    if (tieneDistancia && hasCombustibles && isMarca) {
                        let gasResponse = {
                            id: g.cre_id,
                            calificacion: Math.round(g.calificacion),
                            direccion: g.direccion,
                            lat: g.lat,
                            lng: g.lng,
                            url:"https://firebasestorage.googleapis.com/v0/b/hellogas-3db04.appspot.com/o/marcadores%2F" + getIconUrl(g.marca, dpi) + "?alt=media",
                            marca: g.marca,
                            distancia: calcularDistancia(lat, lng, g.lat, g.lng),
                            combustibles: g.combustibles
                            };   
                        respuesta.push(gasResponse);
                    }
                }
            });
        }
    }).then(() => {
        return coordenadasNodo.child(mlat).child(mlng).once("value", (snapshot) => {
            if(snapshot.val() !== null) {
                snapshot.forEach(snap => {
                    let g = snap.val();
                    let tieneDistancia = estaCerca(g.lat, g.lng, lat, lng, distance);
                    if (tieneDistancia) {
                        let isMarca = esDeLaMarca(g.marca, marcas);
                        let hasCombustibles = tieneCombustibles(combustibles, g.combustibles);
                        if (tieneDistancia && hasCombustibles && isMarca) {
                            let gasResponse = {
                                id: g.cre_id,
                                calificacion: Math.round(g.calificacion),
                                direccion: g.direccion,
                                lat: g.lat,
                                lng: g.lng,
                                url:"https://firebasestorage.googleapis.com/v0/b/hellogas-3db04.appspot.com/o/marcadores%2F" + getIconUrl(g.marca, dpi) + "?alt=media",
                                marca: g.marca,
                                distancia: calcularDistancia(lat, lng, g.lat, g.lng),
                                combustibles: g.combustibles
                                };   
                            respuesta.push(gasResponse);
                        }
                    }
                });
            }
        }).then(() => {
        return coordenadasNodo.child(mlat+1).child(mlng+1).once("value", (snapshot) => {
            if(snapshot.val() !== null) {
                snapshot.forEach(snap => {
                    let g = snap.val();
                    let tieneDistancia = estaCerca(g.lat, g.lng, lat, lng, distance);
                    if (tieneDistancia) {
                        let isMarca = esDeLaMarca(g.marca, marcas);
                        let hasCombustibles = tieneCombustibles(combustibles, g.combustibles);
                        if (tieneDistancia && hasCombustibles && isMarca) {
                            let gasResponse = {
                                id: g.cre_id,
                                calificacion: Math.round(g.calificacion),
                                direccion: g.direccion,
                                lat: g.lat,
                                lng: g.lng,
                                url:"https://firebasestorage.googleapis.com/v0/b/hellogas-3db04.appspot.com/o/marcadores%2F" + getIconUrl2(g.marca, dpi) + "?alt=media",
                                marca: g.marca,
                                distancia: calcularDistancia(lat, lng, g.lat, g.lng),
                                combustibles: g.combustibles
                                };   
                            respuesta.push(gasResponse);
                        }
                    }
                });
            }
        }).then(() => {
            if ( uId !== "" && uId !== null) {
                guardarPreferencias(uId, distance, combustibles, marcas);
            }
            switch (filtro) {
            case "0":  // Filtro en mapa -> Distancia
                respuesta.sort((a, b) => parseFloat(a.distancia) - parseFloat(b.distancia));
                break;
            case "1": // Filtro por precio
                respuesta.sort((a, b) => parseFloat(a.combustibles[combId].precio - parseFloat(b.combustibles[combId].precio)));
                break;
            case "2": // Filtro por calificación
                respuesta.sort((a, b) => parseFloat(a.calificacion) - parseFloat(b.calificacion));
                break;
            case "3":  // filtro distancia
                respuesta.sort((a, b) => parseFloat(a.distancia) - parseFloat(b.distancia));
                break;
            default:
                break;
            }    
            return response.send(respuesta);
        });
        });
    });
});

exports.nuevoComentario = functions.database.ref('/comentarios/{gasId}/{pushId}')
    .onWrite((snapshot, context) => {
    const gId = context.params.gasId;
    let calificacion = 0;
    let i = 0;
    return comentariosNodo.child(gId).once("value", (comments) => {
        if (comments.val() !== null) {
        comments.forEach(comentario => {
            if (comentario.val() !== null) {
                        let v = comentario.val();
                        i++;
                        calificacion += parseFloat(v.calificacion);
            }
        });
        }
        calificacion = calificacion > 0 ? parseFloat(calificacion / i) : calificacion;
    }).then(()=> {
        return gasolinerasNodo.child(gId).child("calificacion").set(calificacion).then(() => {
            return gasolinerasNodo.child(context.params.gasId).once("value", (snap) => {
                let gasolinera = snap.val();
                let lat = Math.trunc(gasolinera.lat);
                let lng = Math.trunc(gasolinera.lng);
                return coordenadasNodo.child(lat).child(lng)
                .child(context.params.gasId).child("calificacion").set(calificacion);
            })
        });
    });
});
  
exports.updatePrecioCombustible = functions.database.ref('/gasolineras/{gasId}/combustibles/{combustible}/precio')
    .onUpdate((change, context) => {
    // Grab the current value of what was written to the Realtime Database.
    const gId = context.params.gasId;
    const combustible = context.params.combustible;
    const precio =  change.after.val();
    let detalleGas = "";
    try {
        return gasolinerasNodo.child(gId).once("value", (snapshot) => {
            detalleGas = snapshot.val();
        }).then(()=> {
            let lat = Math.trunc(detalleGas.lat);
            let lng = Math.trunc(detalleGas.lng);
            return coordenadasNodo
                .child(lng + "/" + lat + "/" + gId + "/combustibles/" + combustible + "/precio")
                .set(precio);
        });
    } catch(e) {
        //console.log(e);
    }

});
  
exports.updateEstadoCombustible = functions.database.ref('/gasolineras/{gasId}/combustibles/{combustible}/estado')
    .onUpdate((change, context) => {
    const gId = context.params.gasId;
    const combustible = context.params.combustible;
    const estado =  change.after.val();
    let detalleGas = "";
    try {
        return gasolinerasNodo.child(gId).once("value", (snapshot) => {
            detalleGas = snapshot.val();
        }).then(()=> {
            let lat = Math.trunc(detalleGas.lat);
            let lng = Math.trunc(detalleGas.lng);
            return coordenadasNodo
               .child(lat + "/" + lng + "/" + gId + "/combustibles/" + combustible + "/estado")
               .set(estado);
        });
    } catch(e) {
        console.log(e);
    }
});


function calcularDistancia(lat1,lon1,lat2,lon2) {
    rad = function(x) {return x * Math.PI/180;}
    var R = 6378137; //Radio de la tierra en metros
    var dLat = rad( lat2 - lat1 );
    var dLong = rad( lon2 - lon1 );
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    
    return parseInt(d); 
  }
  
function guardarPreferencias(uId, distance, combustibles, marcas) {
    return usersNodo.child(uId).once("value", (snapshot) => {
        if (snapshot.val() !== null) {
            return preferenciasNodo.child(uId).set({
                distancia: distance,
                combustibles: combustiblesPref(combustibles),
                marcas: marcasPref(marcas)
            });
        }
    });
}

function combustiblesPref(combustibles) {
    let nodoCombustible  = new Object();
    for (let i = 0; i < combustibles.length; i++) {
        let combustible = combustibles[i] === "all"? "todos": combustibles[i];
        nodoCombustible[i]  = combustible;
    }
    return nodoCombustible;
}
  
function marcasPref(marcas) {
    let nodoMarcas = new Object();
    for (let i = 0; i < marcas.length; i++) {
        let marca = marcas[i] === "all"? "todas": marcas[i];
        nodoMarcas[i]  = marca;
    }
    return nodoMarcas;
}

function esDeLaMarca(gMarca, marcas_array) {
    try {
    var flag = 0;
    marcas_array.forEach(marca => {
        let m = marca.replace(/\s/g,'');
        if (m.toLowerCase() === "all") 
            flag += 1;
        if (gMarca.toUpperCase() === m.toUpperCase()) 
            flag += 1;
        });  
        if (flag > 0) {
            return true;
        }
    } catch(e) {
        console.log(e);
        return false;
    }
    return false;
}

// Evalua si la gasolinera tiene los combustibles
function tieneCombustibles(combustibles_array, snapCombs) {
    try {
        let flag = 0;
        let keys = Object.keys(snapCombs);  
        combustibles_array.forEach(combustible => {
            if (combustible.toLowerCase() === "all") {
                flag += 1;
            }
            if (keys.includes(combustible)) {
                flag += 1;
            }
        });
        if (flag > 0) {
            return true;
        }
    } catch(e) {
        console.log(e);
        return false;
    }
    return false;
}

// Evalúa si la gasolinera está en el área
function estaCerca(gLat, gLng, lat, lng, distance) {  
    let distancia = calcularDistancia(lat, lng, gLat, gLng);
    if (distancia <= distance) {
        return true;
    } 
    return false;
}

function getIconUrl(marca, dpi) {
    let url = '';
    let url_icon = "";
    dpi === "low"? url_icon = "ldpi": 
    dpi === "mid"? url_icon = "mdpi": 
    dpi === "high"? url_icon = "hdpi":
    url_icon = "mdpi";
    let m = marca.replace(" ", "");
    m =  m.toLowerCase();
    url = "ico_" + m + "_" + url_icon + ".png";
    return url;
}

/**
 * FUNCIONES DE ACTUALIZACIONES
 */


/**
 *  Revisa datos de la CRE 
 */
exports.updatestations = functions.https.onRequest((req, response) => {
    let url = "http://api-reportediario.cre.gob.mx/api/EstacionServicio/Petroliferos?entidadId=all&municipioId=all&_=1548951405790";
    let data = '';
    httpsReq.get(url, (res) => {
        res.on("data", (subr) => {
            data += subr;
        });
        res.on('end', () => {
            setGasInf(JSON.parse(data))
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        return response.send("ok");
    });
});

// Lee el array de la CRE
function setGasInf(combustibles) {
    combustibles.forEach(element => {
        setGasolineraCompleta(element);
    });
}

function setGasolineraCompleta(item) {
    try {
        let cre_id = item.Numero.replace(/\//g, "-");
        let nCombustible = item.SubProducto;
        nCombustible = nCombustible.toLowerCase();
        if(gasolinerasNodo.child(cre_id).ref === null) {
            let gasolinera = new Object();
            gasolinera["actualizacion"] = Date.now();
            gasolinera["cre_id"] = cre_id;
            gasolinera["direccion"] = item.Direccion;
            gasolinera["municipio_id"] = item.MunicipioId;
            gasolinera["estado_id"] = item.EntidadFederativaId;
            gasolinera["razon_social"] = item.Nombre;
            gasolinera["calificacion"] = 0;
            gasolinera["marca"] = "PEMEX";
            gasolinerasNodo.child(cre_id).update(gasolinera);
        }

        // Info combustible
        if (nCombustible.includes("regular")) {
             let info = {
                precio: item.PrecioVigente,
                estado: 1, // solo para hacer el 1er update
                fecha_aplicacion: item.FechaAplicacion
            }
            //combustiblesNodo.child(cre_id + "/regular").update(info);
            gasolinerasNodo.child(cre_id + "/combustibles/regular").update(info);
        } 
        if (nCombustible.includes("premium")) {
            let info = {
               precio: item.PrecioVigente,
               estado: 1, // solo para hacer el 1er update
               fecha_aplicacion: item.FechaAplicacion
           }
           //combustiblesNodo.child(cre_id + "/premium").update(info);
           gasolinerasNodo.child(cre_id + "/combustibles/premium").update(info);
        } 
        if (nCombustible.includes("diésel")) {
            let info = {
               precio: item.PrecioVigente,
               estado: 1, // solo para hacer el 1er update
               fecha_aplicacion: item.FechaAplicacion
            }
            //combustiblesNodo.child(cre_id + "/diesel").update(info);
            gasolinerasNodo.child(cre_id + "/combustibles/diesel").update(info);
        }
    } catch(error) {
        //console.log(error);
    }
}

/**
 * GENERA EL NODO COMBUSTIBLES  
 */
exports.placesUpdate = functions.https.onRequest((req, response) => {
    places.forEach(element => {
        updatePlace(element);
    });
    return response.send("ok");
});

function updatePlace(item) {    
    let path = item.cre_id.replace(/\//g, "-");
    let lat = item.location.y;
    let lng = item.location.x;
    // EVALUANDO LATITUDES
    // Es un numero positivo entre 15 y 35 Tiene dos numeros antes del punto
    // 1) Eliminar puntuación
    lat = lat.replace(/\./g,"");
    // 2) Poner punto en posición 2
    lat = numberFormat(lat, 2);
    // EVALUANDO LONGITUDES
    // (1) Son numeros negativos entre -80 y -120
    //lng.replace(/\-/g,"");
    lng.replace(/\./g,"");
    // (2) Si inicia con 9 y 8 tiene dos números antes del punto
    if(lng.slice(0,1) === 8 || lng.slice(0,1) === 9) {
        lng = numberFormat(lng, 2);
        lng = lng * -1;
    }
    // (3) si inicia con 1 tiene 3 numero antes del punto
    if(lng.slice(0,1) === 1) {
        lng = numberFormat(lng, 3);
        lng = lng * -1;
    }
    //console.log(lat+","+lng);
    gasolinerasNodo.child(path + "/lat").set(lat);
    gasolinerasNodo.child(path + "/lng").set(lng);
}

function numberFormat(numero, posicion) {
    return numero.slice(0, posicion) + "." + numero.slice(posicion);
}

/**
 * GENERA EL NODO COORDENADAS
 */
exports.updateLatLng = functions.https.onRequest((request, response) => {
    return gasolinerasNodo.once("value", (snapshot) => {
        snapshot.forEach(element => {
            let g = element.val();
            let lat = Math.trunc(g.lat);
            let lng = Math.trunc(g.lng);
            coordenadasNodo.child(lat + "/" + lng + "/" + g.cre_id).set(g);
        }); 
    }).then(() => {
        return response.send("ok");
    });
});

/**
 * SINCRONIZA REPOSITORIO DE MARCAS
 */
exports.setMarcas = functions.https.onRequest((request, response) => {
    estaciones.forEach(g => {
        let lat = Math.trunc(g.lat);
        let lng = Math.trunc(g.lng);
        coordenadasNodo.child(lat + "/" + lng).once("value", (snapshot) => {
            snapshot.forEach(snap => {
                let datos = snap.val();
                if(estaCerca(g.lat, g.lng, datos.lat, datos.lng, 100)) {
                    coordenadasNodo.child(lat + "/" + lng + "/" + snap.key + "/marca/").set(g.marca);
                    gasolinerasNodo.child(snap.key + "/marca/").set(g.marca);
                }
            });
        });

    });
    return response.send("Marcas actualizadas");
});